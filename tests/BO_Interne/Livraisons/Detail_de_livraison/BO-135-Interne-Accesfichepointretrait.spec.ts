import { testInterne as test, expect } from '@fixtures/auth.fixture';
import { createDeliveryAPI, buildAndGotoDeliveryURL } from '@utils/Helpers/createDeliveryAPI.helpers';
import * as drives from '@testdata/drives.json';
import { InternalDeliveryDetails } from '@pages/BO_Interne/Livraisons/Liste_des_livraisons/Detail_de_livraison/InternalDeliveryDetails';

test.describe(`BO-135 - Accès à la fiche du point de retrait @S2298558f`, () => {
  let pickupPoint: InternalDeliveryDetails;

  test.beforeEach(async ({ page }) => {
    pickupPoint = new InternalDeliveryDetails(page);

    // Create delivery via API and navigate to it
    await buildAndGotoDeliveryURL(page, (await createDeliveryAPI()).id);
  });

  test(`Lien vers la fiche point de retrait @T64c2e6f6`, async () => { // A supprimer quand nouveau detail de livraison sera en place
    // Access pickup point information sheet
    await pickupPoint.clickPickupPointInformationSheet();

    // Check that pickup point link is displayed in modal and contains correct drive ID
    await expect(pickupPoint.driveLinkinModal()).toContainText(`/drives/${drives.drive_alim1.id}`);

  });

  test(`Fonction bouton copie lien du point de retrait @Tcf201697`, async ({ page, context }) => { // A supprimer quand nouveau detail de livraison sera en place
    // Access pickup point information sheet
    await pickupPoint.clickPickupPointInformationSheet();
    
    // Grant clipboard permission to the context
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    
    // Click on the pickup point link copy button
    await pickupPoint.copyPickupPointLinkButton().click();

    // Read the clipboard content
    const clipboardContent = await page.evaluate(() => navigator.clipboard.readText());

    // Check that the clipboard content is the expected link
    expect(clipboardContent).toContain(`/drives/${drives.drive_alim1.id}`);
  });

  test.fixme(`Redirection vers la fiche point de retrait @Tc4760a25`, async () => { // A implémenter quand nouveau detail de livraison sera en place
    // Check that the "View Details" button redirects to the pickup location's details page on bov1
    await expect(pickupPoint.pickupPointInformationSheet()).toHaveAttribute('href', new RegExp(`/drives/${drives.drive_alim1.id}$`));

  });
});