import { testInterne as test, expect } from '@fixtures/auth.fixture';
import { createDeliveryAPI, buildAndGotoDeliveryURL } from '@utils/Helpers/createDeliveryAPI.helpers';
import { updateErrandTable } from '@utils/DB_Utils/updateData.db';
import * as users from '@testdata/users.json';
import * as drives from '@testdata/drives.json';
import { ChangeDelivery } from '@pages/BO_Interne/Livraisons/Liste_des_livraisons/Detail_de_livraison/ChangeDelivery';
import { DeliveryDetailsSuccessMessage } from '@pages/BO_Both/SuccessMessages';

test.describe(`BACK-4696 - Modifier le statut de la livraison @S8b95a9b2`, () => {
  test(`Statut "Réservée" vers "Vers le point de retrait" @T6d2996e1`, async ({ page }) => {

    // Create delivery via API
    const deliveryId = await createDeliveryAPI(drives.drive_alim1,users.recipient_interne);

    // Database delivery setup for this test
    // Adding a CTP and Reserved statut
    await updateErrandTable(deliveryId, [
    { field: 'delivery_man_id', value: users.CTP.id },
    { field: 'status', value: 2 },
    ]);

    // Navigate to the created delivery
    await buildAndGotoDeliveryURL(page, deliveryId);

    // Expected status for the test
    const expectedStatus = 'Vers le point de retrait';
    // Select status "To the pickup point"
    const changeStatus = new ChangeDelivery(page);
    await changeStatus.clickDeliveryStatusDropdown();
    await changeStatus.selectDeliveryStatus(expectedStatus);

    // Save changes
    await changeStatus.saveDeliveryStatusChangesModal();

    // Check that the right success alert is displayed and close the toaster
    const deliveryDetailsSuccessMessage = new DeliveryDetailsSuccessMessage(page);
    await deliveryDetailsSuccessMessage.deliveryUpdateSuccessToaster(deliveryDetailsSuccessMessage.status);

    // Check that active status is updated
    await expect(changeStatus.deliveryActiveStatus()).toHaveText(expectedStatus);

  });
});