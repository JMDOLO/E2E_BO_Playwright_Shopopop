import { testInterne as test, expect } from '@fixtures/auth.fixture';
import { linkTest } from '@testomatio/reporter';
import { createDeliveryAPI, buildAndGotoDeliveryURL, DropOffRecipient } from '@utils/Helpers/createDeliveryAPI.helpers';
import { updateErrandTable } from '@utils/DB_Utils/updateData.db';
import * as users from '@testdata/users.json';
import { InternalDeliveryDetails } from '@pages/BO_Interne/Livraisons/Liste_des_livraisons/Detail_de_livraison/InternalDeliveryDetails';

test.describe(`BO-3454 - Copy phone number (CTP / Recipient) @S55a5b528`, () => {
  let copyPhoneNumber: InternalDeliveryDetails;
  let deliveryId: number;
  let recipientData: DropOffRecipient;

  test.beforeEach(async ({ page, context }) => {
    copyPhoneNumber = new InternalDeliveryDetails(page);

    // Create delivery via API
    ({ id: deliveryId, recipient: recipientData } = await createDeliveryAPI());

    // Database delivery setup for this test
    // Adding a CTP and Reserved statut
    const dateStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await updateErrandTable(deliveryId, [
    { field: 'delivery_man_id', value: users.CTP.id },
    { field: 'status', value: 2 },
    { field: 'updated_at', value: dateStr },
    ]);

    // Grant clipboard permission to the context
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  });

  test(`Fonction bouton copie CTP @T4da6e7a4`, async ({ page }) => {
    linkTest('@T5ed9e9af');

    // Navigate to the created delivery
    await buildAndGotoDeliveryURL(page, deliveryId);

    // Click on the CTP phone number copy button
    await copyPhoneNumber.clickToCopyCtpPhoneNumber();

    // Read the clipboard content
    const clipboardContent = await page.evaluate(() => navigator.clipboard.readText());
    
    // Check that the clipboard content is the expected phone number
    expect(clipboardContent).toBe(users.CTP.phone.replace('+33', '0').replace(/(\d{2})/g, '$1 ').trim());
  });
  
  test(`Fonction bouton copie Recipient ongoing delivery @T498cf75d`, async ({ page }) => {
    linkTest('@T181b72b9');

    // Navigate to the created delivery
    await buildAndGotoDeliveryURL(page, deliveryId);
    
    // Click on the recipient phone number copy button
    await copyPhoneNumber.copyRecipientPhoneNumberButtonOngoing().click();

    // Read the clipboard content
    const clipboardContent = await page.evaluate(() => navigator.clipboard.readText());

    // Check that the clipboard content is the expected phone number
    expect(clipboardContent).toBe(recipientData.phone.replace('+33', '0').replace(/(\d{2})/g, '$1 ').trim());
  });

  test(`Fonction bouton copie Recipient validated delivery @T602b5d18`, async ({ page }) => {
    // Database delivery setup for this test
    // Adding a CTP and Validated statut
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 19).replace('T', ' ');
    await updateErrandTable(deliveryId, [
    { field: 'delivery_man_id', value: users.CTP.id },
    { field: 'done', value: 1 },
    { field: 'status', value: 6 },
    { field: 'delivery_effective', value: dateStr },
    { field: 'booked_date', value: dateStr },
    { field: 'delivery_effective_utc', value: dateStr },
    { field: 'updated_at', value: dateStr },
    ]);

    // Navigate to the created delivery
    await buildAndGotoDeliveryURL(page, deliveryId);
    
    // Click on the recipient phone number copy button
    await copyPhoneNumber.copyRecipientPhoneNumberButtonValidated().click();

    // Read the clipboard content
    const clipboardContent = await page.evaluate(() => navigator.clipboard.readText());

    // Check that the clipboard content is the expected phone number
    expect(clipboardContent).toBe(recipientData.phone.replace('+33', '0').replace(/(\d{2})/g, '$1 ').trim());
  });

});