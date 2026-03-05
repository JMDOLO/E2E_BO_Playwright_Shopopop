import { Page, expect } from '@playwright/test';

export class ProDeliveryDetails {
  readonly page: Page;

  // Bloc titles constants
  readonly dateTimeSlotBlockTitle = 'Date et créneau de livraison';
  readonly pickupPointBlockTitle = 'Retrait de la livraison';
  readonly addressBlockTitle = "Adresse de livraison";
  readonly orderInformationsBlockTitle = 'Informations sur la commande';
  readonly orderContentsBlockTitle = 'Contenu de la commande';
  
  // Modal titles constants
  readonly dateTimeSlotModalTitle = 'Modifier la date ou le créneau de livraison';
  readonly pickupPointModalTitle = 'Modifier le magasin';
  readonly addressModalTitle = 'Modifier l’adresse de livraison';
  readonly orderInformationsModalTitle = 'Modifier les informations de la commande';
  readonly orderContentModalTitle = 'Modifier le contenu de la commande';

  // Elevator options
  readonly elevatorOptions = ['yes', 'no', 'dontknow']; 

  // Order size options
  readonly orderSizeOptions = ["XS - Sac à dos (0 pack)", "S - Sac cabas (1-2 packs)", "M - 1/2 chariot (3-8 packs)", "L - 1 chariot (9-15 packs)", "XL - 2 chariots (16-29 packs)", "XXL - +2 chariots (>\u00a029 packs)"];

  constructor(page: Page) {
    this.page = page;
  }


   // Click the edit buttons
  async clickEditButton(blocTitle: string) {
    await this.page.locator(`//div[text()='${blocTitle}']/following::button[1]`).click();
  }


  // Delivery date and time slot block

  // Change date and time slot modal
    // Modal title locator
    dateTimeModalTitle() {
      return this.page.locator(`//div[text()='Modifier la date ou le créneau de livraison']`);
    }
    // Select the day after tomorrow for new delivery date
    async selectNewDeliveryDate() {
      await this.page.locator(`//strong[text()='Après-demain']/ancestor::label`).check();
    }
    // Save the new delivery date
    newDeliveryDate(){
      return this.page.locator(`//strong[text()='Après-demain']/parent::span/following-sibling::span`);
    }
    // delivery start time global
    async clickDeliveryStartTimeGlobal() {
      await this.page.locator(`//input[@data-testid="TimePicker-DeliveryTimeForm-startDate"]`).click();
    }
    // delivery start time hour
    async clickDeliveryStartTimeHour(startHour: string) {
      await this.page.locator(`//li[contains(@class, "ant-picker-time-panel-cell") and @data-value='8']/following-sibling::li[@data-value='${startHour}']`).click();
    }
    // delivery start time minutes
    async clickDeliveryStartTimeMinutes(startMinutes: string) {
      await this.page.locator(`//li[contains(@class, "ant-picker-time-panel-cell") and @data-value='8']/parent::ul/following-sibling::ul/li[@data-value='${startMinutes}']`).click();
    }
    
  
  // Delivery date
  deliveryDate() {
    return this.page.locator(`//span[text()='Date de livraison']/following::span[1]`);
  }

  // Time slot
  timeSlot() {
    return this.page.locator(`//span[text()='Créneau de livraison']/following::span[1]`);
  }


  // Delivery withdrawal block

  // Click pickup point dropdown in modal
  async clickPickupPointDropdown() {
    await this.page.locator(`//label[@title='Magasin']/ancestor::div[@class='ant-modal-body']//div[@class='ant-select-selector']`).click();
  }
  // Select pickup point in modal
  async selectPickupPoint(pickupPoint: string) {
    await this.page.locator(`//div[@title='${pickupPoint}']`).click();
  }

  // Distance value in pickup point Modal
  distanceValueInPickupPointModal() {
    return this.page.locator(`//label[@title='Magasin']/following::span[contains(@class,'ant-typography')]`);
  }

  // Pickup point
  pickupPoint() {
    return this.page.locator(`//span[text()='Point de retrait']/following::span[1]`);
  }

  // Distance value
  distanceValue() {
    return this.page.locator(`//span[text()='Distance']/following::span[contains(text(),'km')]`);
  }
  

  // Delivery address block
  
  // Fill and Select address in modal
  async fillAndSelectAddressInModal(newAddress: string) {
    await this.page.locator(`//input[@id='address_name']`).fill(newAddress);
    await this.page.locator(`//div[contains(@title,'${newAddress}')]`).click();
  }
  // Floor value input field in modal
  floorInModal() {
    return this.page.locator(`//input[@id='address_floor']`);
  }
  // Increase floor button
  async clickIncreaseFloorButton() {
    // Hover the input field to reveal the increment buttons
    await this.floorInModal().hover();
    // Click on the increase button
    await this.page.locator(`//label[@for='address_floor']/following::span[@aria-label='up'][1]`).click();
  }
  
