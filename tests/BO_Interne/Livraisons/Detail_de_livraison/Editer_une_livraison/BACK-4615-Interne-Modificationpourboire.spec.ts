import { testInterne as test, expect } from '@fixtures/auth.fixture';
import { createDeliveryAPI, buildAndGotoDeliveryURL } from '@utils/Helpers/createDeliveryAPI.helpers';
import * as drives from '@testdata/drives.json';
import * as users from '@testdata/users.json';
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
    await buildAndGotoDeliveryURL(page, await createDeliveryAPI(drives.drive_alim1,users.recipient_interne));

    // Save initial tips value for later verification
    initialTipsValue = (await editTips.tipsValueInputField().getAttribute('value'))!;

    // Increase tips by 1 unit
    await editTips.clickIncreaseTipsButton();
  });

  test(`Statut "Disponible" - Modification pourboire - passant @T5ea6835b`, async ({ page }) => {
    // Save new tips value for later verification
    const newTipsValue = await editTips.tipsValueInputField().getAttribute('value');
    
    // Save changes
    await saveDeliveryChanges.clickDeliveryDetailsSaveButton();

    // Check that the right success alert is displayed and close the toaster
    await deliveryDetailsSuccessMessage.deliveryUpdateSuccessToaster(deliveryDetailsSuccessMessage.details);

    // Check that tips has been updated
    await expect(actualTipsValue.tipsValue()).toContainText(newTipsValue!.replace('.', ','));
  });

  test(`Incrémentation du montant total des augmentations @T48c25b35`, async ({ page }) => {
    // Increase tips by 1 other unit
    await editTips.clickIncreaseTipsButton();
    // Save new tips value for later verification
    const newTipsValue = await editTips.tipsValueInputField().getAttribute('value');
    const expectedTotalIncrease = (parseFloat(newTipsValue!) - parseFloat(initialTipsValue!)).toFixed(2);
    
    // Save changes
    await saveDeliveryChanges.clickDeliveryDetailsSaveButton();

    // Check that the right success alert is displayed and close the toaster
    await deliveryDetailsSuccessMessage.deliveryUpdateSuccessToaster(deliveryDetailsSuccessMessage.details);

    // Check the calculation of the total amount of increases
    await expect(actualTipsValue.totalTipsIncreaseValue()).toContainText(expectedTotalIncrease!.replace('.', ','));
  });
});