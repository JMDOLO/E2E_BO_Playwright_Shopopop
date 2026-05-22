import { testInterne as test, expect, connectPG } from '@fixtures/auth.fixture';
import { DelivererDetails } from '@pages/BO_Interne/Utilisateurs/DelivererDetails';
import { DeliveryDetailsSuccessMessage } from '@pages/BO_Both/SuccessMessages';
import { copyRow } from '@utils/DB_Utils/copyData.db';
import { TestDataRegistry } from '@utils/DB_Utils/testDataRegistry';
import { insertPgRow } from '@utils/PG_Utils/insertData.pg';
import * as urls from '@testdata/url.app.json';
import * as users from '@testdata/users.json';

test.describe(`BO-3579 - Invalider les KYC d'un CTP @Sac43865f`, () => {
  let delivererDetails: DelivererDetails;
  let successMessage: DeliveryDetailsSuccessMessage;
  let ctpId: number;

  test.beforeEach(async ({ page }) => {
    delivererDetails = new DelivererDetails(page);
    successMessage = new DeliveryDetailsSuccessMessage(page);

    // Create a fresh CTP copy (no users_documents row by default)
    ctpId = await copyRow('shop_user', users.CTP.id);
    TestDataRegistry.registerUser(ctpId);
  });

  test(`Bouton "Invalider les KYC" désactivé sans document d'identité @Tc2f49f8c`, async ({ page }) => {
    // Navigate to CTP details page
    await page.goto(`${urls.url_interne}/deliverers/${ctpId}`);

    // Verify identity tag is grey (not_sent)
    await expect(delivererDetails.identityTag()).toHaveClass(delivererDetails.identityTagClass.default);

    // Check button is disabled when no identity document exists
    await expect(delivererDetails.invalidateKycButton()).toBeDisabled();
  });

  test(`Invalider les KYC d'un CTP avec document d'identité validé @Teace7b73`, async ({ page }) => {
    // Insert a validated identity document in PG kyc for this CTP
    await connectPG('kyc');
    await insertPgRow('kyc', 'users_documents', [
      { field: 'user_id', value: ctpId },
      { field: 'ocr_status', value: 'SUCCEEDED' },
      { field: 'kyc_status', value: 'SUCCEEDED' },
      { field: 'user_legal_status', value: 'SUCCEEDED' },
      { field: 'authorized_status', value: 'SUCCEEDED' },
      { field: 'status', value: 'SUCCEEDED' },
      { field: 'metadata', value: '{}' },
    ]);

    // Navigate to CTP details page
    await page.goto(`${urls.url_interne}/deliverers/${ctpId}`);

    // Verify identity tag is green (validated)
    await expect(delivererDetails.identityTag()).toHaveClass(delivererDetails.identityTagClass.success);

    // Click "Invalider les KYC" and confirm
    await delivererDetails.invalidateKycButton().click();
    await delivererDetails.confirmAction();

    // Check success toaster
    await successMessage.deliveryUpdateSuccessToaster(successMessage.kycInvalidation);

    // Reload and verify identity tag is now red (refused)
    await page.reload();
    await expect(delivererDetails.identityTag()).toHaveClass(delivererDetails.identityTagClass.error);
  });
});
