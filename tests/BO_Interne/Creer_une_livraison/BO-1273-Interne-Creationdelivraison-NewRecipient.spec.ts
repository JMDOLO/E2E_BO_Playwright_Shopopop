import { testInterne as test } from '@fixtures/auth.fixture';
import { InternalHomePageMenu } from '@pages/BO_Interne/InternalHomePageMenu';
import { CreateDeliveryStep1Page } from '@pages/BO_Both/Creer_une_livraison/CreateDeliveryStep1';
import { CreateDeliveryStep2Page } from '@pages/BO_Both/Creer_une_livraison/CreateDeliveryStep2';
import { CreateDeliveryStep3Page } from '@pages/BO_Both/Creer_une_livraison/CreateDeliveryStep3';
import { waitForDeliveryCreationAndRetry, withCreationRetry } from '@utils/Helpers/createDelivery.helpers';
import * as drives from '@testdata/drives.json';
import { newRecipient } from '@testdata/new_recipients';
import { generateOrderInformation } from '@testdata/order_information';

test.describe(`BO-1273 - Creation de livraison pour nouveau destinataire @Safae87e6`, () => {
  let menu: InternalHomePageMenu;
  let step1: CreateDeliveryStep1Page;
  let step2: CreateDeliveryStep2Page;
  let step3: CreateDeliveryStep3Page;

  test.beforeEach(async ({ page }) => {
    menu = new InternalHomePageMenu(page);
    step1 = new CreateDeliveryStep1Page(page);
    step2 = new CreateDeliveryStep2Page(page);
    step3 = new CreateDeliveryStep3Page(page);

    // Access delivery creation page
    await menu.createDeliveryButton().click();
  });

  test(`Parcours complet - Nouveau destinataire - cas passant @Tdd1e6dba`, async ({ page }) => {
    await withCreationRetry(step1, async () => {
      const recipient = newRecipient();
      const orderInfo = generateOrderInformation();

      // Step1
      await step1.fillAndSelectPickupPoint(drives.drive_alim1.name);
      await step1.clickCreateNewRecipient();
      await step1.fillRecipientFirstname(recipient.firstname);
      await step1.fillRecipientLastname(recipient.lastname);
      await step1.fillRecipientEmail(recipient.email);
      await step1.fillRecipientPhone(recipient.phone);
      await step1.fillAndSelectAddress(recipient.address, recipient.shortaddress);
      await step1.selectElevatorPresence(recipient.isElevator);
      await step1.fillFloorNumber(recipient.floorNumber);
      await step1.fillAddressAdditionalInfo(recipient.addressAdditionalInfo);
      await step1.validateStep1();

      // Step2
      await step2.fillReference(orderInfo.reference);
      await step2.fillAmount(orderInfo.amount);
      await step2.checkOrderSize(orderInfo.size);
      await step2.checkTransport(orderInfo.minimalTransportModeUI);
      await step2.fillAdditionalInfos(orderInfo.additionalInfos);
      await step2.validateStep2();

      // Step3
      await step3.selectDeliveryDateTomorrow();
      await step3.clickDeliveryStartTimeGlobal();
      await step3.clickDeliveryStartTimeHour();
      await step3.clickDeliveryStartTimeMinutes();
      await step3.dateDeliveryBlockLocator().click();
      const urlBeforeValidation = page.url();
      await step3.validateStep3();

      await waitForDeliveryCreationAndRetry(page, orderInfo.reference, false, urlBeforeValidation);
    });
  });

  test(`Parcours complet - Nouveau destinataire sans email - cas passant @T09299c5d`, async ({ page }) => {
    await withCreationRetry(step1, async () => {
      const recipient = newRecipient();
      const orderInfo = generateOrderInformation();

      // Step1
      await step1.fillAndSelectPickupPoint(drives.drive_alim1.name);
      await step1.clickCreateNewRecipient();
      await step1.fillRecipientFirstname(recipient.firstname);
      await step1.fillRecipientLastname(recipient.lastname);
      await step1.checkNoEmail();
      await step1.fillRecipientPhone(recipient.phone);
      await step1.fillAndSelectAddress(recipient.address, recipient.shortaddress);
      await step1.selectElevatorPresence(recipient.isElevator);
      await step1.fillFloorNumber(recipient.floorNumber);
      await step1.fillAddressAdditionalInfo(recipient.addressAdditionalInfo);
      await step1.validateStep1();

      // Step2
      await step2.fillReference(orderInfo.reference);
      await step2.fillAmount(orderInfo.amount);
      await step2.checkOrderSize(orderInfo.size);
      await step2.checkTransport(orderInfo.minimalTransportModeUI);
      await step2.fillAdditionalInfos(orderInfo.additionalInfos);
      await step2.validateStep2();

      // Step3
      await step3.selectDeliveryDateTomorrow();
      await step3.clickDeliveryStartTimeGlobal();
      await step3.clickDeliveryStartTimeHour();
      await step3.clickDeliveryStartTimeMinutes();
      await step3.dateDeliveryBlockLocator().click();
      const urlBeforeValidation = page.url();
      await step3.validateStep3();

      await waitForDeliveryCreationAndRetry(page, orderInfo.reference, false, urlBeforeValidation);
    });
  });

  test(`Parcours complet - Nouveau destinataire sans prénom - cas passant @Taa5c07af`, async ({ page }) => {
    await withCreationRetry(step1, async () => {
      const recipient = newRecipient();
      const orderInfo = generateOrderInformation();

      // Step1
      await step1.fillAndSelectPickupPoint(drives.drive_alim1.name);
      await step1.clickCreateNewRecipient();
      await step1.fillRecipientLastname(recipient.lastname);
      await step1.fillRecipientEmail(recipient.email);
      await step1.fillRecipientPhone(recipient.phone);
      await step1.fillAndSelectAddress(recipient.address, recipient.shortaddress);
      await step1.selectElevatorPresence(recipient.isElevator);
      await step1.fillFloorNumber(recipient.floorNumber);
      await step1.fillAddressAdditionalInfo(recipient.addressAdditionalInfo);
      await step1.validateStep1();

      // Step2
      await step2.fillReference(orderInfo.reference);
      await step2.fillAmount(orderInfo.amount);
      await step2.checkOrderSize(orderInfo.size);
      await step2.checkTransport(orderInfo.minimalTransportModeUI);
      await step2.fillAdditionalInfos(orderInfo.additionalInfos);
      await step2.validateStep2();

      // Step3
      await step3.selectDeliveryDateTomorrow();
      await step3.clickDeliveryStartTimeGlobal();
      await step3.clickDeliveryStartTimeHour();
      await step3.clickDeliveryStartTimeMinutes();
      await step3.dateDeliveryBlockLocator().click();
      const urlBeforeValidation = page.url();
      await step3.validateStep3();

      await waitForDeliveryCreationAndRetry(page, orderInfo.reference, false, urlBeforeValidation);
    });
  });
});