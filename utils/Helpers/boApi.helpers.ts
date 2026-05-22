import { Page } from '@playwright/test';
import * as urls from '@testdata/url.app.json';

/**
 * Intercepts a BO API request during navigation to capture the Bearer token.
 * The page must already be authenticated (via fixture or storageState).
 *
 * @param page - Playwright page (already authenticated)
 * @param url - URL to navigate to (triggers API calls carrying the Bearer token)
 * @returns The full Authorization header value (e.g. "Bearer eyJ...")
 */
export async function captureBearerTokenAndNavigate(page: Page, url: string): Promise<string> {
  const tokenPromise = page.waitForRequest(
    (req) => req.url().startsWith(urls.url_bo_api) && req.headers()['authorization']?.startsWith('Bearer '),
  );

  await page.goto(url);

  const interceptedRequest = await tokenPromise;
  return interceptedRequest.headers()['authorization'];
}
