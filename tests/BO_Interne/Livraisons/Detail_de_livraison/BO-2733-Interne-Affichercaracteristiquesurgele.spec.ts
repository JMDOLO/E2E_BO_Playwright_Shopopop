import { testInterne as test, expect } from '@fixtures/auth.fixture';
import { createDeliveryAPI, buildAndGotoDeliveryURL } from '@utils/Helpers/createDeliveryAPI.helpers';
import * as users from '@testdata/users.json';
import * as drives from '@testdata/drives.json';
import { InternalDeliveryDetails } from '@pages/BO_Interne/Livraisons/Liste_des_livraisons/Detail_de_livraison/InternalDeliveryDetails';

test.describe(`BO-2733 - Afficher la caractéristique surgelés dans le détail de livraison @S5105751f`, () => {
  let deliveryDetails: InternalDeliveryDetails;

  test.beforeEach(async ({ page }) => {
    deliveryDetails = new InternalDeliveryDetails(page);

    // Create a delivery with frozen_food on an alimentary drive and navigate to it
    await buildAndGotoDeliveryURL(page, await createDeliveryAPI(drives.drive_alim1, users.recipient_interne, { frozenFood: true }));
  });

  test(`Caractéristique "Surgelé" cochée pour une livraison avec surgelés @T355bf473`, async () => {
    // Check that the frozen checkbox is checked
    await expect(deliveryDetails.frozenCheckbox()).toBeChecked();
  });
});
