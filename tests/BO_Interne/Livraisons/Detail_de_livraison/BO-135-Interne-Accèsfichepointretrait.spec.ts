import { testInterne as test, expect } from '@fixtures/auth.fixture';
import { createDeliveryAPI, buildAndGotoDeliveryURL } from '@utils/Helpers/createDeliveryAPI.helpers';
import * as users from '@testdata/users.json';
import * as drives from '@testdata/drives.json';
import { InternalDeliveryDetails } from '@pages/BO_Interne/Livraisons/Liste_des_livraisons/Detail_de_livraison/InternalDeliveryDetails';

test.describe(`BO-135 - Accès à la fiche du point de retrait @S2298558f`, () => {
  let pickupPoint: InternalDeliveryDetails;

  test.beforeEach(async ({ page }) => {
    pickupPoint = new InternalDeliveryDetails(page);

    // Create delivery via API and navigate to it
    await buildAndGotoDeliveryURL(page, await createDeliveryAPI(drives.drive_alim1,users.recipient_interne));

    // Access pickup point information sheet
    await pickupPoint.clickPickupPointInformationSheet();
  });

  test(`Lien vers la fiche point de retrait @T64c2e6f6`, async ({ page }) => {
    // Check that pickup point link is displayed in modal and contains correct drive ID
    await expect(pickupPoint.driveLinkinModal()).toContainText(`/drives/${drives.drive_alim1.id}`);

  });

  test(`Fonction bouton copie lien du point de retrait @Tcf201697`, async ({ page, context }) => {
    // Grant clipboard permission to the context
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    
    // Click on the pickup point link copy button
    await pickupPoint.copyPickupPointLinkButton().click();

    // Read the clipboard content
    const clipboardContent = await page.evaluate(() => navigator.clipboard.readText());

    // Check that the clipboard content is the expected link
    expect(clipboardContent).toContain(`/drives/${drives.drive_alim1.id}`);
  });
});