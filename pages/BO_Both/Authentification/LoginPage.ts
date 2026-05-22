import { Page } from '@playwright/test';
import * as url from '@testdata/url.app.json';
import * as users from '@testdata/users.json';
import { authenticateWithStateDetection } from '@utils/Helpers/authentication.helpers';

export class LoginPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Navigate to BO Interne application
  async gotoInternal() {
    await this.page.goto(url.url_interne);
  }

  // Navigate to BO Pro application
  async gotoPro() {
    await this.page.goto(url.url_pro);
  }

  // Keycloack error message locator (used to detect if we are on error page after failed login)
  keycloakErrorMessage() {
    return this.page.locator('//*[contains(text(),"Erreur inattendue lors du traitement de la requête")]');
  }

  // Google SSO button locator
  googleSSO() {
    return this.page.locator(`//span[@class='gsi-material-button-contents']`);
  }

  // Login form username field locator
  loginFormUsername() {
    return this.page.locator(`//input[@id='username']`);
  }

  // Home page data loaded indicator (OR between delivery row and empty table)
  homePageDataLoaded() {
    return this.page.locator(`//span[@aria-label='arrow-right'] | //div[@class='ant-empty-description']`).first();
  }

  // Fill username
  async fillUsername(username: string) {
    await this.loginFormUsername().fill(username);
  }

  // Fill password
  async fillPassword(password: string) {
    await this.page.locator(`//input[@id='password']`).fill(password);
  }

  // Login button locator
  loginButton() {
    return this.page.locator(`//input[@id='kc-login']`);
  }

  /**
   * Authenticate to BO Interne with environment credentials
   * Uses users.json email + PASSWORDBO env var
   * Used by no-auth tests (BO-1143, BO-2625)
   */
  async authenticateInternalWithEnv() {
    const password = process.env.PASSWORDBO;
    if (!password) {
      throw new Error('Missing PASSWORDBO environment variable');
    }
    await this.gotoInternal();
    await authenticateWithStateDetection(this.page, this, users.user_interne.email, password);
  }

  /**
   * Authenticate to BO Pro with environment credentials
   * Uses users.json email + PASSWORDBO env var
   * Used by no-auth tests (BO-1151)
   */
  async authenticateProWithEnv() {
    const password = process.env.PASSWORDBO;
    if (!password) {
      throw new Error('Missing PASSWORDBO environment variable');
    }
    await this.gotoPro();
    await authenticateWithStateDetection(this.page, this, users.user_pro.email, password);
  }
};

export class UpdatePassword {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }
// Fill Password field in update password page
  async fillPassword(password: string) {
    await this.page.locator(`//input[@id="password-new"]`).fill(password);
  }

  // Fill Confirm Password field in update password page
  async fillConfirmPassword(password: string) {
    await this.page.locator(`//input[@id="password-confirm"]`).fill(password);
  }

  // Click Validate Password Button in update password page
  async clickValidatePasswordButton() {
    await this.page.locator(`//input[@type='submit']`).click();
  }

  // Password Setup Success Message locator
  passwordSetupSuccessMessage() {
    return this.page.locator(`//h1[@id='kc-page-title']`)
  }

};
