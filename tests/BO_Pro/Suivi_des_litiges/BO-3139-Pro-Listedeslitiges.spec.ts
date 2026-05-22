import { testPro as test, expect } from '@fixtures/auth.fixture';
import { createDeliveryAPI, DropOffRecipient } from '@utils/Helpers/createDeliveryAPI.helpers';
import { insertDispute, DisputeData, IN_PROGRESS_STATUSES, COMPLETED_STATUSES } from '@utils/PG_Utils/createDispute.helpers';
import { getRandomWithIndex } from '@utils/Helpers/random.helpers';
import { DisputesListPage } from '@pages/BO_Pro/Suivi_des_litiges/DisputesListPage';
import { ProHomePageMenu } from '@pages/BO_Pro/ProHomePage';
import * as drives from '@testdata/drives.json';

test.describe(`BO-3139 - Afficher la liste des litiges @Sefcec02c`, () => {
  let menu: ProHomePageMenu;
  let disputesList: DisputesListPage;
  let id: number;
  let recipient: DropOffRecipient;
  const date: string = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  async function checkDisputeData(dispute: DisputeData) {
    await expect.soft(disputesList.disputeDate(recipient.full_name)).toContainText(date);
    await expect.soft(disputesList.disputeDriveName(recipient.full_name)).toContainText(new RegExp(`${dispute.drive_name}.*${dispute.drive_zip_code}.*${dispute.drive_city}`));
    await expect.soft(disputesList.disputeReason(recipient.full_name)).toHaveText(dispute.reason);
    await expect.soft(disputesList.disputeAmount(recipient.full_name)).toContainText(String(dispute.amount).replace('.', ','));
    await expect(disputesList.disputeStatus(recipient.full_name)).toHaveText(dispute.statusLabel);
  }

  test.beforeEach(async ({ page }) => {
    menu = new ProHomePageMenu(page);
    disputesList = new DisputesListPage(page);

    // Create delivery
    ({ id, recipient } = await createDeliveryAPI());
  });

  test(`Litige visible dans l'onglet "En cours" @T3667f48c`, async () => {
    // Insert in progress dispute
    const inProgressDispute = await insertDispute(
      id, drives.drive_alim1.name, drives.drive_alim1.id,
      recipient.first_name, recipient.last_name, recipient.phone,
      getRandomWithIndex([...IN_PROGRESS_STATUSES]).value
    );

    // Navigate to disputes page and verify dispute is visible in "En cours" tab with correct data
    await menu.clickDisputesMenu();
    await checkDisputeData(inProgressDispute);
  });

  test(`Litige visible dans l'onglet "Terminés" @T9a246fe8`, async () => {
    // Insert completed dispute
    const completedDispute = await insertDispute(
      id, drives.drive_alim1.name, drives.drive_alim1.id,
      recipient.first_name, recipient.last_name, recipient.phone,
      getRandomWithIndex([...COMPLETED_STATUSES]).value
    );

    // Navigate to disputes page and verify dispute is visible in "Terminés" tab with correct data
    await menu.clickDisputesMenu();
    await disputesList.selectCompletedTab();
    await checkDisputeData(completedDispute);
  });
});
