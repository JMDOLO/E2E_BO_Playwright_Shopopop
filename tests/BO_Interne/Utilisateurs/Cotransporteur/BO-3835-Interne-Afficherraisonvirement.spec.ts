import { testInterne as test, expect, connectPG } from '@fixtures/auth.fixture';
import { DelivererDetails } from '@pages/BO_Interne/Utilisateurs/DelivererDetails';
import { createDeliveryAPI } from '@utils/Helpers/createDeliveryAPI.helpers';
import { insertTransaction, TransactionData } from '@utils/PG_Utils/createTransaction.helpers';
import * as urls from '@testdata/url.app.json';
import * as users from '@testdata/users.json';

test.describe(`BO-3835 - Afficher la raison des virements unitaires @S8d176bc0`, () => {
  let delivererDetails: DelivererDetails;

  test.beforeEach(async ({ page }) => {
    delivererDetails = new DelivererDetails(page);
    
  });

  test(`Afficher la raison du paiement @Ta383244c`, async ({ page }) => {
    // Create delivery and insert a finalized transaction in PG payment
    const { id: deliveryId } = await createDeliveryAPI();
    await connectPG('payment');
    const transaction: TransactionData = await insertTransaction(users.CTP.account_id_qa3, deliveryId);

    // Navigate to CTP 36 payments tab
    await page.goto(`${urls.url_interne}/deliverers/${users.CTP.id}`);
    await delivererDetails.selectTab(delivererDetails.paymentsTabId);

    // Check that the information logo is visible and that the tooltip displays the reason for the payment
    const informationLogo = delivererDetails.informationLogo(transaction.delivery_id);
    await informationLogo.click();
    const idTooltip = await informationLogo.getAttribute('aria-describedby');
    const tooltip = delivererDetails.tooltip(idTooltip!);
    await expect.soft(tooltip).toBeVisible();
    await expect(tooltip).toHaveText(transaction.comment);
  });
});
