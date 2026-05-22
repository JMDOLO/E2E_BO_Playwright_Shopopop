import { testInterne as test, expect } from '@fixtures/auth.fixture';
import { DelivererDetails } from '@pages/BO_Interne/Utilisateurs/DelivererDetails';
import { Toaster } from '@pages/BO_Both/SuccessMessages';
import { copyRow } from '@utils/DB_Utils/copyData.db';
import { TestDataRegistry } from '@utils/DB_Utils/testDataRegistry';
import { getRandomWithIndex } from '@utils/Helpers/random.helpers';
import * as urls from '@testdata/url.app.json';
import * as users from '@testdata/users.json';
import { faker } from '@faker-js/faker';


test.describe(`BO-220 - Désactiver le compte d'un cotransporteur @S5f464c45`, () => {
  let delivererDetails: DelivererDetails;

  test.beforeEach(async ({ page }) => {
    delivererDetails = new DelivererDetails(page);

    // Copy CTP user to get a fresh user to deactivate
    const newUserId = await copyRow('shop_user', users.CTP.id);
    TestDataRegistry.registerUser(newUserId);

    // Navigate to deliverer details page
    await page.goto(`${urls.url_interne}/deliverers/${newUserId}`);
  });

  test(`Désactiver le compte d'un cotransporteur depuis l'historique de modération @T226e9d15`, async ({ page }) => {
    // Select deactivation reason
    const { value: reason } = getRandomWithIndex(delivererDetails.deactivationReasons);

    // Navigate to moderation drawer
    await delivererDetails.clickModerationHistory();

    // Navigate to deactivation drawer
    await delivererDetails.clickDeactivateAccount();

    // Fill and submit deactivation form
    await delivererDetails.selectDeactivationReason(reason);
    await delivererDetails.fillDeactivationDescription(faker.string.alphanumeric(25));
    await delivererDetails.submitDeactivation();
    await delivererDetails.confirmAction();

    // Wait for any toaster before reloading — prevents reload from cancelling the in-flight POST.
    // We don't filter on the message text: a toaster may appear in error while the account is
    // actually deactivated, and the final check below is the source of truth.
    await new Toaster(page).waitForAnyToaster();

    // Verify deactivation actually succeeded: reload and check reactivate button is visible
    await page.reload();
    await delivererDetails.clickModerationHistory();
    await expect(delivererDetails.reactivate()).toBeVisible();
  });
});
