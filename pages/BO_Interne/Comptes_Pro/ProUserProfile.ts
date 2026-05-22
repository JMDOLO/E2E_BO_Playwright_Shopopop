import { Page } from '@playwright/test';

export class ProUserProfile {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Reset Password button and validate
  async resetPasswordButton() {
    await this.page.locator(`//button[contains(.,'Réinitialiser le mot de passe')]`).click();
    await this.page.locator(`//button[contains(.,'Oui')]`).click();
  }

  // Account info field labels
  readonly accountInfoLabels = {
    firstname: 'firstName',
    lastname: 'lastName',
    email: 'email',
    phone: 'phone',
  };

  // Account info field value by label
  accountInfoValue(label: string) {
    return this.page.locator(`//input[@id='${label}']`);
  }

  // Associated store card by drive ID
  associatedStoreCard(driveId: number) {
    return this.page.locator(`//span[contains(.,'${driveId}')]`);
  }
}
