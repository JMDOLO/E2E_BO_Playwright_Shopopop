import { testInterne as test, expect } from '@fixtures/auth.fixture';
import { linkTest } from '@testomatio/reporter';
import { InternalHomePageMenu } from '@pages/BO_Interne/InternalHomePageMenu';
import { SearchUsers } from '@pages/BO_Interne/Utilisateurs/Users';
import * as users from '@testdata/users.json';

test.describe(`BO-3585 - Recherche par type d'utilisateur @S130845c5`, () => {
  let menu: InternalHomePageMenu;
  let searchUsers: SearchUsers;

  test.beforeEach(async ({ page }) => {
    menu = new InternalHomePageMenu(page);
    searchUsers = new SearchUsers(page);

    // Navigate to Users page and fill phone number to ensure results are present for all filters
    await menu.clickUsersMenu();
    await searchUsers.fillPhoneField(users.recipient_interne.phone);
  });

  test(`Recherche avec filtre "Tous" @Tf8ab1661`, async () => {
    linkTest('@T56bc0bdb');
    // User type filter "Tous" by default, just click search button
    await searchUsers.clickSearchButton();

    // Verify results contain both "Cotransporteur" and "Destinataire" types
    await searchUsers.allUserTypeResults().first().waitFor();
    const typeResults = await searchUsers.allUserTypeResults().all();
    const types = new Set<string>();
    for (const result of typeResults) {
      types.add(await result.innerText());
    }
    expect(types.has('Cotransporteur')).toBeTruthy();
    expect(types.has('Destinataire')).toBeTruthy();
  });

  test(`Recherche avec filtre "CTP" @Tbacd5d13`, async () => {
    // Set user type to "Cotransporteur"
    await searchUsers.selectUserType(searchUsers.userTypes[1]);
    await searchUsers.clickSearchButton();

    // Verify all results are "Cotransporteur" only
    await searchUsers.allUserTypeResults().first().waitFor();
    const typeResults = await searchUsers.allUserTypeResults().all();
    for (const result of typeResults) {
      await expect(result).toContainText('Cotransporteur');
    }
  });

  test(`Recherche avec filtre "Destinataire" @Tc8cd9b75`, async () => {
    // Set user type to "Destinataire"
    await searchUsers.selectUserType(searchUsers.userTypes[2]);
    await searchUsers.clickSearchButton();

    // Verify all results are "Destinataire" only
    await searchUsers.allUserTypeResults().first().waitFor();
    const typeResults = await searchUsers.allUserTypeResults().all();
    for (const result of typeResults) {
      await expect(result).toContainText('Destinataire');
    }
  });

  test(`Accès au détail d'un destinataire @T61860656`, async () => {
    // Filter by "Destinataire" and search
    await searchUsers.selectUserType(searchUsers.userTypes[2]);
    await searchUsers.clickSearchButton();

    // Wait for results to load
    await searchUsers.allEmailResults().first().waitFor();

    // Check recipient URL in "Voir le profil" link
    await expect(searchUsers.viewProfileByEmail(users.recipient_interne.email)).toHaveAttribute('href', `/recipients/${users.recipient_interne.internal_uuid}`);
  });

  test(`Accès au détail d'un cotransporteur @Tcf5fdc41`, async () => {
    // Filter by "Cotransporteur" and search
    await searchUsers.selectUserType(searchUsers.userTypes[1]);
    await searchUsers.clickSearchButton();

    // Wait for results to load
    await searchUsers.allEmailResults().first().waitFor();

    // Check deliverer URL in "Voir le profil" link
    await expect(searchUsers.viewProfileByEmail(users.CTP.email)).toHaveAttribute('href', `/deliverers/${users.CTP.id}`);
  });
});
