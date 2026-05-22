import { test as base, expect } from '@playwright/test';
import { disconnectAllPG } from '@utils/PG_Utils/pg.config';

export { expect };

export const test = base.extend<{ _pgCleanup: void }>({
  _pgCleanup: [async ({}, use) => {
    await use();
    await disconnectAllPG();
  }, { auto: true }],

  page: async ({ page, context }, use) => {
    // Add Cloudflare Access headers for API requests
    const cfClientId = process.env.CF_ACCESS_CLIENT_ID_PARTNERS;
    const cfClientSecret = process.env.CF_ACCESS_CLIENT_SECRET_PARTNERS;

    if (cfClientId && cfClientSecret) {
      await context.setExtraHTTPHeaders({
        'CF-Access-Client-Id': cfClientId,
        'CF-Access-Client-Secret': cfClientSecret,
      });
    }

    // Block Google Analytics and Google Tag Manager requests.
    // Targeted patterns (instead of '**/*' with internal filter) so non-analytics requests
    // bypass Playwright's network stack and benefit from Chromium's HTTP disk cache —
    // critical to avoid re-downloading the 2.2M SPA bundle on KC redirect mid-test.
    const blockedPatterns = [
      '**/google-analytics.com/**',
      '**/googletagmanager.com/**',
      '**/analytics.google.com/**',
      '**/gtag/**',
      '**/ga.js',
      '**/analytics.js',
      '**/gtm.js',
    ];
    for (const pattern of blockedPatterns) {
      await page.route(pattern, (route) => route.abort());
    }

    // Add localStorage initialization for all pages in the context
    // This skips the tutorial modals by marking them as completed
    await context.addInitScript(() => {
      localStorage.setItem(
        'completedTours',
        '["helpMenu","dateFilter","recipientSearchStep","deliveryCreationTimeSlot","updateDeliveryTimeSlot"]'
      );
    });

    await use(page);
  },
});
