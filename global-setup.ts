/**
 * Global setup for Playwright tests
 * Runs once before all tests start
 *
 * Responsibilities:
 * - Initialize the database connection pool
 * - Authenticate to BO Pro and BO Interne (storageState for all tests)
 *
 * CI setup-auth-pro job (AUTH_SETUP_ONLY=pro):
 * - Authenticates 1 Pro account → .auth/pro.json
 *
 * CI setup-auth-interne job (AUTH_SETUP_ONLY=interne, AUTH_ACCOUNT_INDEX=N):
 * - Jitter to spread KC load across matrix runners
 * - Authenticates 1 Interne account → .auth/interne_{N}.json
 *
 * CI shard mode:
 * - Skips auth (files provided by setup-auth artifacts)
 *
 * Local mode:
 * - Authenticates 1 Pro + 1 Interne (always re-login for fresh cookies)
 */

import { chromium } from '@playwright/test';
import { getDBPool } from '@utils/DB_Utils/db.config';
import { LoginPage } from '@pages/BO_Both/Authentification/LoginPage';
import { authenticateWithStateDetection } from '@utils/Helpers/authentication.helpers';
import { getProStorageStatePath, getInterneStorageStatePath } from '@utils/Helpers/shardAccount.helpers';
import * as users from '@testdata/users.json';
import fs from 'fs';
import path from 'path';

/** Block Google Analytics/GTM requests (same as base.fixture.ts) */
async function blockAnalytics(page: import('@playwright/test').Page) {
  await page.route('**/*', (route) => {
    const requestUrl = route.request().url();
    if (
      requestUrl.includes('google-analytics.com') ||
      requestUrl.includes('googletagmanager.com') ||
      requestUrl.includes('analytics.google.com') ||
      requestUrl.includes('/gtag/') ||
      requestUrl.includes('/ga.js') ||
      requestUrl.includes('/analytics.js') ||
      requestUrl.includes('/gtm.js')
    ) {
      route.abort();
    } else {
      route.continue();
    }
  });
}

/**
 * Deterministic jitter to spread KC load across matrix runners.
 * Each runner gets a unique slot: delay = ((index - 1) / total) * window.
 * Guarantees even spacing (no collisions unlike random jitter).
 */
function deterministicJitter(index: number, total: number, windowMs: number): Promise<void> {
  const delay = ((index - 1) / total) * windowMs;
  console.log(`⏳ Deterministic jitter: slot ${index}/${total} → ${Math.round(delay)}ms`);
  return new Promise(resolve => setTimeout(resolve, delay));
}

const AUTH_DIR = path.resolve(__dirname, '.auth');
const PRO_STATE = path.join(AUTH_DIR, 'pro.json');
const INTERNE_STATE = path.join(AUTH_DIR, 'interne.json');
const KC_VALIDATION_MAX_ATTEMPTS = 3;
const KC_SETTLE_DELAY_MS = 1000;
const TOKEN_INTERCEPT_TIMEOUT_MS = 30_000; // 30s — fallback if no token exchange (KC cookies shortcut)

/**
 * Intercept KC token endpoint response during login to capture refresh_token,
 * client_id, and token endpoint URL for post-login validation.
 */
function setupTokenInterceptor(page: import('@playwright/test').Page) {
  let resolve: (value: { refreshToken: string; clientId: string; tokenEndpoint: string }) => void;
  const promise = new Promise<{ refreshToken: string; clientId: string; tokenEndpoint: string }>(r => { resolve = r; });

  page.on('response', async (response) => {
    if (response.url().includes('/openid-connect/token') && response.request().method() === 'POST' && response.ok()) {
      try {
        const body = await response.json();
        if (body.refresh_token) {
          const postData = response.request().postData() ?? '';
          const clientId = new URLSearchParams(postData).get('client_id') ?? '';
          resolve({ refreshToken: body.refresh_token, clientId, tokenEndpoint: response.url() });
        }
      } catch { /* ignore parse errors */ }
    }
  });

  return promise;
}

/**
 * Validate KC session by sending a refresh_token POST (same as kc.updateToken during tests).
 * Known KC 26.x bug: session sometimes not stored in PG → refresh fails → tests get disconnected.
 * By validating here, we detect the bug before starting 60 shards.
 */
