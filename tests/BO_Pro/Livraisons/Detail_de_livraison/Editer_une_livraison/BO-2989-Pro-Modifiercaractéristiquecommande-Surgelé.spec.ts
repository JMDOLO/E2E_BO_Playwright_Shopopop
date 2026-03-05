import { testPro as test, expect } from '@fixtures/auth.fixture';
import { createDeliveryAPI, buildAndGotoDeliveryURL } from '@utils/Helpers/createDeliveryAPI.helpers';
import { ProDeliveryDetails } from '@pages/BO_Pro/Livraisons/Liste_des_livraisons/Detail_de_livraison/ProDeliveryDetails';
import { DeliveryDetailsSuccessMessage } from '@pages/BO_Both/SuccessMessages';

test.describe(`BO-2989 - Modifier caractéristique commande - Surgelé @Sfaa3e560`, () => {
  test(`Statut "Disponible" - Alimentaire - Ajout caractéristique Surgelé - passant @Tec1756d7`, async ({ page }) => {

    // Create delivery via API and navigate to it
    await buildAndGotoDeliveryURL(page, await createDeliveryAPI());

    // Edit order details for CTP
    const orderDetails = new ProDeliveryDetails(page);
    // Click on edit order contents button
    await orderDetails.clickEditButton(orderDetails.orderContentsBlockTitle);
    
    // Check Frozen caracteristic in order contents modal (with retry mechanism for modal animation)
    await orderDetails.clickFrozenCharacteristicInModal();

    // Save the modifications (with check that action is applied)
    await orderDetails.checkAndClickSaveButtonInModal(orderDetails.orderContentModalTitle);
    
    // Check that a success alert is displayed and close the toaster
    const orderContentsSuccessMessage = new DeliveryDetailsSuccessMessage(page);
    await orderContentsSuccessMessage.deliveryUpdateSuccessToaster(orderContentsSuccessMessage.orderContent);

    // Check that the order caracteristic has been updated
    await expect(orderDetails.orderCharacteristic()).toHaveText('Surgelé');

  });
});