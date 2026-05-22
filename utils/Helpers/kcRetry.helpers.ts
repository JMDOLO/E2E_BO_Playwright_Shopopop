/**
 * Keycloak disconnect detection & cookie swap
 *
 * Two complementary signals detect a mid-test disconnect and trigger a cookie
 * swap from the per-shard pool:
 *
 * - Interne: the SPA rerenders the login page in place (no KC redirect on the
 *   main frame). Detected via the login illustration asset request
 *   (`pc-bo-login.svg`).
 * - Pro: full redirect to the Keycloak login screen. Detected via the
 *   main-frame navigation hitting `/login-actions/authenticate`.
 *
 * An `intentionalKcNav` flag guards both signals so tests that navigate to KC
 * on purpose (logout flows, password setup via action tokens) don't trigger a
 * swap. The flag is set once a request is sent to `/protocol/openid-connect/
 * logout` (detected via the `request` event — the 302 redirect back to the
 * app is transparent and never surfaces as a `framenavigated` on the logout
 * URL). It stays set for the rest of the test — a logout leaves the user on a
 * login view (KC redirects back to the app which renders it), so we can't use
 * "back to app origin" as a reset signal. The watcher is scoped per page, so
 * the flag resets at the next test's fixture setup.
 *
 * No cooldown between swaps: once a goto completes and the app still shows
 * the login view (fallback account also disconnected), the next signal must
 * be able to trigger another swap immediately to try another pool account.
 * Natural caps remain: the `swapping` flag blocks re-entry during an active
 * goto, and `kcFallback.swap` throws when the 5-account pool is exhausted.
 *
 * CI-only: no-op in local mode. Must be enabled AFTER the initial auth flow
 * so setup redirects don't count as disconnects.
 */

import type { BrowserContext, Page } from '@playwright/test';
import { kcFallback } from '@utils/Helpers/kcFallback.helpers';
import type { AuthType } from '@utils/Helpers/kcFallback.helpers';

const LOGIN_ASSET = 'pc-bo-login.svg';
const PRO_LOGIN_PATH = '/login-actions/authenticate';
const LOGOUT_PATH = '/protocol/openid-connect/logout';
const APP_ORIGINS = [
  'app-qa3.engineering.shopopop.com',
  'backoffice-qa3.engineering.shopopop.com',
];

function isAppUrl(url: string): boolean {
  return APP_ORIGINS.some((origin) => url.includes(origin));
}

async function swapCookies(context: BrowserContext, type: AuthType): Promise<void> {
  const newCookies = kcFallback.swap(type);
  await context.clearCookies();
  await context.addCookies(newCookies);
}

/**
 * Install a passive watcher that swaps cookies when a KC disconnect is
 * detected mid-test. Returns an `enable` function; call it once the initial
 * authentication flow is complete.
 */
export function installKcDisconnectWatcher(page: Page, type: AuthType): { enable: () => void } {
  if (!process.env.CI) return { enable: () => {} };

  let enabled = false;
  let swapping = false;
  let intentionalKcNav = false;
  // Last app URL seen on the main frame. Seeded with the current page URL (the
  // watcher is installed post-auth, so we're on the app origin at install time)
  // and refreshed on every app-origin navigation. Used as the target when
  // resuming the test after a swap — on Pro the main frame is on the KC login
  // URL when we detect the disconnect, so we can't just reload.
  let lastAppUrl: string = page.url();

  const trySwap = (reason: string) => {
    if (!enabled || swapping || intentionalKcNav) return;
    swapping = true;
    (async () => {
      try {
        await swapCookies(page.context(), type);
        console.log(`[kcDisconnect] ${type} swap triggered by ${reason}`);
        // Navigate back to the last app URL so check-sso re-evaluates with the
        // fresh cookies and the current test resumes in-place. The pending
        // assertion/navigation unblocks when the app rerenders authenticated.
        await page.goto(lastAppUrl);
      } catch (err) {
        console.error(`[kcDisconnect] ${type} swap failed (${reason}): ${err instanceof Error ? err.message : err}`);
      } finally {
        swapping = false;
      }
    })();
  };

  // Main-frame navigation: track app URL, detect Pro disconnect.
  page.on('framenavigated', (frame) => {
    if (frame !== page.mainFrame()) return;
    const url = frame.url();

    if (isAppUrl(url)) {
      lastAppUrl = url;
      return;
    }

    if (url.includes(PRO_LOGIN_PATH)) {
      trySwap('pro login-actions nav');
    }
  });

  // Request listener: sets the intentional-logout flag (the 302 KC redirect is
  // transparent so framenavigated never sees the logout URL) and detects the
  // Interne SPA rerender on disconnect.
  page.on('request', (req) => {
    const url = req.url();
    if (url.includes(LOGOUT_PATH)) {
      intentionalKcNav = true;
      return;
    }
    if (url.includes(LOGIN_ASSET)) trySwap('login illustration request');
  });

  return { enable: () => { enabled = true; } };
}
