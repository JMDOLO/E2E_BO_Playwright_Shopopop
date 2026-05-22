import { Page } from '@playwright/test';

export class DelivererDetails {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Tabs
  readonly noShowTabId = 'no-show';
  readonly cancelledTabId = 'cancelled';
  
  private tabXPath(tabId: string) {
    return `//div[contains(@id,'${tabId}')]`;
  }

  async selectTab(tabId: string) {
    await this.page.locator(this.tabXPath(tabId)).click();
  }

  // Tab counter
  tabCounter(tabId: string) {
    return this.page.locator(`${this.tabXPath(tabId)}//sup`);
  }

  // All "Détails de la livraison" links in active tab
  deliveryLink(tabId: string, deliveryId: number) {
    return this.page.locator(`${this.tabXPath(tabId)}//a[@href="/delivery/${deliveryId}"]`);
  }
}
