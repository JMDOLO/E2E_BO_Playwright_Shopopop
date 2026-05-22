import { testInterne as test, expect } from '@fixtures/auth.fixture';
import { createDeliveryAPI, buildAndGotoDeliveryURL } from '@utils/Helpers/createDeliveryAPI.helpers';
import { InternalDeliveryDetails } from '@pages/BO_Interne/Livraisons/Liste_des_livraisons/Detail_de_livraison/InternalDeliveryDetails';
import { generateOrderInformation, TRANSPORT_OPTIONS_API, TRANSPORT_OPTIONS_UI } from '@testdata/order_information';
import { InternalDeliveryPage } from '@pages/BO_Interne/Livraisons/InternalDeliveryPage';
import { DeliveryDetailsSuccessMessage } from '@pages/BO_Both/SuccessMessages';
import { getRandomWithIndex } from '@utils/Helpers/random.helpers';

// TODO: Remplacer les placeholders du mapping TRANSPORT_OPTIONS_API une fois définis par partners API

test.describe(`BO-2611 - Modifier le moyen de transport minimum @S391baa52`, () => {
  let deliveryDetails: InternalDeliveryDetails;
  let deliveryPage: InternalDeliveryPage;
  let successMessage: DeliveryDetailsSuccessMessage;
  let orderInfo: ReturnType<typeof generateOrderInformation>;

  test.beforeEach(async ({ page }) => {
    deliveryDetails = new InternalDeliveryDetails(page);
    deliveryPage = new InternalDeliveryPage(page);
    successMessage = new DeliveryDetailsSuccessMessage(page);
    orderInfo = generateOrderInformation();

    // Create delivery via API and navigate to it
    await buildAndGotoDeliveryURL(page, (await createDeliveryAPI({ orderInfo: { minimalTransportModeAPI: orderInfo.minimalTransportModeAPI } })).id);
  });

  test(`Modifier le moyen de transport minimum recommandé @Ta5fcf662`, async ({ page }) => {
    // Derive the initial transport label from the API value sent during creation
    const initialTransport = TRANSPORT_OPTIONS_API[orderInfo.minimalTransportModeAPI];

    // Select a different transport option
    const filteredOptions = TRANSPORT_OPTIONS_UI.filter(opt => opt !== initialTransport);
    const { value: newTransport } = getRandomWithIndex(filteredOptions);
    await deliveryDetails.clickTransportDropdown();
    await deliveryDetails.selectTransport(newTransport);
    await deliveryDetails.waitForDistanceLoading(); // Remove once the API distance fix has been applied

    // Save changes
    await deliveryPage.clickDeliveryDetailsSaveButton();

    // Check that a success alert is displayed and close the toaster
    await successMessage.deliveryUpdateSuccessToaster(successMessage.details);

    // Refresh page to check values from database
    await page.reload();
    await deliveryDetails.waitForDistanceLoading();

    // Check that transport has been updated
    await expect(deliveryDetails.transportValue()).toHaveText(newTransport);
  });
});
