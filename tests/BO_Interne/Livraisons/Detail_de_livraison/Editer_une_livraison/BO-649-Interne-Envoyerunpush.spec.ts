import { testInterne as test } from '@fixtures/auth.fixture';
import { createDeliveryAPI, buildAndGotoDeliveryURL } from '@utils/Helpers/createDeliveryAPI.helpers';
import { ChangeDelivery } from '@pages/BO_Interne/Livraisons/Liste_des_livraisons/Detail_de_livraison/ChangeDelivery';
import { InternalDeliveryPage } from '@pages/BO_Interne/Livraisons/InternalDeliveryPage';
import { InternalDeliveryDetails } from '@pages/BO_Interne/Livraisons/Liste_des_livraisons/Detail_de_livraison/InternalDeliveryDetails';
import { DeliveryDetailsSuccessMessage } from '@pages/BO_Both/SuccessMessages';

test.describe(`CLAUDE-BO-649 - Envoyer un push depuis le détail de livraison @S935f3e2f`, () => {
  let changeDelivery: ChangeDelivery;
  let deliveryPage: InternalDeliveryPage;
  let deliveryDetails: InternalDeliveryDetails;
  let successMessage: DeliveryDetailsSuccessMessage;

  test.beforeEach(async ({ page }) => {
    changeDelivery = new ChangeDelivery(page);
    deliveryPage = new InternalDeliveryPage(page);
    deliveryDetails = new InternalDeliveryDetails(page);
    successMessage = new DeliveryDetailsSuccessMessage(page);

    // Create a delivery in "Disponible" status and navigate to it
    await buildAndGotoDeliveryURL(page, (await createDeliveryAPI()).id);
  });

  test(`Livraison disponible - Envoyer un push manuel @T8703592a`, async () => {
    // Check the push radio button
    await changeDelivery.checkPush().check();
    await deliveryDetails.waitForDistanceLoading(); // Remove once the API distance fix has been applied

    // Save changes
    await deliveryPage.clickDeliveryDetailsSaveButton();

    // Check that the push success alert is displayed and close the toaster
    await successMessage.deliveryUpdateSuccessToaster(successMessage.push);
  });
});
