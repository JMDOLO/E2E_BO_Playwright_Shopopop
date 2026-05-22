import { testPro as test, expect } from '@fixtures/auth.fixture';
import { createDeliveryAPI, buildAndGotoDeliveryURL } from '@utils/Helpers/createDeliveryAPI.helpers';
import { ProDeliveryDetails } from '@pages/BO_Pro/Livraisons/Liste_des_livraisons/Detail_de_livraison/ProDeliveryDetails';
import { DeliveryDetailsSuccessMessage } from '@pages/BO_Both/SuccessMessages';
import { getRandomWithIndex } from '@utils/Helpers/random.helpers';
import { faker } from '@faker-js/faker';

test.describe(`BO-1887 - Modifier l'adresse de livraison @S895ace1c`, () => {
  let deliveryAddress: ProDeliveryDetails;

  test.beforeEach(async ({ page }) => {
    deliveryAddress = new ProDeliveryDetails(page);
    // Create delivery via API and navigate to it
    await buildAndGotoDeliveryURL(page, await createDeliveryAPI());

    // Edit delivery address
    // Click on edit order contents button
    await deliveryAddress.clickEditButton(deliveryAddress.addressBlockTitle);
    // Wait for modal to be fully loaded with backend data
    await deliveryAddress.waitForDistanceLoadingInModal();
  });

  test(`Statut "Disponible" - Modifier Adresse de Livraison - passant @T6488cf84`, async ({ page }) => {
    // Fill and select address in delivery address modal
    await deliveryAddress.fillAndSelectAddressInModal('Shopopop France');

    // Save the modifications (with check that action is applied)
    await deliveryAddress.waitForDistanceLoadingInModal();
    await deliveryAddress.checkAndClickSaveButtonInModal(deliveryAddress.addressModalTitle);

    // Check that a success alert is displayed and close the toaster
    const deliveryAddressSuccessMessage = new DeliveryDetailsSuccessMessage(page);
    await deliveryAddressSuccessMessage.deliveryUpdateSuccessToaster(deliveryAddressSuccessMessage.deliveryAddress);

    // Check that address has been updated
    await expect(deliveryAddress.deliveryAddress()).toContainText('Mail Pablo Picasso');
  });

  test(`Distance mise à jour à la modification de l'adresse @T7813df31`, async ({ page }) => {
    // Note the original distance
    const originalDistance = await deliveryAddress.distanceValue().innerText();
    
    // Fill and select address in delivery address modal
    await deliveryAddress.fillAndSelectAddressInModal('Shopopop France');

    // Check that distance in modal has been updated
    await expect(deliveryAddress.getSaveButtonInModal(deliveryAddress.addressModalTitle)).toBeEnabled();
    const distanceInModal = await deliveryAddress.distanceValueInAddressModal().innerText();
    expect(distanceInModal).not.toContain(originalDistance);

    // Save the modifications (with check that action is applied)
    await deliveryAddress.waitForDistanceLoadingInModal();
    await deliveryAddress.checkAndClickSaveButtonInModal(deliveryAddress.addressModalTitle);

    // Check that a success alert is displayed and close the toaster
    const deliveryAddressSuccessMessage = new DeliveryDetailsSuccessMessage(page);
    await deliveryAddressSuccessMessage.deliveryUpdateSuccessToaster(deliveryAddressSuccessMessage.deliveryAddress);

    // Check that distance has been updated
    await expect(deliveryAddress.distanceValue()).not.toHaveText(originalDistance);
  });

  test(`Statut "Disponible" - Modifier Etage - passant @T726836e4`, async ({ page }) => {
    // Increase floor in Modal by 1 unit
    await deliveryAddress.clickIncreaseFloorButton();
    // Save new floor value for later verification
    const floor = await deliveryAddress.floorInModal().getAttribute('value');

    // Save the modifications (with check that action is applied)
    await deliveryAddress.checkAndClickSaveButtonInModal(deliveryAddress.addressModalTitle);

    // Check that a success alert is displayed and close the toaster
    const deliveryAddressSuccessMessage = new DeliveryDetailsSuccessMessage(page);
    await deliveryAddressSuccessMessage.deliveryUpdateSuccessToaster(deliveryAddressSuccessMessage.deliveryAddress);

    // Check that address has been updated
    await expect(deliveryAddress.deliveryFloorAndElevator()).toContainText(`Étage(s): ${floor}`);
  });

  test(`Statut "Disponible" - Modifier Ascenseur - passant @T491849b6`, async ({ page }) => {
    // Change elevator in Modal (payload send 'no' by default, see recipient_pro in users.json)
    let newElevator = getRandomWithIndex(deliveryAddress.elevatorOptions.filter(o => o !== 'no')).value;
    await deliveryAddress.elevatorInModal(newElevator).check();
    newElevator = await deliveryAddress.currentElevatorValue().innerText();

    // Save the modifications (with check that action is applied)
    await deliveryAddress.checkAndClickSaveButtonInModal(deliveryAddress.addressModalTitle);

    // Check that a success alert is displayed and close the toaster
    const deliveryAddressSuccessMessage = new DeliveryDetailsSuccessMessage(page);
    await deliveryAddressSuccessMessage.deliveryUpdateSuccessToaster(deliveryAddressSuccessMessage.deliveryAddress);

    // Check that address has been updated
    await expect(deliveryAddress.deliveryFloorAndElevator()).toContainText(`Ascenseur: ${newElevator}`);
  });

  test(`Statut "Disponible" - Modifier Précisions Adresse - passant @T164d4e55`, async ({ page }) => {
    // Fill address details in modal (with retry mechanism for modal animation)
    const newAddressDetails = faker.string.alphanumeric(25);
    await deliveryAddress.fillAddressDetailsInModal(newAddressDetails);

    // Save the modifications (with check that action is applied)
    await deliveryAddress.checkAndClickSaveButtonInModal(deliveryAddress.addressModalTitle);

    // Check that a success alert is displayed and close the toaster
    const deliveryAddressSuccessMessage = new DeliveryDetailsSuccessMessage(page);
    await deliveryAddressSuccessMessage.deliveryUpdateSuccessToaster(deliveryAddressSuccessMessage.deliveryAddress);

    // Check that address has been updated
    await expect(deliveryAddress.addressDetails()).toHaveText(`${newAddressDetails}`);
  });
});