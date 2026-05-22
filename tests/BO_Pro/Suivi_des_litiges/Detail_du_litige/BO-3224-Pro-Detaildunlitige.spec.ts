import { testPro as test, expect } from '@fixtures/auth.fixture';
import { createDeliveryAPI } from '@utils/Helpers/createDeliveryAPI.helpers';
import { insertDispute, DisputeData } from '@utils/PG_Utils/createDispute.helpers';
import { DisputesListPage } from '@pages/BO_Pro/Suivi_des_litiges/DisputesListPage';
import { DisputeDetailDrawer } from '@pages/BO_Pro/Suivi_des_litiges/DisputeDetailDrawer';
import { ProHomePageMenu } from '@pages/BO_Pro/ProHomePage';
import * as drives from '@testdata/drives.json';

test.describe(`BO-3224 - Accéder au détail d'un litige @S6adce61e`, () => {
  let menu: ProHomePageMenu;
  let disputesList: DisputesListPage;
  let drawer: DisputeDetailDrawer;
  let fullName: string;
  let dispute: DisputeData;
  const fr = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  test.beforeEach(async ({ page }) => {
    menu = new ProHomePageMenu(page);
    disputesList = new DisputesListPage(page);
    drawer = new DisputeDetailDrawer(page);

    // Create delivery and insert a "to_be_completed" status dispute
    const { id, recipient } = await createDeliveryAPI();
    fullName = recipient.full_name;

    dispute = await insertDispute(
      id, drives.drive_alim1.name, drives.drive_alim1.id,
      recipient.first_name, recipient.last_name, recipient.phone,
      "to_be_completed", // Use to display completionDeadline in drawer
    );

    // Navigate to disputes page via menu and open the drawer
    await menu.clickDisputesMenu();
    await disputesList.clickDisputeRow(fullName);
  });

  test('Drawer affiche les informations du litige @T072773d5', async ({ page }) => {
    // Compute deadline as airtable_created_date + 2 months to verify it's correctly displayed in the drawer
    const createdDate = dispute.airtable_created_date;
    const deadline = new Date(createdDate);
    deadline.setMonth(deadline.getMonth() + 2);

    // Verify drawer displays correct informations
    await expect.soft(page.locator(drawer.drawerTitle)).toHaveText('Détail du litige');
    await expect.soft(page.locator(drawer.statusLabel)).toHaveText(dispute.statusLabel);
    await expect.soft(page.locator(drawer.creationDate)).toHaveText(fr(createdDate));
    await expect.soft(page.locator(drawer.completionDeadline)).toHaveText(fr(deadline));
    await expect.soft(page.locator(drawer.storeName)).toHaveText(dispute.drive_name);
    await expect.soft(page.locator(drawer.deliveryReference)).toHaveText(dispute.reference);
    await expect.soft(page.locator(drawer.recipientName)).toHaveText(fullName);
    await expect.soft(page.locator(drawer.recipientPhone)).toHaveText(dispute.recipient_phone.replace('+33', '0').replace(/(\d{2})/g, '$1 ').trim());
    await expect.soft(page.locator(drawer.disputeReason)).toHaveText(dispute.reason);
    await expect(page.locator(drawer.disputeAmount)).toContainText(String(dispute.amount).replace('.', ','));
  });

  test('Bouton "Voir le détail de la livraison" @Taf705a69', async ({ page }) => {
    // Verify URL of button "Voir le détail de la livraison"
    await expect(page.locator(drawer.deliveryDetailButton)).toHaveAttribute('href', new RegExp(`/delivery/${dispute.delivery_id}`));
  });
});