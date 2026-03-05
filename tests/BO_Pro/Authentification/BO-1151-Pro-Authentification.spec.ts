import { test, expect } from '@fixtures/base.fixture';
import { LoginPage } from '@pages/BO_Both/Authentification/LoginPage';
import { ProHomePageMenu } from '@pages/BO_Pro/ProHomePage';

test.describe(`BO-1151 - Authentification BO Pro @Sa77fe43b`, () => {
  test(`Connexion - cas passant @T54097eea`, async ({ page }) => {
    // Authentication (manual, not auto-authenticated)
    const loginPage = new LoginPage(page);
    await loginPage.authenticateProWithEnv();

    // Assertion: delivery creation button visible
    const menu = new ProHomePageMenu(page);
    await expect(menu.createDeliveryButton()).toBeVisible();
  });
});