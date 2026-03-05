import { testPro as test, expect } from '@fixtures/auth.fixture';
import { createDeliveryAPI, buildAndGotoDeliveryURL } from '@utils/Helpers/createDeliveryAPI.helpers';
import { ProDeliveryDetails } from '@pages/BO_Pro/Livraisons/Liste_des_livraisons/Detail_de_livraison/ProDeliveryDetails';
import { DeliveryDetailsSuccessMessage } from '@pages/BO_Both/SuccessMessages';

test.describe(`BO-1852 - Modifier le point de retrait @Sfecd91cf`, () => {
  let deliveryWithdrawal: ProDeliveryDetails;
  let deliveryWithdrawalSuccessMessage: DeliveryDetailsSuccessMessage;

  test.beforeEach(async ({ page }) => {
    deliveryWithdrawal = new ProDeliveryDetails(page);
    deliveryWithdrawalSuccessMessage = new DeliveryDetailsSuccessMessage(page);

    // Create delivery via API and navigate to it
    await buildAndGotoDeliveryURL(page, await createDeliveryAPI());

    // Click on edit delivery withdrawal button
    await deliveryWithdrawal.clickEditButton(deliveryWithdrawal.pickupPointBlockTitle);

    // Click on pickup point dropdown in modal
    await deliveryWithdrawal.clickPickupPointDropdown();
    // Select pickup point in modal
    await deliveryWithdrawal.selectPickupPoint('testAutoBOVin1');
  });

  test(`Statut "Disponible" - Modifier Point de Retrait - passant @T5d2885ab`, async ({ page }) => {
    // Save the modifications (with check that action is applied)
    await deliveryWithdrawal.checkAndClickSaveButtonInModal(deliveryWithdrawal.pickupPointModalTitle);
    
    // Check that a success alert is displayed and close the toaster
    await deliveryWithdrawalSuccessMessage.deliveryUpdateSuccessToaster(deliveryWithdrawalSuccessMessage.deliveryWithdrawal);

    // Check that pickup point has been updated
    await expect(deliveryWithdrawal.pickupPoint()).toHaveText('testAutoBOVin1');
  });

  test(`Distance mise à jour à la modification du Point de Retrait @Tfda0e7b9`, async ({ page }) => {
    // Note the original distance
    const originalDistance = await deliveryWithdrawal.distanceValue().innerText();

    // Check that distance in modal has been updated
    await expect(deliveryWithdrawal.getSaveButtonInModal(deliveryWithdrawal.pickupPointModalTitle)).toBeEnabled();
    const distanceInModal = await deliveryWithdrawal.distanceValueInPickupPointModal().innerText();
    expect(distanceInModal).not.toContain(originalDistance);

    // Save the modifications (with check that action is applied)
    await deliveryWithdrawal.checkAndClickSaveButtonInModal(deliveryWithdrawal.pickupPointModalTitle);
    
    // Check that a success alert is displayed and close the toaster
    await deliveryWithdrawalSuccessMessage.deliveryUpdateSuccessToaster(deliveryWithdrawalSuccessMessage.deliveryWithdrawal);

    // Check that distance has been updated
    await expect(deliveryWithdrawal.distanceValue()).not.toHaveText(originalDistance);
  });
});