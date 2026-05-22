import { testInterne as test, expect } from '@fixtures/auth.fixture';
import { DelivererDetails } from '@pages/BO_Interne/Utilisateurs/DelivererDetails';
import { createDeliveryAPI } from '@utils/Helpers/createDeliveryAPI.helpers';
import { insertTransaction, TransactionData } from '@utils/PG_Utils/createTransaction.helpers';
import { copyRow } from '@utils/DB_Utils/copyData.db';
import { TestDataRegistry } from '@utils/DB_Utils/testDataRegistry';
import * as urls from '@testdata/url.app.json';
import * as users from '@testdata/users.json';

test.describe(`BO-3580 - Consulter l'historique des paiements d'un CTP @S38372d83`, () => {
  let delivererDetails: DelivererDetails;

  test.beforeEach(async ({ page }) => {
    delivererDetails = new DelivererDetails(page);
    
  });

  test(`Aucun paiement pour un CTP sans historique @T51a7fe0c`, async ({ page }) => {
    // Copy CTP user to get a fresh user with no payment history
    const ctpId = await copyRow('shop_user', users.CTP.id);
    TestDataRegistry.registerUser(ctpId);

    // Navigate to CTP payments tab
    await page.goto(`${urls.url_interne}/deliverers/${ctpId}`);
    await delivererDetails.selectTab(delivererDetails.paymentsTabId);

    // Verify no payment message is visible
    await expect(delivererDetails.noValueMessage(delivererDetails.paymentsTabId)).toBeVisible();
  });

  test(`Affichage des paiements d'un CTP @T8f2c2833`, async ({ page }) => {
    // Create delivery and insert a finalized transaction in PG payment
    const { id: deliveryId } = await createDeliveryAPI();
    const transaction: TransactionData = await insertTransaction(users.CTP.account_id_qa3, deliveryId);

    // Navigate to CTP 36 payments tab
    await page.goto(`${urls.url_interne}/deliverers/${users.CTP.id}`);
    await delivererDetails.selectTab(delivererDetails.paymentsTabId);

    // Verify payment row displays correct data
    await expect.soft(delivererDetails.paymentDeliveryId(transaction.delivery_id)).toContainText(String(transaction.delivery_id));
    await expect.soft(delivererDetails.paymentType(transaction.delivery_id)).toContainText(transaction.type_label);
    await expect.soft(delivererDetails.paymentAmount(transaction.delivery_id)).toContainText(transaction.amount_display);
    await expect(delivererDetails.paymentStatus(transaction.delivery_id)).toContainText(transaction.status_label);
  });
});
