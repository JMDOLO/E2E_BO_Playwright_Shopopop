import { Page } from '@playwright/test';

export class RecipientDetails {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // All "Détails de la livraison" links in the page
  deliveryLink(deliveryId: number) {
    return this.page.locator(`//a[@href="/delivery/${deliveryId}"]`);
  }
}
