import { testInterne as test, expect } from '@fixtures/auth.fixture';
import { createDeliveryAPI, buildAndGotoDeliveryURL } from '@utils/Helpers/createDeliveryAPI.helpers';
import * as users from '@testdata/users.json';
import * as drives from '@testdata/drives.json';
import { orderInformation } from '@testdata/order_information';
import { InternalDeliveryDetails } from '@pages/BO_Interne/Livraisons/Liste_des_livraisons/Detail_de_livraison/InternalDeliveryDetails';

test.describe(`BACK-4810 - Afficher les informations de la commande dans le détail de livraison @S774379e3`, () => {
  let deliveryDetails: InternalDeliveryDetails;

  test.beforeEach(async ({ page }) => {
    deliveryDetails = new InternalDeliveryDetails(page);

    // Create a delivery with custom reference, amount and store comment, then navigate to it
    await buildAndGotoDeliveryURL(page, await createDeliveryAPI(drives.drive_alim1, users.recipient_interne, { reference: orderInformation.reference, amount: orderInformation.amount, additionalInfos: orderInformation.additionalInfos }));
  });

  test(`Afficher la référence de la commande @Te1590dfe`, async () => {
    await expect(deliveryDetails.orderReference()).toHaveValue(orderInformation.reference);
  });

  test(`Afficher le montant de la commande @Td3ab673f`, async () => {
    await expect(deliveryDetails.orderAmount()).toHaveValue(`${orderInformation.amount},00`);
  });

  test(`Afficher le commentaire du point de retrait @Tc500db91`, async () => {
    await expect(deliveryDetails.storeComment()).toHaveValue(orderInformation.additionalInfos);
  });
});
