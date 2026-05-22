import { testInterne as test, expect } from '@fixtures/auth.fixture';
import { createDeliveryAPI, buildAndGotoDeliveryURL } from '@utils/Helpers/createDeliveryAPI.helpers';
import * as users from '@testdata/users.json';
import { InternalDeliveryDetails } from '@pages/BO_Interne/Livraisons/Liste_des_livraisons/Detail_de_livraison/InternalDeliveryDetails';
import { DeliveryDetailsSuccessMessage } from '@pages/BO_Both/SuccessMessages';
import { ChangeDelivery } from '@pages/BO_Interne/Livraisons/Liste_des_livraisons/Detail_de_livraison/ChangeDelivery';

test.describe(`BACK-4628 - Ajouter un CTP @S1e0d1ba2`, () => {
  test(`Ajouter un CTP - passant @T3247f94a`, async ({ page }) => {

    // Create delivery via API and navigate to it
    await buildAndGotoDeliveryURL(page, (await createDeliveryAPI()).id);

    // Adding a CTP
    const addingCTP = new InternalDeliveryDetails(page);
    // Fill and select CTP
    await addingCTP.fillAndSelectCTP(users.CTP.email);

    // Validate adding CTP 
    await addingCTP.clickSaveButtonInAddingCTPModal();

    // Check that the right success alert is displayed and close the toaster
    const deliveryDetailsSuccessMessage = new DeliveryDetailsSuccessMessage(page);
    await deliveryDetailsSuccessMessage.deliveryUpdateSuccessToaster(deliveryDetailsSuccessMessage.details);

    // Refresh page to check values from database
    await page.reload();
    await addingCTP.waitForDistanceLoading();

    // Check that CTP has been added
    await expect(addingCTP.ctpFirstAndLastName()).toBeVisible();

    // Check that the delivery status is 'Réservée'
    const changeStatus = new ChangeDelivery(page);
    await expect(changeStatus.deliveryActiveStatus()).toHaveText('Réservée');

  });
});