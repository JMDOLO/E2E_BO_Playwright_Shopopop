import { Page } from '@playwright/test';

export class CreateDeliveryStep4Page {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Validate step 4
  async validateStep4() {
    await this.page.locator(`//button[@data-transaction-name='button-deliveryCreationNew-CREATION_STEP_04']`).click();
  }
};