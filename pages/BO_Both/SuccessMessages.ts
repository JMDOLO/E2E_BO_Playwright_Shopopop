import { Page, expect } from '@playwright/test';

/**
 * Delivery creation success message toaster
 */
export class DeliverySuccessMessage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  readonly inProgress = 'Livraison en cours de création.';
  readonly success = 'Livraison créée avec succès.';
  readonly tooMuchTry = 'Vous avez effectué trop de tentatives.';
  readonly errors: string[] = [
    'Une erreur serveur est survenue.',
    'Erreur lors de la création',
  ];

  // Get delivery message text (assumes message is already visible)
  async getDeliveryMessageText(): Promise<string> {
    const messageLocator = this.page.locator(`//div[@class='ant-notification-notice-message']`).first();
    return await messageLocator.textContent() || '';
  }

  // Click on "Voir la livraison" link
  viewDelivery() {
    return this.page.locator(`//a[text()='Voir la livraison']`);
  }

  // Click "Voir la livraison" link, wait for navigation, return delivery URL
  async clickViewDeliveryAndGetURL(): Promise<string> {
    await this.viewDelivery().click();
    await this.page.waitForURL(/\/delivery\/\d+/);
    const deliveryURL = this.page.url();
    console.log(`Delivery URL: ${deliveryURL}`);
    return deliveryURL;
  }
};

/**
 * Delivery details success message toaster (unified for Pro and Interne)
 */
export class DeliveryDetailsSuccessMessage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Pro messages
  readonly dateTimeSlot = 'Créneau de livraison modifié'
  readonly deliveryWithdrawal = 'Le magasin a été modifié.'
  readonly deliveryAddress = 'L’adresse de livraison a été modifiée.'
  readonly orderInformations = 'Les informations de la commande ont été mises à jour.'
  readonly orderContent = 'Le contenu de la commande a été mis à jour.' 
  readonly reportCTP = "Le cotransporteur a été signalé au Service Client Shopopop.";

  // Internal messages
  readonly details = 'Les modifications de la livraison ont été prises en compte.';
  readonly status = 'La modification du statut a été prise en compte.';
  readonly incident = "L’incident a été déclaré.";
  readonly canceledIncident = "L'incident a été annulé.";
  readonly push = "Votre push a été envoyé avec succès.";

  // Get the success alert message locator
  successAlertUpdateDelivery(reason: string) {
    return this.page.locator(`//div[@class='ant-notification-notice-message' and text()='${reason}']`);
  }

  // Close the success alert using the message locator to find the close button
  async closeDeliveryDetailsSuccessMessage(reason: string) {
    const messageLocator = this.successAlertUpdateDelivery(reason);
    await messageLocator.locator(`//ancestor::div[@class='ant-notification-notice-content']/following-sibling::a`).click();
  }

  // Check delivery details update success alert message and close toaster
  async deliveryUpdateSuccessToaster(reason: string): Promise<void> {
    await expect(this.successAlertUpdateDelivery(reason)).toBeVisible();
    await this.closeDeliveryDetailsSuccessMessage(reason);
  }
};

export class InternalSendEmailSuccessMessage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  readonly sendEmail = 'Le formulaire de configuration a bien été envoyé.';

  // Get the success alert message locator
  successAlertSendEmail(reason: string) {
    return this.page.locator(`//div[@class='ant-notification-notice-message' and contains(text(),'${reason}')]`);
  }

  // Close the success alert using the message locator to find the close button
  async closeSendEmailSuccessMessage(reason: string) {
    const messageLocator = this.successAlertSendEmail(reason);
    await messageLocator.locator(`//ancestor::div[@class='ant-notification-notice-content']/following-sibling::a`).click();
  }

  // Check send email success alert message and close toaster
  async sendEmailSuccessToaster(reason: string): Promise<void> {
    await expect(this.successAlertSendEmail(reason)).toBeVisible();
    await this.closeSendEmailSuccessMessage(reason);
  }
};