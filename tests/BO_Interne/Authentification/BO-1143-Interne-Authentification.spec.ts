import { test, expect } from '@fixtures/base.fixture';
import { LoginPage } from '@pages/BO_Both/Authentification/LoginPage';
import { InternalHomePageMenu } from '@pages/BO_Interne/InternalHomePageMenu';

test.describe(`BO-1143 - Authentification BO Interne @S01d6e1db`, () => {
  test(`Connexion - cas passant @Tb333b53b`, async ({ page }) => {
    // Authentication (manual, not auto-authenticated)
    const loginPage = new LoginPage(page);
    await loginPage.authenticateInternalWithEnv();

    // Assertion: delivery creation button visible
    const menu = new InternalHomePageMenu(page);
    await expect(menu.createDeliveryButton()).toBeVisible();
  });
});