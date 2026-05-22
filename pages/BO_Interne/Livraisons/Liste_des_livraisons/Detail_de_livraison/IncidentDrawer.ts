import { Page } from '@playwright/test';

export class IncidentDrawer {
  readonly page: Page;

  // Incident categories (radio button values)
  readonly categories = {
    pickupReturn: 'PICKUP_RETURN',
    additionalJourney: 'ADDITIONAL_JOURNEY',
    pickupProblem: 'PICKUP_PROBLEM',
    cotransporterProblem: 'COTRANSPORTER_PROBLEM',
  } as const;

  // Incident reasons per category (radio button values)
  readonly pickupReturnReasons: string[] = ['RECIPIENT_ABSENT', 'BAD_ADDRESS_SUP_10KM', 'BAD_DELIVERY'];
  readonly additionalJourneyReasons: string[] = ['BAD_ADDRESS_INF_10KM', 'BAD_DELIVERY'];
  readonly pickupProblemReasons: string[] = ['ORDER_NOT_READY', 'UNAVAILABLE_ORDER', 'ORDER_PROBLEM', 'DUPLICATE_ORDER', 'UNDELIVERABLE'];
  readonly cotransporterProblemReasons: string[] = ['THEFT', 'MISSING_PRODUCT', 'DAMAGE_PRODUCT', 'COLD_CHAIN', 'OTHER'];

  // Kilometer range options (displayed labels)
  readonly kilometerRanges: string[] = ['Moins de 1km', 'De 1 à 5km', 'De 5 à 10km'];

  constructor(page: Page) {
    this.page = page;
  }

  // Click Report or Manage an incident button
  async clickReportManageIncidentButton() {
    await this.page.locator(`//span[@aria-label='warning']/ancestor::button`).click();
  }

  // Check an incident category radio button
  async checkCategory(category: string) {
    await this.page.locator(`//input[@value='${category}']/ancestor::label`).click();
  }

  // Check an incident reason radio button
  async checkReason(reason: string) {
    await this.page.locator(`//input[@value='${reason}']/ancestor::label`).click();
  }

  // Select a kilometer range in the dropdown
  async selectKm(label: string) {
    await this.page.locator(`//input[@id='incident-form_kilometerRange']/ancestor::div[contains(@class,'ant-select')][1]`).click();
    await this.page.locator(`//div[@class='ant-select-item-option-content' and contains(.,"${label}")]`).click();
  }

  // Fill incident description
  async fillIncidentDescription(description: string) {
    await this.page.locator(`//textarea[@id='incident-form_description']`).fill(description);
  }

  // Toggle the "Close delivery" switch
  async toggleCloseDelivery() {
    await this.page.locator(`//button[@role='switch']`).click();
  }

  // Click submit incident button
  async clickSubmitIncidentButton() {
    await this.page.locator(`//button[contains(.,"Déclarer l’incident")]`).click();
  }

  // Validate incident in confirmation modal — retry click until POST /incidents is sent
  // (popconfirm zoom animation can swallow the first click; DOM visibility is unreliable due to animations)
  async confirmIncidentModal() {
    const yesButton = this.page.locator(`//div[@class='ant-popconfirm-buttons']/button[contains(.,'Oui')]`);
    const maxRetries = 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const postSent = this.page.waitForRequest(
        req => req.url().includes('/incidents') && req.method() === 'POST',
        { timeout: 3000 }
      ).catch(() => null);

      await yesButton.click();
      if (await postSent) return;
    }
    throw new Error(`Incident POST not sent after ${maxRetries} attempts`);
  }
}