async function authenticateWithKCValidation(
  page: import('@playwright/test').Page,
  loginPage: LoginPage,
  username: string,
  password: string,
): Promise<void> {
  for (let attempt = 1; attempt <= KC_VALIDATION_MAX_ATTEMPTS; attempt++) {
    // Set up interceptor BEFORE login triggers the KC token exchange
    const tokenPromise = setupTokenInterceptor(page);

    await authenticateWithStateDetection(page, loginPage, username, password);

    // Wait for the token response — but with a timeout fallback.
    // When authenticateWithStateDetection exits via KC cookies shortcut (no fresh login),
    // no token exchange happens and tokenPromise would hang forever.
    const tokenResult = await Promise.race([
      tokenPromise.then(result => ({ ok: true as const, ...result })),
      new Promise<{ ok: false }>(resolve =>
        setTimeout(() => resolve({ ok: false }), TOKEN_INTERCEPT_TIMEOUT_MS)
      ),
    ]);

    if (!tokenResult.ok) {
      console.warn(`    ⚠️  No token exchange intercepted within ${TOKEN_INTERCEPT_TIMEOUT_MS / 1000}s — clearing KC cookies and retrying auth (${attempt}/${KC_VALIDATION_MAX_ATTEMPTS})`);
      const context = page.context();
      const cookies = await context.cookies();
      const kcCookies = cookies.filter(c => c.domain.includes('auth-sso'));
      if (kcCookies.length > 0) {
        await context.clearCookies({ domain: kcCookies[0].domain });
      }
      await page.goto(page.url());
      continue;
    }

    const { refreshToken, clientId, tokenEndpoint } = tokenResult;

    // Let KC persist the session to PG before validating
    await new Promise(resolve => setTimeout(resolve, KC_SETTLE_DELAY_MS));

    // Validate: POST refresh_token to KC (same as kc.updateToken(5) in the BO)
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        refresh_token: refreshToken,
      }),
    });

    if (response.ok) {
      if (attempt > 1) {
        console.log(`    ✅ KC session validated on attempt ${attempt}`);
      }
      return;
    }

    console.warn(`    ⚠️  KC refresh_token rejected (${response.status}), session not stored — retrying auth (${attempt}/${KC_VALIDATION_MAX_ATTEMPTS})`);

    // Clear KC cookies to force a fresh login on next attempt
    const context = page.context();
    const cookies = await context.cookies();
    const kcCookies = cookies.filter(c => c.domain.includes('auth-sso'));
    if (kcCookies.length > 0) {
      await context.clearCookies({ domain: kcCookies[0].domain });
    }

    // Navigate back to BO — without KC cookies, this will redirect to login
    await page.goto(page.url());
  }

  throw new Error(`KC session validation failed after ${KC_VALIDATION_MAX_ATTEMPTS} attempts`);
}

