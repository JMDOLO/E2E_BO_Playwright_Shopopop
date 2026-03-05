import { testInterne as test, expect } from '@fixtures/auth.fixture';
import { linkTest } from '@testomatio/reporter';
import { createDeliveryAPI, buildAndGotoDeliveryURL } from '@utils/Helpers/createDeliveryAPI.helpers';
import { updateErrandTable } from '@utils/DB_Utils/updateData.db';
import * as drives from '@testdata/drives.json';
import * as users from '@testdata/users.json';
import { InternalDeliveryDetails } from '@pages/BO_Interne/Livraisons/Liste_des_livraisons/Detail_de_livraison/InternalDeliveryDetails';

test.describe(`BO-3454 - Copy phone number (CTP / Recipient) @S55a5b528`, () => {
  let copyPhoneNumber: InternalDeliveryDetails;
  let deliveryId: number;
  
  test.beforeEach(async ({ page, context }) => {
    copyPhoneNumber = new InternalDeliveryDetails(page);

    // Create delivery via API
    deliveryId = await createDeliveryAPI(drives.drive_alim1,users.recipient_interne);

    // Grant clipboard permission to the context
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  });

  test(`Fonction bouton copie CTP @T4da6e7a4`, async ({ page }) => {
    linkTest('@T5ed9e9af');

    // Database delivery setup for this test
    // Adding a CTP and Reserved statut
    await updateErrandTable(deliveryId, [
    { field: 'delivery_man_id', value: users.CTP.id },
    { field: 'status', value: 2 },
    ]);

    // Navigate to the created delivery
    await buildAndGotoDeliveryURL(page, deliveryId);

    // Click on the CTP phone number copy button
    await copyPhoneNumber.clickToCopyCtpPhoneNumber();

    // Read the clipboard content
    const clipboardContent = await page.evaluate(() => navigator.clipboard.readText());

    // Check that the recipient phone number copy button is visible
    await expect(copyPhoneNumber.copyRecipientPhoneNumberButton()).toBeVisible();
    
    // Check that the clipboard content is the expected phone number
    expect(clipboardContent).toBe(users.CTP.phone.replace('+33', '0').replace(/(\d{2})/g, '$1 ').trim());
  });
  
  test(`Fonction bouton copie Recipient @T498cf75d`, async ({ page }) => {
    linkTest('@T181b72b9');

    // Navigate to the created delivery
    await buildAndGotoDeliveryURL(page, deliveryId);
    
    // Click on the recipient phone number copy button
    await copyPhoneNumber.copyRecipientPhoneNumberButton().click();

    // Read the clipboard content
    const clipboardContent = await page.evaluate(() => navigator.clipboard.readText());

    // Check that the clipboard content is the expected phone number
    expect(clipboardContent).toBe(users.recipient_interne.phone.replace('+33', '0').replace(/(\d{2})/g, '$1 ').trim());
  });

});