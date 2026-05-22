import { testInterne as test, expect } from '@fixtures/auth.fixture';
import { ProUserProfile } from '@pages/BO_Interne/Comptes_Pro/ProUserProfile';
import * as users from '@testdata/users.json';
import * as drives from '@testdata/drives.json';
import * as urls from '@testdata/url.app.json';

test.describe("BO-3758 - Consulter le profil d'un utilisateur partenaire @Se5ca815b",() => {
    let proUserProfile: ProUserProfile;

    test.beforeEach(async ({ page }) => {
      proUserProfile = new ProUserProfile(page);

      // Navigate to pro user profile
      await page.goto(`${urls.url_interne}/search-pro-users/${users.user_pro.id}`);
    });

    test('Vérifier les informations du compte @Tdbab291f', async () => {
      // Check account info fields
      const labels = proUserProfile.accountInfoLabels;
      await expect.soft(proUserProfile.accountInfoValue(labels.firstname)).toHaveValue(users.user_pro.firstname);
      await expect.soft(proUserProfile.accountInfoValue(labels.lastname)).toHaveValue(users.user_pro.lastname);
      await expect.soft(proUserProfile.accountInfoValue(labels.email)).toHaveValue(users.user_pro.email);
      await expect(proUserProfile.accountInfoValue(labels.phone)).toHaveValue(users.user_pro.phone);
    });

    test('Vérifier les magasins associés @T753d6890', async () => {
      // Check associated stores are displayed
      await expect.soft(proUserProfile.associatedStoreCard(drives.drive_fleur1.id)).toContainText(drives.drive_fleur1.name);
      await expect.soft(proUserProfile.associatedStoreCard(drives.drive_alim1.id)).toContainText(drives.drive_alim1.name);
      await expect(proUserProfile.associatedStoreCard(drives.drive_vin1.id)).toContainText(drives.drive_vin1.name);
    });
  },
);
