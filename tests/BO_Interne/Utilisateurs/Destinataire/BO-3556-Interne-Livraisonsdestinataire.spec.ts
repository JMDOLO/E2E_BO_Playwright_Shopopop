import { testInterne as test, expect } from '@fixtures/auth.fixture';
import { RecipientDetails } from '@pages/BO_Interne/Utilisateurs/RecipientDetails';
import { createDeliveryAPI } from '@utils/Helpers/createDeliveryAPI.helpers';
import { waitForErrandInES } from '@utils/ES_Utils/selectData.es';
import * as urls from '@testdata/url.app.json';

test.describe(`BO-3556 - Livraisons d'un destinataire @S67c9c131`, () => {
  let recipientDetails: RecipientDetails;
  let deliveryId: number;

  test.beforeEach(async ({ page }) => {
    recipientDetails = new RecipientDetails(page);

    // Create delivery via API and wait for ES indexation
    const { id, recipient } = await createDeliveryAPI();
    deliveryId = id;
    await waitForErrandInES(deliveryId);

    // Navigate to recipient details page
    await page.goto(`${urls.url_interne}/recipients/${recipient.internal_uuid}`);
  });

  test(`Accès au détail de livraison @T2179aac0`, async () => {
    // Check delivery URL in arrow-right link
    await expect(recipientDetails.deliveryLink(deliveryId)).toBeVisible();
  });
});
