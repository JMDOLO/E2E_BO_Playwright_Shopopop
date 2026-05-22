import { testPro as test, expect } from '@fixtures/auth.fixture';
import { createDeliveryAPI, buildAndGotoDeliveryURL } from '@utils/Helpers/createDeliveryAPI.helpers';
import { updateErrandTable } from '@utils/DB_Utils/updateData.db';
import * as users from '@testdata/users.json';
import { ProDeliveryDetails } from '@pages/BO_Pro/Livraisons/Liste_des_livraisons/Detail_de_livraison/ProDeliveryDetails';
import { faker } from '@faker-js/faker';
import { DeliveryDetailsSuccessMessage } from '@pages/BO_Both/SuccessMessages';

test.describe(`BO-1829 - Signaler un ctp @S059f5fd2`, () => {
  test(`Statut "Réservée" - Signaler CTP - passant @Tad7a8982`, async ({ page }) => {

    // Create delivery via API
    const deliveryId = await createDeliveryAPI();

    // Database delivery setup for this test
    // Adding a CTP and Reserved statut
    await updateErrandTable(deliveryId, [
    { field: 'delivery_man_id', value: users.CTP.id },
    { field: 'status', value: 2 },
    ]);

    // Navigate to the created delivery
    await buildAndGotoDeliveryURL(page, deliveryId);

    // Report CTP
    const reportCTP = new ProDeliveryDetails(page);
    // Click on report CTP button
    await reportCTP.reportCTPButton();
    
    // Fill description of the report in report CTP modal (with retry mechanism for modal animation)
    const descriptionReport = faker.string.alphanumeric(25);
    await reportCTP.fillDescriptionReportInModal(descriptionReport);

    // Save the modifications (with check that action is applied)
    await reportCTP.checkAndClickSaveButtonInCTPModal();
    
    // Check that a success alert is displayed and close the toaster
    const reportCTPSuccessMessage = new DeliveryDetailsSuccessMessage(page);
    await reportCTPSuccessMessage.deliveryUpdateSuccessToaster(reportCTPSuccessMessage.reportCTP);

    // Check that report CTP block has been updated
    await expect(reportCTP.reportMadeMessage()).toHaveText("Un signalement a déjà été effectué pour ce cotransporteur sur cette livraison.");

  });
});