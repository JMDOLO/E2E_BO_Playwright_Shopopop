import { Page } from '@playwright/test';

export class ChangeDelivery {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Delivery active status
  deliveryActiveStatus() {
    return this.page.locator(`//span[text()='Statut']/following-sibling::div//span[@class='ant-select-selection-item']`);
  }

  // Click delivery status dropdown
  async clickDeliveryStatusDropdown() {
    await this.page.locator(`//span[text()='Statut']/following-sibling::div/div[@class='ant-select-selector']`).click();
  }

  // Select delivery status
  async selectDeliveryStatus(status: string) {
    await this.page.locator(`//div[@class='rc-virtual-list']/descendant::div[@title='${status}']`).click();
  };

  // Save delivery status changes modal
  async saveDeliveryStatusChangesModal() {
    await this.page.locator(`//div[@role='dialog']//button[./span[text()='OK']]`).click();
  }
  

  // Click delivery day in text
  // An API delivery is created for "tomorrow", so value not in the list.
  readonly deliveryDayInText = ["Aujourd'hui", "Après-demain"];
  async clickDeliveryDayInText(dayInText: string) {
    await this.page.locator(`//div[@title="${dayInText}"]`).click();
  }

  // Select delivery date in calendar
  // Click access calendar
  async accessCalendar() {
    await this.page.locator(`//input[@id='deliveryDayPicker']`).click();
  }
  // Initial delivery date (pick in calendar in ISO format "YYYY-MM-DD")
  initialISODeliveryDateInCalendar() {
    return this.page.locator(`//td[contains(@class, 'ant-picker-cell-selected')]`);
  }
  
  // Select day (the second day after tomorrow) in calendar
  // An API delivery is created for "tomorrow".
  dayInCalendar() {
    return this.page.locator(`//td[contains(@class, 'ant-picker-cell-selected')]/following::td[2]`);
  }
  async selectDayInCalendar() {
    await this.dayInCalendar().locator('xpath=./div').click();
  }

  // delivery start time global
  deliveryStartTimeGlobal() {
    return this.page.locator(`//input[@id='hourStart']`);
  }
  // delivery start time hour
  async clickDeliveryStartTimeHour(startHour: string) {
    await this.page.locator(`//li[contains(@class, "ant-picker-time-panel-cell") and @data-value='8']/following-sibling::li[@data-value='${startHour}']`).click();
  }
  // delivery start time minutes
  async clickDeliveryStartTimeMinutes(startMinutes: string) {
    await this.page.locator(`//li[contains(@class, "ant-picker-time-panel-cell") and @data-value='8']/parent::ul/following-sibling::ul/li[@data-value='${startMinutes}']`).click();
  }

  // Tips value input field
  tipsValueInputField() {
    return this.page.locator(`//input[@id='tips-update-delivery-detail-delivery']`);
  }
  
  // Increase tips button
  async clickIncreaseTipsButton() {
    // Hover the input field to reveal the increment buttons
    await this.tipsValueInputField().hover();
    // Click on the increase button
    await this.page.locator(`//label[@title='Pourboire']/following::span[@aria-label='Increase Value'][1]`).click();
  }

  // Tips value (for delivery archived or with major incident)
  tipsValue() {
    return this.page.locator(`//div[@role='separator']/following::span[text()='Pourboire']/following-sibling::span[1]`);
  }

  // Push radio button label
  checkPush() {
    return this.page.locator(`//input[@id='push']/ancestor::label`);
  }
};