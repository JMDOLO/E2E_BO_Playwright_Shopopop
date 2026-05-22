import { testInterne as test, expect } from '@fixtures/auth.fixture';
import { createDeliveryAPI, buildAndGotoDeliveryURL } from '@utils/Helpers/createDeliveryAPI.helpers';
import * as users from '@testdata/users.json';
import * as drives from '@testdata/drives.json';
import { InternalDeliveryDetails } from '@pages/BO_Interne/Livraisons/Liste_des_livraisons/Detail_de_livraison/InternalDeliveryDetails';
import { InternalDeliveryPage } from '@pages/BO_Interne/Livraisons/InternalDeliveryPage';
import { DeliveryDetailsSuccessMessage } from '@pages/BO_Both/SuccessMessages';

test.describe(`BACK-4619 - Modifier le point de retrait @S6a021de1`, () => {
  let updatePickupPoint: InternalDeliveryDetails;
  let saveDeliveryChanges: InternalDeliveryPage;
  let deliveryDetailsSuccessMessage: DeliveryDetailsSuccessMessage;

  test.beforeEach(async ({ page }) => {
    updatePickupPoint = new InternalDeliveryDetails(page);
    saveDeliveryChanges = new InternalDeliveryPage(page);
    deliveryDetailsSuccessMessage = new DeliveryDetailsSuccessMessage(page);

    // Create delivery via API and navigate to it
    await buildAndGotoDeliveryURL(page, await createDeliveryAPI(drives.drive_alim1,users.recipient_interne));

    // Update pickup point
    // Fill and pickup point
    await updatePickupPoint.fillAndSelectPickupPoint(drives.drive_fleur1.name);

    // Save changes
    await saveDeliveryChanges.clickDeliveryDetailsSaveButton();

    // Check that the right success alert is displayed and close the toaster
    await deliveryDetailsSuccessMessage.deliveryUpdateSuccessToaster(deliveryDetailsSuccessMessage.details);
  });

  test(`Modifier le point de retrait @T7d75a26d`, async ({ page }) => {
    // Check that pickup point name has been added
    await expect(updatePickupPoint.inputPickupPoint()).toHaveAttribute('value', drives.drive_fleur1.name);

  });

  test(`Mise à jour du numéro de téléphone du drive @T3370c18a`, async ({ page }) => {
    // Check that pickup point phone number has been updated
    await expect(updatePickupPoint.pickupPointPhoneNumber()).toHaveText(drives.drive_fleur1.phone);

  });

  test(`Mise à jour du lien du drive @Ta346cb37`, async ({ page }) => {
    // Access pickup point information sheet
    await updatePickupPoint.clickPickupPointInformationSheet();

    // Check that pickup point link has been updated
    await expect(updatePickupPoint.driveLinkinModal()).toContainText(`/drives/${drives.drive_fleur1.id}`);

  });
});