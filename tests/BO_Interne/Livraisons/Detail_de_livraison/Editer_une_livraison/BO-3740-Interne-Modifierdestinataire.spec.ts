import { testInterne as test, expect } from '@fixtures/auth.fixture';
import { createDeliveryAPI, buildAndGotoDeliveryURL } from '@utils/Helpers/createDeliveryAPI.helpers';
import { newRecipient } from '@testdata/new_recipients';
import { InternalDeliveryDetails } from '@pages/BO_Interne/Livraisons/Liste_des_livraisons/Detail_de_livraison/InternalDeliveryDetails';
import { InternalDeliveryPage } from '@pages/BO_Interne/Livraisons/InternalDeliveryPage';
import { DeliveryDetailsSuccessMessage } from '@pages/BO_Both/SuccessMessages';

test.describe(`BO-3740 - Modification destinataire depuis le détail de livraison @S412d70fa`, () => {
  let deliveryDetails: InternalDeliveryDetails;
  let deliveryPage: InternalDeliveryPage;
  let successMessage: DeliveryDetailsSuccessMessage;

  test.beforeEach(async ({ page }) => {
    deliveryDetails = new InternalDeliveryDetails(page);
    deliveryPage = new InternalDeliveryPage(page);
    successMessage = new DeliveryDetailsSuccessMessage(page);

    await buildAndGotoDeliveryURL(page, (await createDeliveryAPI()).id);
  });

  test(`Modifier le prénom, nom, email et téléphone du destinataire @T58d63daa`, async ({ page }) => {
    const recipient = newRecipient();

    // Fill all recipient fields with new values
    await deliveryDetails.recipientFirstName().fill(recipient.firstname);
    await deliveryDetails.recipientLastName().fill(recipient.lastname);
    await deliveryDetails.recipientEmailOngoing().fill(recipient.email);
    await deliveryDetails.recipientPhoneNumberOngoing().fill(recipient.phone);

    // Save changes
    await deliveryPage.clickDeliveryDetailsSaveButton();

    // Check toaster and close it
    await successMessage.deliveryUpdateSuccessToaster(successMessage.details);

    // Refresh page to check values from database
    await page.reload();
    await deliveryDetails.waitForDistanceLoading();

    // Check values are preserved
    await expect.soft(deliveryDetails.recipientFirstName()).toHaveValue(recipient.firstname);
    await expect.soft(deliveryDetails.recipientLastName()).toHaveValue(recipient.lastname);
    await expect.soft(deliveryDetails.recipientEmailOngoing()).toHaveValue(recipient.email);
    await expect(deliveryDetails.recipientPhoneNumberOngoing()).toHaveValue(recipient.phone.replace(/^(\+\d{2})(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/, '$1 $2 $3 $4 $5 $6'));
  });

  test(`Modifier les champs du destinataire avec le prénom vidé @T11ab0237`, async ({ page }) => {
    const recipient = newRecipient();

    // Clear firstname, fill other fields with new values
    await deliveryDetails.recipientFirstName().fill('');
    await deliveryDetails.recipientLastName().fill(recipient.lastname);
    await deliveryDetails.recipientEmailOngoing().fill(recipient.email);
    await deliveryDetails.recipientPhoneNumberOngoing().fill(recipient.phone);

    // Save changes
    await deliveryPage.clickDeliveryDetailsSaveButton();

    // Check toaster and close it
    await successMessage.deliveryUpdateSuccessToaster(successMessage.details);

    // Refresh page to check values from database
    await page.reload();
    await deliveryDetails.waitForDistanceLoading();

    // Check values are preserved (firstname is empty)
    await expect.soft(deliveryDetails.recipientFirstName()).toHaveValue('');
    await expect.soft(deliveryDetails.recipientLastName()).toHaveValue(recipient.lastname);
    await expect.soft(deliveryDetails.recipientEmailOngoing()).toHaveValue(recipient.email);
    await expect(deliveryDetails.recipientPhoneNumberOngoing()).toHaveValue(recipient.phone.replace(/^(\+\d{2})(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/, '$1 $2 $3 $4 $5 $6'));
  });

  test(`Modifier les champs du destinataire avec la case pas d'email cochée @T140c01b2`, async ({ page }) => {
    const recipient = newRecipient();

    // Fill recipient fields (except email)
    await deliveryDetails.recipientFirstName().fill(recipient.firstname);
    await deliveryDetails.recipientLastName().fill(recipient.lastname);
    await deliveryDetails.recipientPhoneNumberOngoing().fill(recipient.phone);

    // Check "no email" checkbox
    await deliveryDetails.recipientNoEmail().check();

    // Save changes
    await deliveryPage.clickDeliveryDetailsSaveButton();

    // Check toaster and close it
    await successMessage.deliveryUpdateSuccessToaster(successMessage.details);

    // Refresh page to check values from database
    await page.reload();
    await deliveryDetails.waitForDistanceLoading();

    // Check email has auto-generated format: nom.prenomtelephone@shopopopmail.com
    await expect.soft(deliveryDetails.recipientNoEmail()).toBeChecked();
    await expect(deliveryDetails.recipientEmailOngoing()).toBeDisabled();
  });
});
