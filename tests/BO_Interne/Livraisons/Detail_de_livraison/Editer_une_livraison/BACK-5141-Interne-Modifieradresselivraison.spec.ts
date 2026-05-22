import { testInterne as test, expect } from '@fixtures/auth.fixture';
import { createDeliveryAPI, buildAndGotoDeliveryURL } from '@utils/Helpers/createDeliveryAPI.helpers';
import * as drives from '@testdata/drives.json';
import * as users from '@testdata/users.json';
import { InternalDeliveryDetails } from '@pages/BO_Interne/Livraisons/Liste_des_livraisons/Detail_de_livraison/InternalDeliveryDetails';
import { InternalDeliveryPage } from '@pages/BO_Interne/Livraisons/InternalDeliveryPage';
import { getRandomWithIndex } from '@utils/Helpers/random.helpers';
import { DeliveryDetailsSuccessMessage } from '@pages/BO_Both/SuccessMessages';

test.describe(`BACK-5141 - Modifier l'adresse de livraison @Sb9339069`, () => {
  let deliveryAddress: InternalDeliveryDetails;
  let saveDeliveryChanges: InternalDeliveryPage;
  let deliveryDetailsSuccessMessage: DeliveryDetailsSuccessMessage;
  
  test.beforeEach(async ({ page }) => {
    deliveryAddress = new InternalDeliveryDetails(page);
    saveDeliveryChanges = new InternalDeliveryPage(page);
    deliveryDetailsSuccessMessage = new DeliveryDetailsSuccessMessage(page);

    // Create delivery via API and navigate to it
    await buildAndGotoDeliveryURL(page, await createDeliveryAPI(drives.drive_alim1,users.recipient_interne));
  });

  test(`Statut "Disponible" - Modifier Adresse de Livraison - passant @Tb83f9f93`, async ({ page }) => {
    // Fill Select and note new address
    await deliveryAddress.fillAndSelectAddress('Shopopop France');
    const newAddress = await deliveryAddress.searchAddressLocator().innerText();

    // Save changes
    await saveDeliveryChanges.clickDeliveryDetailsSaveButton();
  
    // Check that a success alert is displayed and close the toaster
    await deliveryDetailsSuccessMessage.deliveryUpdateSuccessToaster(deliveryDetailsSuccessMessage.details);
  
    // Check that Search address has been updated
    await expect(deliveryAddress.searchAddressLocator()).toHaveText(newAddress!);
    // Check that original address has been changed
    await expect(deliveryAddress.originalAddress()).toHaveText(newAddress!);
  });

   test(`Distance de livraison mise à jour suite à une modification de l'adresse @Tb75380e2`, async ({ page }) => {
    // Note the original delivery distance
    const originalDeliveryDistanceInAddress = await deliveryAddress.deliveryDistance().innerText();
    const originalDistanceValueInOverallDetail = await deliveryAddress.distanceValue().innerText();

    // Fill and select new address
    await deliveryAddress.fillAndSelectAddress('Shopopop France');

    // Check that delivery distance is updated
    await expect(deliveryAddress.deliveryDistance()).not.toHaveText(originalDeliveryDistanceInAddress);

    // Save changes
    await saveDeliveryChanges.clickDeliveryDetailsSaveButton();
  
    // Check that a success alert is displayed and close the toaster
    await deliveryDetailsSuccessMessage.deliveryUpdateSuccessToaster(deliveryDetailsSuccessMessage.details);
  
    // Check that Distance, in the overall detail, has been updated
    await expect(deliveryAddress.distanceValue()).not.toHaveText(originalDistanceValueInOverallDetail);
  });

  test(`Statut "Disponible" - Modifier Ascenseur @Tba741627`, async ({ page }) => {
    // Change elevator (payload send 'no' by default, see recipient_interne in users.json)
    const newElevator = getRandomWithIndex(deliveryAddress.elevatorOptions.filter(o => o !== 'no')).value;
    await deliveryAddress.checkElevator(newElevator);
    
    // Save changes
    await saveDeliveryChanges.clickDeliveryDetailsSaveButton();
    
    // Check that a success alert is displayed and close the toaster
    await deliveryDetailsSuccessMessage.deliveryUpdateSuccessToaster(deliveryDetailsSuccessMessage.details);
    
    // Check that elevator value has been updated
    await expect(deliveryAddress.currentElevator()).toHaveAttribute('value', newElevator);
  });

  test(`Statut "Disponible" - Modifier Etage - passant @Tad924504`, async ({ page }) => {
    // Increase floor by 1 unit
    await deliveryAddress.clickIncreaseFloorButton();
    // Save new floor value for later verification
    const newFloorValue = await deliveryAddress.floorInputField().getAttribute('value');

    // Save changes
    await saveDeliveryChanges.clickDeliveryDetailsSaveButton();
    
    // Check that a success alert is displayed and close the toaster
    await deliveryDetailsSuccessMessage.deliveryUpdateSuccessToaster(deliveryDetailsSuccessMessage.details);

    // Check that floor value has been updated
    await page.reload();
    await expect(deliveryAddress.floorInputField()).toHaveValue(newFloorValue!);
  });

});