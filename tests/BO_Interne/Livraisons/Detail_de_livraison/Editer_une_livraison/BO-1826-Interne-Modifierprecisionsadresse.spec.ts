import { testInterne as test, expect } from '@fixtures/auth.fixture';
import { createDeliveryAPI, buildAndGotoDeliveryURL } from '@utils/Helpers/createDeliveryAPI.helpers';
import { InternalDeliveryDetails } from '@pages/BO_Interne/Livraisons/Liste_des_livraisons/Detail_de_livraison/InternalDeliveryDetails';
import { InternalDeliveryPage } from '@pages/BO_Interne/Livraisons/InternalDeliveryPage';
import { faker } from '@faker-js/faker';
import { DeliveryDetailsSuccessMessage } from '@pages/BO_Both/SuccessMessages';

test.describe(`BO-1826 - Modifier précisions adresse @Sc8ed6f1e`, () => {
  test(`Statut "Disponible" - Modifier précisions adresse - passant @Tbf95c002`, async ({ page }) => {

    // Create delivery via API and navigate to it
    await buildAndGotoDeliveryURL(page, (await createDeliveryAPI()).id);

    // Fill new delivery adress details
    const newAddressDetails = faker.string.alphanumeric(8);
    const deliveryAddressDetails = new InternalDeliveryDetails(page);
    await deliveryAddressDetails.deliveryAddressDetails().fill(newAddressDetails);
    await deliveryAddressDetails.waitForDistanceLoading(); // Remove once the API distance fix has been applied

    // Save changes
    const saveDeliveryChanges = new InternalDeliveryPage(page);
    await saveDeliveryChanges.clickDeliveryDetailsSaveButton();
    
    // Check that a success alert is displayed and close the toaster
    const deliveryDetailsSuccessMessage = new DeliveryDetailsSuccessMessage(page);
    await deliveryDetailsSuccessMessage.deliveryUpdateSuccessToaster(deliveryDetailsSuccessMessage.details);

    // Refresh page to check values from database
    await page.reload();
    await deliveryAddressDetails.waitForDistanceLoading();

    // Check that adress details has been updated
    await expect(deliveryAddressDetails.deliveryAddressDetails()).toHaveValue(newAddressDetails);

  });
});