import { Page } from '@playwright/test';

export class Settings {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  readonly settingsTranslations:string[] = ['Your settings', 'Tu configuración', 'Impostazioni', 'Uw instellingen']

  // Settings bloc title locator
  settingsBlocTitle() {
    return this.page.locator(`(//div[@class='ant-card-head-title'])[1]`);
  }
};

export class Language {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  readonly languagelist:string[] = ['English', 'Español', 'Italiano', 'Nederlands']

  // settings language field
  async clickSettingsLanguageField() {
    await this.page.locator(`(//div[@class='ant-select-selector'])[1]`).click();
  }

  // Select language
  async selectLanguage(language:string) {
    await this.page.locator(`//div[@class='ant-select-item-option-content' and text()='${language}']`).click();
  }
  highlightedLanguage(language:string) {
    return this.page.locator(`//div[contains(@class,'ant-select-item-option-active')and @title='${language}']`);
  }
};

export class Country {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  readonly existCountries: string[] =
  [`Belgique`, `France`, `Italia`, `Luxembourg`]; // Ajouter Nederland quand BO-3804 merge

  // Active countries
  activeCountries(): Promise<string[]> {
    return this.page.locator(`//div[@class='ant-select-selection-overflow']//span[@class='ant-select-selection-item']`).allInnerTexts();
  }

  // Delete country from active list
  async deleteActiveCountry(activeCountry: string){
    await this.page.locator(`//div[@class='ant-select-selection-overflow']/descendant::span[@title='${activeCountry}']//span[@aria-label='close']`).click(); 
  }

  // Click countries dropdown
  async clickCountriesDropdown() {
    await this.page.locator(`//div[@class='ant-select-selection-overflow']`).click();
  }

  // Select a country
  async selectCountry(country: string) {
    await this.page.locator(`//div[contains(@class,'ant-select-item') and @title='${country}']`).click();
  }

  // Get available countries (countries that are not already active)
  async getAvailableCountries(): Promise<string[]> {
    const activeCountries = await this.activeCountries();
    return this.existCountries.filter(country => !activeCountries.includes(country));
  }
};

export class PartnerSettings {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Partner settings bloc title locator
  partnerSettingsBlocTitle() {
    return this.page.locator(`(//div[@class='ant-card-head-title'])[2]`);
  }

  // click Set Pro password button
  async clicSetProPasswordButton() {
    await this.page.locator(`//button[./span[text()="Configurer le mot de passe d'un pro"]]`).click();
  }
};
