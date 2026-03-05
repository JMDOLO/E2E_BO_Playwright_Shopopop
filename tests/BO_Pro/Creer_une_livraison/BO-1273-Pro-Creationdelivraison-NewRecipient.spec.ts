import { testPro as test } from '@fixtures/auth.fixture';
import { ProHomePageMenu } from '@pages/BO_Pro/ProHomePage';
import { CreateDeliveryStep1Page } from '@pages/BO_Both/Creer_une_livraison/CreateDeliveryStep1';
import { CreateDeliveryStep2Page } from '@pages/BO_Both/Creer_une_livraison/CreateDeliveryStep2';
import { CreateDeliveryStep3Page } from '@pages/BO_Both/Creer_une_livraison/CreateDeliveryStep3';
import { CreateDeliveryStep4Page } from '@pages/BO_Both/Creer_une_livraison/CreateDeliveryStep4';
import { waitForDeliveryCreationAndRetry } from '@utils/Helpers/createDelivery.helpers';
import * as drives from '@testdata/drives.json';
import { newRecipientPro, newRecipient } from '@testdata/new_recipients';
import { orderInformation } from '@testdata/order_information';
import { selectTable } from '@utils/DB_Utils/selectData.db';
import { TestDataRegistry } from '@utils/DB_Utils/testDataRegistry';

test.describe(`BO-1273 - Creation de livraison pour nouveau destinataire @S6449c9c0`, () => {
  test(`Parcours complet - Nouveau destinataire - cas passant @T90ac7f75`, async ({ page }) => {
    // Complete delivrery creation

    // Access delivery creation page
    const menu = new ProHomePageMenu(page);
    await menu.createDeliveryButton().click();

    // Step1
    const step1 = new CreateDeliveryStep1Page(page);
    await step1.fillAndSelectPickupPoint(drives.drive_alim1.name);
    await step1.clickCreateNewRecipient();
    await step1.fillRecipientFirstname(newRecipientPro.firstname);
    await step1.fillRecipientLastname(newRecipientPro.lastname);
    await step1.fillRecipientEmail(newRecipientPro.email);
    await step1.fillRecipientPhone(newRecipient.phone);
    await step1.fillAndSelectAddress(newRecipientPro.address, newRecipientPro.shortaddress);
    await step1.selectElevatorPresence(newRecipient.isElevator);
    await step1.fillFloorNumber(newRecipient.floorNumber);
    await step1.fillAddressAdditionalInfo(newRecipient.addressAdditionalInfo);
    await step1.waitForDistanceLoading();
    await step1.validateStep1();

    // Step2
    const step2 = new CreateDeliveryStep2Page(page);
    await step2.fillReference(orderInformation.reference);
    await step2.fillAmount(orderInformation.amount);
    await step2.checkOrderSize(orderInformation.size);
    await step2.checkTransport(orderInformation.minimalTransportModeUI);
    await step2.fillAdditionalInfos(orderInformation.additionalInfos);
    await step2.validateStep2();

    // Step3
    const step3 = new CreateDeliveryStep3Page(page);
    await step3.selectDeliveryDateTomorrow();
    await step3.clickDeliveryStartTimeGlobal();
    await step3.clickDeliveryStartTimeHour();
    await step3.clickDeliveryStartTimeMinutes();
    await step3.dateDeliveryBlockLocator().click();
    const urlBeforeValidation = page.url();
    await step3.validateStep3();

    // Step4
    const step4 = new CreateDeliveryStep4Page(page);
    await step4.validateStep4();

    // Wait for delivery creation with automatic retry on "too many attempts" error
    const { id: deliveryId } = await waitForDeliveryCreationAndRetry(page, step4, true, urlBeforeValidation);

    // Extract shop_user ID from DB for cleanup
    const rows = await selectTable(
      'errand',
      [{ field: 'id', value: deliveryId }],
      ['shopper_id']
    );
    const userId = rows[0].shopper_id as number;
    TestDataRegistry.registerUser(userId);
  });
});