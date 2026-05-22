import { testInterne as test, expect } from '@fixtures/auth.fixture';
import { createDeliveryAPI, buildAndGotoDeliveryURL } from '@utils/Helpers/createDeliveryAPI.helpers';
import { InternalDeliveryDetails } from '@pages/BO_Interne/Livraisons/Liste_des_livraisons/Detail_de_livraison/InternalDeliveryDetails';
import { InternalDeliveryPage } from '@pages/BO_Interne/Livraisons/InternalDeliveryPage';
import { getRandomWithIndex } from '@utils/Helpers/random.helpers';
import { DeliveryDetailsSuccessMessage } from '@pages/BO_Both/SuccessMessages';

test.describe(`BACK-5141 - Modifier l'adresse de livraison @Sb9339069`, () => {
  let deliveryAddress: InternalDeliveryDetails;
  let saveDeliveryChanges: InternalDeliveryPage;
  let deliveryDetailsSuccessMessage: DeliveryDetailsSuccessMessage;
  let originalDistance: string;
  let newDeliveryDistance: string;
  let distanceValue: string;
  
  test.beforeEach(async ({ page }) => {
    deliveryAddress = new InternalDeliveryDetails(page);
    saveDeliveryChanges = new InternalDeliveryPage(page);
    deliveryDetailsSuccessMessage = new DeliveryDetailsSuccessMessage(page);

    // Create delivery via API and navigate to it
    await buildAndGotoDeliveryURL(page, (await createDeliveryAPI()).id);
  });

  test(`Statut "Disponible" - Modifier Adresse de Livraison - passant @Tb83f9f93`, async ({ page }) => {
    // Save original distance before modifying address
    originalDistance = await deliveryAddress.deliveryDistance().innerText();

    // Fill Select and note new address
    await deliveryAddress.fillAndSelectAddress('Shopopop France');

    // Wait for distance to be recalculated before saving
    await expect(deliveryAddress.deliveryDistance()).not.toHaveText(originalDistance);

    // Save changes
    await saveDeliveryChanges.clickDeliveryDetailsSaveButton();
  
    // Check that a success alert is displayed and close the toaster
    await deliveryDetailsSuccessMessage.deliveryUpdateSuccessToaster(deliveryDetailsSuccessMessage.details);

    // Refresh page to check values from database
    await page.reload();
    await deliveryAddress.waitForDistanceLoading();
  
    const newAddress = new RegExp(`Mail Pablo Picasso.*Nantes`);
    // Check that Search address has been updated
    await expect.soft(deliveryAddress.searchAddressLocator()).toContainText(newAddress);
    // Check that original address has been changed
    await expect(deliveryAddress.originalAddress()).toContainText(newAddress);
  });

   test(`Distance de livraison mise à jour suite à une modification de l'adresse @Tb75380e2`, async ({ page }) => {
    // Note the original delivery distance
    originalDistance = await deliveryAddress.deliveryDistance().innerText();

    // Fill and select new address
    await deliveryAddress.fillAndSelectAddress('Shopopop France');

    // Wait for delivery distance to be recalculated
    await expect(deliveryAddress.deliveryDistance()).not.toHaveText(originalDistance);
    newDeliveryDistance = await deliveryAddress.deliveryDistance().innerText();

    // Save changes
    await saveDeliveryChanges.clickDeliveryDetailsSaveButton();
  
    // Check that a success alert is displayed and close the toaster
    await deliveryDetailsSuccessMessage.deliveryUpdateSuccessToaster(deliveryDetailsSuccessMessage.details);

    // Refresh page to check values from database
    await page.reload();
    await deliveryAddress.waitForDistanceLoading();
  
    // Check that Distance, in the overall detail, has been updated
    distanceValue = await deliveryAddress.distanceValue().innerText();
    expect(newDeliveryDistance).toContain(distanceValue.replace('.', ','));
  });

   test(`Distance de livraison supérieure à 40km @Tf0d94739`, async ({ page }) => {
    // Update unauthorized delivery address (> 40 km)
    // Fill and select new address
    await deliveryAddress.fillAndSelectAddress('61 Rue Eugène Martin, Fontenay-sous-Bois');

    // Check delivery distance error message
    await expect(deliveryAddress.deliveryDistanceErrorMessage()).toHaveText("La distance de la livraison ne doit pas être supérieure à 40km. Veuillez modifier le magasin ou l'adresse du destinataire.");

    // Check that clicking save does not trigger a PUT request
    await saveDeliveryChanges.clickDeliveryDetailsSaveButton();
    const putRequest = await page.waitForResponse(
      response => response.request().method() === 'PUT',
      { timeout: 2000 }
    ).catch(() => null);

    expect(putRequest).toBeNull();
  });

  test(`Statut "Disponible" - Modifier Ascenseur @Tba741627`, async ({ page }) => {
    // Change elevator (payload send 'no' by default, see recipient_interne in users.json)
    const newElevator = getRandomWithIndex(deliveryAddress.elevatorOptions.filter(o => o !== 'no')).value;
    await deliveryAddress.checkElevator(newElevator);
    await deliveryAddress.waitForDistanceLoading(); // Remove once the API distance fix has been applied
    
    // Save changes
    await saveDeliveryChanges.clickDeliveryDetailsSaveButton();
    
    // Check that a success alert is displayed and close the toaster
    await deliveryDetailsSuccessMessage.deliveryUpdateSuccessToaster(deliveryDetailsSuccessMessage.details);

    // Refresh page to check values from database
    await page.reload();
    await deliveryAddress.waitForDistanceLoading();
    
    // Check that elevator value has been updated
    await expect(deliveryAddress.currentElevator()).toHaveAttribute('value', newElevator);
  });

  test(`Statut "Disponible" - Modifier Etage - passant @Tad924504`, async ({ page }) => {
    // Increase floor by 1 unit
    await deliveryAddress.clickIncreaseFloorButton();
    await deliveryAddress.waitForDistanceLoading(); // Remove once the API distance fix has been applied
    // Save new floor value for later verification
    const newFloorValue = await deliveryAddress.floorInputField().getAttribute('value');

    // Save changes
    await saveDeliveryChanges.clickDeliveryDetailsSaveButton();
    
    // Check that a success alert is displayed and close the toaster
    await deliveryDetailsSuccessMessage.deliveryUpdateSuccessToaster(deliveryDetailsSuccessMessage.details);

    // Refresh page to check values from database
    await page.reload();
    await deliveryAddress.waitForDistanceLoading();

    // Check that floor value has been updated
    await expect(deliveryAddress.floorInputField()).toHaveValue(newFloorValue!);
  });

});