import { testInterne as test, expect } from '@fixtures/auth.fixture';
import { DelivererDetails } from '@pages/BO_Interne/Utilisateurs/DelivererDetails';
import { createDeliveryAPI } from '@utils/Helpers/createDeliveryAPI.helpers';
import { insertRows } from '@utils/DB_Utils/insertData.db';
import * as drives from '@testdata/drives.json';
import * as urls from '@testdata/url.app.json';
import * as users from '@testdata/users.json';

test.describe(`BO-3730 - Onglet d'annulation @Sfd3b33fa`, () => {
  let delivererDetails: DelivererDetails;
  let deliveryId: number;

  test.beforeEach(async ({ page }) => {
    delivererDetails = new DelivererDetails(page);

    // Create delivery via API
    deliveryId = await createDeliveryAPI(drives.drive_alim1, users.recipient_interne);

    // Insert cancellation history entry
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 19).replace('T', ' ');
    await insertRows('errand_history', [
      [
        { field: 'errand_id', value: deliveryId },
        { field: 'user_id', value: users.user_interne.id },
        { field: 'type', value: 'CANCELED' },
        { field: 'additional_info', value: JSON.stringify({ delivery_man_id: users.CTP.id, cancelationTime: now.toISOString() }) },
        { field: 'date', value: dateStr },
        { field: 'delivery_man_id', value: users.CTP.id },
      ],
    ]);

    // Navigate to deliverer details page
    await page.goto(`${urls.url_interne}/deliverers/${users.CTP.id}`);

    // The tab must be active to view the counter or delivery links.
    await delivererDetails.selectTab(delivererDetails.cancelledTabId);
  });

  test(`Compteur du nombre d'annulations @Tefb19dd5`, async () => {
    // Check counter visibility in cancelled tab
    await expect(delivererDetails.tabCounter(delivererDetails.cancelledTabId)).toBeVisible();
  });

  test(`Accès au détail de livraison @T2d27b342`, async ({ page }) => {
    // Check delivery URL in arrow-right link
    await expect(delivererDetails.deliveryLink(delivererDetails.cancelledTabId, deliveryId)).toBeVisible();
  });
});
