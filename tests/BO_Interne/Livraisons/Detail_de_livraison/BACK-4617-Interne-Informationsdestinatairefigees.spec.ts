import { testInterne as test, expect } from '@fixtures/auth.fixture';
import { createDeliveryAPI, buildAndGotoDeliveryURL, DropOffRecipient } from '@utils/Helpers/createDeliveryAPI.helpers';
import { updateErrandTable } from '@utils/DB_Utils/updateData.db';
import * as users from '@testdata/users.json';
import { InternalDeliveryDetails } from '@pages/BO_Interne/Livraisons/Liste_des_livraisons/Detail_de_livraison/InternalDeliveryDetails';
//import { InternalDeliveryDetails } from '@pages/BO_Interne/Livraisons/Liste_des_livraisons/Detail_de_livraison/InternalDeliveryDetailsNew';

test.describe(`BACK-4617 - Affichage des informations du destinataire @Sb7ac861e`, () => { // A mettre à jour une fois le ticket BO-3742 MEP (applicable au statut Validé)
  let recipientPage: InternalDeliveryDetails;
  let recipientData: DropOffRecipient;

  test.beforeEach(async ({ page }) => {
    recipientPage = new InternalDeliveryDetails(page);

    // Create delivery via API
    const { id: deliveryId, recipient } = await createDeliveryAPI();
    recipientData = recipient;

    // Database delivery setup for this test
    // Adding a CTP and Validated statut
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 19).replace('T', ' ');
    await updateErrandTable(deliveryId, [
    { field: 'delivery_man_id', value: users.CTP.id },
    { field: 'done', value: 1 },
    { field: 'status', value: 6 },
    { field: 'delivery_effective', value: dateStr },
    { field: 'booked_date', value: dateStr },
    { field: 'delivery_effective_utc', value: dateStr },
    { field: 'updated_at', value: dateStr },
    ]);

    // Navigate to the created delivery
    await buildAndGotoDeliveryURL(page, deliveryId);
  });

  test(`Affichage des prénom et nom @T5363caab`, async () => {
    // Check that recipient name is displayed correctly
    await expect(recipientPage.recipientFirstAndLastName()).toHaveText(recipientData.full_name);
  });

  test(`Affichage du numéro de téléphone @T05825696`, async () => {
    // Check that recipient phone number is displayed correctly
    await expect(recipientPage.recipientPhoneNumberValidated()).toHaveText(recipientData.phone.replace('+33', '0').replace(/(\d{2})/g, '$1 ').trim());
  });

  test(`Affichage de l'e-mail @Tce819e72`, async () => {
    // Check that recipient email is displayed correctly
    await expect(recipientPage.recipientEmailValidated()).toHaveText(recipientData.email);
  });

  test(`Lien vers le profil recipient @Te6761570`, async () => {
    // Check that recipient profile link in button redirects to the correct page
    await expect(recipientPage.recipientProfileLinkValidated()).toHaveAttribute('href', expect.stringContaining(`/recipients/${recipientData.internal_uuid}`));
  });
});