import { testInterne as test, expect } from '@fixtures/auth.fixture';
import { createDeliveryAPI, buildAndGotoDeliveryURL } from '@utils/Helpers/createDeliveryAPI.helpers';
import { updateErrandTable } from '@utils/DB_Utils/updateData.db';
import * as users from '@testdata/users.json';
import { InternalDeliveryDetails } from '@pages/BO_Interne/Livraisons/Liste_des_livraisons/Detail_de_livraison/InternalDeliveryDetails';
//import { InternalDeliveryDetails } from '@pages/BO_Interne/Livraisons/Liste_des_livraisons/Detail_de_livraison/InternalDeliveryDetailsNew';

test.describe(`BACK-4627 - Affichage des informations du cotransporteur @Sbdf86364`, () => {
  let CTP: InternalDeliveryDetails;
  
  test.beforeEach(async ({ page }) => {
    CTP = new InternalDeliveryDetails(page);

    // Create delivery via API
    const { id: deliveryId } = await createDeliveryAPI();

    // Database delivery setup for this test
    // Adding a CTP and Reserved statut
    const dateStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await updateErrandTable(deliveryId, [
    { field: 'delivery_man_id', value: users.CTP.id },
    { field: 'status', value: 2 },
    { field: 'updated_at', value: dateStr },
    ]);

    // Navigate to the created delivery
    await buildAndGotoDeliveryURL(page, deliveryId);
  });

  test(`Affichage des prénom et nom @Tb92bfc11`, async ({ page }) => {
    // Check that CTP name is displayed correctly
    await expect(CTP.ctpFirstAndLastName()).toHaveText(users.CTP.name);
  });

  test(`Affichage du numéro de téléphone @T06ec4424`, async ({ page }) => {
    // Check that CTP phone number is displayed correctly
    await expect(CTP.ctpPhoneNumber()).toHaveText(users.CTP.phone.replace('+33', '0').replace(/(\d{2})/g, '$1 ').trim());
  });

  test(`Affichage de l'e-mail @T77a24934`, async ({ page }) => {
    // Check that CTP email is displayed correctly
    await expect(CTP.ctpEmail()).toHaveText(users.CTP.email);
  });

  test(`Lien vers le profil deliverers @Tf36dc572`, async ({ page }) => {
    // Check that CTP profile link in button redirects to the correct page
    await expect(CTP.ctpProfileLink()).toHaveAttribute('href', `/deliverers/${users.CTP.id}`);
  });
});