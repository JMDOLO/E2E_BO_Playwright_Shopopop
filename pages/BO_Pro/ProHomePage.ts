import { Page } from '@playwright/test';

export class ProHomePageMenu {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Create delivery button locator
  createDeliveryButton() {
    return this.page.locator(`//button[@name='delivery']`);
  }

  // Click deliveries menu
  async clickDeliveriesMenu() {
    await this.page.locator(`//li[@title='Livraisons']`).click();
  }

  // Click dashboard menu
  async clickDashboardMenu() {
    await this.page.locator(`//li[@title='Tableau de bord']`).click();
  }

  // Click disputes menu
  async clickDisputesMenu() {
    await this.page.locator(`//li[@title='Suivi des litiges']`).click();
  }

  // Click logout
  async clickLogout() {
    await this.page.locator(`//li[@title='Déconnexion']`).click();
  }  
};

export class SelectLanguage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  readonly languageList:string[] = ['English', 'Italiano', 'Nederlands', "Español"]

  // settings language button
  async hoverSettingsLanguageButton() {
    await this.page.locator(`//span[@aria-label='setting']`).click();
    // Keep cursor in dropdown menu area to prevent it from closing
    await this.page.locator(`//span[@class='ant-dropdown-menu-title-content' and text()='Français']/ancestor::ul[contains(@class, 'ant-dropdown-menu-root')]`).hover();
  }

  // Select language
  async selectLanguage(language:string) {
    await this.page.locator(`//span[@class='ant-dropdown-menu-title-content' and text()='${language}']`).click();
  }
  highlightedLanguage(language:string) {
    return this.page.locator(`//li[contains(@class,'ant-dropdown-menu-item-selected')]/span[text()='${language}']`);
  }

};

export class SelectDrive { // TODO
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  readonly driveList:string[] = ['Tous mes magasins', 'testAutoBOFleur1', 'testAutoBOAlim1', 'testAutoBOVin1']

  // click drive selector to open the dropdown
  openDriveSelector() {
    return this.page.locator(`//div[@data-testid='pickupPoint']//input`);
  }

  // select drive by name
  async selectDrive(driveName:string) {
    await this.openDriveSelector().click();
    await this.page.locator(`//div[contains(@class,'ant-select-item-option') and @title='${driveName}']`).click();
  }
};
