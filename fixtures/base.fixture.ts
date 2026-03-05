import { test as base, expect } from '@playwright/test';

export { expect };

export const test = base.extend({
  page: async ({ page, context }, use) => {
    // 1. Bypass Content Security Policy (CSP) restrictions in tests
    await context.setExtraHTTPHeaders({
      'Content-Security-Policy': '',
    });

    // 2. Add Cloudflare Access headers for API requests
    const cfClientId = process.env.CF_ACCESS_CLIENT_ID_PARTNERS;
    const cfClientSecret = process.env.CF_ACCESS_CLIENT_SECRET_PARTNERS;

    if (cfClientId && cfClientSecret) {
      await context.setExtraHTTPHeaders({
        'CF-Access-Client-Id': cfClientId,
        'CF-Access-Client-Secret': cfClientSecret,
      });
    }

    // 3. Block Google Analytics and Google Tag Manager requests
    await page.route('**/*', (route) => {
      const url = route.request().url();
      if (
        url.includes('google-analytics.com') ||
        url.includes('googletagmanager.com') ||
        url.includes('analytics.google.com') ||
        url.includes('/gtag/') ||
        url.includes('/ga.js') ||
        url.includes('/analytics.js') ||
        url.includes('/gtm.js')
      ) {
        route.abort();
      } else {
        route.continue();
      }
    });

    // 4. Add localStorage initialization for all pages in the context
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
