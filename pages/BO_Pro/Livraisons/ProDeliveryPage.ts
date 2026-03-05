import { Page } from '@playwright/test';

export class ProDeliveryPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Breadcrumb translations (same order as SelectLanguage.languagelist in ProHomePage)
  // ['English', 'Italiano', 'Nederlands', 'Español']
  readonly breadcrumbTranslations: string[] = ['Deliveries', 'Consegne', 'Leveringen', 'Entregas'];

  // Breadcrumb text locator
  breadcrumbText() {
    return this.page.locator(`//a[@class='breadcrumb-text']//strong`);
  }
};