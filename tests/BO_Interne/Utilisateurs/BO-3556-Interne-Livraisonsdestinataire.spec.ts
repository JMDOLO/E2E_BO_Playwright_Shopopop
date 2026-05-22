import { testInterne as test, expect } from '@fixtures/auth.fixture';
import { RecipientDetails } from '@pages/BO_Interne/Utilisateurs/RecipientDetails';
import { createDeliveryAPI } from '@utils/Helpers/createDeliveryAPI.helpers';
import * as drives from '@testdata/drives.json';
import * as urls from '@testdata/url.app.json';
import * as users from '@testdata/users.json';

test.describe(`BO-3556 - Livraisons d'un destinataire @S67c9c131`, () => {
  let recipientDetails: RecipientDetails;
  let deliveryId: number;

  test.beforeEach(async ({ page }) => {
    recipientDetails = new RecipientDetails(page);

    // Create delivery via API
    deliveryId = await createDeliveryAPI(drives.drive_alim1, users.recipient_interne);

    // Navigate to recipient details page
    await page.goto(`${urls.url_interne}/recipients/${users.recipient_interne.internal_uuid}`);
  });

  test(`Accès au détail de livraison @T2179aac0`, async ({ page }) => {
    // Check delivery URL in arrow-right link
    await expect(recipientDetails.deliveryLink(deliveryId)).toBeVisible();
  });
});
