import { Page } from '@playwright/test';

export class InternalDeliveryPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Breadcrumb text and link
  async breadcrumbText() {
    return this.page.locator(`//span[@class='ant-breadcrumb-link']/a`);
  }

  // Click delivery details save button
  async clickDeliveryDetailsSaveButton() {
    const saveButton = this.page.locator(`//button[@id='button-save-detail-delivery']`);
    await saveButton.evaluate(el => el.scrollIntoView({ block: 'center' }));
    await saveButton.click();
  }
};