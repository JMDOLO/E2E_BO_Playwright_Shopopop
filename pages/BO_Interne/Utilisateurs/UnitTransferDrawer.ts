import { Page } from '@playwright/test';

export class UnitTransferDrawer {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Close drawer
  async clickClose() {
    await this.page.locator(`//button[@aria-label="Fermer"]`).click();
  }

  // Drawer title
  drawerTitle() {
    return this.page.locator(`//div[@class="ant-drawer-title"]`);
  }

  // Delivery title
  deliveryTitle() {
    return this.page.locator(`//label[@title="Livraison"]`);
  }

  // Delivery field value
  deliveryFieldValue() {
    return this.page.locator(`//span[./input[@id="deliveryId"]]/following-sibling::span[@class='ant-select-selection-item']`);
  }

  // Search and select a delivery
  async searchDelivery(text: string) {
    await this.page.locator(`//input[@id="deliveryId"]`).fill(text);
  }

  // Delivery dropdown option (portal, not scoped to drawer)
  deliveryOption(deliveryId: number) {
    return this.page.locator(`//div[@class="ant-select-item-option-content" and contains(.,"${deliveryId}")]`);
  }

  async selectDelivery(deliveryId: number) {
    await this.deliveryOption(deliveryId).click();
  }

  // Delivery validation error
  deliveryError() {
    return this.page.locator(`//div[@id='deliveryId_help']`);
  }

  // Amount title
  amountTitle() {
    return this.page.locator(`//label[@title="Montant du virement"]`);
  }

  // Amount field value
  amountFieldValue() {
    return this.page.locator(`//input[@id="amount"]`);
  }

  // Fill amount
  async fillAmount(amount: string) {
    await this.amountFieldValue().fill(amount);
  }

  // Amount validation error
  amountError() {
    return this.page.locator(`//div[@id='amount_help']`);
  }

  // Reason title
  reasonTitle() {
    return this.page.locator(`//label[@title="Raison"]`);
  }

  // Reason field value
  reasonFieldValue() {
    return this.page.locator(`//textarea[@id="reason"]`);
  }

  // Fill reason
  async fillReason(text: string) {
    await this.reasonFieldValue().fill(text);
  }

  // Reason validation error
  reasonError() {
    return this.page.locator(`//div[@id='reason_help']`);
  }

  // Submit unit transfer
  async clickSubmit() {
    await this.page.locator(`//div[contains(@class,"ant-drawer-footer")]//button[contains(.,"Envoyer le virement unitaire")]`).click();
  }
}
