import { test as base, expect } from './base.fixture';
import { LoginPage } from '@pages/BO_Both/Authentification/LoginPage';
import { authenticateWithStateDetection } from '@utils/Helpers/authentication.helpers';
import { getShardProEmail, getShardInterneEmail } from '@utils/Helpers/shardAccount.helpers';
import { kcFallback } from '@utils/Helpers/kcFallback.helpers';
import { installKcDisconnectWatcher } from '@utils/Helpers/kcRetry.helpers';
import { connectPG } from '@utils/PG_Utils/pg.config';
import * as url from '@testdata/url.app.json';

export { expect, connectPG };

/**
 * Apply the currently active Keycloak cookies to the context.
 * Relevant after a previous test triggered a swap: Playwright still loads the
 * shard-assigned storageState at context creation, but the in-memory singleton
 * holds the new active cookies.
 */
async function applyActiveKcCookies(context: import('@playwright/test').BrowserContext, type: 'pro' | 'interne') {
  const cookies = kcFallback.getActiveCookies(type);
  if (cookies) {
    await context.clearCookies();
    await context.addCookies(cookies);
  }
}

/**
 * Authenticated test fixture for BO Pro
 */
export const testPro = base.extend({
  page: async ({ page, context }, use) => {
    const password = process.env.PASSWORDBO;
    if (!password) {
      throw new Error('Missing PASSWORDBO environment variable');
    }

    await applyActiveKcCookies(context, 'pro');
    await page.goto(url.url_pro);
    const loginPage = new LoginPage(page);
    await authenticateWithStateDetection(page, loginPage, getShardProEmail(), password);

    // Enable passive KC disconnect handling for the remainder of the test
    installKcDisconnectWatcher(page, 'pro').enable();

    await use(page);
  },
});

/**
 * Authenticated test fixture for BO Interne
 */
export const testInterne = base.extend({
  page: async ({ page, context }, use) => {
    const password = process.env.PASSWORDBO;
    if (!password) {
      throw new Error('Missing PASSWORDBO environment variable');
    }

    await applyActiveKcCookies(context, 'interne');
    await page.goto(url.url_interne);
    const loginPage = new LoginPage(page);
    await authenticateWithStateDetection(page, loginPage, getShardInterneEmail(), password);

    // Enable passive KC disconnect handling for the remainder of the test
    installKcDisconnectWatcher(page, 'interne').enable();

    await use(page);
  },
});
