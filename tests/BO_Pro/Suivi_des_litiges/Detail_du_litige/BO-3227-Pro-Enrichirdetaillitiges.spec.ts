import { testPro as test, expect } from '@fixtures/auth.fixture';
import { createDeliveryAPI } from '@utils/Helpers/createDeliveryAPI.helpers';
import { insertDispute, IN_PROGRESS_STATUSES, COMPLETED_STATUSES } from '@utils/PG_Utils/createDispute.helpers';
import { DisputesListPage } from '@pages/BO_Pro/Suivi_des_litiges/DisputesListPage';
import { DisputeDetailDrawer } from '@pages/BO_Pro/Suivi_des_litiges/DisputeDetailDrawer';
import { ProHomePageMenu } from '@pages/BO_Pro/ProHomePage';
import * as drives from '@testdata/drives.json';

test.describe(`BO-3227 - Enrichir le détail d'un litige @Seba38428`, () => {
  let menu: ProHomePageMenu;
  let disputesList: DisputesListPage;
  let drawer: DisputeDetailDrawer;
  let disputeMessagesByStatus: Record<string, string>;

  test.beforeEach(async ({ page }) => {
    menu = new ProHomePageMenu(page);
    disputesList = new DisputesListPage(page);
    drawer = new DisputeDetailDrawer(page);
    disputeMessagesByStatus = drawer.disputeMessagesByStatus;
  });

  // Testomat IDs by status — Record typing on the helper array:
  // Adding or renaming a status in the helper causes a compile-time error until the map is updated
  const IN_PROGRESS_TESTOMAT_IDS: Record<typeof IN_PROGRESS_STATUSES[number], string> = {
    to_be_completed: '@Tdf5f17d8',
    in_progress: '@Td178f787',
    invalid_documents: '@Ta072f9ae',
  };
  const COMPLETED_TESTOMAT_IDS: Record<typeof COMPLETED_STATUSES[number], string> = {
    approved: '@T96e06ad2',
    cancelled: '@T9ff6f77c',
    rejected: '@Tbecf1be3',
  };

  // A single data-driven loop for the 6 statuses — the fromCompletedTab flag dictates the tab to open
  const ALL_MESSAGE_CHECKS = [
    ...IN_PROGRESS_STATUSES.map(status => ({ status, testomatId: IN_PROGRESS_TESTOMAT_IDS[status], fromCompletedTab: false })),
    ...COMPLETED_STATUSES.map(status => ({ status, testomatId: COMPLETED_TESTOMAT_IDS[status], fromCompletedTab: true })),
  ];

  for (const { status, testomatId, fromCompletedTab } of ALL_MESSAGE_CHECKS) {
    test(`Explication - Statut "${status}" ${testomatId}`, async ({ page }) => {
      // Create delivery and insert a dispute with the tested status
      const { id, recipient } = await createDeliveryAPI();
      const dispute = await insertDispute(
        id, drives.drive_alim1.name, drives.drive_alim1.id,
        recipient.first_name, recipient.last_name, recipient.phone,
        status
      );
      
      // Navigate to disputes page via menu, in the correct tab according to status, and open the drawer
      await menu.clickDisputesMenu();
      await disputesList.openDisputeDrawer(recipient.full_name, fromCompletedTab);
      const expectedMessage = disputeMessagesByStatus[status].replace('${contact_email}', dispute.contact_email);
      await expect(page.locator(drawer.contextualAlert)).toHaveText(expectedMessage);
    });
  }

  test(`Lien du bouton "Compléter la déclaration" @T0a4d8459`, async ({ page }) => {
    // Create delivery and insert a "to_be_completed" status dispute
    const { id, recipient } = await createDeliveryAPI();
    const dispute = await insertDispute(
      id, drives.drive_alim1.name, drives.drive_alim1.id,
      recipient.first_name, recipient.last_name, recipient.phone,
      'to_be_completed'
    );

    // Navigate to disputes page via menu and open the drawer
    await menu.clickDisputesMenu();
    await disputesList.openDisputeDrawer(recipient.full_name);

    // Verify name and URL of button in contextual alert
    await expect.soft(drawer.contextualAlertButton()).toHaveText('Compléter la déclaration');
    const [newTab] = await Promise.all([
      page.waitForEvent('popup'),
      drawer.contextualAlertButton().click(),
    ]);
    await expect(newTab).toHaveURL(dispute.form_url);
  });

  test(`Bloc "Date de validation" @Ta89a0353`, async ({ page }) => {
    // Future date to distinguish from the helper's default `now`
    const airtableUpdatedStatusDate = new Date();
    airtableUpdatedStatusDate.setDate(airtableUpdatedStatusDate.getDate() + 1);

    // Create delivery and insert an "approved" status dispute
    const { id, recipient } = await createDeliveryAPI();
    await insertDispute(
      id, drives.drive_alim1.name, drives.drive_alim1.id,
      recipient.first_name, recipient.last_name, recipient.phone,
      'approved',
      { airtableUpdatedStatusDate }
    );

    // Navigate to disputes page via menu, open "Terminés" tab and open the drawer
    await menu.clickDisputesMenu();
    await disputesList.openDisputeDrawer(recipient.full_name, true);

    // Verify validation date
    const fr = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    await expect(page.locator(drawer.validationDate)).toHaveText(fr(airtableUpdatedStatusDate));
  });
});
