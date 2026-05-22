import { Page } from '@playwright/test';
import { isResponseValid } from '@utils/Helpers/apiResponse.helpers';

export class CreateDeliveryStep1Page {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Pickup point input and selection
  async fillAndSelectPickupPoint(driveName: string) {
    await this.page.locator(`//input[@id='pickupPoint']`).fill(driveName);
    await this.page.locator(`//div[@title='` + driveName + `']`).click();
  }

  // Recipient search input and selection — selecting an existing recipient pre-fills the address
  // and triggers /addresses/distance directly. Retry on distance API failure (no autocomplete here:
  // the address comes from the recipient's saved data, so /addresses/autocomplete is not called).
  async fillAndSelectRecipient(recipientName: string) {
    const searchInput = this.page.locator(`//input[@id='search']`);
    const resultOption = this.page.locator(`//div[contains(@title,'${recipientName}')][1]`);
    const distanceLoaded = this.page.locator('span', { hasText: /\d\s*km/ }).first();
    const maxRetries = 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      // Clear only if search input has leftover value (previous attempt)
      if (await searchInput.inputValue()) await searchInput.clear();

      const distanceResponse = this.page.waitForResponse(
        (res) => res.url().includes('/addresses/distance'),
        { timeout: 10000 }
      ).catch(() => null);

      await searchInput.fill(recipientName);
      await resultOption.click();

      if (!(await isResponseValid(await distanceResponse))) continue;

      // API OK → wait for distance UI to render before returning (prevents validateStep1 race)
      await distanceLoaded.waitFor({ timeout: 10000 });
      return;
    }

    throw new Error(`Distance API did not return expected status after ${maxRetries + 1} attempts`);
  }

  // Click the Create New Recipient button
  async clickCreateNewRecipient() {
    await this.page.locator(`//button[@data-transaction-name='button-deliveryCreation-CreateNewRcp']`).click();
  }

  // Click cancel create new recipient
  async clickCancelCreateNewRecipient() {
    await this.page.locator(`//button[@data-transaction-name='button-deliveryCreation-CancelNewRcp']`).click();
  }

  // Firstname input
  async fillRecipientFirstname(firstname: string) {
    await this.page.locator(`//input[@id='recipient_firstName']`).fill(firstname);
  }

  // Lastname input
  async fillRecipientLastname(lastname: string) {
    await this.page.locator(`//input[@id='recipient_lastName']`).fill(lastname);
  }

  // Email input
  async fillRecipientEmail(email: string) {
    await this.page.locator(`//input[@id='recipient_email']`).fill(email);
  }
  // Check "no email" checkbox
  async checkNoEmail() {
    await this.page.locator(`//input[@id='recipient_emailOptional']`).check();
  } 

  // Phone input
  async fillRecipientPhone(phone: string) {
    await this.page.locator(`//input[@id='recipient_phone']`).fill(phone);
  }

  // Address input and selection — validates both autocomplete and distance APIs, waits for distance UI, with retry on failure.
  // pressSequentially (vs fill) emits native keyboard events so React onChange fires per char and Ant useDebounce (400ms)
  // reliably re-triggers /autocomplete on retry.
  async fillAndSelectAddress(address: string, shortAddress: string) {
    // Click the ant-select-selector parent (input's first ancestor div): works in both states the retry can land on:
    //   - initial: sibling is .ant-select-selection-placeholder (pointer-events: none → cannot be clicked directly)
    //   - after /distance fail: sibling is .ant-select-selection-item which intercepts clicks on the searchSpan
    // The selector parent always activates Ant search mode and focuses the input. On retry, click the Ant × button to
    // trigger the onClear handler → resets React state so next pressSequentially fires a fresh /autocomplete call.
    // (Playwright's native clear() empties the input visually but Ant's internal state stays, so no new API call.)
    const addressSelector = this.page.locator(`//input[@id='address_name']/ancestor::div[1]`);
    const addressInput = this.page.locator(`//input[@id='address_name']`);
    const addressClearButton = this.page.locator(`//input[@id='address_name']/ancestor::div[@class='ant-select-selector']/following-sibling::span[@class='ant-select-clear']`);
    const resultOption = this.page.locator(`//div[contains(@title,'${shortAddress}')][1]`);
    const distanceLoaded = this.page.locator('span', { hasText: /\d\s*km/ }).first();
    const maxRetries = 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      await addressSelector.click();
      if (attempt > 0) await addressClearButton.click();

      const autocompleteResponse = this.page.waitForResponse(
        (res) => res.url().includes('/addresses/autocomplete'),
        { timeout: 10000 }
      ).catch(() => null);

      const distanceResponse = this.page.waitForResponse(
        (res) => res.url().includes('/addresses/distance'),
        { timeout: 10000 }
      ).catch(() => null);

      await addressInput.pressSequentially(address, { delay: 30 });
      if (!(await isResponseValid(await autocompleteResponse))) continue;

      await resultOption.click();
      if (!(await isResponseValid(await distanceResponse))) continue;

      // API OK → wait for distance UI to render before returning (prevents validateStep1 race)
      await distanceLoaded.waitFor({ timeout: 10000 });
      return;
    }

    throw new Error(`Autocomplete or Distance API did not return expected status after ${maxRetries + 1} attempts`);
  }

  // Sélection présence ascenseur
  async selectElevatorPresence(isElevator: 'yes' | 'no' | 'dontknow') {
    await this.page.locator(`//div[@id='address_elevator']//input[@value='${isElevator}']/ancestor::label`).click();
  }

  // Floor number input
  async fillFloorNumber(floorNumber: string) {
    await this.page.locator(`//input[@id='address_floor']`).fill(floorNumber);
  }

  // Address additional informations input
  async fillAddressAdditionalInfo(addressAdditionalInfo: string) {
    await this.page.locator(`//textarea[@id='address_comment']`).fill(addressAdditionalInfo);
  }

  // Step 1 validation button locator
  buttonStep1() {
    return this.page.locator(`//button[@data-transaction-name='button-deliveryCreationNew-CREATION_STEP_01']`);
  }

  // Validate step 1
  async validateStep1() {
    await this.buttonStep1().click();
  }
};