  // Current elevator
  currentElevatorValue() {
    return this.page.locator(`//div[@data-testid='elevator-radio']/label[contains(@class,'checked')]//span[2]`);
  }
  currentElevatorAttribute() {
    return this.page.locator(`//div[@data-testid='elevator-radio']/label[contains(@class,'checked')]//input`);
  }
  // Change elevator in modal
  elevatorInModal(elevator: string) {
    return this.page.locator(`//input[@name='address_elevator' and @value='${elevator}']/ancestor::label`);
  }
  // Distance value in Address Modal
  distanceValueInAddressModal() {
    return this.page.locator(`//label[@title='Rechercher une adresse']/following::span[contains(@class,'ant-typography css')]`);
  }
  // Wait for distance loading in Modal
  async waitForDistanceLoadingInModal() {
    await expect(this.distanceValueInAddressModal()).toContainText('km');
  }
  // Fill address details in modal with retry mechanism to handle modal animation
    async fillAddressDetailsInModal(text: string, maxRetries: number = 3) {
      await this.fillTextareaInModalWithRetry(
        this.page.locator(`//textarea[@id='address_comment']`),
        text,
        this.addressModalTitle,
        maxRetries
      );
    }

  // Delivery address
  deliveryAddress() {
    return this.page.locator(`//span[text()='Adresse']/following::span[2]`);
  }

  // Delivery floor and elevator
  deliveryFloorAndElevator() {
    return this.page.locator(`//span[text()='Adresse']/following::span[3]`);
  }

  // Address details
  addressDetails() {
    return this.page.locator(`//span[text()="Précisions sur l’adresse"]/following::div[1]/span`);
  }


  // Order informations block
  // Change order informations modal
    // Click grief event radio button with retry mechanism
    async clickGriefEventInModal(maxRetries: number = 3) {
      await this.clickInputInModalWithRetry(
        this.page.locator(`//input[@value='FUNERAL']`),
        this.orderInformationsModalTitle,
        maxRetries
      );
    }
  
  // Order event
  orderEvent() {
    return this.page.locator(`//span[text()='Occasion de livraison']//following::div[1]/span`);
  }
  
  // Order contents block
  // Change order contents modal
    // Click frozen characteristic checkbox with retry mechanism
    async clickFrozenCharacteristicInModal(maxRetries: number = 3) {
      await this.clickInputInModalWithRetry(
        this.page.locator(`//input[@value='frozen']`),
        this.orderContentModalTitle,
        maxRetries
      );
    }

    // Click order size dropdown in modal
    async clickOrderSizeDropdownInModal() {
      await this.page.locator(`//input[@id='size']/ancestor::div[1]`).click();
    }
    // Select order size in modal
    async selectOrderSizeInModal(size: string) {
      await this.page.locator(`//div[contains(@title,'${size}')]`).click();
    }

    // Fill order details for CTP in modal with retry mechanism to handle modal animation
    async fillOrderDetailsForCTPInModal(text: string, maxRetries: number = 3) {
      await this.fillTextareaInModalWithRetry(
        this.page.locator(`//textarea[@id='additionalInfo']`),
        text,
        this.orderContentModalTitle,
        maxRetries
      );
    }

  // Order characteristic
  orderCharacteristic() {
    return this.page.locator(`//span[text()="Caractéristique(s) de la commande"]/following::span[1]`);
  }

  // Order size value
  orderSizeValue() {
    return this.page.locator(`//span[text()="Taille de la commande"]/following::span[1]`);
  }
  
  // Recommended vehicle
  recommendedVehicle() {
    return this.page.locator(`//span[text()="Moyen de transport minimum recommandé"]/following::span[1]`);
  }

  // Order details for CTP
  orderDetailsForCTP() {
    return this.page.locator(`//span[text()="Précisions sur la commande pour le cotransporteur"]/following::span[1]`);
  }


  // CTP block
  // Report the CTP button
  async reportCTPButton() {
    return this.page.locator(`//span[text()='Cotransporteur']/following::button[1]`).click();
  }

  // Report made message locator
  reportMadeMessage() {
    return this.page.locator(`//span[text()='Cotransporteur']/following::span[1]`);
  }

