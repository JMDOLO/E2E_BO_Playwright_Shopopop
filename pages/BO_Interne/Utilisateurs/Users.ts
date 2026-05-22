import { Page } from '@playwright/test';

export class SearchUsers {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  readonly userTypes: string[] = ['all', 'deliverer', 'recipient'];

  // Fill Name Field (firstname and/or lastname)
  async fillNameField(name: string) {
    await this.page.locator(`//input[@id="name-userSearch"]`).fill(name);
  }

  // Fill Phone Field
  async fillPhoneField(phone: string) {
    await this.page.locator(`//input[@data-testid="phoneCode-inputPhoneNumber"]`).fill(phone);
  }

  // Fill E-mail Field
  async fillEmailField(email: string) {
    await this.page.locator(`//input[@id="email-userSearch"]`).fill(email);
  }

  // Select User Type Filter
  async selectUserType(userTypes: string) {
    await this.page.locator(`//input[@value='${userTypes}']/ancestor::label`).click();
  }

  // Click Search Button
  async clickSearchButton() {
    await this.page.locator(`//button[./span[text()='Rechercher']]`).click();
  }
  
  // All Name Results Locator
  allNameResults() {
    return this.page.locator(`//td[contains(@class,'ant-table-row-expand-icon-cell')]/following-sibling::td[1]`);
  }

  // All Phone Results Locator
  allPhoneResults() {
    return this.page.locator(`//td[contains(@class,'ant-table-row-expand-icon-cell')]/following-sibling::td[2]`);
  }

  // All Email Results Locator
  allEmailResults() {
    return this.page.locator(`//td[contains(@class,'ant-table-row-expand-icon-cell')]/following-sibling::td[3]`);
  }

  // All User Type Results Locator
  allUserTypeResults() {
    return this.page.locator(`//td[contains(@class,'ant-table-row-expand-icon-cell')]/following-sibling::td[4]`);
  }

  // "Voir le profil" link on the row matching a given email
  viewProfileByEmail(email: string) {
    return this.page.locator(`//tr[./td[text()='${email}']]//a[normalize-space()='Voir le profil']`);
  }
};