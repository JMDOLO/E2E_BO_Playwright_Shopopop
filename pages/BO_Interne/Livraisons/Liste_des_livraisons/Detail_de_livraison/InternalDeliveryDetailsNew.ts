import { Page, expect } from '@playwright/test';
import { isResponseValid } from '@utils/Helpers/apiResponse.helpers';

export class InternalDeliveryDetails {
  readonly page: Page;

  // Elevator options
  readonly elevatorOptions = ['yes', 'no', 'dontknow']; 
  
  // Order size options
  readonly orderSizeOptions = ["XS - Sac à dos (0 pack)", "S - Sac cabas (1 pack)", "M - 1 Demi chariot (2-5 packs)", "L - 1 chariot (6-11 packs)", "XL - 2 chariots (12-22 packs)", "XXL - +2 chariots (> 22 packs)"];

  constructor(page: Page) {
    this.page = page;
  }

  // Overall delivery details
  // Delivery date
  deliveryDate() {
    return this.page.locator(`//span[text()='Date de livraison']`);
  }

  // Delivery date value
  deliveryDateValue() {
    return this.page.locator(`//span[text()='Date de livraison']/following::span[1]`);
  }

  // Initial delivery date value
  initialDeliveryDateValue() {
    return this.page.locator(`//span[text()='Date de livraison']/following::span[./del]`);
  }

  // Delivery date change counter
  deliveryDateChangeCounter() {
    return this.page.locator(`//span[contains(@class, 'ant-typography') and span[@aria-label='calendar']]`);
  }

  // Time slot locator
  timeSlot() {
    return this.page.locator(`//span[text()='Créneau de livraison']/following::span[1]`);
  }

  // Tips value
  tipsValue() {
    return this.page.locator(`//div[./span[text()='Pourboire']]/following-sibling::div`);
  }
  
  // total tips increase value
  totalTipsIncreaseValue() {
    return this.page.locator(`//span[text()='Créneau de livraison']/following::span[text()='Pourboire']/following-sibling::span[2]`);
  }

  // Distance value
  distanceValue() {
    return this.page.locator(`//span[text()='Distance']/following::span[1]`);
  }

  // Cotransporter block
  private readonly CTPBlock = `//span[text()='Cotransporteur']/ancestor::div[@class='ant-card-head']/following-sibling::div`;
  // Fill and select CTP
  async fillAndSelectCTP(CTPName: string) {
    await this.page.locator(`//input[@id='delivery-detail-search-deliverer']`).fill(CTPName);
    await this.page.locator(`//div[@class='ant-select-item-option-content' and contains(., 'Test Auto')]`).click();
  }

  // Validation modal for adding CTP
    // Click save button in adding CTP modal
    async clickSaveButtonInAddingCTPModal() {
      await this.page.locator(`//div[@role='dialog']//button[./span[text()='Valider']]`).click();
    }
  
  // Firstname, lastname of CTP
  ctpFirstAndLastName() {
    return this.page.locator(`${this.CTPBlock}/descendant::span[text()='Prénom, Nom']/following::span[1]`);
  }

  // CTP phone number
  ctpPhoneNumber() {
    return this.page.locator(`${this.CTPBlock}/descendant::span[text()='Numéro de téléphone']/following::span[1]`);
  }
  // Click to copy CTP phone number
  async clickToCopyCtpPhoneNumber() {
    await this.page.locator(`${this.CTPBlock}/descendant::span[text()='Numéro de téléphone']/following::button[1]`).click();
  }

  // CTP email
  ctpEmail() {
    return this.page.locator(`${this.CTPBlock}/descendant::span[text()='E-mail']/following::span[1]`);
  }

  // CTP profile link
  ctpProfileLink() {
    return this.page.locator(`//span[text()='Cotransporteur']/following::a[1]`);
  }

  // Recipient block
  // Base locator for delivery with validated status
  private readonly recipientBlock = `//span[text()='Destinataire']/ancestor::div[@class='ant-card-head']/following-sibling::div`;
  
  // Recipient firstname (delivery with ongoing status)
  recipientFirstName() {
    return this.page.locator(`//input[@id='recipient_firstName']`);
  }
  // Recipient lastname (delivery with ongoing status)
  recipientLastName() {
    return this.page.locator(`//input[@id='recipient_lastName']`);
  }
  // Recipient firstname and lastname (delivery with validated status)
  recipientFirstAndLastName() {
    return this.page.locator(`${this.recipientBlock}/descendant::span[text()='Prénom, Nom']/following::span[1]`);
  }

  // Recipient email (delivery with ongoing status)
  recipientEmailOngoing() {
    return this.page.locator(`//input[@id='recipient_email']`);
  }
  // Check recipient no email (delivery with ongoing status)
  recipientNoEmail() {
    return this.page.locator(`//label[.//input[@id='recipient_noMail']]`);
  }
  // Recipient email (delivery with validated status)
  recipientEmailValidated() {
    return this.page.locator(`${this.recipientBlock}/descendant::span[text()='E-mail']/following::span[1]`);
  }
  
