import { BrowserContext, Page } from '@playwright/test';
import { LoginPage } from '@pages/BO_Both/Authentification/LoginPage';

/**
 * Authentication Helper
 * Handles smart retry logic with state detection for Keycloak login
 *
 * Used by:
 * - global-setup.ts for generating storageState files
 * - LoginPage.authenticateProWithEnv() / authenticateInternalWithEnv() for no-auth tests
 */

const LOAD_TIMEOUT = 15000; // Aligned with createDeliveryAPI pattern
const KC_DOMAIN = 'auth-sso-qa.engineering.shopopop.com';
const REQUIRED_KC_COOKIES = ['KEYCLOAK_SESSION', 'KEYCLOAK_IDENTITY'];

/**
 * Detects the current page state using Promise.race
 * Works for both Pro and Internal (SSO button only exists for Internal)
 * @returns 'home' | 'keycloackerror' | 'login' | 'sso' | 'timeout'
 */
async function detectPageState(_page: Page, loginPage: LoginPage): Promise<'home' | 'keycloakerror' | 'login' | 'sso' | 'timeout'> {
  const result = await Promise.any([
    // Home page = already authenticated (checks for data loaded: delivery rows or empty table)
    loginPage.homePageDataLoaded()
      .waitFor({ timeout: LOAD_TIMEOUT })
      .then(() => 'home' as const),

    // Keycloak error message
    loginPage.keycloakErrorMessage()
      .waitFor({ timeout: LOAD_TIMEOUT })
      .then(() => 'keycloakerror' as const),

    // Login form = need to authenticate
    loginPage.loginFormUsername()
      .waitFor({ timeout: LOAD_TIMEOUT })
      .then(() => 'login' as const),

    // Google SSO button = need to click it (Internal only)
    loginPage.googleSSO()
      .waitFor({ timeout: LOAD_TIMEOUT })
      .then(() => 'sso' as const),
  ]).catch(() => 'timeout' as const);

  return result;
}

/**
 * Clicks Google SSO button and waits for proof of change
 * Race between: (URL AND button) OR login form OR home page OR timeout
 */
async function clickGoogleSSOAndWait(page: Page, loginPage: LoginPage) {
  const currentURL = page.url();
  const ssoButton = loginPage.googleSSO();
  const loginForm = loginPage.loginFormUsername();
  const homePage = loginPage.homePageDataLoaded();
  const keycloakError = loginPage.keycloakErrorMessage();

  await ssoButton.click();

  await Promise.race([
    // Combined: URL changes AND button disappears
    Promise.all([
      page.waitForURL(url => url.href !== currentURL, { timeout: LOAD_TIMEOUT }),
      ssoButton.waitFor({ state: 'hidden', timeout: LOAD_TIMEOUT })
    ]).catch(() => {}),

    // OR login form appears
    loginForm.waitFor({ timeout: LOAD_TIMEOUT }).catch(() => {}),

    // OR home page appears
    homePage.waitFor({ timeout: LOAD_TIMEOUT }).catch(() => {}),

    // OR Keycloak error appears
    keycloakError.waitFor({ timeout: LOAD_TIMEOUT }).catch(() => {}),
  ]);
}

/**
 * Fills credentials and submits, then waits for proof of change
 * Race between: (URL AND form hidden) OR home page OR timeout
 */
async function fillCredentialsAndWait(page: Page, loginPage: LoginPage, username: string, password: string) {
  const currentURL = page.url();
  const loginForm = loginPage.loginFormUsername();
  const homePage = loginPage.homePageDataLoaded();
  const keycloakError = loginPage.keycloakErrorMessage();

  await loginPage.fillUsername(username);
  await loginPage.fillPassword(password);
  await loginPage.loginButton().click();

  await Promise.race([
    // Combined: URL changes AND form disappears
    Promise.all([
      page.waitForURL(url => url.href !== currentURL, { timeout: LOAD_TIMEOUT }),
      loginForm.waitFor({ state: 'hidden', timeout: LOAD_TIMEOUT })
    ]).catch(() => {}),

    // OR home page appears
    homePage.waitFor({ timeout: LOAD_TIMEOUT }).catch(() => {}),

    // OR Keycloak error appears
    keycloakError.waitFor({ timeout: LOAD_TIMEOUT }).catch(() => {}),
  ]);
}

/**
 * Checks if the browser context has valid Keycloak session cookies.
 * Called inside the retry loop on timeout: if KC already set session cookies
 * (e.g. page load stalled after KC redirect), we can short-circuit —
 * the storageState will be usable by shards for auto-authentication.
 */
export async function hasKeycloakCookies(context: BrowserContext): Promise<boolean> {
  const cookies = await context.cookies();
  const kcCookies = cookies.filter(c => c.domain.includes(KC_DOMAIN));
  const foundNames = kcCookies.map(c => c.name);
  const hasAll = REQUIRED_KC_COOKIES.every(name => foundNames.includes(name));

  if (hasAll) {
    console.log(`✅ KC cookies found: ${foundNames.join(', ')}`);
  } else {
    const missing = REQUIRED_KC_COOKIES.filter(name => !foundNames.includes(name));
    console.log(`❌ KC cookies missing: ${missing.join(', ')} (found: ${foundNames.join(', ') || 'none'})`);
  }

  return hasAll;
}

export async function authenticateWithStateDetection(
  page: Page,
  loginPage: LoginPage,
  username: string,
  password: string
): Promise<void> {
  const maxTimeouts = 3;
  let timeoutCount = 0;

  // Wait for potential redirect to complete (e.g., to Keycloak)
  // Use Promise.race to avoid blocking if no redirect happens
  const initialURL = page.url();

  await Promise.race([
    // Redirect happens (URL changes)
    page.waitForURL(url => url.href !== initialURL, { timeout: 5000 })
      .catch(() => new Promise<never>(() => {})), // Never resolves if no redirect

    // No redirect after 5s (already authenticated or direct login page)
    new Promise(resolve => setTimeout(resolve, 5000))
  ]);

  // Infinite loop - only timeouts are counted, not normal steps
  while (true) {
    const state = await detectPageState(page, loginPage);

    switch (state) {
      case 'home':
        return;

      case 'login':
        await fillCredentialsAndWait(page, loginPage, username, password);
        continue; // Re-check state

      case 'sso':
        await clickGoogleSSOAndWait(page, loginPage);
        continue; // Re-check state

      case 'keycloakerror':
        await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
        continue; // Re-check state after reload

      case 'timeout':
        // Page didn't reach a known state, but KC may have already set session cookies
        if (await hasKeycloakCookies(page.context())) {
          return; // KC session established — storageState will be usable
        }
        timeoutCount++;
        if (timeoutCount >= maxTimeouts) {
          throw new Error(`Authentication failed after ${maxTimeouts} timeouts`);
        }
        await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
        continue; // Re-check state after reload
    }
  }
}
