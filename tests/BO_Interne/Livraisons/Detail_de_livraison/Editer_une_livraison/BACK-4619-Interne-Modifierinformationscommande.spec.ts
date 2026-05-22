import { testInterne as test, expect } from '@fixtures/auth.fixture';
import { createDeliveryAPI, buildAndGotoDeliveryURL } from '@utils/Helpers/createDeliveryAPI.helpers';
import { InternalDeliveryDetails } from '@pages/BO_Interne/Livraisons/Liste_des_livraisons/Detail_de_livraison/InternalDeliveryDetails';
import { InternalDeliveryPage } from '@pages/BO_Interne/Livraisons/InternalDeliveryPage';
import { DeliveryDetailsSuccessMessage } from '@pages/BO_Both/SuccessMessages';
import { generateOrderInformation } from '@testdata/order_information';

test.describe(`BACK-4619 - Modifier les informations de la commande dans le détail de livraison @S9e245010`, () => {
  let deliveryDetails: InternalDeliveryDetails;
  let deliveryPage: InternalDeliveryPage;
  let successMessage: DeliveryDetailsSuccessMessage;

  test.beforeEach(async ({ page }) => {
    deliveryDetails = new InternalDeliveryDetails(page);
    deliveryPage = new InternalDeliveryPage(page);
    successMessage = new DeliveryDetailsSuccessMessage(page);

    // Create delivery via API and navigate to it
    await buildAndGotoDeliveryURL(page, (await createDeliveryAPI()).id);
  });

  test(`Modifier la référence de la commande @T37294ff0`, async ({ page }) => {
    // Generate a new random reference
    const newReference = generateOrderInformation().reference;

    // Fill new reference
    await deliveryDetails.orderReference().fill(newReference);
    await deliveryDetails.waitForDistanceLoading(); // Remove once the API distance fix has been applied

    // Save changes
    await deliveryPage.clickDeliveryDetailsSaveButton();

    // Check that a success alert is displayed and close the toaster
    await successMessage.deliveryUpdateSuccessToaster(successMessage.details);

    // Refresh page to check values from database
    await page.reload();
    await deliveryDetails.waitForDistanceLoading();

    // Check that reference is preserved
    await expect(deliveryDetails.orderReference()).toHaveValue(newReference);
  });

  test(`Modifier le montant de la commande @T409e5dcb`, async ({ page }) => {
    // Save initial amount value
    const initialAmount = await deliveryDetails.orderAmount().getAttribute('value');

    // Increase amount by 1 unit
    await deliveryDetails.clickIncreaseOrderAmountButton();
    await deliveryDetails.waitForDistanceLoading(); // Remove once the API distance fix has been applied

    // Save changes
    await deliveryPage.clickDeliveryDetailsSaveButton();

    // Check that a success alert is displayed and close the toaster
    await successMessage.deliveryUpdateSuccessToaster(successMessage.details);

    // Refresh page to check values from database
    await page.reload();
    await deliveryDetails.waitForDistanceLoading();

    // Check that amount has been updated (different from initial)
    await expect(deliveryDetails.orderAmount()).not.toHaveValue(initialAmount!);
  });

  test(`Modifier le commentaire du point de retrait @T225aa8e2`, async ({ page }) => {
    // Generate a new random comment
    const newComment = generateOrderInformation().additionalInfos;

    // Clear and fill new comment
    await deliveryDetails.storeComment().fill(newComment);
    await deliveryDetails.waitForDistanceLoading(); // Remove once the API distance fix has been applied

    // Save changes
    await deliveryPage.clickDeliveryDetailsSaveButton();

    // Check that a success alert is displayed and close the toaster
    await successMessage.deliveryUpdateSuccessToaster(successMessage.details);

    // Refresh page to check values from database
    await page.reload();
    await deliveryDetails.waitForDistanceLoading();

    // Check that comment is preserved
    await expect(deliveryDetails.storeComment()).toHaveValue(newComment);
  });
});
