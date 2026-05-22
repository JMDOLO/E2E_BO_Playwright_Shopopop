import { testInterne as test, expect } from '@fixtures/auth.fixture';
import { createDeliveryAPI, buildAndGotoDeliveryURL } from '@utils/Helpers/createDeliveryAPI.helpers';
import * as drives from '@testdata/drives.json';
import * as users from '@testdata/users.json';
import { InternalDeliveryDetails } from '@pages/BO_Interne/Livraisons/Liste_des_livraisons/Detail_de_livraison/InternalDeliveryDetails';

test.describe(`BACK-4617 - Affichage des informations du destinataire @Sb7ac861e`, () => {
  let recipient: InternalDeliveryDetails;
  
  test.beforeEach(async ({ page }) => {
    recipient = new InternalDeliveryDetails(page);

    // Create delivery via API and navigate to it
    await buildAndGotoDeliveryURL(page, await createDeliveryAPI(drives.drive_alim1,users.recipient_interne));
  });

  test(`Affichage des prénom et nom @T5363caab`, async ({ page }) => {
    // Check that recipient name is displayed correctly
    await expect(recipient.recipientFirstAndLastName()).toHaveText(users.recipient_interne.name);
  });

  test(`Affichage du numéro de téléphone @T05825696`, async ({ page }) => {
    // Check that recipient phone number is displayed correctly
    await expect(recipient.recipientPhoneNumber()).toHaveText(users.recipient_interne.phone.replace('+33', '0').replace(/(\d{2})/g, '$1 ').trim());
  });

  test(`Affichage de l'e-mail @Tce819e72`, async ({ page }) => {
    // Check that recipient email is displayed correctly
    await expect(recipient.recipientEmail()).toHaveText(users.recipient_interne.email);
  });

  test(`Lien vers le profil recipient @Te6761570`, async ({ page }) => {
    // Check that recipient profile link in button redirects to the correct page
    await expect(recipient.recipientProfileLink()).toHaveAttribute('href', expect.stringContaining(`/users/${users.recipient_interne.id}`));
    //await expect(recipient.recipientProfileLink()).toHaveAttribute('href', expect.stringContaining(`/recipients/${users.recipient_interne.internal_uuid}`));
    // -> à remplacer après la MEP de la nouvelle page recipients
  });
});