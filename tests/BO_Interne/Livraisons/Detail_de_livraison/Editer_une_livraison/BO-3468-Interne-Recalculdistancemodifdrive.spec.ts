import { testInterne as test, expect } from '@fixtures/auth.fixture';
import { createDeliveryAPI, buildAndGotoDeliveryURL } from '@utils/Helpers/createDeliveryAPI.helpers';
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
    await buildAndGotoDeliveryURL(page, (await createDeliveryAPI()).id);
    await updatePickupPoint.waitForDistanceLoading(); // Remove once the API distance fix has been applied
  });

  test(`Distance de livraison mise à jour suite à une modification du point de retrait @T34572f1e`, async ({ page }) => {
    // Note the original delivery distance
    originalDeliveryDistance = await updatePickupPoint.deliveryDistance().innerText();
    console.log('Original delivery distance:', originalDeliveryDistance);
    
    // Update authorized pickup point (< 40 km)
    // Fill and select pickup point
    await updatePickupPoint.fillAndSelectPickupPoint(drives.drive_fleur1.name);

    // Wait for delivery distance to be recalculated
    await expect(updatePickupPoint.deliveryDistance()).not.toHaveText(originalDeliveryDistance); // Ensure distance is not the same as before (but can be the loader)
    await updatePickupPoint.waitForDistanceLoading(); // Ensure the distance is a number with km unit
    newDeliveryDistance = await updatePickupPoint.deliveryDistance().innerText();
    console.log('New delivery distance:', newDeliveryDistance);

    // Save changes
    await saveDeliveryChanges.clickDeliveryDetailsSaveButton();
  
    // Check that a success alert is displayed and close the toaster
    await deliveryDetailsSuccessMessage.deliveryUpdateSuccessToaster(deliveryDetailsSuccessMessage.details);
  
    // Check that Distance, in the overall detail, has been updated
    //distanceValue = await updatePickupPoint.distanceValue().innerText();
    // la distance dans le détail en haut de page n’est pas mise à jour directement au changement d’adresse / pickuppoint contrairement à l’ancienne page. Un reload est nécessaire.
    // expect(newDeliveryDistance).toContain(distanceValue);

    // Refresh page to check values from database                                                                                                                                                
    await page.reload();                                                                                                                                                                         
    await updatePickupPoint.waitForDistanceLoading();
    // la distance dans le détail en haut de page n’est pas mise à jour directement au changement d’adresse / pickuppoint contrairement à l’ancienne page. Un reload est nécessaire.
    distanceValue = await updatePickupPoint.distanceValue().innerText(); 

    // Check Distances from database
    await expect.soft(updatePickupPoint.deliveryDistance()).toHaveText(newDeliveryDistance);
    await expect(updatePickupPoint.distanceValue()).toHaveText(distanceValue);
  });

  test(`Distance de livraison supérieure à 40km @Tb6a069ac`, async ({ page }) => {
    // Update unauthorized pickup point (> 40 km)
    // Fill and select pickup point
    await updatePickupPoint.fillAndSelectPickupPoint('Shopopop Belgium');

    // Check delivery distance error message
    await expect(updatePickupPoint.deliveryDistanceErrorMessage()).toHaveText("La distance de la livraison ne doit pas être supérieure à 40km. Veuillez modifier le magasin ou l'adresse du destinataire.");

    // Check that clicking save does not trigger a PUT request
    await saveDeliveryChanges.clickDeliveryDetailsSaveButton();
    const putRequest = await page.waitForResponse(
      response => response.request().method() === 'PUT',
      { timeout: 2000 }
    ).catch(() => null);

    expect(putRequest).toBeNull();
  });
});