  // Recipient phone number (delivery with ongoing status)
  recipientPhoneNumberOngoing() {
    return this.page.locator(`//input[@id='recipient-phone-delivery-detail']`);
  }
  // Copy recipient phone number button (delivery with ongoing status)
  copyRecipientPhoneNumberButtonOngoing() {
    return this.page.locator(`//input[@id='recipient-phone-delivery-detail']/following::button[1]`);
  }
  // Recipient phone number (delivery with validated status)
  recipientPhoneNumberValidated() {
    return this.page.locator(`${this.recipientBlock}/descendant::span[text()='Numéro de téléphone']/following::span[1]`);
  }
  // Copy recipient phone number button (delivery with validated status)
  copyRecipientPhoneNumberButtonValidated() {
    return this.page.locator(`${this.recipientBlock}/descendant::span[text()='Numéro de téléphone']/following::button[1]`);
  }

  // Recipient profile link (delivery with ongoing status)
  recipientProfileLinkOngoing() {
    return this.page.locator(`//div[text()='Destinataire']/following::a[1]`);
  }
  // Recipient profile link (delivery with validated status)
  recipientProfileLinkValidated() {
    return this.page.locator(`//span[text()='Destinataire']/following::a[1]`);
  }

  // Delivery adress block
  //Search and fill address
  searchAddressLocator() {
    return this.page.locator(`//input[@id='address_name']/following::span[1]`);
  }
  // Address input and selection — validates both autocomplete and distance APIs, waits for distance UI, with retry on failure.
  // pressSequentially (vs fill) emits native keyboard events so React onChange fires per char and Ant useDebounce (400ms) reliably
  // re-triggers /autocomplete on retry. The preceding click() puts Ant Select in search mode (previous value greyed out as
  // placeholder, search input empty) so the new typing does not concatenate with the previous attempt's value.
  async fillAndSelectAddress(newAddress: string) {
    // Click the ant-select-selector parent (input's first ancestor div) to reliably activate Ant search mode and focus the input.
    // On retry, click the Ant × button to trigger the onClear handler → resets React state (searchTerm) so next pressSequentially
    // fires a fresh /autocomplete call. (Playwright's native clear() empties the input visually but Ant's internal searchTerm stays,
    // so no new API call.)
    const addressSelector = this.page.locator(`//input[@id='address_name']/ancestor::div[1]`);
    const addressInput = this.page.locator(`//input[@id='address_name']`);
    const addressClearButton = this.page.locator(`//input[@id='address_name']/ancestor::div[@class='ant-select-selector']/following-sibling::span[@class='ant-select-clear']`);
    const resultOption = this.page.locator(`//div[contains(@title,'${newAddress}')]`);
    const maxRetries = 2;

    // Scroll input into view to prevent option click from overlapping the save button (flaky)
    await addressSelector.evaluate(el => el.scrollIntoView({ block: 'center' }));

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      await addressSelector.click();
      if (attempt > 0) await addressClearButton.click();

      const autocompleteResponse = this.page.waitForResponse(
        (res) => res.url().includes('/addresses/autocomplete'),
        { timeout: 10000 }
      ).catch(() => null);

      const distanceResponse = this.page.waitForResponse(
        (res) => res.url().includes('/addresses/distance'),
        { timeout: 10000 }
      ).catch(() => null);

      await addressInput.pressSequentially(newAddress, { delay: 30 });
      if (!(await isResponseValid(await autocompleteResponse))) continue;

      await resultOption.click();
      if (!(await isResponseValid(await distanceResponse))) continue;

      // API OK → wait for distance UI to render before returning (prevents save/UI race)
      await this.waitForDistanceLoading();
      return;
    }

