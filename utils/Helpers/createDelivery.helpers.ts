import { Page } from '@playwright/test';
import { CreateDeliveryStep1Page } from '@pages/BO_Both/Creer_une_livraison/CreateDeliveryStep1';
import { CreateDeliveryStep2Page } from '@pages/BO_Both/Creer_une_livraison/CreateDeliveryStep2';
import { CreateDeliveryStep3Page } from '@pages/BO_Both/Creer_une_livraison/CreateDeliveryStep3';
import { CreateDeliveryStep4Page } from '@pages/BO_Both/Creer_une_livraison/CreateDeliveryStep4';
import { Toaster } from '@pages/BO_Both/SuccessMessages';
import { generateOrderInformation } from '@testdata/order_information';
import { Drive, Recipient } from '@utils/API_Utils/payload.builder';
import { selectTable } from '@utils/DB_Utils/selectData.db';
import { TestDataRegistry } from '@utils/DB_Utils/testDataRegistry';
import { waitForDeliveryPageData } from '@utils/Helpers/createDeliveryAPI.helpers';
import * as url from '@testdata/url.app.json';

/**
 * Error thrown when delivery creation fails and the whole flow must be retried from step 1
 */
export class RetryFromScratchError extends Error {
  constructor(message: string) {
    super(`Delivery creation failed, retrying from scratch: ${message}`);
    this.name = 'RetryFromScratchError';
  }
}

/**
 * Wraps a delivery creation flow with retry on transient creation errors.
 * On RetryFromScratchError (reload already done), waits for step 1 to be visible and retries.
 */
export async function withCreationRetry(
  step1: CreateDeliveryStep1Page,
  fn: () => Promise<void>
): Promise<void> {
  const maxRetries = 1;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) await step1.buttonStep1().waitFor({ state: 'visible' });
      await fn();
      return;
    } catch (error) {
      if (error instanceof RetryFromScratchError && attempt < maxRetries) continue;
      throw error;
    }
  }
}

/**
 * Interface for order information (optional parameters)
 */
interface OrderInfo {
  reference?: string;
  amount?: string;
  size?: string;
  additionalInfos?: string;
  minimalTransportModeUI?: string;
}

/**
 * Creates a complete delivery for BO Pro with an existing recipient
 * Includes Step 4 (final validation specific to BO Pro)
 *
 * @param page - Playwright Page object
 * @param drive - Drive/pickup point data
 * @param recipient - Recipient data
 * @param orderInfo - Optional order information (reference, amount, size, additionalInfos)
 * @returns Object with delivery URL and ID
 *
 * @example
 * ```typescript
 * import { createDeliveryForPro } from '@utils/delivery.helpers';
 * import * as drives from '@testdata/drives.json';
 * import * as users from '@testdata/users.json';
 *
 * // Avec valeurs par défaut
 * const { url: deliveryURL, id: deliveryId } = await createDeliveryForPro(
 *   page,
 *   drives.drive_alim1,
 *   users.recipient_pro
 * );
 *
 * // Avec valeurs personnalisées
 * const { url: deliveryURL2, id: deliveryId2 } = await createDeliveryForPro(
 *   page,
 *   drives.drive_alim1,
 *   users.recipient_pro,
 *   { amount: "500", size: "M" }
 * );
 * ```
 *
 * @prerequisite Page must be on the delivery creation form (Step 1)
 */
export async function createDeliveryForPro(
  page: Page,
  drive: Drive,
  recipient: Recipient,
  orderInfo: OrderInfo = {}
): Promise<DeliveryCreationResult> {
  return createDeliveryWithExistingRecipient(page, drive, recipient, orderInfo, true);
}

/**
 * Creates a complete delivery for BO Interne with an existing recipient
 * Skips Step 4 (not present in BO Interne workflow)
 *
 * @param page - Playwright Page object
 * @param drive - Drive/pickup point data
 * @param recipient - Recipient data
 * @param orderInfo - Optional order information (reference, amount, size, additionalInfos)
 * @returns Object with delivery URL and ID
 *
 * @example
 * ```typescript
 * import { createDeliveryForInternal } from '@utils/delivery.helpers';
 * import * as drives from '@testdata/drives.json';
 * import * as users from '@testdata/users.json';
 *
 * const { url: deliveryURL, id: deliveryId } = await createDeliveryForInternal(
 *   page,
 *   drives.drive_alim1,
 *   users.recipient_interne
 * );
 * ```
 *
 * @prerequisite Page must be on the delivery creation form (Step 1)
 */
export async function createDeliveryForInternal(
  page: Page,
  drive: Drive,
  recipient: Recipient,
  orderInfo: OrderInfo = {}
): Promise<DeliveryCreationResult> {
  return createDeliveryWithExistingRecipient(page, drive, recipient, orderInfo, false);
}

/**
 * Private helper function that creates a delivery with optional Step 4
 * Use createDeliveryForPro() or createDeliveryForInternal() instead
 *
 * @private
 */
