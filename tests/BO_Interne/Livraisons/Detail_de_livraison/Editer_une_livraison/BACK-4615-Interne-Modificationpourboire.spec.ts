import { testInterne as test, expect } from '@fixtures/auth.fixture';
import { createDeliveryAPI, buildAndGotoDeliveryURL } from '@utils/Helpers/createDeliveryAPI.helpers';
import { ChangeDelivery } from '@pages/BO_Interne/Livraisons/Liste_des_livraisons/Detail_de_livraison/ChangeDelivery';
import { InternalDeliveryPage } from '@pages/BO_Interne/Livraisons/InternalDeliveryPage';
import { DeliveryDetailsSuccessMessage } from '@pages/BO_Both/SuccessMessages';
import { InternalDeliveryDetails } from '@pages/BO_Interne/Livraisons/Liste_des_livraisons/Detail_de_livraison/InternalDeliveryDetails';


test.describe(`BACK-4615 - Modifier le pourboire de la livraison @S027c83f3`, () => {
  let editTips: ChangeDelivery;
  let saveDeliveryChanges: InternalDeliveryPage;
  let deliveryDetailsSuccessMessage: DeliveryDetailsSuccessMessage;
  let actualTipsValue: InternalDeliveryDetails;
  let initialTipsValue: string;
  
  test.beforeEach(async ({ page }) => {
    editTips = new ChangeDelivery(page);
    saveDeliveryChanges = new InternalDeliveryPage(page);
    deliveryDetailsSuccessMessage = new DeliveryDetailsSuccessMessage(page);
    actualTipsValue = new InternalDeliveryDetails(page);

    // Create delivery via API and navigate to it
    await buildAndGotoDeliveryURL(page, (await createDeliveryAPI()).id);

    // Save initial tips value for later verification
    initialTipsValue = (await editTips.tipsValueInputField().getAttribute('value'))!;

    // Increase tips by 1 unit
    await editTips.clickIncreaseTipsButton();
    await actualTipsValue.waitForDistanceLoading(); // Remove once the API distance fix has been applied
  });

  test(`Statut "Disponible" - Modification pourboire - passant @T5ea6835b`, async ({ page }) => {
    // Save new tips value for later verification
    const newTipsValue = await editTips.tipsValueInputField().getAttribute('value');
    
    // Save changes
    await saveDeliveryChanges.clickDeliveryDetailsSaveButton();

    // Check that the right success alert is displayed and close the toaster
    await deliveryDetailsSuccessMessage.deliveryUpdateSuccessToaster(deliveryDetailsSuccessMessage.details);

    // Refresh page to check values from database
    await page.reload();
    await actualTipsValue.waitForDistanceLoading();

    // Check that tips has been updated
    await expect(actualTipsValue.tipsValue()).toContainText(newTipsValue!.replace('.', ','));
  });

  test(`Incrémentation du montant total des augmentations @T48c25b35`, async ({ page }) => { // old delivery detail page version
    // Increase tips by 1 other unit
    await editTips.clickIncreaseTipsButton();
    // Save new tips value for later verification
    const newTipsValue = await editTips.tipsValueInputField().getAttribute('value');
    const expectedTotalIncrease = (parseFloat(newTipsValue!) - parseFloat(initialTipsValue!)).toFixed(2);
    
    // Save changes
    await saveDeliveryChanges.clickDeliveryDetailsSaveButton();

    // Check that the right success alert is displayed and close the toaster
    await deliveryDetailsSuccessMessage.deliveryUpdateSuccessToaster(deliveryDetailsSuccessMessage.details);

    // Refresh page to check values from database
    await page.reload();
    await actualTipsValue.waitForDistanceLoading();

    // Check the calculation of the total amount of increases
    await expect(actualTipsValue.totalTipsIncreaseValue()).toContainText(expectedTotalIncrease!.replace('.', ','));
  });

  test.fixme(`NEW - Incrémentation du montant total des augmentations @T48c25b35`, async ({ page }) => { // New version of the delivery detail page
    // Increase tips by 1 other unit
    await editTips.clickIncreaseTipsButton();
    await actualTipsValue.waitForDistanceLoading(); // Remove once the API distance fix has been applied
    // Save new tips value for later verification
    const newTipsValue = await editTips.tipsValueInputField().getAttribute('value');
    const expectedTotalIncrease = (parseFloat(newTipsValue!) - parseFloat(initialTipsValue!)).toFixed(2);
    
    // Save changes
    await saveDeliveryChanges.clickDeliveryDetailsSaveButton();

    // Check that the right success alert is displayed and close the toaster
    await deliveryDetailsSuccessMessage.deliveryUpdateSuccessToaster(deliveryDetailsSuccessMessage.details);

    // Refresh page to check values from database
    await page.reload();
    await actualTipsValue.waitForDistanceLoading();

    // Check the calculation of the total amount of increases
    await expect(actualTipsValue.tipsValue()).toContainText(expectedTotalIncrease!.replace('.', ','));
  });
});