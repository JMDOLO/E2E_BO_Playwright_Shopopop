import { Page, expect } from '@playwright/test';

export class InternalDeliveryDetails {
  readonly page: Page;

  // Elevator options
  readonly elevatorOptions = ['yes', 'no', 'dontknow']; 
  
  // Order size options
  readonly orderSizeOptions = ["XS - Sac à dos (0 pack)", "S - Sac cabas (1-2 packs)", "M - 1/2 chariot (3-8 packs)", "L - 1 chariot (9-15 packs)", "XL - 2 chariots (16-29 packs)", "XXL - +2 chariots (>\u00a029 packs)"];

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
    return this.page.locator(`//span[text()='Date de livraison']/following::span[1]/following::del`);
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
    return this.page.locator(`//span[text()='Créneau de livraison']/following::span[text()='Pourboire']/following-sibling::span[1]`);
  }
  
  // total tips increase value
  totalTipsIncreaseValue() {
    return this.page.locator(`//span[text()='Créneau de livraison']/following::span[text()='Pourboire']/following-sibling::span[2]`);
  }

  // Distance value
  distanceValue() {
    return this.page.locator(`//span[text()='Distance']/following::span[2]`);
  }

  // Cotransporter block
  private readonly CTPBlock = `//div[text()='Cotransporteur']/ancestor::div[@class='ant-card-head']/following-sibling::div`;
  // Fill and select CTP
  async fillAndSelectCTP(CTPName: string) {
    await this.page.locator(`//input[@id='search-shopper-delivery-detail-delivery']`).fill(CTPName);
    await this.page.locator(`//span[./b[contains(text(), '${CTPName}')]]`).click();
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
    return this.page.locator(`//div[text()='Cotransporteur']/following::a[1]`);
  }

  // Recipient block
  private readonly recipientBlock = `//span[text()='Destinataire']/ancestor::div[@class='ant-card-head']/following-sibling::div`;
  // Firstname, lastname of recipient
  recipientFirstAndLastName() {
    return this.page.locator(`${this.recipientBlock}/descendant::span[text()='Prénom, Nom']/following::span[1]`);
  }

  // Recipient phone number
  recipientPhoneNumber() {
    return this.page.locator(`${this.recipientBlock}/descendant::span[text()='Numéro de téléphone']/following::span[1]`);
  }
  // Copy recipient phone number button
  copyRecipientPhoneNumberButton() {
    return this.page.locator(`${this.recipientBlock}/descendant::span[text()='Numéro de téléphone']/following::button[1]`);
  }

  // Recipient email
  recipientEmail() {
    return this.page.locator(`${this.recipientBlock}/descendant::span[text()='E-mail']/following::span[1]`);
  }

  // Recipient profile link
  recipientProfileLink() {
    return this.page.locator(`//span[text()='Destinataire']/following::a[1]`);
  }

  // Delivery adress block
  //Search and fill address
  searchAddressLocator() {
    return this.page.locator(`//input[@id='address_name']/following::span[1]`);
  }
   async fillAndSelectAddress(newAddress: string) {
    await this.page.locator(`//input[@id='address_name']`).fill(newAddress);
    await this.page.locator(`//div[contains(@title,'${newAddress}')]`).click();
    // Wait until the dropdown closes (the options are no longer visible)
    await expect(this.page.locator(`//div[contains(@title,'${newAddress}')]`)).toBeHidden();
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

  // Delivery distance
  deliveryDistance() {
    return this.page.locator(`//div[contains(@class,'ant-flex css')]/span[contains(@class,'ant-typography css')]`);
  }
  // Wait for distance loading
  async waitForDistanceLoading() {
    await expect(this.deliveryDistance()).toContainText('km');
  }

  // Delivery address details
  deliveryAddressDetails() {
    return this.page.locator(`//textarea[@id='address_comment']`);
  }

  // Pickup point block
  private readonly pickupPointBlock = `//div[text()='Point de retrait']/ancestor::div[@class='ant-card-head']/following-sibling::div`;
  // Fill and select CTP
  inputPickupPoint() {
    return this.page.locator(`//input[@id='search-drive-delivery-detail-delivery']`);
  }
  async fillAndSelectPickupPoint(pickupPointName: string) {
    await this.inputPickupPoint().fill(pickupPointName);
    await this.page.locator(`//span[contains(text(), '${pickupPointName}')]`).click();
  }

  // Pickup point phone number
  pickupPointPhoneNumber() {
    return this.page.locator(`${this.pickupPointBlock}/descendant::span[text()='Numéro de téléphone']/following::span[1]`);
  }
  // Click to copy pickup point phone number
  async clickToCopyPickupPointPhoneNumber() {
    await this.page.locator(`${this.pickupPointBlock}/descendant::span[text()='Numéro de téléphone']/following::button[1]`).click();
  }

  // Click Pickup point information sheet button
  async clickPickupPointInformationSheet() {
    await this.page.locator(`//div[text()='Point de retrait']/ancestor::div[@class='ant-card-head']//button[1]`).click();
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
    return this.page.locator(`//input[@id='reference-delivery-detail-delivery']`);
  }

  // Order amount
  orderAmount() {
    return this.page.locator(`//input[@id='order-amount-delivery-detail-delivery']`);
  }
  // Increase order amount button
  async clickIncreaseOrderAmountButton() {
    // Hover the input field to reveal the increment buttons
    await this.orderAmount().hover();
    // Click on the increase button
    await this.page.locator(`//label[@for='orderAmount']/following::span[@aria-label='up'][1]`).click();
  }

  // Order size value
  orderSizeValue() {
    return this.page.locator(`//input[@id='articles-amount-delivery-detail-delivery']/following::span[1]`);
  }
  // Order size dropdown to click
  async clickOrderSizeDropdown() {
    await this.page.locator(`//input[@id='articles-amount-delivery-detail-delivery']/following::span[1]`).click();
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
    return this.page.locator(`//textarea[@id='store-comment-delivery-detail-delivery']`);
  }
};
