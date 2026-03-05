import { testPro as test, expect } from '@fixtures/auth.fixture';
import { ProHomePageMenu } from '@pages/BO_Pro/ProHomePage';
import { LoginPage } from '@pages/BO_Both/Authentification/LoginPage';

test.describe(`BO-2075 - Déconnexion BO Pro @S7f50d12b`, () => {
  test(`Déconnexion - cas passant @T12910f7a`, async ({ page }) => {
    // Logout
    const menu = new ProHomePageMenu(page);
    await menu.clickLogout();

    // Back to login page
    const loginPage = new LoginPage(page);
    await expect(loginPage.loginButton()).toBeVisible();
  });
});
