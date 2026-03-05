import { testInterne as test } from '@fixtures/auth.fixture';
import { createDeliveryAPI, buildAndGotoDeliveryURL } from '@utils/Helpers/createDeliveryAPI.helpers';
import * as users from '@testdata/users.json';
import * as drives from '@testdata/drives.json';
import { InternalDeliveryDetails } from '@pages/BO_Interne/Livraisons/Liste_des_livraisons/Detail_de_livraison/InternalDeliveryDetails';
import { InternalDeliveryPage } from '@pages/BO_Interne/Livraisons/InternalDeliveryPage';
import { DeliveryDetailsSuccessMessage } from '@pages/BO_Both/SuccessMessages';

test.describe(`BO-2734 - Modifier la caractéristique surgelés dans le détail de livraison @S355f8f75`, () => {
  let deliveryDetails: InternalDeliveryDetails;
  let deliveryPage: InternalDeliveryPage;
  let successMessage: DeliveryDetailsSuccessMessage;

  test.beforeEach(async ({ page }) => {
    deliveryDetails = new InternalDeliveryDetails(page);
    deliveryPage = new InternalDeliveryPage(page);
    successMessage = new DeliveryDetailsSuccessMessage(page);

    // Create a delivery without frozen_food on an alimentary drive and navigate to it
    await buildAndGotoDeliveryURL(page, await createDeliveryAPI(drives.drive_alim1, users.recipient_interne));
  });

  test(`Livraison disponible - Cocher et décocher la caractéristique "Surgelé" @T5b674874`, async () => {
    // Check the frozen checkbox
    await deliveryDetails.frozenCheckbox().check();

    // Save changes
    await deliveryPage.clickDeliveryDetailsSaveButton();

    // Check that a success alert is displayed and close the toaster
    await successMessage.deliveryUpdateSuccessToaster(successMessage.details);

    // Uncheck the frozen checkbox
    await deliveryDetails.frozenCheckbox().uncheck();

    // Save changes
    await deliveryPage.clickDeliveryDetailsSaveButton();

    // Check that a success alert is displayed and close the toaster
    await successMessage.deliveryUpdateSuccessToaster(successMessage.details);

  });
});