  // Report CTP modal
    // Fill description of the report in modal with retry mechanism to handle modal animation
    async fillDescriptionReportInModal(text: string, maxRetries: number = 3): Promise<void> {
      const descriptionTextArea = this.page.locator(`//textarea[@id='description']`);

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        await descriptionTextArea.click();
        await descriptionTextArea.fill(text);

        const descriptionReportApplied = await this.checkDescriptionReportIsApplied();
        if (descriptionReportApplied) return; // Success, exit

        if (attempt === maxRetries - 1) {
          throw new Error(`Failed to fill textarea after ${maxRetries} attempts. Save button did not become enabled.`);
        }
      }
    }
    // Save the report description
    async checkAndClickSaveButtonInCTPModal() {
      const saveButton = this.getCTPReportSaveButton();
      await expect(saveButton).toBeEnabled();
      await saveButton.click();
    }
    /**
    * Returns the locator for the "Envoyer" (Send) button in the CTP report modal.
    *
    * @returns Locator for the send button
    */
    private getCTPReportSaveButton() {
      return this.page.locator(
        `//span[text()='Signaler le cotransporteur']/ancestor::div[@class='ant-modal-header']/following-sibling::div[@class='ant-modal-footer']/button[.//span[text()='Envoyer']]`
      );
    }

  /**
   * Checks if the description report has been successfully applied in the CTP report modal.
   * Uses a specific locator for the "Envoyer" button in this modal (different from generic "Mettre à jour" button).
   *
   * @param timeout - Maximum time to wait for button to be enabled (default: 1000ms)
   * @returns true if description is applied (button enabled), false otherwise
   */
  private async checkDescriptionReportIsApplied(timeout: number = 1000): Promise<boolean> {
    const saveButton = this.getCTPReportSaveButton();
    try {
      await expect(saveButton).toBeEnabled({ timeout });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generic method to click an input (checkbox/radio) in a modal with retry mechanism to handle modal animation.
   * Retries the click operation until the save button becomes enabled.
   *
   * @param locator - The input locator
   * @param modalTitle - The title of the modal
   * @param maxRetries - Maximum number of retry attempts (default: 3)
   */
  private async clickInputInModalWithRetry(
    locator: ReturnType<Page['locator']>,
    modalTitle: string,
    maxRetries: number = 3
  ): Promise<void> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      await locator.click();

      const actionApplied = await this.checkActionIsApplied(modalTitle);
      if (actionApplied) return; // Success, exit

      if (attempt === maxRetries - 1) {
        throw new Error(`Failed to click input after ${maxRetries} attempts. Save button did not become enabled.`);
      }
    }
  }

  /**
   * Generic method to fill a textarea in a modal with retry mechanism to handle modal animation.
   * Retries the fill operation until the save button becomes enabled.
   *
   * @param locator - The textarea locator
   * @param text - The text to fill
   * @param modalTitle - The title of the modal
   * @param maxRetries - Maximum number of retry attempts (default: 3)
   */
  private async fillTextareaInModalWithRetry(
    locator: ReturnType<Page['locator']>,
    text: string,
    modalTitle: string,
    maxRetries: number = 3
  ): Promise<void> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      await locator.click();
      await locator.clear();
      await locator.fill(text);

      const actionApplied = await this.checkActionIsApplied(modalTitle);
      if (actionApplied) return; // Success, exit

      if (attempt === maxRetries - 1) {
        throw new Error(`Failed to fill textarea after ${maxRetries} attempts. Save button did not become enabled.`);
      }
    }
  }

  /**
   * Checks if an action applied in a modal has been successfully registered.
   * Verifies that the "Mettre à jour" (Save) button is enabled, proving the action wasn't reset.
   *
   * @param modalTitle - The title of the modal
   * @param timeout - Maximum time to wait for button to be enabled (default: 1000ms)
   * @returns true if action is applied (button enabled), false otherwise
   */
  private async checkActionIsApplied(modalTitle: string, timeout: number = 1000): Promise<boolean> {
    const saveButton = this.getSaveButtonInModal(modalTitle);
    try {
      await expect(saveButton).toBeEnabled({ timeout });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Returns the locator for the "Mettre à jour" (Save) button in a modal.
   *
   * @param modalTitle - The title of the modal
   * @returns Locator for the save button
   */
  getSaveButtonInModal(modalTitle: string) {
    return this.page.locator(
      `//div[text()='${modalTitle}']/parent::div[@class='ant-modal-header']/following-sibling::div[@class='ant-modal-footer']/button[.//span[text()='Mettre à jour']]`
    );
  }

  /**
   * Checks that an action is applied in the modal and clicks the save button.
   * Ensures the save button is enabled before clicking (with Playwright auto-retry).
   *
   * @param modalTitle - The title of the modal
   */
  async checkAndClickSaveButtonInModal(modalTitle: string) {
    const saveButton = this.getSaveButtonInModal(modalTitle);
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
  }

};
