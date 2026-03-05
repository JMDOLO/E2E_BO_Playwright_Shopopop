import { testInterne as test, expect } from '@fixtures/auth.fixture';
import { createDeliveryAPI, buildAndGotoDeliveryURL } from '@utils/Helpers/createDeliveryAPI.helpers';
import * as users from '@testdata/users.json';
import * as drives from '@testdata/drives.json';
import { InternalDeliveryDetails } from '@pages/BO_Interne/Livraisons/Liste_des_livraisons/Detail_de_livraison/InternalDeliveryDetails';
import { InternalDeliveryPage } from '@pages/BO_Interne/Livraisons/InternalDeliveryPage';
import { DeliveryDetailsSuccessMessage } from '@pages/BO_Both/SuccessMessages';

test.describe(`BO-3468 - Recalculer la distance suite à la modif d'un drive sur la livraison @S2eaa020a`, () => {
  let originalDeliveryDistance: string;
  let updatePickupPoint: InternalDeliveryDetails;
  let newDeliveryDistance: string;
  let saveDeliveryChanges: InternalDeliveryPage;
  let deliveryDetailsSuccessMessage: DeliveryDetailsSuccessMessage;
  let distanceValue: string;

  test.beforeEach(async ({ page }) => {
    updatePickupPoint = new InternalDeliveryDetails(page);
    saveDeliveryChanges = new InternalDeliveryPage(page);
    deliveryDetailsSuccessMessage = new DeliveryDetailsSuccessMessage(page);

    // Create delivery via API and navigate to it
    await buildAndGotoDeliveryURL(page, await createDeliveryAPI(drives.drive_alim1,users.recipient_interne));

    // Note the original delivery distance
    originalDeliveryDistance = await updatePickupPoint.deliveryDistance().innerText();

    // Update pickup point
    // Fill and pickup point
    await updatePickupPoint.fillAndSelectPickupPoint(drives.drive_fleur1.name);
  });

  test(`Distance de livraison mise à jour suite à une modification du point de retrait @T34572f1e`, async () => { // A utiliser quand BO-3468 merge
    // Check that delivery distance is updated
    newDeliveryDistance = await updatePickupPoint.deliveryDistance().innerText();
    expect(originalDeliveryDistance).not.toBe(newDeliveryDistance);

    // Save changes
    await saveDeliveryChanges.clickDeliveryDetailsSaveButton();
  
    // Check that a success alert is displayed and close the toaster
    await deliveryDetailsSuccessMessage.deliveryUpdateSuccessToaster(deliveryDetailsSuccessMessage.details);
  
    // Check that Distance, in the overall detail, has been updated
    distanceValue = await updatePickupPoint.distanceValue().innerText();
    expect(newDeliveryDistance).toContain(distanceValue.replace('.', ','));
  });
});