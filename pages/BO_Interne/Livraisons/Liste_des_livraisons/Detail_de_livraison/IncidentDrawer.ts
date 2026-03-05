import { Page } from '@playwright/test';

export class IncidentDrawer {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Click Report or Manage an incident button
  async clickReportManageIncidentButton() {
    await this.page.locator(`//span[@aria-label='warning']//ancestor::button`).click();
  }

  // Incident category
  // Check CTP Problem
  async checkCTPProblem() {
    await this.page.locator(`//input[@value='COTRANSPORTER_PROBLEM']`).check();
  }

  // Incident reason
  // Check theft reason
  async checkTheftReason() {
    await this.page.locator(`//input[@value='THEFT']`).check();
  }

  // Click submit incident button
  async clickSubmitIncidentButton() {
    await this.page.locator(`//button[./span[text()='Déclarer l’incident']]`).click();
  }

  // Validate incident in confirmation modal
    async confirmIncidentModal() {
      await this.page.locator(`//div[@class='ant-popconfirm-buttons']/button[2]`).click();
    }
};
