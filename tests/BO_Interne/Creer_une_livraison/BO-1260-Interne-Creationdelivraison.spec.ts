import { testInterne as test } from '@fixtures/auth.fixture';
import { InternalHomePageMenu } from '@pages/BO_Interne/InternalHomePageMenu';
import { createDeliveryForInternal } from '@utils/Helpers/createDelivery.helpers';
import * as drives from '@testdata/drives.json';
import * as users from '@testdata/users.json';

test.describe(`BO-1260 - Creation de livraison @Safc6561b`, () => {
  test(`Parcours complet - Destinataire existant - cas passant @Ted2081e2`, async ({ page }) => {
    // Complete delivrery creation

    // Access delivery creation page
    const menu = new InternalHomePageMenu(page);
    await menu.createDeliveryButton().click();

    // Create the delivery with the helper
    await createDeliveryForInternal(
      page,
      drives.drive_alim1,
      users.recipient_interne
    );
  });
});