import { testInterne as test, expect } from '@fixtures/auth.fixture';
import { createDeliveryAPI, buildAndGotoDeliveryURL, DropOffRecipient } from '@utils/Helpers/createDeliveryAPI.helpers';
import { InternalDeliveryDetails } from '@pages/BO_Interne/Livraisons/Liste_des_livraisons/Detail_de_livraison/InternalDeliveryDetails';

test.describe(`B0-3740 - Affichage destinataire modifiable @S5e3588d5`, () => {
  let recipientPage: InternalDeliveryDetails;
  let recipientData: DropOffRecipient;

  test.beforeEach(async ({ page }) => {
    recipientPage = new InternalDeliveryDetails(page);

    // Create delivery via API and navigate to it
    const { id, recipient } = await createDeliveryAPI();
    recipientData = recipient;
    await buildAndGotoDeliveryURL(page, id);
  });

  test(`Affichage du prénom @T3cdcbc3f`, async () => {
    // Check that recipient firstname is displayed correctly
    await expect(recipientPage.recipientFirstName()).toHaveAttribute('value', recipientData.first_name);
  });

  test(`Affichage du nom @Te951a740`, async () => {
    // Check that recipient lastname is displayed correctly
    await expect(recipientPage.recipientLastName()).toHaveAttribute('value', recipientData.last_name);
  });

  test(`Affichage du numéro de téléphone @T9b84a84e`, async () => {
    // Check that recipient phone number is displayed correctly
    await expect(recipientPage.recipientPhoneNumberOngoing()).toHaveAttribute('value', recipientData.phone.replace(/^(\+\d{2})(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/, '$1 $2 $3 $4 $5 $6'));
  });

  test(`Affichage de l'e-mail @T033a0d5a`, async () => {
    // Check that recipient email is displayed correctly
    await expect(recipientPage.recipientEmailOngoing()).toHaveAttribute('value', recipientData.email);
  });

  test(`Lien vers le profil recipient @T47ef82c0`, async () => {
    // Check that recipient profile link in button redirects to the correct page
    await expect(recipientPage.recipientProfileLinkOngoing()).toHaveAttribute('href', expect.stringContaining(`/recipients/${recipientData.internal_uuid}`));
  });
});