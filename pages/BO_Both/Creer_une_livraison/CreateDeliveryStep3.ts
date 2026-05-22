import { Page } from '@playwright/test';

export class CreateDeliveryStep3Page {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // block title Date and delivery slot
  dateDeliveryBlockLocator() {
    return this.page.locator(`//div[text()='Date et créneau de livraison']`);
  }

  // Select Tomorrow for delivery date
  async selectDeliveryDateTomorrow() {
    await this.page.locator(`//strong[text()='Demain']/ancestor::label`).check();
  }

  // delivery start time global
  async clickDeliveryStartTimeGlobal() {
    await this.page.locator(`//input[@data-testid="TimePicker-DeliveryTimeForm-startDate"]`).click();
  }

  // delivery start time hour (10)
  async clickDeliveryStartTimeHour() {
    await this.page.locator(`//li[contains(@class, "ant-picker-time-panel-cell") and @data-value='8']/following-sibling::li[@data-value='10']`).click();
  }

  // delivery start time minutes (00)
  async clickDeliveryStartTimeMinutes() {
    await this.page.locator(`//li[contains(@class, "ant-picker-time-panel-cell") and @data-value='8']/parent::ul/following-sibling::ul/li[@data-value='0']`).click();
  }

  // Validate step 3
  async validateStep3() {
    await this.page.locator(`//button[@data-transaction-name='button-deliveryCreationNew-CREATION_STEP_03']`).click();
  }
};