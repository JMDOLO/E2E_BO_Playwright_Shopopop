import { testInterne as test, expect } from '@fixtures/auth.fixture';
import { createDeliveryAPI, buildAndGotoDeliveryURL } from '@utils/Helpers/createDeliveryAPI.helpers';
import { updateErrandTable } from '@utils/DB_Utils/updateData.db';
import * as users from '@testdata/users.json';
import { ChangeDelivery } from '@pages/BO_Interne/Livraisons/Liste_des_livraisons/Detail_de_livraison/ChangeDelivery';
import { DeliveryDetailsSuccessMessage } from '@pages/BO_Both/SuccessMessages';
import { IncidentDrawer } from '@pages/BO_Interne/Livraisons/Liste_des_livraisons/Detail_de_livraison/IncidentDrawer';
import { getRandomWithIndex } from '@utils/Helpers/random.helpers';
import { faker } from '@faker-js/faker';

test.describe(`BO-742 - Déclarer un incident @Sc2677366`, () => {
  let incidentDrawer: IncidentDrawer;
  let changeDelivery: ChangeDelivery;
  let successMessage: DeliveryDetailsSuccessMessage;
  let initialTips: string;

  test.beforeEach(async ({ page }) => {
    incidentDrawer = new IncidentDrawer(page);
    changeDelivery = new ChangeDelivery(page);
    successMessage = new DeliveryDetailsSuccessMessage(page);

    // Create a delivery in "Vers le point de retrait" status and navigate to it
    const { id: deliveryId } = await createDeliveryAPI();
    const dateStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await updateErrandTable(deliveryId, [
      { field: 'delivery_man_id', value: users.CTP.id },
      { field: 'status', value: 3 },
      { field: 'updated_at', value: dateStr },
    ]);
    await buildAndGotoDeliveryURL(page, deliveryId);

    // Save initial tips for comparison
    initialTips = await changeDelivery.tipsValueInputField().inputValue();
  });

  // Theft: only reason with auto-close + tips = 0 without toggle
  test(`Problème CTP - Vol @T16991f59`, async () => {
    // Open incident drawer and select category + reason (Theft)
    await incidentDrawer.clickReportManageIncidentButton();
    await incidentDrawer.checkCategory(incidentDrawer.categories.cotransporterProblem);
    await incidentDrawer.checkReason(incidentDrawer.cotransporterProblemReasons[0]);

    // Submit and confirm incident
    await incidentDrawer.clickSubmitIncidentButton();
    await incidentDrawer.confirmIncidentModal();

    // Check that the success alert is displayed and close the toaster
    await successMessage.deliveryUpdateSuccessToaster(successMessage.incident);

    // Check delivery is closed with tips reset
    await expect(changeDelivery.deliveryActiveStatus()).toHaveText('Terminée');
    await expect(changeDelivery.tipsValue()).toHaveText('0 €');
  });

  test(`Retour au point de retrait @T3c817cfc`, async () => { // BO-3973
    const { value: reason } = getRandomWithIndex(incidentDrawer.pickupReturnReasons);

    // Open incident drawer and select category + reason
    await incidentDrawer.clickReportManageIncidentButton();
    await incidentDrawer.checkCategory(incidentDrawer.categories.pickupReturn);
    await incidentDrawer.checkReason(reason);

    // Submit and confirm incident
    await incidentDrawer.clickSubmitIncidentButton();
    await incidentDrawer.confirmIncidentModal();

    // Check that the success alert is displayed and close the toaster
    await successMessage.deliveryUpdateSuccessToaster(successMessage.incident);

    // Check delivery is validated with tips increased by 50%
    await expect(changeDelivery.deliveryActiveStatus()).toHaveText('Validée');
    const expectedTips = parseFloat((parseFloat(initialTips) * 1.5).toFixed(2));
    await expect(changeDelivery.tipsValue()).toContainText(String(expectedTips));
  });

  test(`Trajet supplémentaire @Tcb5e8cb4`, async ({ page }) => {
    const { value: reason } = getRandomWithIndex(incidentDrawer.additionalJourneyReasons);

    // Open incident drawer and select category + reason + km
    await incidentDrawer.clickReportManageIncidentButton();
    await incidentDrawer.checkCategory(incidentDrawer.categories.additionalJourney);
    await incidentDrawer.checkReason(reason);
    const { value: km } = getRandomWithIndex(incidentDrawer.kilometerRanges);
    await incidentDrawer.selectKm(km);

    // Submit and confirm incident
    await incidentDrawer.clickSubmitIncidentButton();
    await incidentDrawer.confirmIncidentModal();

    // Check that the success alert is displayed and close the toaster
    await successMessage.deliveryUpdateSuccessToaster(successMessage.incident);

    // Check tips have been reevaluated (different from initial)
    await page.reload();
    await expect(changeDelivery.tipsValueInputField()).not.toHaveValue(initialTips);
  });

  test(`Problème au point de retrait sans clôture @T9639be09`, async ({ page }) => {
    const { value: reason } = getRandomWithIndex(incidentDrawer.pickupProblemReasons);

    // Open incident drawer and select category + reason
    await incidentDrawer.clickReportManageIncidentButton();
    await incidentDrawer.checkCategory(incidentDrawer.categories.pickupProblem);
    await incidentDrawer.checkReason(reason);

    // Submit and confirm incident
    await incidentDrawer.clickSubmitIncidentButton();
    await incidentDrawer.confirmIncidentModal();

    // Check that the success alert is displayed and close the toaster
    await successMessage.deliveryUpdateSuccessToaster(successMessage.incident);

    // Check tips and status remain unchanged
    await page.reload();
    await expect(changeDelivery.tipsValueInputField()).toHaveValue(initialTips);
    await expect(changeDelivery.deliveryActiveStatus()).toHaveText('Vers le point de retrait');
  });

  test(`Problème au point de retrait avec clôture @Te36276b4`, async () => {
    const { value: reason } = getRandomWithIndex(incidentDrawer.pickupProblemReasons);

    // Open incident drawer and select category + reason
    await incidentDrawer.clickReportManageIncidentButton();
    await incidentDrawer.checkCategory(incidentDrawer.categories.pickupProblem);
    await incidentDrawer.checkReason(reason);

    // Toggle close delivery, then submit and confirm incident
    await incidentDrawer.toggleCloseDelivery();
    await incidentDrawer.clickSubmitIncidentButton();
    await incidentDrawer.confirmIncidentModal();

    // Check that the success alert is displayed and close the toaster
    await successMessage.deliveryUpdateSuccessToaster(successMessage.incident);

    // Check delivery is validated with tips decreased by 50%
    await expect(changeDelivery.deliveryActiveStatus()).toHaveText('Validée');
    const expectedTips = parseFloat((parseFloat(initialTips) * 0.5).toFixed(2));
    await expect(changeDelivery.tipsValue()).toContainText(String(expectedTips));
  });

  // Excludes Theft (index 0) which has different behavior (auto-close)
  test(`Problème CTP sans clôture @T90e6ec05`, async ({ page }) => {
    const { value: reason } = getRandomWithIndex(incidentDrawer.cotransporterProblemReasons.slice(1));

    // Open incident drawer and select category + reason
    await incidentDrawer.clickReportManageIncidentButton();
    await incidentDrawer.checkCategory(incidentDrawer.categories.cotransporterProblem);
    await incidentDrawer.checkReason(reason);
    await incidentDrawer.fillIncidentDescription(faker.string.alphanumeric(25));

    // Submit and confirm incident
    await incidentDrawer.clickSubmitIncidentButton();
    await incidentDrawer.confirmIncidentModal();

    // Check that the success alert is displayed and close the toaster
    await successMessage.deliveryUpdateSuccessToaster(successMessage.incident);

    // Check tips and status remain unchanged
    await page.reload();
    await expect(changeDelivery.tipsValueInputField()).toHaveValue(initialTips);
    await expect(changeDelivery.deliveryActiveStatus()).toHaveText('Vers le point de retrait');
  });

  // Excludes Theft (index 0) which has different behavior (auto-close)
  test(`Problème CTP avec clôture @T311f05d9`, async () => {
    const { value: reason } = getRandomWithIndex(incidentDrawer.cotransporterProblemReasons.slice(1));

    // Open incident drawer and select category + reason
    await incidentDrawer.clickReportManageIncidentButton();
    await incidentDrawer.checkCategory(incidentDrawer.categories.cotransporterProblem);
    await incidentDrawer.checkReason(reason);
    await incidentDrawer.fillIncidentDescription(faker.string.alphanumeric(25));

    // Toggle close delivery, submit and confirm incident
    await incidentDrawer.toggleCloseDelivery();
    await incidentDrawer.clickSubmitIncidentButton();
    await incidentDrawer.confirmIncidentModal();

    // Check that the success alert is displayed and close the toaster
    await successMessage.deliveryUpdateSuccessToaster(successMessage.incident);

    // Check delivery is closed with tips reset
    await expect(changeDelivery.deliveryActiveStatus()).toHaveText('Terminée');
    await expect(changeDelivery.tipsValue()).toHaveText('0 €');
  });
});
