import { testInterne as test, expect } from '@fixtures/auth.fixture';
import { DelivererDetails } from '@pages/BO_Interne/Utilisateurs/DelivererDetails';
import { createDeliveryAPI } from '@utils/Helpers/createDeliveryAPI.helpers';
import { updateErrandTable } from '@utils/DB_Utils/updateData.db';
import { copyRow } from '@utils/DB_Utils/copyData.db';
import { TestDataRegistry } from '@utils/DB_Utils/testDataRegistry';
import * as urls from '@testdata/url.app.json';
import * as users from '@testdata/users.json';
import { captureBearerTokenAndNavigate } from '@utils/Helpers/boApi.helpers';

test.describe(`BO-3662 - Onglet Non présentation @Sb251c3ac`, () => {
  let delivererDetails: DelivererDetails;
  let deliveryId: number;

  test.beforeEach(async ({ page }) => {
    delivererDetails = new DelivererDetails(page);

    //Copy CTP user to get a fresh user for no-show tests (avoids deactivating the shared CTP)
    const ctpId = await copyRow('shop_user', users.CTP.id);
    TestDataRegistry.registerUser(ctpId);

    // Create delivery via API
    ({ id: deliveryId } = await createDeliveryAPI());

    // Set delivery as BOOKED by the fresh CTP with past withdrawal_end_utc (required for CANCELED → NO_SHOW)
    const pastDate = new Date(Date.now() - 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    const dateStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await updateErrandTable(deliveryId, [
      { field: 'status', value: Number(2) },
      { field: 'delivery_man_id', value: ctpId },
      { field: 'withdrawal_end_utc', value: pastDate },
      { field: 'updated_at', value: dateStr },
    ]);

    // Navigate to deliverer details page and capture Bearer token from BO API call
    const delivererPage = `${urls.url_interne}/deliverers/${ctpId}`;
    const bearerToken = await captureBearerTokenAndNavigate(page, delivererPage);

    // POST /deliveries/event to simulate cotransporteur withdrawal (CANCELED = NO_SHOW)
    const response = await page.request.post(`${urls.url_bo_api}/deliveries/event`, {
      headers: { 'Authorization': bearerToken, 'Content-Type': 'application/json' },
      data: { errand_id: deliveryId, event: 'CANCELED' },
    });
    expect(response.status(), `POST /deliveries/event failed for errand ${deliveryId}`).toBe(204);

    // Reload to ensure fresh data (the page was loaded before the POST, rare race condition on GET no-shows)
    await page.reload({ waitUntil: 'networkidle' });

    // The tab must be active to view the counter or delivery links.
    await delivererDetails.selectTab(delivererDetails.noShowTabId);
  });

  test(`Compteur du nombre de non présentation @T82f1b299`, async () => {
    // Check counter visibility in no-show tab
    await expect(delivererDetails.tabCounter(delivererDetails.noShowTabId)).toHaveAttribute('title', '1');
  });

  test(`Accès au détail de livraison @Td1cd3e81`, async () => {
    // Check delivery URL in arrow-right link
    await expect(delivererDetails.deliveryLink(delivererDetails.noShowTabId, deliveryId)).toBeVisible();
  });
});

test.describe(`BO-3662 - Onglet No-show @Sb251c3ac`, () => {
  test(`Absence de non présentation @Tad2f1e23`, async ({ page }) => {
    // Copy CTP user to get a fresh user with no no-show history
    const ctpId = await copyRow('shop_user', users.CTP.id);
    TestDataRegistry.registerUser(ctpId);

    // Navigate to CTP no-show tab
    await page.goto(`${urls.url_interne}/deliverers/${ctpId}`);
    const delivererDetails = new DelivererDetails(page);
    await delivererDetails.selectTab(delivererDetails.noShowTabId);

    // Verify no non-show message is visible
    await expect(delivererDetails.noValueMessage(delivererDetails.noShowTabId)).toBeVisible();
  });
});
