import { test, expect } from '@fixtures/base.fixture';
import { LoginPage } from '@pages/BO_Both/Authentification/LoginPage';
import { InternalHomePageMenu } from '@pages/BO_Interne/InternalHomePageMenu';
import { ProHomePageMenu } from '@pages/BO_Pro/ProHomePage';
import { createDeliveryForInternal, createDeliveryForPro } from '@utils/Helpers/createDelivery.helpers';
import { createDeliveryAPI, buildAndGotoDeliveryURL } from '@utils/Helpers/createDeliveryAPI.helpers';
import { getCurrentAccountIndex } from '@utils/Helpers/authentication.helpers';
import * as drives from '@testdata/drives.json';
import * as users from '@testdata/users.json';
import * as url from '@testdata/url.app.json';
import { InternalHistory } from '@pages/BO_Interne/Livraisons/Liste_des_livraisons/Historique/InternalHistory';

test.describe(`BO-2625 - Mise en ligne de livraison  @S2f10413c`, () => {
  let history: InternalHistory;
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    history = new InternalHistory(page);
    loginPage = new LoginPage(page);
  });

  // Helper function to check history message
  async function checkHistoryMessage(expectedCreator: string, expectedOrigin: string) {
    await history.clickHistoryTab();
    const message = history.deliveryCreationMessage();
    await expect(message).toContainText(`Mise en ligne par ${expectedCreator}`);
    await expect(message).toContainText(`Origine : ${expectedOrigin}`);
  }

  test(`Création par un user Interne @Tbc47c5b9`, async ({ page }) => {
    // Authentication BO Interne (manual, not auto-authenticated)
    await loginPage.authenticateInternalWithEnv();

    // Get the current account index for this shard (1-20)
    const accountIndex = getCurrentAccountIndex();
    // Build expected creator name based on account index (e.g., "Qa Interne5")
    const expectedCreator = `Qa Interne${accountIndex}`;

    // Access delivery creation page
    const menu = new InternalHomePageMenu(page);
    await menu.createDeliveryButton().click();

    // Create the delivery with the helper
    await createDeliveryForInternal(
      page,
      drives.drive_alim1,
      users.recipient_interne
    );

    // Click history tab and check delivery creation message
    await checkHistoryMessage(expectedCreator, 'BACKOFFICE');
  });

  test(`Création par un user Pro @T861dab9d`, async ({ page }) => {
    // BO Pro manual delivery creation
    // Authentication BO Pro (manual, not auto-authenticated)
    await loginPage.authenticateProWithEnv();

    // Access delivery creation page
    const menu = new ProHomePageMenu(page);
    await menu.createDeliveryButton().click();

    // Create the delivery with the helper
    const { url: deliveryProURL } = await createDeliveryForPro(
      page,
      drives.drive_alim1,
      users.recipient_pro
    );

    // Logout from BO Pro to clear Keycloak session before switching to BO Interne
    await menu.clickLogout();

    // Convert BO Pro URL to BO Interne URL
    const deliveryIntURL = deliveryProURL.replace(url.url_pro, url.url_interne);

    // BO Interne access delivery and test history message
    // Authentication BO Interne (manual, not auto-authenticated)
    await loginPage.authenticateInternalWithEnv();
    // Access delivery
    await page.goto(deliveryIntURL);

    // Click history tab and check delivery creation message
    await checkHistoryMessage(drives.drive_alim1.name, 'BACKOFFICE');
  });

  test(`Création par api @T13a1883b`, async ({ page }) => {
    // Authentication BO Interne (manual, not auto-authenticated)
    await loginPage.authenticateInternalWithEnv();

    // Create delivery via API and navigate to it
    await buildAndGotoDeliveryURL(page, await createDeliveryAPI());

    // Click history tab and check delivery creation message
    await checkHistoryMessage(drives.drive_alim1.name, 'API_PARTNER');
  });
});