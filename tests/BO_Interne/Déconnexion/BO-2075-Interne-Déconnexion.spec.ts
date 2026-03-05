import { testInterne as test, expect } from '@fixtures/auth.fixture';
import { LoginPage } from '@pages/BO_Both/Authentification/LoginPage';
import { InternalHomePageMenu } from '@pages/BO_Interne/InternalHomePageMenu';

test.describe(`BO-2075 - Déconnexion BO Interne @S7bf047b9`, () => {
  test(`Déconnexion - cas passant @Tf156b3dc`, async ({ page }) => {
    // Logout
    const menu = new InternalHomePageMenu(page);
    await menu.clickLogout();

    // Back to login page
    const loginPage = new LoginPage(page);
    await expect(loginPage.googleSSO()).toBeVisible();
  });
});