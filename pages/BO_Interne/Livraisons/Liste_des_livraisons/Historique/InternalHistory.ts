import { Page } from '@playwright/test';

export class InternalHistory {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Click history Tab
  async clickHistoryTab() {
    return this.page.locator(`//div[@data-node-key='history']`).click();
  }

  // Delivery creation message
  deliveryCreationMessage() {
    return this.page.locator(`//li[contains(@class,'ant-timeline-item-last')]//div[div[@class='ant-space-item']]/following-sibling::div`);
  }
};
