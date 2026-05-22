import { testInterne as test, expect } from '@fixtures/auth.fixture';
import { createDeliveryAPI, buildAndGotoDeliveryURL } from '@utils/Helpers/createDeliveryAPI.helpers';
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
    await buildAndGotoDeliveryURL(page, (await createDeliveryAPI()).id);
  });

  test(`Livraison disponible - Cocher et décocher la caractéristique "Surgelé" @T5b674874`, async ({ page }) => {
    // Check the frozen checkbox
    await deliveryDetails.frozenCheckbox().check();
    await deliveryDetails.waitForDistanceLoading(); // Remove once the API distance fix has been applied

    // Save changes
    await deliveryPage.clickDeliveryDetailsSaveButton();

    // Check that a success alert is displayed and close the toaster
    await successMessage.deliveryUpdateSuccessToaster(successMessage.details);

    // Refresh page to check values from database
    await page.reload();
    await deliveryDetails.waitForDistanceLoading();

    // Check that frozen checkbox is checked
    await expect(deliveryDetails.frozenCheckbox()).toBeChecked();

    // Uncheck the frozen checkbox
    await deliveryDetails.frozenCheckbox().uncheck();
    await deliveryDetails.waitForDistanceLoading(); // Remove once the API distance fix has been applied

    // Save changes
    await deliveryPage.clickDeliveryDetailsSaveButton();

    // Check that a success alert is displayed and close the toaster
    await successMessage.deliveryUpdateSuccessToaster(successMessage.details);

    // Refresh page to check values from database
    await page.reload();
    await deliveryDetails.waitForDistanceLoading();

    // Check that frozen checkbox is unchecked
    await expect(deliveryDetails.frozenCheckbox()).not.toBeChecked();
  });
});
