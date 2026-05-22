import { testInterne as test, expect } from '@fixtures/auth.fixture';
import { createDeliveryAPI, buildAndGotoDeliveryURL } from '@utils/Helpers/createDeliveryAPI.helpers';
import { updateErrandTable } from '@utils/DB_Utils/updateData.db';
import * as users from '@testdata/users.json';
import * as drives from '@testdata/drives.json';
import { ChangeDelivery } from '@pages/BO_Interne/Livraisons/Liste_des_livraisons/Detail_de_livraison/ChangeDelivery';
import { DeliveryDetailsSuccessMessage } from '@pages/BO_Both/SuccessMessages';
import { IncidentDrawer } from '@pages/BO_Interne/Livraisons/Liste_des_livraisons/Detail_de_livraison/IncidentDrawer';

test.describe(`BO-742 - Déclarer un incident @Sc2677366`, () => {
  test(`Problème CTP - Vol @T16991f59`, async ({ page }) => {

    // Create delivery via API
    const deliveryId = await createDeliveryAPI(drives.drive_alim1,users.recipient_interne);

    // Database delivery setup for this test
    // Adding a CTP and Reserved statut
    await updateErrandTable(deliveryId, [
    { field: 'delivery_man_id', value: users.CTP.id },
    { field: 'status', value: 3 },
    ]);

    // Navigate to the created delivery
    await buildAndGotoDeliveryURL(page, deliveryId);

    // Report an incident
    const reportIncident = new IncidentDrawer(page);
    // Click Report or Manage an incident button
    await reportIncident.clickReportManageIncidentButton();
    // Check CTP Problem
    await reportIncident.checkCTPProblem();
    // Check theft reason
    await reportIncident.checkTheftReason();
    // Click submit incident button
    await reportIncident.clickSubmitIncidentButton();
    // Validate incident in confirmation modal
    await reportIncident.confirmIncidentModal();

    // Check that the right success alert is displayed and close the toaster
    const deliveryDetailsSuccessMessage = new DeliveryDetailsSuccessMessage(page);
    await deliveryDetailsSuccessMessage.deliveryUpdateSuccessToaster(deliveryDetailsSuccessMessage.incident);
    
    // Expected status for the test
    const changeDelivery = new ChangeDelivery(page);
    const expectedStatus = 'Terminée';
    // Check that active status is updated
    await expect(changeDelivery.deliveryActiveStatus()).toHaveText(expectedStatus);

    // Check tips value
    await expect(changeDelivery.tipsValue()).toHaveText('0 €');
  });
});