import { testInterne as test, expect } from '@fixtures/auth.fixture';
import { InternalHomePageMenu } from '@pages/BO_Interne/InternalHomePageMenu';
import { SearchUsers } from '@pages/BO_Interne/Utilisateurs/Users';
import * as users from '@testdata/users.json'

test.describe(`BACK-5877 - Rechercher un utilisateur @Sd1bde397`, () => {
  let menu: InternalHomePageMenu;
  let searchUsers: SearchUsers;

  test.beforeEach(async ({page}) => {
    menu = new InternalHomePageMenu(page);
    searchUsers = new SearchUsers(page);
  });

  test(`Recherche nom - cas passant @Tb65cf010`, async () => {
      // Click users menu
      await menu.clickUsersMenu();

      // Fill Name Field (firstname and/or lastname)
      const lastname = users.recipient_interne.lastname;
      await searchUsers.fillNameField(lastname);

      // Click Search Button
      await searchUsers.clickSearchButton();

      // Verify all search results contain the searched lastname
      await searchUsers.allNameResults().first().waitFor();
      const nameResults = await searchUsers.allNameResults().all();
      for (const result of nameResults) {
        await expect(result).toContainText(lastname);
      }
  });

  test(`Recherche téléphone - cas passant @T91a903c8`, async () => {
      // Click users menu
      await menu.clickUsersMenu();

      // Fill Phone Field
      const phone = users.recipient_interne.phone;
      await searchUsers.fillPhoneField(phone);

      // Click Search Button
      await searchUsers.clickSearchButton();

      // Verify all search results contain the searched phone number
      const formattedPhone = phone.replace('+33', '0').replace(/(\d{2})/g, '$1 ').trim();
      await searchUsers.allPhoneResults().first().waitFor();
      const phoneResults = await searchUsers.allPhoneResults().all();
      for (const result of phoneResults) {
        await expect(result).toContainText(formattedPhone);
      }
  });

  test(`Recherche e-mail - cas passant @T3c994101`, async () => {
      // Click users menu
      await menu.clickUsersMenu();

      // Fill E-mail Field
      const email = users.recipient_interne.email;
      await searchUsers.fillEmailField(email);

      // Click Search Button
      await searchUsers.clickSearchButton();

      // Verify all search results contain the searched email
      await searchUsers.allEmailResults().first().waitFor();
      const emailResults = await searchUsers.allEmailResults().all();
      for (const result of emailResults) {
        await expect(result).toContainText(email);
      }
  });
});