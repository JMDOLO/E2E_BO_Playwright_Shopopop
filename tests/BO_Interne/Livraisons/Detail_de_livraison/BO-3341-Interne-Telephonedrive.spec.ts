import { testInterne as test, expect } from '@fixtures/auth.fixture';
import { linkTest } from '@testomatio/reporter';
import { createDeliveryAPI, buildAndGotoDeliveryURL } from '@utils/Helpers/createDeliveryAPI.helpers';
import * as users from '@testdata/users.json';
import * as drives from '@testdata/drives.json';
import { InternalDeliveryDetails } from '@pages/BO_Interne/Livraisons/Liste_des_livraisons/Detail_de_livraison/InternalDeliveryDetails';

test.describe(`BO-3341 - Telephone du drive @S7167ac83`, () => {
  let pickupPoint: InternalDeliveryDetails;

  test.beforeEach(async ({ page, context }) => {
    pickupPoint = new InternalDeliveryDetails(page);
  });

  test(`Affichage numéro drive - Statut "Disponible" @Td7ffc476`, async ({ page }) => {
    // Create delivery via API and navigate to it
    await buildAndGotoDeliveryURL(page, await createDeliveryAPI(drives.drive_alim1,users.recipient_interne));

    // Check that pickup point phone number is displayed
    await expect(pickupPoint.pickupPointPhoneNumber()).toHaveText(drives.drive_alim1.phone);
  });

  test(`Affichage numéro drive - Absence de numéro @T9f7f4415`, async ({ page }) => {
    // Create delivery via API and navigate to it
    await buildAndGotoDeliveryURL(page, await createDeliveryAPI(drives.drive_vin1,users.recipient_interne));

    // Check that pickup point phone number is replaced by a dash
    await expect(pickupPoint.pickupPointPhoneNumber()).toHaveText('-');
  });

  test(`Fonction bouton copie @T8b705b70`, async ({ page, context }) => {
    linkTest('@Tda272b9b');
    // Create delivery via API and navigate to it
    await buildAndGotoDeliveryURL(page, await createDeliveryAPI(drives.drive_alim1,users.recipient_interne));
    
    // Grant clipboard permission to the context
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Click on the pickup point phone number copy button
    await pickupPoint.clickToCopyPickupPointPhoneNumber();

    // Read the clipboard content
    const clipboardContent = await page.evaluate(() => navigator.clipboard.readText());

    // Check that the clipboard content is the expected link
    expect(clipboardContent).toBe(drives.drive_alim1.phone);
  });
});