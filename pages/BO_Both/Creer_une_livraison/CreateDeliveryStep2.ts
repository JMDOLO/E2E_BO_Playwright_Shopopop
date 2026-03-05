import { Page } from '@playwright/test';

export class CreateDeliveryStep2Page {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Fill order reference
  async fillReference(reference: string) {
    await this.page.locator(`//input[@id='reference']`).fill(reference);
  }

  // Fill order amount
  async fillAmount(amount: string) {
    await this.page.locator(`//input[@id='amount']`).fill(amount);
  }

  // Check order size
  async checkOrderSize(size: string) {
    await this.page.locator(`//input[@value='${size}']/ancestor::label`).check();
  }

  // Select transport mode
  async checkTransport(transport: string) {
    await this.page.locator(`//span[text()='${transport}']/ancestor::label`).check();
  }

  // Fill additional information
  async fillAdditionalInfos(additionalInfos: string) {
    await this.page.locator(`//textarea[@id='additionalInfos']`).fill(additionalInfos);
  }

  // Validate step 2
  async validateStep2() {
    await this.page.locator(`//button[@data-transaction-name='button-deliveryCreationNew-CREATION_STEP_02']`).click();
  }
};