import { testPro as test, expect } from '@fixtures/auth.fixture';
import { linkTest } from '@testomatio/reporter';
import { createDeliveryAPI, buildAndGotoDeliveryURL } from '@utils/Helpers/createDeliveryAPI.helpers';
import { ProDeliveryDetails } from '@pages/BO_Pro/Livraisons/Liste_des_livraisons/Detail_de_livraison/ProDeliveryDetails';
import { getRandomWithIndex } from '@utils/Helpers/random.helpers';
import { DeliveryDetailsSuccessMessage } from '@pages/BO_Both/SuccessMessages';

test.describe(`BO-3372 - BO Pro - Modifier taille de la commande @S46b6720d`, () => {
  let orderSize: ProDeliveryDetails;
  let orderContentsSuccessMessage: DeliveryDetailsSuccessMessage;

  test.beforeEach(async ({ page }) => {
    orderSize = new ProDeliveryDetails(page);
    orderContentsSuccessMessage = new DeliveryDetailsSuccessMessage(page);
  });

  test(`Statut "Disponible" - Modifier taille commande - passant @Tf49a6b42`, async ({ page }) => {
    linkTest('@T396ee3da');

    // Create delivery via API and navigate to it
    await buildAndGotoDeliveryURL(page, await createDeliveryAPI());

    // Initial order size
    const initialOrderSize = await orderSize.orderSizeValue().innerText();

    // Click on edit order contents button
    await orderSize.clickEditButton(orderSize.orderContentsBlockTitle);
    
    // Click order size dropdown in modal
    await orderSize.clickOrderSizeDropdownInModal();
    // Select order size in modal (different from initial order size)
    const filteredOptions = orderSize.orderSizeOptions.filter(opt => opt !== initialOrderSize);
    const { value: newOrderSize } = getRandomWithIndex(filteredOptions);
    await orderSize.selectOrderSizeInModal(newOrderSize);

    // Save the modifications (with check that action is applied)
    await orderSize.checkAndClickSaveButtonInModal(orderSize.orderContentModalTitle);
    
    // Check that a success alert is displayed and close the toaster
    await orderContentsSuccessMessage.deliveryUpdateSuccessToaster(orderContentsSuccessMessage.orderContent);

    // Check that order size has been updated
    await expect(orderSize.orderSizeValue()).toHaveText(newOrderSize);

  });
});