    throw new Error(`Autocomplete or Distance API did not return expected status after ${maxRetries + 1} attempts`);
  }

  // Original address
  originalAddress() {
    return this.page.locator(`//span[text()='Adresse originale']/following::span[1]`);
  }

  // Current elevator
  currentElevator() {
    return this.page.locator(`//div[@data-testid='elevator-radio']/label[contains(@class,'checked')]//input`);
  }

  // Change elevator
  async checkElevator(elevator: string) {
    await this.page.locator(`//input[@name='address_elevator' and @value='${elevator}']/ancestor::label`).check();
  }

  // Floor value input field
  floorInputField() {
    return this.page.locator(`//input[@id='address_floor']`);
  }
  // Increase floor button
  async clickIncreaseFloorButton() {
    // Hover the input field to reveal the increment buttons
    await this.floorInputField().hover();
    // Click on the increase button
    await this.page.locator(`//label[@for='address_floor']/following::span[@aria-label='up'][1]`).click();
  }

  // Delivery distance XPath
  private readonly deliveryDistanceXPath = `//span[contains(text(),'Distance de la livraison')]`;

  // Delivery distance
  deliveryDistance() {
    return this.page.locator(this.deliveryDistanceXPath);
  }
  // Wait for distance loading
  async waitForDistanceLoading() {
    await expect(this.deliveryDistance()).toContainText(/\d\s*km/);
  }
  // Delivery distance error message
  deliveryDistanceErrorMessage() {
    return this.page.locator(`${this.deliveryDistanceXPath}/following-sibling::span`);
  }

  // Delivery address details
  deliveryAddressDetails() {
    return this.page.locator(`//textarea[@id='address_comment']`);
  }

  // Pickup point block
  private readonly pickupPointBlock = `//div[text()='Point de retrait']/ancestor::div[@class='ant-card-head']/following-sibling::div`;
  // Fill and select CTP
  inputPickupPoint() {
    return this.page.locator(`//input[@id='search-drive-delivery-detail-new']`);
  }

  // Current pickup point value
  currentPickupPoint() {
    return this.page.locator(`//span[./input[@id='search-drive-delivery-detail-new']]/following-sibling::span`);
  }

  // Pickup point selection — validates distance API, waits for distance UI, with retry on failure (no Google autocomplete here)
  async fillAndSelectPickupPoint(pickupPointName: string) {
    const inputPickupPoint = this.inputPickupPoint();
    const resultOption = this.page.locator(`//b[contains(text(),'${pickupPointName}')]/ancestor::div[@class='ant-select-item-option-content']`);
    const maxRetries = 2;

    // Scroll input into view to prevent option click from overlapping the save button (flaky)
    await inputPickupPoint.evaluate(el => el.scrollIntoView({ block: 'center' }));

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      // Clear only if search input has leftover value (previous attempt)
      if (await inputPickupPoint.inputValue()) await inputPickupPoint.clear();

      const distanceResponse = this.page.waitForResponse(
        (res) => res.url().includes('/addresses/distance'),
        { timeout: 10000 }
      ).catch(() => null);

      await inputPickupPoint.fill(pickupPointName);
      await resultOption.click();

      if (!(await isResponseValid(await distanceResponse))) continue;

      // API OK → wait for distance UI to render before returning (prevents save/UI race)
      await this.waitForDistanceLoading();
      return;
    }

    throw new Error(`Distance API did not return 2xx/304 after ${maxRetries + 1} attempts`);
  }

  // Pickup point phone number
  pickupPointPhoneNumber() {
    return this.page.locator(`${this.pickupPointBlock}/descendant::span[text()='Numéro de téléphone']/following::span[1]`);
  }
  // Click to copy pickup point phone number
  async clickToCopyPickupPointPhoneNumber() {
    await this.page.locator(`${this.pickupPointBlock}/descendant::span[text()='Numéro de téléphone']/following::button[1]`).click();
  }

  // Pickup point information sheet button
  pickupPointInformationSheet() {
    return this.page.locator(`//div[text()='Point de retrait']/ancestor::div[@class='ant-card-head']//a[1]`);
  }

  // Drive link in modal
  driveLinkinModal() {
    return this.page.locator(`//strong[text()='Accédez à la fiche point de retrait']/ancestor::div[@class='ant-modal-header']/following-sibling::div/div[3]`);
  }

  // Copy pickup point link button
  copyPickupPointLinkButton() {
    return this.page.locator(`//strong[text()='Accédez à la fiche point de retrait']/ancestor::div[@class='ant-modal-header']/following::button[1]`);
  }

  // Order block
  // Order reference
  orderReference() {
    return this.page.locator(`//input[@id='delivery-detail-order-reference']`);
  }

  // Order amount
  orderAmount() {
    return this.page.locator(`//input[@id='delivery-detail-order-amount']`);
  }
  // Increase order amount button
  async clickIncreaseOrderAmountButton() {
    // Hover the input field to reveal the increment buttons
    await this.orderAmount().hover();
    // Click on the increase button
    await this.page.locator(`//label[@for='amount']/following::span[@aria-label='up'][1]`).click();
  }

  // Order size value
  orderSizeValue() {
    return this.page.locator(`//input[@id='delivery-detail-order-size']/following::span[1]`);
  }
  // Order size dropdown to click
  async clickOrderSizeDropdown() {
    await this.orderSizeValue().click();
  }
  // Select order size
  async selectOrderSize(size: string) {
    await this.page.locator(`//div[contains(@title,'${size}')]`).click();
  }

  // Current transport value
  transportValue() {
    return this.page.locator(`//label[@title='Moyen de transport minimum recommandé']/following::span[@class='ant-select-selection-item']`);
  }

  // Click transport dropdown
  async clickTransportDropdown() {
    await this.page.locator(`//label[@title='Moyen de transport minimum recommandé']/following::div[@class='ant-select-selector']`).click();
  }

  // Select a transport option
  async selectTransport(transport: string) {
    await this.page.locator(`//label[@title='Moyen de transport minimum recommandé']/following::div[contains(@class,'ant-select-item') and @title='${transport}']`).click();
  }

  // Order characteristic (frozen)
  // Frozen checkbox
  frozenCheckbox() {
    return this.page.locator(`//input[@value='frozen']/ancestor::label`);
  }

  // Store comment (pickup point comment)
  storeComment() {
    return this.page.locator(`//textarea[@id='delivery-detail-order-comment']`);
  }
};
