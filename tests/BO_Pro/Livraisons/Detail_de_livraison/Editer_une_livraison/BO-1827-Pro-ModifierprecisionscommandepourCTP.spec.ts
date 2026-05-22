import { testPro as test, expect } from '@fixtures/auth.fixture';
import { createDeliveryAPI, buildAndGotoDeliveryURL } from '@utils/Helpers/createDeliveryAPI.helpers';
import { ProDeliveryDetails } from '@pages/BO_Pro/Livraisons/Liste_des_livraisons/Detail_de_livraison/ProDeliveryDetails';
import { faker } from '@faker-js/faker';
import { DeliveryDetailsSuccessMessage } from '@pages/BO_Both/SuccessMessages';

test.describe(`BO-1827 - Modifier précisions commande pour CTP @Sea565dc2`, () => {
  test(`Statut "Disponible" - Modifier précisions pour CTP - passant @T87338785`, async ({ page }) => {

    // Create delivery via API and navigate to it
    await buildAndGotoDeliveryURL(page, await createDeliveryAPI());

    // Edit order details for CTP
    const orderDetails = new ProDeliveryDetails(page);
    // Click on edit order contents button
    await orderDetails.clickEditButton(orderDetails.orderContentsBlockTitle);
    
    // Fill order details for CTP in order contents modal (with retry mechanism for modal animation)
    const newOrderDetailsForCTP = faker.string.alphanumeric(25);
    await orderDetails.fillOrderDetailsForCTPInModal(newOrderDetailsForCTP);

    // Save the modifications (with check that action is applied)
    await orderDetails.checkAndClickSaveButtonInModal(orderDetails.orderContentModalTitle);
    
    // Check that a success alert is displayed and close the toaster
    const orderContentsSuccessMessage = new DeliveryDetailsSuccessMessage(page);
    await orderContentsSuccessMessage.deliveryUpdateSuccessToaster(orderContentsSuccessMessage.orderContent);

    // Check that order details for CTP has been updated
    await expect(orderDetails.orderDetailsForCTP()).toHaveText(newOrderDetailsForCTP);

  });
});