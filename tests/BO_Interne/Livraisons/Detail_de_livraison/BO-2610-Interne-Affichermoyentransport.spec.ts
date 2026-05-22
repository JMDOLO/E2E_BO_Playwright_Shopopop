import { testInterne as test, expect } from '@fixtures/auth.fixture';
import { createDeliveryAPI, buildAndGotoDeliveryURL } from '@utils/Helpers/createDeliveryAPI.helpers';
import { InternalHomePageMenu } from '@pages/BO_Interne/InternalHomePageMenu';
import { createDeliveryForInternal } from '@utils/Helpers/createDelivery.helpers';
import * as users from '@testdata/users.json';
import * as drives from '@testdata/drives.json';
import { InternalDeliveryDetails } from '@pages/BO_Interne/Livraisons/Liste_des_livraisons/Detail_de_livraison/InternalDeliveryDetails';
import { orderInformation, TRANSPORT_OPTIONS_API, TRANSPORT_OPTIONS_UI } from '@testdata/order_information';
import { getRandomWithIndex } from '@utils/Helpers/random.helpers';

// TODO: Remplacer les placeholders du mapping TRANSPORT_OPTIONS_API une fois définis par partners API

test.describe(`BO-2610 - Connaitre le moyen de transport minimum @S387b5804`, () => {
  let deliveryDetails: InternalDeliveryDetails;

  test.beforeEach(async ({ page }) => {
    deliveryDetails = new InternalDeliveryDetails(page);

  });

  test(`Afficher le moyen de transport minimum recommandé - API @T0d283792`, async ({ page }) => {
    // Create a delivery with a random transport mode via API and navigate to it
    await buildAndGotoDeliveryURL(page, await createDeliveryAPI(drives.drive_alim1, users.recipient_interne, { minimalTransportModeAPI: orderInformation.minimalTransportModeAPI }));

    // Check that the transport value in UI is the one sent by API
    await expect(deliveryDetails.transportValue()).toHaveText(TRANSPORT_OPTIONS_API[orderInformation.minimalTransportModeAPI]);
  });

  test(`Afficher le moyen de transport minimum recommandé - UI @T3e6901e6`, async ({ page }) => {
    // Pick a random transport mode excluding the default ('Voiture') to ensure a real selection
    const transportUI = getRandomWithIndex([...TRANSPORT_OPTIONS_UI].filter(o => o !== 'Voiture')).value;

    // Access delivery creation page
    const menu = new InternalHomePageMenu(page);
    await menu.createDeliveryButton().click();

    // Create the delivery with the helper
    await createDeliveryForInternal(
      page,
      drives.drive_alim1,
      users.recipient_interne,
      { minimalTransportModeUI: transportUI }
    );

    // Check that the transport value in UI is the one sent by UI
    await expect(deliveryDetails.transportValue()).toHaveText(transportUI);
  });
});
