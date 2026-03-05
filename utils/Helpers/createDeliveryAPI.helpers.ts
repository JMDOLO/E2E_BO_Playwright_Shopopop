/**
 * Helper function to create deliveries via API
 * This is a high-level helper that orchestrates the delivery creation process
 */

import { Page } from '@playwright/test';
import { getAPIConfig } from '@utils/API_Utils/api.config';
import { createDelivery } from '@utils/API_Utils/delivery.post';
import { buildDeliveryPayload, Drive, Recipient, OrderInfo } from '@utils/API_Utils/payload.builder';
import { selectTable } from '@utils/DB_Utils/selectData.db';
import * as users from '@testdata/users.json';
import * as drives from '@testdata/drives.json';
import { TestDataRegistry } from '@utils/DB_Utils/testDataRegistry';
import { LoginPage } from '@pages/BO_Both/Authentification/LoginPage';

/**
 * Creates a delivery via GenericV2 API
 * This is a faster alternative to creating deliveries through the UI
 *
 * IMPORTANT: This function uses the GenericV2 API endpoint (/v2/deliveries)
 * which properly creates:
 * 1. An entry in the `errand` table with the delivery information
 * 2. An entry in the `drop_off` table with recipient and address information
 * 3. The `errand.drop_off_id` field is populated with the ID from the `drop_off` table
 *
 * Without a valid `drop_off_id`, the delivery will NOT be visible in the mobile application.
 *
 * @param drive - Optional drive/pickup point data from testdata/drives.json (defaults to drives.drive_alim1)
 * @param recipient - Optional recipient data from testdata/users.json (defaults to users.recipient_pro)
 * @param orderInfo - Optional order information (reference, amount, size, additionalInfos)
 * @returns The delivery ID from the database
 *
 * @example
 * ```typescript
 * import { createDeliveryAPI } from '@utils/Helpers/createDeliveryAPI.helpers';
 * import * as drives from '@testdata/drives.json';
 * import * as users from '@testdata/users.json';
 *
 * // With all defaults (drive_alim1 and recipient_pro)
 * const deliveryId = await createDeliveryAPI();
 *
 * // With specific drive only
 * const deliveryId2 = await createDeliveryAPI(drives.drive_alim2);
 *
 * // With specific recipient
 * const deliveryId3 = await createDeliveryAPI(
 *   drives.drive_alim1,
 *   users.recipient_interne
 * );
 *
 * // With custom values for specific test
 * const deliveryId4 = await createDeliveryAPI(
 *   drives.drive_alim1,
 *   users.recipient_pro,
 *   { amount: "500", size: "M", reference: "TESTREF1" }
 * );
 * ```
 */
export async function createDeliveryAPI(
  drive: Drive = drives.drive_alim1,
  recipient: Recipient = users.recipient_pro,
  orderInfo: OrderInfo = {}
): Promise<number> {
  // Get API configuration
  const config = getAPIConfig();

  // Build payload using testdata and optional overrides
  const payload = buildDeliveryPayload(drive, recipient, orderInfo);

  // Send API request to create delivery (retry with jitter for MySQL deadlock handling)
  const MAX_ATTEMPTS = 5;
  let createResponse!: Awaited<ReturnType<typeof createDelivery>>;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    createResponse = await createDelivery(
      config.url,
      payload,
      config.partnerId,
      config.apiKey,
      config.cfClientId,
      config.cfClientSecret
    );

    // 200/204 = created, 409 = already created on a previous attempt (same reference)
    if (createResponse.status === 204 || createResponse.status === 200 || createResponse.status === 409) break;

    if (attempt < MAX_ATTEMPTS) {
      // Random jitter (1-4s) to avoid thundering herd on MySQL deadlocks
      const jitter = 1000 + Math.random() * 3000;
      await new Promise(resolve => setTimeout(resolve, jitter));
    }
  }

  if (createResponse.status !== 204 && createResponse.status !== 200 && createResponse.status !== 409) {
    throw new Error(
      `Failed to create delivery after ${MAX_ATTEMPTS} attempts: Status ${createResponse.status}, Response: ${JSON.stringify(createResponse.data)}`
    );
  }

  const reference = payload.delivery.order.reference;

  // Wait for the delivery to be processed and written to the database
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Get delivery ID from database using the reference
  const deliveryData = await selectTable(
    'errand',
    [{ field: 'reference', value: reference }],
    ['id']
  );
  const deliveryId = deliveryData[0].id;

  // Auto-register pour cleanup
  TestDataRegistry.registerErrand(deliveryId);

  console.log(`Delivery ID retrieved: ${deliveryId}`);

  return deliveryId;
}

/**
 * Build delivery URL and navigate to it
 * This is the recommended function to use after createDeliveryAPI() when you want to navigate to the delivery
 *
 * @param page - Playwright Page object
 * @param deliveryId - The delivery ID
 * @returns Promise that resolves with the delivery URL
 *
 * @example
 * ```typescript
 * // Simple usage - create delivery and navigate to it
 * const deliveryId = await createDeliveryAPI();
 * await buildAndGotoDeliveryURL(page, deliveryId);
 *
 * // One-liner if you don't need the delivery ID
 * await buildAndGotoDeliveryURL(page, await createDeliveryAPI());
 *
 * // When you need the ID for other operations (DB updates)
 * const deliveryId = await createDeliveryAPI();
 * await updateErrandTable(deliveryId, [...]);
 * await buildAndGotoDeliveryURL(page, deliveryId);
 *
 * // When you need the URL for assertions
 * const deliveryURL = await buildAndGotoDeliveryURL(page, await createDeliveryAPI());
 * await expect(page).toHaveURL(deliveryURL);
 * ```
 */
/**
 * Waits for delivery detail page data to load with retry/reload
 * Used by both API flow (buildAndGotoDeliveryURL) and UI flow (waitForDeliveryCreationAndRetry)
 *
 * @param page - Playwright Page object (must already be on /delivery/{id})
 * @param deliveryURL - Delivery URL for goto-based retries (avoids reload redirecting to home)
 */
export async function waitForDeliveryPageData(page: Page, deliveryURL: string): Promise<void> {
  const LOAD_TIMEOUT = 15000; // 15 seconds per attempt
  const MAX_RETRIES = 3; // Maximum reload attempts

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Wait for delivery data to load (distance with calculated number) or detect errors
    const distanceLoaded = page.locator('span', { hasText: /\d\s*km/ }).first();
    const errorMessage = new LoginPage(page).keycloakErrorMessage();

    const result = await Promise.race([
      distanceLoaded.waitFor({ timeout: LOAD_TIMEOUT }).then(() => 'success'),
      errorMessage.waitFor({ timeout: LOAD_TIMEOUT }).then(() => 'error'),
      new Promise<string>(resolve => setTimeout(() => resolve('timeout'), LOAD_TIMEOUT))
    ]);

    if (result === 'success') return;

    // Retry if not the last attempt: goto preserves correct URL even after redirect to home
    if (attempt < MAX_RETRIES - 1) {
      await page.goto(deliveryURL);
    }
  }

  throw new Error('Failed to load delivery page data');
}

export async function buildAndGotoDeliveryURL(page: Page, deliveryId: number): Promise<string> {
  // Build the delivery URL (inline logic from buildDeliveryURL)
  const baseUrl = new URL(page.url()).origin;
  const deliveryURL = `${baseUrl}/delivery/${deliveryId}`;

  // Navigate to the delivery details page
  await page.goto(deliveryURL);
  await waitForDeliveryPageData(page, deliveryURL);

  return deliveryURL;
}
