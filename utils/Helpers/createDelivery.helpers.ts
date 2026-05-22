import { Page } from '@playwright/test';
import { CreateDeliveryStep1Page } from '@pages/BO_Both/Creer_une_livraison/CreateDeliveryStep1';
import { CreateDeliveryStep2Page } from '@pages/BO_Both/Creer_une_livraison/CreateDeliveryStep2';
import { CreateDeliveryStep3Page } from '@pages/BO_Both/Creer_une_livraison/CreateDeliveryStep3';
import { CreateDeliveryStep4Page } from '@pages/BO_Both/Creer_une_livraison/CreateDeliveryStep4';
import { DeliverySuccessMessage } from '@pages/BO_Both/SuccessMessages';
import { orderInformation } from '@testdata/order_information';
import { TestDataRegistry } from '@utils/DB_Utils/testDataRegistry';
import { waitForDeliveryPageData } from '@utils/Helpers/createDeliveryAPI.helpers';
import * as url from '@testdata/url.app.json';

/**
 * Interface for drive data
 */
interface Drive {
  name: string;
  id: string;
  trade_type: string;
  trade_name: string;
}

/**
 * Interface for recipient data
 */
interface Recipient {
  name: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  address: string;
  shortaddress: string;
  street: string;
  zipCode: string;
  city: string;
  type: string;
  floor: number;
  elevator: boolean;
  id: number;
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
  // Use orderInformation from testdata as default, with ability to override
  const {
    reference = orderInformation.reference,
    amount = orderInformation.amount,
    size = orderInformation.size,
    additionalInfos = orderInformation.additionalInfos,
    minimalTransportModeUI = orderInformation.minimalTransportModeUI
  } = orderInfo;

  // Step 1: Pickup point and recipient selection
  const step1 = new CreateDeliveryStep1Page(page);
  await step1.fillAndSelectPickupPoint(drive.name);
  await step1.fillAndSelectRecipient(recipient.email);
  await step1.fillAndSelectAddress(recipient.address, recipient.shortaddress);
  await step1.waitForDistanceLoading();
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
    // BO Pro: Wait for delivery creation with retry using Step 4
    return waitForDeliveryCreationAndRetry(page, step4, true, urlBeforeValidation);
  }

  // BO Interne: Wait for delivery creation with retry using Step 3
  return waitForDeliveryCreationAndRetry(page, step3, false, urlBeforeValidation);
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
 * @param page - Playwright Page object
 * @param lastValidationStep - The last step page object (Step3 for Interne, Step4 for Pro)
 * @param isStep4 - True if using Step4 (BO Pro), false if using Step3 (BO Interne)
 * @param urlBeforeValidation - URL captured before the validation click, used to detect redirect to home
 * @returns Object with delivery URL and ID
 *
 * @example
 * ```typescript
 * // For BO Interne (after step 3 validation)
 * const urlBeforeValidation = page.url();
 * await step3.validateStep3();
 * const { url, id } = await waitForDeliveryCreationAndRetry(page, step3, false, urlBeforeValidation);
 *
 * // For BO Pro (after step 4 validation)
 * const urlBeforeValidation = page.url();
 * await step3.validateStep3();
 * await step4.validateStep4();
 * const { url, id } = await waitForDeliveryCreationAndRetry(page, step4, true, urlBeforeValidation);
 * ```
 */
export async function waitForDeliveryCreationAndRetry(
  page: Page,
  lastValidationStep: CreateDeliveryStep3Page | CreateDeliveryStep4Page,
  isStep4: boolean = false,
  urlBeforeValidation: string
): Promise<DeliveryCreationResult> {
  const message = new DeliverySuccessMessage(page);

  while (true) {
    // Wait for any notification message to appear (success, tooMuchTry, or inProgress)
    await page.waitForSelector(`//div[@class='ant-notification-notice-message']`, { timeout: 15000 });

    // Get the toaster message text immediately
    const messageText = await message.getDeliveryMessageText();

    if (messageText.includes(message.inProgress)) {
      // Wait for inProgress to disappear and loop again
      await page.waitForTimeout(6000);
      continue;
    }

    if (messageText.includes(message.success)) {
      // Wait for redirect to home before clicking "Voir la livraison"
      // (avoids race: clicking toaster before redirect causes navigation back to home)
      await page.waitForURL(url => url.href !== urlBeforeValidation, { timeout: 5000 });

      // Now on home page: click toaster link, wait for navigation, then wait for data to load
      const deliveryURL = await message.clickViewDeliveryAndGetURL();
      await waitForDeliveryPageData(page, deliveryURL);

      // Extract delivery ID from URL for cleanup
      const baseURL = isStep4 ? url.url_pro : url.url_interne;
      const deliveryIdString = deliveryURL.replace(`${baseURL}/delivery/`, '');
      const deliveryId = parseInt(deliveryIdString, 10);

      // Guard clause: handle error case first
      if (isNaN(deliveryId)) {
        throw new Error(`Failed to extract delivery ID from URL: ${deliveryURL}`);
      }

      // Happy path: valid delivery ID
      TestDataRegistry.registerErrand(deliveryId);
      return { url: deliveryURL, id: deliveryId };
    }

    if (messageText.includes(message.tooMuchTry) || message.errors.some(err => messageText.includes(err))) {
      // Transient error (rate limiting or server 502/500) - wait 40s then retry validation
      await page.waitForTimeout(40000);

      // Retry the last validation step
      if (isStep4) {
        await (lastValidationStep as CreateDeliveryStep4Page).validateStep4();
      } else {
        await (lastValidationStep as CreateDeliveryStep3Page).validateStep3();
      }
      continue;
    }

    // Unexpected message - throw error
    throw new Error(`Unexpected delivery creation message: "${messageText}"`);
  }
}