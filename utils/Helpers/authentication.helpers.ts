import { Page } from '@playwright/test';
import { LoginPage } from '@pages/BO_Both/Authentification/LoginPage';

/**
 * Authentication Helper
 * Handles shard-based credential selection and smart retry logic with state detection
 *
 * This helper manages:
 * - Rotating credentials across 20 accounts based on shard index
 * - Smart authentication with Promise.race state detection
 * - Robust retry logic with page reload on timeout
 * - Account index retrieval for tests that need to reference authenticated user data
 */

const LOAD_TIMEOUT = 15000; // Aligned with createDeliveryAPI pattern

/**
 * Gets the shard-specific credentials for load balancing across multiple test accounts
 * Distributes 60 CI shards across 20 accounts using modulo rotation
 *
 * @param accountType - Type of account: 'pro' for BO Pro, 'internal' for BO Interne
 * @returns Object with username and password for the shard-specific account
 *
 * @example
 * // In CI with PLAYWRIGHT_SHARD_INDEX=15
 * getShardCredentials('pro') // Returns account 15 (LOGINBOPRO_15)
 *
 * // In CI with PLAYWRIGHT_SHARD_INDEX=45
 * getShardCredentials('internal') // Returns account 5 (LOGINBOINT_5) via modulo 20
 *
 * // Local execution (no PLAYWRIGHT_SHARD_INDEX)
 * getShardCredentials('pro') // Returns account 1 (LOGINBOPRO_1)
 */
export function getShardCredentials(accountType: 'pro' | 'internal'): { username: string; password: string } {
  // Get shard index from Playwright environment (CI) or default to 1 (local)
  const shardIndex = process.env.PLAYWRIGHT_SHARD_INDEX
    ? parseInt(process.env.PLAYWRIGHT_SHARD_INDEX)
    : 1;

  // Rotate across 20 accounts using modulo (shards 1-20 → accounts 1-20, shards 21-40 → accounts 1-20, etc.)
  const accountIndex = ((shardIndex - 1) % 20) + 1;

  // Build environment variable name based on account type and index
  const loginEnvVar = accountType === 'pro'
    ? `LOGINBOPRO_${accountIndex}`
    : `LOGINBOINT_${accountIndex}`;

  // Retrieve credentials from environment
  const username = process.env[loginEnvVar];
  const password = process.env.PASSWORDBO;

  // Validate credentials are available
  if (!username || !password) {
    throw new Error(
      `Missing credentials: ${loginEnvVar}=${username}, PASSWORDBO=${password ? '***' : 'undefined'}. ` +
      `Shard ${shardIndex} requires account ${accountIndex}.`
    );
  }

  return { username, password };
}

/**
 * Gets the current account index being used by this shard
 * Useful for tests that need to reference the authenticated user's data
 *
 * @returns Account index (1-20)
 *
 * @example
 * const accountIndex = getCurrentAccountIndex();
 * const expectedCreator = `Qa Interne${accountIndex}`;
 */
export function getCurrentAccountIndex(): number {
  const shardIndex = process.env.PLAYWRIGHT_SHARD_INDEX
    ? parseInt(process.env.PLAYWRIGHT_SHARD_INDEX)
    : 1;
  return ((shardIndex - 1) % 20) + 1;
}

/**
 * Detects the current page state using Promise.race
 * Works for both Pro and Internal (SSO button only exists for Internal)
 * @returns 'home' | 'keycloackerror' | 'login' | 'sso' | 'timeout'
 */
async function detectPageState(_page: Page, loginPage: LoginPage): Promise<'home' | 'keycloakerror' | 'login' | 'sso' | 'timeout'> {
  const result = await Promise.race([
    // Home page = already authenticated (checks for data loaded: delivery rows or empty table)
    loginPage.homePageDataLoaded()
      .waitFor({ timeout: LOAD_TIMEOUT })
      .then(() => 'home' as const)
      .catch(() => new Promise<never>(() => {})), // Never resolves, let timeout win

    // Keycloak error message
    loginPage.keycloakErrorMessage()
      .waitFor({ timeout: LOAD_TIMEOUT })
      .then(() => 'keycloakerror' as const)
      .catch(() => new Promise<never>(() => {})), // Never resolves, let timeout win
    
    // Login form = need to authenticate
    loginPage.loginFormUsername()
      .waitFor({ timeout: LOAD_TIMEOUT })
      .then(() => 'login' as const)
      .catch(() => new Promise<never>(() => {})), // Never resolves, let timeout win

    // Google SSO button = need to click it (Internal only)
    loginPage.googleSSO()
      .waitFor({ timeout: LOAD_TIMEOUT })
      .then(() => 'sso' as const)
      .catch(() => new Promise<never>(() => {})), // Never resolves, let timeout win

    // Timeout = unclear state → reload
    new Promise<'timeout'>((resolve) =>
      setTimeout(() => resolve('timeout'), LOAD_TIMEOUT)
    )
  ]);

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

    // OR timeout
    new Promise(resolve => setTimeout(resolve, LOAD_TIMEOUT))
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

    // OR timeout
    new Promise(resolve => setTimeout(resolve, LOAD_TIMEOUT))
  ]);
}

/**
 * Smart authentication with state detection and retry logic
 * Uses Promise.race to detect page state and act accordingly
 *
 * @param page - Playwright Page object
 * @param loginPage - LoginPage instance for basic actions
 * @param username - Username for authentication
 * @param password - Password for authentication
 * @throws Error if authentication fails after max retries
 */
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
        await page.reload();
        continue; // Re-check state after reload

      case 'timeout':
        timeoutCount++;
        if (timeoutCount >= maxTimeouts) {
          throw new Error(`Authentication failed after ${maxTimeouts} timeouts`);
        }
        await page.reload();
        continue; // Re-check state after reload
    }
  }
}