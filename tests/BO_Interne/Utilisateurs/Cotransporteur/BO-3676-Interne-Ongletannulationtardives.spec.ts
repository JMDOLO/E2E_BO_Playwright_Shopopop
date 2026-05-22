import { testInterne as test, expect } from '@fixtures/auth.fixture';
import { DelivererDetails } from '@pages/BO_Interne/Utilisateurs/DelivererDetails';
import { createDeliveryAPI } from '@utils/Helpers/createDeliveryAPI.helpers';
import { insertModerationEvent } from '@utils/PG_Utils/createModerationEvent.helpers';
import { updateErrandTable } from '@utils/DB_Utils/updateData.db';
import { copyRow } from '@utils/DB_Utils/copyData.db';
import { selectTable } from '@utils/DB_Utils/selectData.db';
import { TestDataRegistry } from '@utils/DB_Utils/testDataRegistry';
import * as urls from '@testdata/url.app.json';
import * as users from '@testdata/users.json';
import { captureBearerTokenAndNavigate } from '@utils/Helpers/boApi.helpers';
import { postMobileDeliveryEvent } from '@utils/Helpers/cancelMobileDelivery.helpers';
import { selectPgTable } from '@utils/PG_Utils/selectData.pg';

test.describe(`BO-3676 - Onglet Annulations tardives @S4159f993`, () => {
  let delivererDetails: DelivererDetails;
  let ctpId: number;

  test.beforeEach(async ({ page }) => {
    delivererDetails = new DelivererDetails(page);

    //Copy CTP user to get a fresh user for late_cancellation tests (avoids deactivating the shared CTP)
    ctpId = await copyRow('shop_user', users.CTP.id);
    TestDataRegistry.registerUser(ctpId);
    
  });

  test(`Compteur du nombre d'annulations tardives @T2af2f38b`, async ({ page }) => {
    // Create delivery and insert a finalized moderation_event in PG kyc
    const { id: deliveryId } = await createDeliveryAPI();
    await insertModerationEvent(ctpId, deliveryId, 'LATE_CANCELLATION');

    // Navigate to deliverer details page
    await page.goto(`${urls.url_interne}/deliverers/${ctpId}`);

    // Access the late cancellation tab
    await delivererDetails.selectTab(delivererDetails.lateCancelledTabId);

    // Check counter visibility in late cancellation tab
    await expect(delivererDetails.tabCounter(delivererDetails.lateCancelledTabId)).toHaveAttribute('title', '1');
  });

  test(`Accès au détail de livraison @T183cd8d8`, async ({ page }) => {
    // Create delivery and insert a finalized moderation_event in PG kyc
    const { id: deliveryId } = await createDeliveryAPI();
    await insertModerationEvent(ctpId, deliveryId, 'LATE_CANCELLATION');

    // Navigate to deliverer details page
    await page.goto(`${urls.url_interne}/deliverers/${ctpId}`);

    // Access the late cancellation tab
    await delivererDetails.selectTab(delivererDetails.lateCancelledTabId);

    // Check delivery URL in arrow-right link
    await expect(delivererDetails.deliveryLink(delivererDetails.lateCancelledTabId, deliveryId)).toBeVisible();
  });

  test(`Absence d'annulation tardive si retrait du CTP par agent SC @T681143e8`, async ({ page }) => {
    // Ne pouvant pas tester le retrait d'un CTP via mobile, ce test vérifie que le retrait d'un CTP par un agent SC, dans le créneau d'annulation tardive, n'entraîne pas d'annulation tardive mais uniquement une annulation classique (pas de présence dans l'onglet annulations tardives)
    
    // Create delivery via API
    const { id: deliveryId } = await createDeliveryAPI();

    // Place la livraison de sorte que `now` tombe dans la fenêtre d'annulation tardive
    // Règle : fenêtre = [delivery_end - 1h30 ; withdrawal_end] (uniquement CTP via mobile)
    // delivery_end_utc   = now + 60min → début de fenêtre à now - 30min
    // withdrawal_end_utc = now + 30min → fin de fenêtre à now + 30min
    // → `now` est centré dans la fenêtre avec 30 min de marge de chaque côté
    const deliveryEndUtc = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    const withdrawalEndUtc = new Date(Date.now() + 30 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    const dateStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await updateErrandTable(deliveryId, [
      { field: 'status', value: Number(2) },
      { field: 'delivery_man_id', value: ctpId },
      { field: 'delivery_end_utc', value: deliveryEndUtc },
      { field: 'withdrawal_end_utc', value: withdrawalEndUtc },
      { field: 'updated_at', value: dateStr },
    ]);

    // Navigate to deliverer details page and capture Bearer token from BO API call
    const delivererPage = `${urls.url_interne}/deliverers/${ctpId}`;
    const bearerToken = await captureBearerTokenAndNavigate(page, delivererPage);

    // POST /deliveries/event to simulate cotransporteur withdrawal by Agent SC  (CANCELED)
    const response = await page.request.post(`${urls.url_bo_api}/deliveries/event`, {
      headers: { 'Authorization': bearerToken, 'Content-Type': 'application/json' },
      data: { errand_id: deliveryId, event: 'CANCELED' },
    });
    expect(response.status(), `POST /deliveries/event failed for errand ${deliveryId}`).toBe(204);

    // Access the late cancellation tab
    await delivererDetails.selectTab(delivererDetails.lateCancelledTabId);

    // Verify no late cancellation message is visible
    await expect(delivererDetails.noValueMessage(delivererDetails.lateCancelledTabId)).toBeVisible();
  });

  test(`Annulation tardive suite retrait mobile du CTP @Tfa60f8d3`, async () => {
    // Cas passant miroir de @T681143e8 : un cancel CTP via mobile dans la fenêtre late doit créer
    // une ligne LATE_CANCELLATION en PG service_kyc_engineering_qa3 (moderation_events).
    // Bypass mobiles-api : on tape directement delivery-api QA3 (Clever Cloud) avec auth_key=mobileApiKey,
    // ce qui reproduit côté delivery-api le path C_FROM_MOBILES_API avec cancelFromMobile=true.

    // Create delivery via API and place it in the late cancellation window
    // Règle : fenêtre = [delivery_end - 1h30 ; withdrawal_end]
    // delivery_end_utc   = now + 60min → début de fenêtre à now - 30min
    // withdrawal_end_utc = now + 30min → fin de fenêtre à now + 30min
    const { id: deliveryId } = await createDeliveryAPI();
    const deliveryEndUtc = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    const withdrawalEndUtc = new Date(Date.now() + 30 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    const dateStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await updateErrandTable(deliveryId, [
      { field: 'status', value: 2 },
      { field: 'delivery_man_id', value: ctpId },
      { field: 'delivery_end_utc', value: deliveryEndUtc },
      { field: 'withdrawal_end_utc', value: withdrawalEndUtc },
      { field: 'updated_at', value: dateStr },
    ]);

    // Fetch the copied CTP's access_token (generated by copyRow shop_user config)
    const [ctp] = await selectTable('shop_user', [{ field: 'id', value: ctpId }], ['access_token']);
    const userAuthKey = ctp.access_token as string;

    // Trigger the mobile cancel as the CTP — bypasses mobiles-api, hits delivery-api QA3 directly
    await postMobileDeliveryEvent(deliveryId, userAuthKey, 'CANCELED');

    // Assert one LATE_CANCELLATION row created in PG service_kyc_engineering_qa3
    // (moderation_events cleanup is handled globally by global-teardown via TestDataRegistry)
    const rows = await selectPgTable(
      'kyc',
      'moderation_events',
      [{ field: 'delivery_id', value: deliveryId }, { field: 'type', value: 'LATE_CANCELLATION' }],
    );
    expect(rows, 'moderation_events LATE_CANCELLATION row for the delivery').toHaveLength(1);
  });
});