async function globalSetup() {
  console.log('🚀 Initializing global resources...\n');

  const setupMode = process.env.AUTH_SETUP_ONLY; // 'pro' | 'interne' | undefined

  // Skip DB init in CI setup-auth jobs (only auth is needed, each shard inits its own pool)
  if (!setupMode) {
    try {
      const pool = getDBPool();
      console.log('✅ Database connection pool initialized successfully');

      await pool.query('SELECT 1');
      console.log('✅ Database connection verified\n');
    } catch (error) {
      console.error('❌ Error initializing database pool:', error);
      throw error;
    }
  } else {
    console.log(`⏭️  AUTH_SETUP_ONLY=${setupMode}, skipping database initialization\n`);
  }

  // Authentication: generate storageState files
  const isCI = !!process.env.CI;

  // CI shard mode: skip auth if files already exist (provided by setup-auth artifacts)
  // Apply deterministic jitter to stagger test starts across shards and avoid KC thundering herd
  if (isCI && !setupMode) {
    const proState = getProStorageStatePath();
    const interneState = getInterneStorageStatePath();
    if (fs.existsSync(proState) && fs.existsSync(interneState)) {
      const shardIndex = parseInt(process.env.PLAYWRIGHT_SHARD_INDEX || '1');
      const totalShards = 55;
      await deterministicJitter(shardIndex, totalShards, 5000);
      console.log('⏭️  Auth files found (.auth/), skipping authentication\n');
      return;
    }
  }

  fs.mkdirSync(AUTH_DIR, { recursive: true });

  const password = process.env.PASSWORDBO;
  if (!password) {
    throw new Error('Missing PASSWORDBO environment variable');
  }

  // Build extra HTTP headers: CSP bypass + Cloudflare Access (same as base.fixture.ts)
  const cfClientId = process.env.CF_ACCESS_CLIENT_ID_PARTNERS;
  const cfClientSecret = process.env.CF_ACCESS_CLIENT_SECRET_PARTNERS;
  const extraHTTPHeaders: Record<string, string> = {
    'Content-Security-Policy': '',
  };
  if (cfClientId && cfClientSecret) {
    extraHTTPHeaders['CF-Access-Client-Id'] = cfClientId;
    extraHTTPHeaders['CF-Access-Client-Secret'] = cfClientSecret;
  }

  const browser = await chromium.launch();

  if (setupMode === 'pro') {
    // --- CI setup-auth-pro: single Pro login (matrix job) ---
    const accountIndex = parseInt(process.env.AUTH_ACCOUNT_INDEX || '1');
    const email = `qa-team+pro${accountIndex}@example.com`;
    const statePath = path.join(AUTH_DIR, `pro_${accountIndex}.json`);

    // Deterministic jitter to spread KC load across the 20 Pro matrix runners
    await deterministicJitter(accountIndex, 20, 5000);

    console.log(`🔐 Authenticating BO Pro pro${accountIndex} (${email})...`);
    const proContext = await browser.newContext({
      ignoreHTTPSErrors: true,
      locale: 'fr-FR',
      extraHTTPHeaders,
    });
    const proPage = await proContext.newPage();
    await blockAnalytics(proPage);
    const proLoginPage = new LoginPage(proPage);
    await proLoginPage.gotoPro();
    await authenticateWithKCValidation(proPage, proLoginPage, email, password);
    await proContext.storageState({ path: statePath });
    await proContext.close();
    console.log(`✅ BO Pro pro${accountIndex} authenticated (KC session validated) → ${statePath}\n`);

  } else if (setupMode === 'interne') {
    // --- CI setup-auth-interne: single Interne login (matrix job) ---
    const accountIndex = parseInt(process.env.AUTH_ACCOUNT_INDEX || '1');
    const email = `qa-team+int${accountIndex}@example.com`;
    const statePath = path.join(AUTH_DIR, `interne_${accountIndex}.json`);

    // Deterministic jitter to spread KC load across the 20 Interne matrix runners
    await deterministicJitter(accountIndex, 20, 5000);

    console.log(`🔐 Authenticating BO Interne int${accountIndex} (${email})...`);
    const intContext = await browser.newContext({
      ignoreHTTPSErrors: true,
      locale: 'fr-FR',
      extraHTTPHeaders,
    });
    const intPage = await intContext.newPage();
    await blockAnalytics(intPage);
    const intLoginPage = new LoginPage(intPage);
    await intLoginPage.gotoInternal();
    await authenticateWithKCValidation(intPage, intLoginPage, email, password);
    await intContext.storageState({ path: statePath });
    await intContext.close();
    console.log(`✅ BO Interne int${accountIndex} authenticated (KC session validated) → ${statePath}\n`);

  } else {
    // --- Local: authenticate Pro and Interne in parallel ---
    console.log('🔐 Authenticating BO Pro + BO Interne in parallel...');

    const authPro = async () => {
      const proContext = await browser.newContext({
        ignoreHTTPSErrors: true,
        locale: 'fr-FR',
        extraHTTPHeaders,
      });
      const proPage = await proContext.newPage();
      await blockAnalytics(proPage);
      const proLoginPage = new LoginPage(proPage);
      await proLoginPage.gotoPro();
      await authenticateWithKCValidation(proPage, proLoginPage, users.user_pro.email, password);
      await proContext.storageState({ path: PRO_STATE });
      await proContext.close();
      console.log('✅ BO Pro authenticated (KC session validated)');
    };

    const authInterne = async () => {
      const intContext = await browser.newContext({
        ignoreHTTPSErrors: true,
        locale: 'fr-FR',
        extraHTTPHeaders,
      });
      const intPage = await intContext.newPage();
      await blockAnalytics(intPage);
      const intLoginPage = new LoginPage(intPage);
      await intLoginPage.gotoInternal();
      await authenticateWithKCValidation(intPage, intLoginPage, users.user_interne.email, password);
      await intContext.storageState({ path: INTERNE_STATE });
      await intContext.close();
      console.log('✅ BO Interne authenticated (KC session validated)');
    };

    await Promise.all([authPro(), authInterne()]);
    console.log('');
  }

  await browser.close();
}

export default globalSetup;
