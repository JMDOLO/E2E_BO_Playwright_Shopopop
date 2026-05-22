import { Page } from '@playwright/test';

export class InternalHomePageMenu {
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

  // Click users menu
  async clickUsersMenu() {
    await this.page.locator(`//li[@title='Utilisateurs']`).click();
  }

  // Click settings menu
  async clickSettingsMenu() {
    await this.page.locator(`//li[@title='Paramètres']`).click();
  }

  // Click logout
  async clickLogout() {
    await this.page.locator(`//li[@title='Déconnexion']`).click();
  }  
};
