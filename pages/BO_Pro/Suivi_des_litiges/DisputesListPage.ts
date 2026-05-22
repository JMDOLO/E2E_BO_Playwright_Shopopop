import { Page } from '@playwright/test';

export class DisputesListPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Disputes count label (e.g. "3 demandes de litiges")
  readonly disputesCount = `//div[contains(.,"demandes de litiges")]`;

  // Click "Terminés" tab
  async selectCompletedTab() {
    await this.page.locator(`//div[@role="tab" and contains(.,"Terminés")]`).click();
  }

  // Dispute row locator by recipient name
  disputeRowByRecipient(recipientName: string) {
    return this.page.locator(`//tr[contains(.,"${recipientName}")]`);
  }

  // Get dispute date
  disputeDate(recipientName: string) {
    return this.disputeRowByRecipient(recipientName).locator(`xpath=/td[1]`);
  }

  // Get dispute drive name
  disputeDriveName(recipientName: string) {
    return this.disputeRowByRecipient(recipientName).locator(`xpath=/td[2]`);
  }

  // Get dispute reason
  disputeReason(recipientName: string) {
    return this.disputeRowByRecipient(recipientName).locator(`xpath=/td[4]`);
  }

  // Get dispute amount
  disputeAmount(recipientName: string) {
    return this.disputeRowByRecipient(recipientName).locator(`xpath=/td[5]`);
  }

  // Get dispute status
  disputeStatus(recipientName: string) {
    return this.disputeRowByRecipient(recipientName).locator(`xpath=/td[6]`);
  }

  // Click a dispute row to open the drawer
  async clickDisputeRow(recipientName: string) {
    await this.disputeRowByRecipient(recipientName).click();
  }

  // Open a dispute drawer, optionally switching to the "Terminés" tab first
  async openDisputeDrawer(recipientName: string, fromCompletedTab = false) {
    if (fromCompletedTab) {
      await this.selectCompletedTab();
    }
    await this.clickDisputeRow(recipientName);
  }

  // No dispute message locator
  noDisputeMessage() {
    return this.page.locator(`//div[@class='ant-empty-description']`);
  }
}
