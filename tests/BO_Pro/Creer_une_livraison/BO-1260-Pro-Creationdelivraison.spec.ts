import { testPro as test } from '@fixtures/auth.fixture';
import { ProHomePageMenu } from '@pages/BO_Pro/ProHomePage';
import { createDeliveryForPro } from '@utils/Helpers/createDelivery.helpers';
import { createDeliveryAPI, buildAndGotoDeliveryURL } from '@utils/Helpers/createDeliveryAPI.helpers';
import * as drives from '@testdata/drives.json';
import * as users from '@testdata/users.json';

test.describe(`BO-1260 - Creation de livraison @S399cef48`, () => {
  test(`Parcours complet - Destinataire existant - cas passant @T0a562508`, async ({ page }) => {
    // Complete delivrery creation

    // Access delivery creation page
    const menu = new ProHomePageMenu(page);
    await menu.createDeliveryButton().click();

    // Create the delivery with the helper
    // No assertion needed: waitForDeliveryCreationAndRetry already verifies page loaded (distance regex + retry)
    await createDeliveryForPro(
      page,
      drives.drive_alim1,
      users.recipient_pro
    );
  });

  test(`Parcours complet - API - cas passant @Ta6424ed0`, async ({ page }) => {
    // Create delivery via API and navigate to it
    // No assertion needed: buildAndGotoDeliveryURL already verifies page loaded (distance regex + retry)
    await buildAndGotoDeliveryURL(page, await createDeliveryAPI());
  });
});