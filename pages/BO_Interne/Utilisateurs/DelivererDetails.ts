import { Page, expect } from '@playwright/test';

export class DelivererDetails {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Moderation History
  async clickModerationHistory() {
    // Wait for user data load — drawer fetches on click and won't refresh after
    await expect(this.page.locator(`//input[@id='user-info-header-email']`)).not.toHaveValue('');
    await this.page.locator(`//button[contains(.,'Historique de modération')]`).click();
  }

  // Drawer "Historique de modération"
  // Click deactivate account
  async clickDeactivateAccount() {
    await this.page.locator(`//div[contains(@class,'ant-drawer-footer')]//button[contains(.,'Désactiver le compte')]`).click();
  }

  // Reactivate button (in history entry)
  reactivate() {
    return this.page.locator(`//button[contains(.,'Réactiver')]`);
  }

  // Confirm popconfirm (Oui) - see confirmAction() below, can be reused for reactivation confirmation.

  // Drawer "Désactiver le compte cotransporteur"
  // Select deactivation reasons (radio values)
  readonly deactivationReasons = ['THEFT', 'BEHAVIOUR', 'MULTI_ACCOUNTS', 'BAD_RATING', 'EXCESSIVE_CANCELLATIONS'];

  // Select deactivation reason
  async selectDeactivationReason(reason: string) {
    await this.page.locator(`//input[@value='${reason}']/ancestor::label`).click();
  }

  // Fill deactivation description
  async fillDeactivationDescription(text: string) {
    await this.page.locator(`//textarea[@id='comment']`).fill(text);
  }

  // Submit deactivation (button in deactivation drawer body)
  async submitDeactivation() {
    await this.page.locator(`//div[contains(@class,'ant-drawer-body')]//button[contains(.,'Désactiver le compte')]`).click();
  }

  // Confirm popconfirm (Oui)
  async confirmAction() {
    await this.page.locator(`//button[contains(.,'Oui')]`).click();
  }

  // KYC invalidation button
  invalidateKycButton() {
    return this.page.locator(`//button[contains(.,'Invalider les KYC')]`);
  }

  // Identity document tag
  identityTag() {
    return this.page.locator(`//span[contains(@class,'ant-tag') and contains(.,"Document d’identité")]`);
  }

  // Identity document tag class
  readonly identityTagClass = {
    default: /ant-tag-default/, // grey = not_sent
    processing: /ant-tag-processing/, // blue = pending
    success: /ant-tag-success/, // green = validated
    error: /ant-tag-error/, // red = refused
    warning: /ant-tag-warning/, // orange = unvalidated
  };

  // Confirm popconfirm (Oui) - see confirmAction() above, can be reused for invalid KYC.

  // Tabs
  readonly noShowTabId = 'no-show';
  readonly lateCancelledTabId = 'late-cancelled';
  readonly paymentsTabId = 'payments';
  readonly deliveryTabId = 'active';

  // No value message
  readonly noValueMessageByTab: Record<string, string> = {
    [this.paymentsTabId]: 'Aucun paiement',
    // BO-4032 - fix à venir (Aucune livraison -> Aucune non présentation)
    [this.noShowTabId]: 'Aucune livraison',
    //[this.noShowTabId]: 'Aucune non présentation',
    [this.lateCancelledTabId]: 'Aucune annulation tardive sur les 30 derniers jours',
    [this.deliveryTabId]: 'Aucune livraison',
  };

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

  // Unit transfer button
  async clickUnitTransferButton() {
    await this.page.locator(`//button[contains(.,'Faire un virement unitaire')]`).click();
  }

  // No value message in active tab
  noValueMessage(tabId: string) {
    return this.page.locator(`${this.tabXPath(tabId)}//div[text()='${this.noValueMessageByTab[tabId]}']`);
  }

  // All "Détails de la livraison" links in active tab
  deliveryLink(tabId: string, deliveryId: number) {
    return this.page.locator(`${this.tabXPath(tabId)}//a[@href="/delivery/${deliveryId}"]`);
    //return this.page.locator(`${this.tabXPath(tabId)}//a[@href="/detail/${deliveryId}"]`); // New version of the delivery detail page
  }

  // Payments table — row locator by delivery ID
  paymentRowByDeliveryId(deliveryId: number) {
    return this.page.locator(`//tr[contains(.,'${deliveryId}')]`);
  }

  // Payment row cells (column index: 1=Livraison, 2=Date, 3=Type, 4=Montant, 5=Statut)
  paymentDeliveryId(deliveryId: number) {
    return this.paymentRowByDeliveryId(deliveryId).locator(`xpath=/td[1]`);
  }

  paymentDate(deliveryId: number) {
    return this.paymentRowByDeliveryId(deliveryId).locator(`xpath=/td[2]`);
  }

  paymentType(deliveryId: number) {
    return this.paymentRowByDeliveryId(deliveryId).locator(`xpath=/td[3]`);
  }

  informationLogo(deliveryId: number) {
    return this.paymentRowByDeliveryId(deliveryId).locator(`xpath=/td[3]//span[@aria-label='info-circle']`);
  }

  tooltip(id: string) {
    return this.page.locator(`//*[@role='tooltip' and @id='${id}']`);
  }

  paymentAmount(deliveryId: number) {
    return this.paymentRowByDeliveryId(deliveryId).locator(`xpath=/td[4]`);
  }

  paymentStatus(deliveryId: number) {
    return this.paymentRowByDeliveryId(deliveryId).locator(`xpath=/td[5]`);
  }
}
