import { testPro as test, expect } from '@fixtures/auth.fixture';
import { createDeliveryAPI, buildAndGotoDeliveryURL } from '@utils/Helpers/createDeliveryAPI.helpers';
import { ProDeliveryDetails } from '@pages/BO_Pro/Livraisons/Liste_des_livraisons/Detail_de_livraison/ProDeliveryDetails';
import { DeliveryDetailsSuccessMessage } from '@pages/BO_Both/SuccessMessages';

test.describe(`BO-1856 - Décalage de livraison @S6b2f4bd0`, () => {
  test(`Statut "Disponible" - Décalage Date et Créneau - passant @T0b35df94`, async ({ page }) => {

    // Create delivery via API and navigate to it
    await buildAndGotoDeliveryURL(page, await createDeliveryAPI());

    // Edit date and time slot
    const dateTimeSlot = new ProDeliveryDetails(page);
    // Click on edit date and time slot button
    await dateTimeSlot.clickEditButton(dateTimeSlot.dateTimeSlotBlockTitle);
    
    // Select new delivery date (check the day after tomorrow)
    await dateTimeSlot.selectNewDeliveryDate();
    // Save the new delivery date
    const newDeliveryDate: string = await dateTimeSlot.newDeliveryDate().innerText();

    // Select new time slot (start at 11:15)
    const startHour = '11'
    const startMinutes = '15'
    await dateTimeSlot.clickDeliveryStartTimeGlobal();
    await dateTimeSlot.clickDeliveryStartTimeHour(startHour);
    await dateTimeSlot.clickDeliveryStartTimeMinutes(startMinutes);
    await dateTimeSlot.dateTimeModalTitle().click();

    // Save the modifications (with check that action is applied)
    await dateTimeSlot.checkAndClickSaveButtonInModal(dateTimeSlot.dateTimeSlotModalTitle);

    // Check that a success alert is displayed and close the toaster
    const dateTimeSlotSuccessMessage = new DeliveryDetailsSuccessMessage(page);
    await dateTimeSlotSuccessMessage.deliveryUpdateSuccessToaster(dateTimeSlotSuccessMessage.dateTimeSlot);

    // Check that delivery date has been updated (case-insensitive comparison)
    await expect(dateTimeSlot.deliveryDate()).toContainText(new RegExp(newDeliveryDate, 'i'));

    // Check that time slot has been updated
    await expect(dateTimeSlot.timeSlot()).toContainText(`${startHour}:${startMinutes}`);

  });
});