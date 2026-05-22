import { testInterne as test, expect } from '@fixtures/auth.fixture';
import { createDeliveryAPI, buildAndGotoDeliveryURL } from '@utils/Helpers/createDeliveryAPI.helpers';
import { ChangeDelivery } from '@pages/BO_Interne/Livraisons/Liste_des_livraisons/Detail_de_livraison/ChangeDelivery';
import { InternalDeliveryPage } from '@pages/BO_Interne/Livraisons/InternalDeliveryPage';
import { DeliveryDetailsSuccessMessage } from '@pages/BO_Both/SuccessMessages';
import { InternalDeliveryDetails } from '@pages/BO_Interne/Livraisons/Liste_des_livraisons/Detail_de_livraison/InternalDeliveryDetails';


test.describe(`BACK-4613 - Décalage de livraison @Sc13f9da8`, () => {
  let changeDayDateTimeSlot: ChangeDelivery;
  let saveDeliveryChanges: InternalDeliveryPage;
  let deliveryDetailsSuccessMessage: DeliveryDetailsSuccessMessage;
  let deliveryDateAndTimeSlot: InternalDeliveryDetails;
  
  test.beforeEach(async ({ page }) => {
    changeDayDateTimeSlot = new ChangeDelivery(page);
    saveDeliveryChanges = new InternalDeliveryPage(page);
    deliveryDetailsSuccessMessage = new DeliveryDetailsSuccessMessage(page);
    deliveryDateAndTimeSlot = new InternalDeliveryDetails(page);

    // Create delivery via API and navigate to it
    await buildAndGotoDeliveryURL(page, (await createDeliveryAPI()).id);
  });

  // Helper function to convert date in "DD/MM/YYYY" format to "D month YYYY" format in French
  async function convertDateToFrenchFormat(date: string) {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  test(`Statut "Disponible" - Décalage Jour et Créneau - passant @Td3945aca`, async ({ page }) => { // old delivery detail page version
    // Edit day (in text) and time slot
    // Select delivery day in text
    const dayInText = changeDayDateTimeSlot.deliveryDayInText[1]; // the day after tomorrow
    await changeDayDateTimeSlot.clickDeliveryDayInText(dayInText);

    // Select new time slot (start at 11:15)
    const startHour = '11'
    const startMinutes = '15'
    await changeDayDateTimeSlot.deliveryStartTimeGlobal().click();
    await changeDayDateTimeSlot.clickDeliveryStartTimeHour(startHour);
    await changeDayDateTimeSlot.clickDeliveryStartTimeMinutes(startMinutes);
    await expect(changeDayDateTimeSlot.deliveryStartTimeGlobal()).toHaveAttribute('value', `${startHour}:${startMinutes}`);
    await deliveryDateAndTimeSlot.deliveryDate().click(); // Click outside to close time picker

    // Save changes
    await saveDeliveryChanges.clickDeliveryDetailsSaveButton();

    // Check that the right success alert is displayed and close the toaster
    await deliveryDetailsSuccessMessage.deliveryUpdateSuccessToaster(deliveryDetailsSuccessMessage.details);

    // Refresh page to check values from database
    await page.reload();
    await deliveryDateAndTimeSlot.waitForDistanceLoading();

    // Check that delivery date in text has been updated (case-insensitive comparison)
    await expect(deliveryDateAndTimeSlot.deliveryDateValue()).toHaveText(new RegExp(dayInText, 'i'));

    // Check that time slot has been updated
    await expect(deliveryDateAndTimeSlot.timeSlot()).toContainText(`${startHour}h${startMinutes}`);
  });

  test.fixme(`NEW - Statut "Disponible" - Décalage Jour et Créneau - passant @Td3945aca`, async ({ page }) => { // New version of the delivery detail page
    // Edit day (in text) and time slot
    // Select delivery day in text
    const dayInText = changeDayDateTimeSlot.deliveryDayInText[1]; // the day after tomorrow
    await changeDayDateTimeSlot.clickDeliveryDayInText(dayInText);

    // Select new time slot (start at 11:15)
    const startHour = '11'
    const startMinutes = '15'
    await changeDayDateTimeSlot.deliveryStartTimeGlobal().click();
    await changeDayDateTimeSlot.deliveryStartTimeHour(startHour).click();
    await changeDayDateTimeSlot.deliveryStartTimeMinutes(startMinutes).click();
    await expect(changeDayDateTimeSlot.deliveryStartTimeGlobal()).toHaveAttribute('value', `${startHour}:${startMinutes}`);
    await deliveryDateAndTimeSlot.deliveryDate().click(); // Click outside to close time picker
    await expect(changeDayDateTimeSlot.deliveryStartTimeHour(startHour)).toBeHidden(); // Check that time picker is closed

    // Save changes
    await saveDeliveryChanges.clickDeliveryDetailsSaveButton();

    // Check that the right success alert is displayed and close the toaster
    await deliveryDetailsSuccessMessage.deliveryUpdateSuccessToaster(deliveryDetailsSuccessMessage.details);

    // Refresh page to check values from database
    await page.reload();
    await deliveryDateAndTimeSlot.waitForDistanceLoading();

    // Check that delivery date in text has been updated (case-insensitive comparison)
    await expect(deliveryDateAndTimeSlot.deliveryDateValue()).toHaveText(new RegExp(dayInText, 'i'));

    // Check that time slot has been updated
    await expect(deliveryDateAndTimeSlot.timeSlot()).toContainText(`${startHour}h${startMinutes}`);
  });

  test(`Statut "Disponible" - Date calendrier - passant @T8c19a4d3`, async ({ page }) => {
    // Select date in calendar
    await changeDayDateTimeSlot.accessCalendar();
    let newSelectedDate = await changeDayDateTimeSlot.dayInCalendar().getAttribute('title'); // Get selected date for later verification format "2026-02-01".
    await changeDayDateTimeSlot.selectDayInCalendar(); // Select the second day after tomorrow
    await expect(changeDayDateTimeSlot.dayInCalendar()).toBeHidden(); // Check that calendar is closed
    
    // Get date in text from selected date
    newSelectedDate = await convertDateToFrenchFormat(newSelectedDate!);

    // Save changes
    await saveDeliveryChanges.clickDeliveryDetailsSaveButton();

    // Check that the right success alert is displayed and close the toaster
    await deliveryDetailsSuccessMessage.deliveryUpdateSuccessToaster(deliveryDetailsSuccessMessage.details);

    // Refresh page to check values from database
    await page.reload();
    await deliveryDateAndTimeSlot.waitForDistanceLoading();

    // Check that delivery date in text has been updated
    await expect(deliveryDateAndTimeSlot.deliveryDateValue()).toContainText(newSelectedDate);
  });

  test(`Date initiale de livraison barrée dans le détail @T0d4c22d9`, async ({ page }) => {
    // Record initial delivery date from calendar and convert to French format
    await changeDayDateTimeSlot.accessCalendar();
    let initialDeliveryDate = await changeDayDateTimeSlot.initialISODeliveryDateInCalendar().getAttribute('title');
    initialDeliveryDate = await convertDateToFrenchFormat(initialDeliveryDate!);
    await changeDayDateTimeSlot.selectDayInCalendar(); // Select new date : the second day after tomorrow
    await expect(changeDayDateTimeSlot.dayInCalendar()).toBeHidden(); // Check that calendar is closed

    // Save changes
    await saveDeliveryChanges.clickDeliveryDetailsSaveButton();

    // Check that the right success alert is displayed and close the toaster
    await deliveryDetailsSuccessMessage.deliveryUpdateSuccessToaster(deliveryDetailsSuccessMessage.details);

    // Refresh page to check values from database
    await page.reload();
    await deliveryDateAndTimeSlot.waitForDistanceLoading();

    // Check that initial delivery date in text is displayed as struck through below the new delivery date
    await expect(deliveryDateAndTimeSlot.initialDeliveryDateValue()).toContainText(initialDeliveryDate);
  });

  test(`Compteur de modifications de la date de livraison dans le détail @T2a79ef05`, async ({ page }) => {
    // The delivery date change counter increments with each change.
    for (let compteur = 1; compteur <= 2; compteur++) {
      // Select new date : the second day after current selected date
      await changeDayDateTimeSlot.accessCalendar();
      await changeDayDateTimeSlot.selectDayInCalendar();
      await expect(changeDayDateTimeSlot.dayInCalendar()).toBeHidden(); // Check that calendar is closed

      // Save changes
      await saveDeliveryChanges.clickDeliveryDetailsSaveButton();

      // Check that the right success alert is displayed and close the toaster
      await deliveryDetailsSuccessMessage.deliveryUpdateSuccessToaster(deliveryDetailsSuccessMessage.details);

      // Refresh page to check values from database
      await page.reload();
      await deliveryDateAndTimeSlot.waitForDistanceLoading();

      // Verify the counter increments correctly
      await expect(deliveryDateAndTimeSlot.deliveryDateChangeCounter()).toHaveText(`${compteur}`);
    }
  });
});