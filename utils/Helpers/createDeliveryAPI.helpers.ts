/**
 * Helper function to create deliveries via API
 * This is a high-level helper that orchestrates the delivery creation process
 */

import { Page } from '@playwright/test';
import { getAPIConfig } from '@utils/API_Utils/api.config';
import { createDelivery } from '@utils/API_Utils/delivery.post';
import { buildDeliveryPayload, Drive, Recipient, OrderInfo } from '@utils/API_Utils/payload.builder';
import { selectTable } from '@utils/DB_Utils/selectData.db';
import * as drives from '@testdata/drives.json';
import { newRecipient } from '@testdata/new_recipients';
import { TestDataRegistry } from '@utils/DB_Utils/testDataRegistry';
import { LoginPage } from '@pages/BO_Both/Authentification/LoginPage';

/**
 * Recipient data from the drop_off table
 */
/**
 * Column order follows the drop_off table structure
 */
export interface DropOffRecipient {
  first_name: string;
  last_name: string;
  full_name: string;
  address: string;
  phone: string;
  email: string;
  street_address_1: string;
  street_address_2: string;
  zip_code: string;
  city: string;
  country: string;
  location_name: string;
  recipient_additional_info: string;
  floor: number;
  elevator: number;
  hash: string;
  location_type: string;
  door: string;
  internal_uuid: string;
}

/**
 * Result of createDeliveryAPI containing delivery ID and recipient data from DB
 */
export interface DeliveryAPIResult {
  id: number;
  recipient: DropOffRecipient;
}

/**
 * Options for createDeliveryAPI
 */
export interface CreateDeliveryAPIOptions {
  drive?: Drive;
  recipient?: Recipient;
  orderInfo?: OrderInfo;
}

/**
 * Creates a delivery via GenericV2 API
 *
 * Uses a Faker-generated recipient by default for test isolation (each test gets its own recipient).
 * Pass a specific recipient from users.json when you need a known user (e.g., pagination tests).
 *
 * @param options - Optional overrides for drive, recipient and orderInfo
 * @returns Delivery ID and recipient data (internal_uuid, name, phone, email) from the drop_off table
 *
 * @example
 * ```typescript
 * // Default: new unique recipient each time
 * const { id, recipient } = await createDeliveryAPI();
 *
 * // With specific drive
 * const { id } = await createDeliveryAPI({ drive: drives.drive_fleur1 });
 *
 * // With known user (e.g., for pagination/search tests)
 * const { id } = await createDeliveryAPI({ drive: drives.drive_alim1, recipient: users.recipient_interne });
 *
 * // Override order info only
 * const { id } = await createDeliveryAPI({ orderInfo: { frozenFood: true } });
 * ```
 */
export async function createDeliveryAPI(
  options: CreateDeliveryAPIOptions = {}
): Promise<DeliveryAPIResult> {
  const drive = options.drive ?? drives.drive_alim1;
  const actualRecipient = options.recipient ?? newRecipient();
  const orderInfo = options.orderInfo ?? {};

  // Get API configuration
  const config = getAPIConfig();

  // Build payload using testdata and optional overrides
  const payload = buildDeliveryPayload(drive, actualRecipient, orderInfo);

  // Send API request to create delivery (retry with jitter for MySQL deadlock handling)
  // Note: shard-level deterministic jitter is applied in global-setup.ts to stagger test starts
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

  // Get delivery ID and drop_off_id from database
  const errandData = await selectTable(
    'errand',
    [{ field: 'reference', value: reference }],
    ['id', 'drop_off_id']
  );
  const deliveryId = errandData[0].id as number;
  const dropOffId = errandData[0].drop_off_id as number;

  // Get recipient data from drop_off table
  const dropOffData = await selectTable(
    'drop_off',
    [{ field: 'id', value: dropOffId }],
    ['first_name', 'last_name', 'full_name', 'address', 'phone', 'email',
     'street_address_1', 'street_address_2', 'zip_code', 'city', 'country',
     'location_name', 'recipient_additional_info', 'floor', 'elevator',
     'hash', 'location_type', 'door', 'internal_uuid']
  );
  const recipientData = dropOffData[0] as DropOffRecipient;

  // Auto-register for cleanup
  TestDataRegistry.registerErrand(deliveryId);

  console.log(`Delivery ID retrieved: ${deliveryId}`);

  return { id: deliveryId, recipient: recipientData };
}

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
    ]).catch(() => 'timeout');

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
  //const deliveryURL = `${baseUrl}/detail/${deliveryId}`;

  // Navigate to the delivery details page
  await page.goto(deliveryURL);
  await waitForDeliveryPageData(page, deliveryURL);

  return deliveryURL;
}
