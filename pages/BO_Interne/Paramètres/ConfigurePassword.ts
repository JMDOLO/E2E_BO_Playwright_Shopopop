import { Page } from '@playwright/test';

export class ConfigurePassword {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Fill Pro Email
  async fillProEmail(email: string) {
    await this.page.locator(`//input[@id='email']`).fill(email);
  }

  // Click Submit Button
  async clickSubmitButton() {
    await this.page.locator(`//button[@type='submit']`).click();
  }

};