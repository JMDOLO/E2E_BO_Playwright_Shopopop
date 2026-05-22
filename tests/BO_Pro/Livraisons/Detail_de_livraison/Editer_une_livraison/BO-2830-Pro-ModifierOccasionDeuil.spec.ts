import { testPro as test, expect } from '@fixtures/auth.fixture';
import { createDeliveryAPI, buildAndGotoDeliveryURL } from '@utils/Helpers/createDeliveryAPI.helpers';
import * as drives from '@testdata/drives.json';
import { ProDeliveryDetails } from '@pages/BO_Pro/Livraisons/Liste_des_livraisons/Detail_de_livraison/ProDeliveryDetails';
import { DeliveryDetailsSuccessMessage } from '@pages/BO_Both/SuccessMessages';

test.describe(`BO-2830 - BO Pro - Modifier occasion "Deuil" dans le détail @Sce447882`, () => {
  test(`Modifier occasion "Sans événement" en "Deuil" @T6d1289c7`, async ({ page }) => {

    // Create delivery via API, for a florist, and navigate to it
    await buildAndGotoDeliveryURL(page, await createDeliveryAPI(drives.drive_fleur1));

    // Edit order informations
    const orderInformations = new ProDeliveryDetails(page);
    // Click on edit order informations button
    await orderInformations.clickEditButton(orderInformations.orderInformationsBlockTitle);
    
    // Check Grief event in order informations modal (with retry mechanism for modal animation)
    await orderInformations.clickGriefEventInModal();

    // Save the modifications (with check that action is applied)
    await orderInformations.checkAndClickSaveButtonInModal(orderInformations.orderInformationsModalTitle);

    // Check that a success alert is displayed and close the toaster -> attente fix BO-3782 
    const orderInformationsSuccessMessage = new DeliveryDetailsSuccessMessage(page);
    await orderInformationsSuccessMessage.deliveryUpdateSuccessToaster(orderInformationsSuccessMessage.orderInformations);

    // Check that the delivery event has been updated
    await expect(orderInformations.orderEvent()).toHaveText('Deuil');

  });
});