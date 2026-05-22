import { testInterne as test, expect } from '@fixtures/auth.fixture';
import { DelivererDetails } from '@pages/BO_Interne/Utilisateurs/DelivererDetails';
import { Toaster } from '@pages/BO_Both/SuccessMessages';
import { copyRow } from '@utils/DB_Utils/copyData.db';
import { insertRows } from '@utils/DB_Utils/insertData.db';
import { TestDataRegistry } from '@utils/DB_Utils/testDataRegistry';
import * as urls from '@testdata/url.app.json';
import * as users from '@testdata/users.json';

test.describe(`BO-286 - Réactiver un compte cotransporteur @S2d2e6956`, () => {
  let delivererDetails: DelivererDetails;

  test.beforeEach(async ({ page }) => {
    delivererDetails = new DelivererDetails(page);

    // Copy CTP user to get a fresh user to reactivate
    const newUserId = await copyRow('shop_user', users.CTP.id);
    TestDataRegistry.registerUser(newUserId);

    // Insert data in deactivation history and user_banned
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 19).replace('T', ' ');
    await insertRows('users_deactivation_history', [
      [
        { field: 'deliverer_id', value: newUserId },
        { field: 'deactivation_type', value: 'TOTAL_DEACTIVATION' }
      ],
    ]);
    await insertRows('user_banned', [
      [
        { field: 'user_id', value: newUserId },
        { field: 'banned_date', value: dateStr }
      ],
    ]);

    // Navigate to deliverer details page
    await page.goto(`${urls.url_interne}/deliverers/${newUserId}`);
  });

  test(`Réactiver le compte d'un cotransporteur désactivé depuis l'historique de modération @Tbbf800d8`, async ({page}) => {
    // Navigate to moderation drawer
    await delivererDetails.clickModerationHistory();

    // Reactivate user
    await delivererDetails.reactivate().click();
    await delivererDetails.confirmAction();

    // Wait for any toaster before reloading — prevents reload from cancelling the in-flight POST.
    // We don't filter on the message text: a toaster may appear in error while the account is
    // actually reactivated, and the final check below is the source of truth.
    await new Toaster(page).waitForAnyToaster();

    // Verify reactivation actually succeeded: reload and check reactivate button is not visible
    await page.reload();
    await delivererDetails.clickModerationHistory();
    await expect(delivererDetails.reactivate()).toBeHidden();
    
  });
});
