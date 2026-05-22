import { testInterne as test, expect } from '@fixtures/auth.fixture';
import { DelivererDetails } from '@pages/BO_Interne/Utilisateurs/DelivererDetails';
import { UnitTransferDrawer } from '@pages/BO_Interne/Utilisateurs/UnitTransferDrawer';
import { createDeliveryAPI, DropOffRecipient } from '@utils/Helpers/createDeliveryAPI.helpers';
import { updateErrandTable } from '@utils/DB_Utils/updateData.db';
import { waitForErrandInES } from '@utils/ES_Utils/selectData.es';
import { faker } from '@faker-js/faker/locale/fr';
import * as urls from '@testdata/url.app.json';
import * as users from '@testdata/users.json';
import * as drives from '@testdata/drives.json';

test.describe('BO-3581 - Faire un virement unitaire @S0c75143a', () => {
  let delivererDetails: DelivererDetails;
  let unitTransferDrawer: UnitTransferDrawer;
  let deliveryId: number;
  let recipientData: DropOffRecipient;

  test.beforeEach(async ({ page }) => {
    delivererDetails = new DelivererDetails(page);
    unitTransferDrawer = new UnitTransferDrawer(page);
  });

  test(`Ouvrir le drawer de virement unitaire @Tf8c162dc`, async ({ page }) => {
    // Navigate to CTP payments tab
    await page.goto(`${urls.url_interne}/deliverers/${users.CTP.id}`);
    await delivererDetails.selectTab(delivererDetails.paymentsTabId);

    // Open transfer drawer
    await delivererDetails.clickUnitTransferButton();

    // Verify titles and form fields are empty
    await expect.soft(unitTransferDrawer.drawerTitle()).toHaveText('Faire un virement unitaire');
    await expect.soft(unitTransferDrawer.deliveryTitle()).toHaveText('Livraison');
    await expect.soft(unitTransferDrawer.deliveryFieldValue()).toBeHidden();
    await expect.soft(unitTransferDrawer.amountTitle()).toHaveText('Montant du virement');
    await expect.soft(unitTransferDrawer.amountFieldValue()).toHaveValue('');
    await expect.soft(unitTransferDrawer.reasonTitle()).toHaveText('Raison');
    await expect(unitTransferDrawer.reasonFieldValue()).toHaveValue('');
  });

  test(`Rechercher et sélectionner une livraison terminée @T974c7863`, async ({ page }) => {
    // Create delivery and set as terminated with CTP assigned
    ({ id: deliveryId, recipient: recipientData } = await createDeliveryAPI());
    const dateStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await updateErrandTable(deliveryId, [
      { field: 'delivery_man_id', value: users.CTP.id },
      { field: 'status', value: 8 },
      { field: 'updated_at', value: dateStr },
    ]);

    // Wait for ES reindexation (after update) before accessing the UI
    await waitForErrandInES(deliveryId, dateStr);

    // Navigate to CTP payments tab
    await page.goto(`${urls.url_interne}/deliverers/${users.CTP.id}`);
    await delivererDetails.selectTab(delivererDetails.paymentsTabId);

    // Open transfer drawer
    await delivererDetails.clickUnitTransferButton();

    // Search by delivery ID
    await unitTransferDrawer.searchDelivery(String(deliveryId));

    // Verify option shows delivery ID with drive name
    await expect.soft(unitTransferDrawer.deliveryOption(deliveryId)).toBeVisible();
    await expect(unitTransferDrawer.deliveryOption(deliveryId)).toContainText(`${deliveryId} - ${drives.drive_alim1.name} - ${recipientData.full_name}`);
  });

  test(`Erreur montant supérieur à la limite @T33a80eba`, async ({ page }) => {
    // Navigate to CTP payments tab
    await page.goto(`${urls.url_interne}/deliverers/${users.CTP.id}`);
    await delivererDetails.selectTab(delivererDetails.paymentsTabId);

    // Open transfer drawer and fill invalid amount
    await delivererDetails.clickUnitTransferButton();
    await unitTransferDrawer.fillAmount('15.01');

    // Verify amount error message
    await expect(unitTransferDrawer.amountError()).toHaveText('Le montant doit être compris entre 0.01€ et 15€');
  });

  test(`Erreurs champs vides @Tb8e819a6`, async ({ page }) => {
    // Navigate to CTP payments tab
    await page.goto(`${urls.url_interne}/deliverers/${users.CTP.id}`);
    await delivererDetails.selectTab(delivererDetails.paymentsTabId);

    // Open transfer drawer and and submit transfer
    await delivererDetails.clickUnitTransferButton();
    await unitTransferDrawer.clickSubmit();

    // Verify error messages for each field
    await expect.soft(unitTransferDrawer.deliveryError()).toHaveText('Le champ Livraison est obligatoire');
    await expect.soft(unitTransferDrawer.amountError()).toHaveText('Le champ Montant du virement est obligatoire');
    await expect(unitTransferDrawer.reasonError()).toHaveText('Le champ Raison est obligatoire');
  });

  test(`Envoyer un virement unitaire via UI @T7905109d`, async ({ page }) => {
    const amount = faker.number.float({ min: 0.01, max: 15, fractionDigits: 2 }).toString();
    const reason = faker.string.alphanumeric(25);

    // Create delivery and set as terminated with CTP assigned
    ({ id: deliveryId } = await createDeliveryAPI());
    const dateStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await updateErrandTable(deliveryId, [
      { field: 'delivery_man_id', value: users.CTP.id },
      { field: 'status', value: 8 },
      { field: 'updated_at', value: dateStr },
    ]);

    // Wait for ES reindexation (after update) before accessing the UI
    await waitForErrandInES(deliveryId, dateStr);

    // Navigate to CTP payments tab
    await page.goto(`${urls.url_interne}/deliverers/${users.CTP.id}`);
    await delivererDetails.selectTab(delivererDetails.paymentsTabId);

    // Open transfer drawer and fill all fields
    await delivererDetails.clickUnitTransferButton();
    await unitTransferDrawer.searchDelivery(String(deliveryId));
    await unitTransferDrawer.selectDelivery(deliveryId);
    await unitTransferDrawer.fillAmount(amount);
    await unitTransferDrawer.fillReason(reason);

    // Intercept the POST request and submit transfer
    const [request] = await Promise.all([
      page.waitForRequest((req) => req.method() === 'POST' && req.url().includes(`/internal/deliverers/${users.CTP.id}/transactions`)),
      unitTransferDrawer.clickSubmit(),
    ]);

    // Verify POST payload contains correct data
    const payload = request.postDataJSON();
    expect(payload).toEqual({
      deliveryId: Number(deliveryId),
      amount: Number(amount),
      reason: reason,
    });
  });

  test(`Virement unitaire QA2 echange STRIPE @Te78ea832`, async ({ page }) => {
    const amount = faker.number.float({ min: 0.01, max: 15, fractionDigits: 2 }).toString();
    const reason = faker.string.alphanumeric(25);
    const ctpIdQA2 = 531683;
    const urlQA2 = 'https://api-backoffice-qa2.engineering.shopopop.com';

    // Create a fresh terminated errand on QA2 for this CTP
    const mysql = await import('mysql2/promise');
    const qa2Conn = await mysql.createConnection({
      host: process.env.DB_HOST_QA2,
      port: parseInt(process.env.DB_PORT_QA2 || '20392'),
      user: process.env.DB_USER_QA2,
      password: process.env.DB_PASSWORD_QA2,
      database: process.env.DB_DATABASE_QA2,
    });

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const [result] = await qa2Conn.execute(
      `INSERT INTO errand (delivery_man_id, drive_id, reference, tips, validated, done, status,
        ord_value, withdrawal_start, withdrawal_end, delivery_start, delivery_end, delivery_time,
        delivery_type, currency_code, updated_at)
        VALUES (?, 14517, ?, 5, 1, 1, 8, ?, ?, ?, ?, ?, ?, 'B2C', 'EUR', ?)`,
      [ctpIdQA2, faker.string.alphanumeric({ length: 8, casing: 'upper' }),
        faker.number.int({ min: 1, max: 999 }), now, now, now, now, now, now],
    );
    const deliveryIdQA2 = (result as import('mysql2').ResultSetHeader).insertId;

    try {
      // Intercept a request to get the bearer token
      const tokenPromise = page.waitForRequest(
        (req) => req.url().startsWith(urls.url_bo_api) && req.headers()['authorization']?.startsWith('Bearer '),
      );
      await page.reload();
      const bearerToken = (await tokenPromise).headers()['authorization'];

      // POST /transactions with QA2 data
      const response = await page.request.post(`${urlQA2}/internal/deliverers/${ctpIdQA2}/transactions`, {
        headers: { 'Authorization': bearerToken, 'Content-Type': 'application/json' },
        data: { deliveryId: deliveryIdQA2, amount: Number(amount), reason: reason },
      });

      // The status code is 200, and the response contains "SUCCEEDED".
      expect(response.status(), `POST /transactions status`).toBe(200);
      const body = await response.json();
      expect(body.status, `POST /transactions body`).toBe('SUCCEEDED');

    } finally {
      // Cleanup: delete errand from QA2 MySQL
      await qa2Conn.execute('DELETE FROM errand WHERE id = ?', [deliveryIdQA2]).catch(() => {});
      await qa2Conn.end().catch(() => {});

      // Cleanup: delete transaction from PG service_payment_engineering_qa
      try {
        const { connectPG, disconnectPG } = await import('@utils/PG_Utils/pg.config');
        const pgPool = await connectPG('paymentQa');
        await pgPool.query(
          `DELETE FROM "transactions" WHERE (metadata->>'delivery_id')::int = $1`,
          [deliveryIdQA2],
        );
        await disconnectPG('paymentQa');
      } catch { /* PG cleanup is best-effort */ }
    }
  });

  test(`Fermer le drawer sans enregistrer @Tae6b3010`, async ({ page }) => {
    const amount = faker.number.float({ min: 0.01, max: 15, fractionDigits: 2 }).toString();
    const reason = faker.string.alphanumeric(25);

    // Create delivery and set as terminated with CTP assigned
    ({ id: deliveryId } = await createDeliveryAPI());
    const dateStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await updateErrandTable(deliveryId, [
      { field: 'delivery_man_id', value: users.CTP.id },
      { field: 'status', value: 8 },
      { field: 'updated_at', value: dateStr },
    ]);

    // Wait for ES reindexation (after update) before accessing the UI
    await waitForErrandInES(deliveryId, dateStr);

    // Navigate to CTP payments tab
    await page.goto(`${urls.url_interne}/deliverers/${users.CTP.id}`);
    await delivererDetails.selectTab(delivererDetails.paymentsTabId);

    // Open transfer drawer and fill all fields
    await delivererDetails.clickUnitTransferButton();
    await unitTransferDrawer.searchDelivery(String(deliveryId));
    await unitTransferDrawer.selectDelivery(deliveryId);
    await unitTransferDrawer.fillAmount(amount);
    await unitTransferDrawer.fillReason(reason);

    // Close drawer
    await unitTransferDrawer.clickClose();

    // Verify drawer is no longer visible
    await expect(unitTransferDrawer.drawerTitle()).toBeHidden();

    // Open transfer drawer and verify form fields are empty
    await delivererDetails.clickUnitTransferButton();
    await expect.soft(unitTransferDrawer.deliveryFieldValue()).toBeHidden();
    await expect.soft(unitTransferDrawer.amountFieldValue()).toHaveValue('');
    await expect(unitTransferDrawer.reasonFieldValue()).toHaveValue('');
  });
});