async function createDeliveryWithExistingRecipient(
  page: Page,
  drive: Drive,
  recipient: Recipient,
  orderInfo: OrderInfo,
  includeStep4: boolean
): Promise<DeliveryCreationResult> {
  // Generate fresh random defaults per call, with ability to override
  const defaults = generateOrderInformation();
  const {
    reference = defaults.reference,
    amount = defaults.amount,
    size = defaults.size,
    additionalInfos = defaults.additionalInfos,
    minimalTransportModeUI = defaults.minimalTransportModeUI
  } = orderInfo;

  const maxRetries = 1;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // After reload, wait for step 1 form to be ready
        const step1 = new CreateDeliveryStep1Page(page);
        await step1.buttonStep1().waitFor({ state: 'visible' });
      }

      // Step 1: Pickup point and recipient selection
      // Selecting the recipient pre-fills the address and validates /addresses/distance
      // with retry — no need to re-trigger autocomplete via fillAndSelectAddress here.
      const step1 = new CreateDeliveryStep1Page(page);
      await step1.fillAndSelectPickupPoint(drive.name);
      await step1.fillAndSelectRecipient(recipient.email);
      await step1.validateStep1();

      // Step 2: Order information
      const step2 = new CreateDeliveryStep2Page(page);
      await step2.fillReference(reference);
      await step2.fillAmount(amount);
      await step2.checkOrderSize(size);
      await step2.checkTransport(minimalTransportModeUI);
      await step2.fillAdditionalInfos(additionalInfos);
      await step2.validateStep2();

      // Step 3: Delivery date
      const step3 = new CreateDeliveryStep3Page(page);
      await step3.selectDeliveryDateTomorrow();
      await step3.clickDeliveryStartTimeGlobal();
      await step3.clickDeliveryStartTimeHour();
      await step3.clickDeliveryStartTimeMinutes();
      await step3.dateDeliveryBlockLocator().click();
      // Capture URL before creation trigger to detect redirect to home
      const urlBeforeValidation = page.url();
      await step3.validateStep3();

      // Step 4: Final validation (BO Pro only) and wait for delivery creation
      if (includeStep4) {
        const step4 = new CreateDeliveryStep4Page(page);
        await step4.validateStep4();
        return await waitForDeliveryCreationAndRetry(page, reference, true, urlBeforeValidation);
      }

      return await waitForDeliveryCreationAndRetry(page, reference, false, urlBeforeValidation);
    } catch (error) {
      if (error instanceof RetryFromScratchError && attempt < maxRetries) {
        continue;
      }
      throw error;
    }
  }

  // Unreachable but TypeScript needs it
  throw new Error('Delivery creation failed after all retries');
}

/**
 * Return type for delivery creation
 */
export interface DeliveryCreationResult {
  url: string;
  id: number;
}

/**
 * Waits for delivery creation with automatic retry on "too many attempts" error
 * Used in tests that detail all creation steps (BO-1273 style tests)
 *
 * Delivery ID is resolved via DB lookup on the reference (no toaster click required),
 * then the page navigates directly to /delivery/{id} after the app's redirect to home settles.
 *
 * @param page - Playwright Page object
 * @param reference - Delivery reference used in Step 2 (unique, used for DB lookup)
 * @param isStep4 - True if using Step4 (BO Pro), false if using Step3 (BO Interne)
 * @param urlBeforeValidation - URL captured before the validation click, used to wait for redirect stability before goto
 * @returns Object with delivery URL and ID
 *
 * @example
 * ```typescript
 * // For BO Interne (after step 3 validation)
 * const urlBeforeValidation = page.url();
 * await step3.validateStep3();
 * const { url, id } = await waitForDeliveryCreationAndRetry(page, orderInfo.reference, false, urlBeforeValidation);
 *
 * // For BO Pro (after step 4 validation)
 * const urlBeforeValidation = page.url();
 * await step3.validateStep3();
 * await step4.validateStep4();
 * const { url, id } = await waitForDeliveryCreationAndRetry(page, orderInfo.reference, true, urlBeforeValidation);
 * ```
 */
export async function waitForDeliveryCreationAndRetry(
  page: Page,
  reference: string,
  isStep4: boolean,
  urlBeforeValidation: string
): Promise<DeliveryCreationResult> {
  const toaster = new Toaster(page);

  while (true) {
    // Wait for any notification message to appear (success, tooMuchTry, or inProgress), then read it
    await toaster.waitForAnyToaster();
    const messageText = await toaster.getToasterMessageText();

    if (messageText.includes(toaster.inProgress)) {
      // Wait for inProgress to disappear and loop again
      await page.waitForTimeout(6000);
      continue;
    }

    if (messageText.includes(toaster.success)) {
      // Resolve delivery ID via DB lookup — the "Voir la livraison" <a> has no href (onClick-only)
      const rows = await selectTable('errand', [{ field: 'reference', value: reference }], ['id']);
      const deliveryId = rows[0].id as number;

      const baseURL = isStep4 ? url.url_pro : url.url_interne;
      const deliveryURL = `${baseURL}/delivery/${deliveryId}`;

      // Wait for the app's own redirect to settle before goto, to avoid navigation race
      await page.waitForURL(url => url.href !== urlBeforeValidation, { timeout: 5000 });

      await page.goto(deliveryURL);
      await waitForDeliveryPageData(page, deliveryURL);

      TestDataRegistry.registerErrand(deliveryId);
      return { url: deliveryURL, id: deliveryId };
    }

    if (messageText.includes(toaster.tooMuchTry) || toaster.errors.some(err => messageText.includes(err))) {
      await page.reload();
      throw new RetryFromScratchError(messageText);
    }

    // Unexpected message - throw error
    throw new Error(`Unexpected delivery creation message: "${messageText}"`);
  }
}