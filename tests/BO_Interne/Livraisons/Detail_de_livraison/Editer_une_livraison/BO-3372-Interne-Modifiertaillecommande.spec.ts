import { testInterne as test, expect } from '@fixtures/auth.fixture';
import { linkTest } from '@testomatio/reporter';
import { createDeliveryAPI, buildAndGotoDeliveryURL } from '@utils/Helpers/createDeliveryAPI.helpers';
import * as drives from '@testdata/drives.json';
import * as users from '@testdata/users.json';
import { InternalDeliveryDetails } from '@pages/BO_Interne/Livraisons/Liste_des_livraisons/Detail_de_livraison/InternalDeliveryDetails';
import { InternalDeliveryPage } from '@pages/BO_Interne/Livraisons/InternalDeliveryPage';
import { getRandomWithIndex } from '@utils/Helpers/random.helpers';
import { DeliveryDetailsSuccessMessage } from '@pages/BO_Both/SuccessMessages';

test.describe(`BO-3372 - BO Interne - Modifier taille de la commande @S29f2175c`, () => {
  let orderSize: InternalDeliveryDetails;
  let saveDeliveryChanges: InternalDeliveryPage;
  let deliveryDetailsSuccessMessage: DeliveryDetailsSuccessMessage;
  
  test.beforeEach(async ({ page }) => {
    orderSize = new InternalDeliveryDetails(page);
    saveDeliveryChanges = new InternalDeliveryPage(page);
    deliveryDetailsSuccessMessage = new DeliveryDetailsSuccessMessage(page);
  });

  test(`Statut "Disponible" - Modifier taille commande - passant @Te8726458`, async ({ page }) => {
    linkTest('@T9340a27d');
    
    // Create delivery via API and navigate to it
    await buildAndGotoDeliveryURL(page, await createDeliveryAPI(drives.drive_alim1,users.recipient_interne));

    // Initial order size
    const initialOrderSize = await orderSize.orderSizeValue().getAttribute('title');
    
    // Click order size dropdown
    await orderSize.clickOrderSizeDropdown();
    // Select order size in modal (different from initial order size)
    const filteredOptions = orderSize.orderSizeOptions.filter(opt => opt !== initialOrderSize);
    const { value: newOrderSize } = getRandomWithIndex(filteredOptions);
    await orderSize.selectOrderSize(newOrderSize);

    // Save changes
    await saveDeliveryChanges.clickDeliveryDetailsSaveButton();
  
    // Check that a success alert is displayed and close the toaster
    await deliveryDetailsSuccessMessage.deliveryUpdateSuccessToaster(deliveryDetailsSuccessMessage.details);
  
    // Check that order size has been updated
    await expect(orderSize.orderSizeValue()).toHaveAttribute('title', newOrderSize);
  });
});