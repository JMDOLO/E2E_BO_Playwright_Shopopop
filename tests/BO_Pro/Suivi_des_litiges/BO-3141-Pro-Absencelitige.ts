import { testPro as test, expect } from '@fixtures/auth.fixture';
import { deletePgRows } from '@utils/PG_Utils/deleteData.pg';
import { DisputesListPage } from '@pages/BO_Pro/Suivi_des_litiges/DisputesListPage';
import { ProHomePageMenu, SelectDrive } from '@pages/BO_Pro/ProHomePage';
import * as drives from '@testdata/drives.json';

test.describe(`BO-3141 - Message pour absence de litige @S0eb9980a`, () => {
  let menu: ProHomePageMenu;
  let selectDrive: SelectDrive;
  let disputesList: DisputesListPage;

  test.beforeEach(async ({ page }) => {
    menu = new ProHomePageMenu(page);
    selectDrive = new SelectDrive(page);
    disputesList = new DisputesListPage(page);
  });

  test(`BO-3141 - Liste de litiges - Aucun litige @T4cf8f02c`, async () => {
    // Ensure no disputes exist for the selected drive
    await deletePgRows('backoffice', 'disputes', 'drive_name', [drives.drive_vin1.name]);

    // Navigate to disputes page
    await menu.clickDisputesMenu();

    // Select the choosen drive
    await selectDrive.selectDrive(drives.drive_vin1.name);

    // Verify there is no dispute and the appropriate message is displayed
    await expect(disputesList.noDisputeMessage()).toHaveText("Il n'y a aucune demande de litige à afficher.Pour déclarer un litige, veuillez contacter notre service client.");
  });
});
