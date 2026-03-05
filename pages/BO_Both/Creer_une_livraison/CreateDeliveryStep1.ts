import { Page, expect } from '@playwright/test';

export class CreateDeliveryStep1Page {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Pickup point input and selection
  async fillAndSelectPickupPoint(driveName: string) {
    await this.page.locator(`//input[@id='pickupPoint']`).fill(driveName);
    await this.page.locator(`//div[@title='` + driveName + `']`).click();
  }

  // Recipient search input and selection
  async fillAndSelectRecipient(recipientName: string) {
    await this.page.locator(`//input[@id='search']`).fill(recipientName);
    await this.page.locator(`//div[contains(@title,'` + recipientName + `')][1]`).click();
  }

  // Click the Create New Recipient button
  async clickCreateNewRecipient() {
    await this.page.locator(`//button[@data-transaction-name='button-deliveryCreation-CreateNewRcp']`).click();
  }

  // Click cancel create new recipient
  async clickCancelCreateNewRecipient() {
    await this.page.locator(`//button[@data-transaction-name='button-deliveryCreation-CancelNewRcp']`).click();
  }

  // Firstname input
  async fillRecipientFirstname(firstname: string) {
    await this.page.locator(`//input[@id='recipient_firstName']`).fill(firstname);
  }

  // Lastname input
  async fillRecipientLastname(lastname: string) {
    await this.page.locator(`//input[@id='recipient_lastName']`).fill(lastname);
  }

  // Email input
  async fillRecipientEmail(email: string) {
    await this.page.locator(`//input[@id='recipient_email']`).fill(email);
  }
  // Check "no email" checkbox
  async checkNoEmail() {
    await this.page.locator(`//input[@id='recipient_emailOptional']`).check();
  } 

  // Phone input
  async fillRecipientPhone(phone: string) {
    await this.page.locator(`//input[@id='recipient_phone']`).fill(phone);
  }

  // Address input and selection
  async fillAndSelectAddress(address: string, shortAddress: string) {
    await this.page.locator(`//input[@id='address_name']`).fill(address);
    await this.page.locator(`//div[contains(@title,'` + shortAddress + `')][1]`).click();
  }

  // Sélection présence ascenseur
  async selectElevatorPresence(isElevator: 'yes' | 'no' | 'dontknow') {
    await this.page.locator(`//div[@id='address_elevator']//input[@value='${isElevator}']/ancestor::label`).click();
  }

  // Floor number input
  async fillFloorNumber(floorNumber: string) {
    await this.page.locator(`//input[@id='address_floor']`).fill(floorNumber);
  }

  // Address additional informations input
  async fillAddressAdditionalInfo(addressAdditionalInfo: string) {
    await this.page.locator(`//textarea[@id='address_comment']`).fill(addressAdditionalInfo);
  }

  // Wait for distance loading
  async waitForDistanceLoading() {
    await expect(this.page.locator(`//div[contains(@class,'ant-flex css')]/span[contains(@class,'ant-typography css')]`)).toContainText('km');
  }

  // Validate step 1
  async validateStep1() {
    await this.page.locator(`//button[@data-transaction-name='button-deliveryCreationNew-CREATION_STEP_01']`).click();
  }
};