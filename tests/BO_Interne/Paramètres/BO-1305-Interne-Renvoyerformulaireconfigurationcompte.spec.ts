import { testInterne as test, expect } from '@fixtures/auth.fixture';
import { InternalHomePageMenu } from '@pages/BO_Interne/InternalHomePageMenu';
import { PartnerSettings } from '@pages/BO_Interne/Paramètres/Settings';
import { ConfigurePassword } from '@pages/BO_Interne/Paramètres/ConfigurePassword';
import * as users from '@testdata/users.json'
import { InternalSendEmailSuccessMessage } from '@pages/BO_Both/SuccessMessages'
import { waitForGoogleGroupEmail, extractLinkFromEmail, deleteGmailMessage } from '@utils/Helpers/googleGroups.helpers'
import { UpdatePassword } from '@pages/BO_Both/Authentification/LoginPage';

test.describe(`BO-1305 - Renvoyer le formulaire de configuration du compte @S139628cd`, () => {
  let menu: InternalHomePageMenu;
  let partnerSettings: PartnerSettings;
  let configurePassword: ConfigurePassword;
  let successMessage: InternalSendEmailSuccessMessage;
  let updatePassword: UpdatePassword;

  test.beforeEach(async ({page}) => {
    menu = new InternalHomePageMenu(page);
    partnerSettings = new PartnerSettings(page);
    configurePassword = new ConfigurePassword(page);
    successMessage = new InternalSendEmailSuccessMessage(page);
    updatePassword = new UpdatePassword(page);

  });

  test(`Email valide @T07d0cbff`, async () => {
      // Click settings menu
      await menu.clickSettingsMenu();

      // click Set Pro password button
      await partnerSettings.clicSetProPasswordButton();

      // Fill Pro Email with Google Group address (configured in users.json)
      await configurePassword.fillProEmail(users.user_pro1.email);

      // Click Submit Button
      await configurePassword.clickSubmitButton();

      // Check send email success alert message and close toaster
      await successMessage.sendEmailSuccessToaster(successMessage.sendEmail);

      //Logout
      await menu.clickLogout();

      // Wait for email to arrive in Google Group and retrieve its content
      const receivedEmail = await waitForGoogleGroupEmail(
        users.user_pro1.email,
        'Bienvenue sur Shopopop Pro',
        30000
      );

      // Verify email content
      expect(receivedEmail.htmlBody || receivedEmail.plainTextBody).toBeTruthy();
      expect(receivedEmail.subject).toContain('Bienvenue sur Shopopop Pro');

      // Extract and access link containing "Configurer mon mot de passe"
      const configurePasswordLink = extractLinkFromEmail(receivedEmail.htmlBody, 'Configurer mon mot de passe');
      expect(configurePasswordLink).toBeTruthy();

      // Navigate to the password configuration page
      await configurePassword.page.goto(configurePasswordLink!, { waitUntil: 'domcontentloaded' });

      // Wait for redirect to SSO authentication page
      await configurePassword.page.waitForURL('https://auth-sso-qa.engineering.shopopop.com/realms/shopopop/login-actions/**');

      // Fill password fields with environment variable
      await updatePassword.fillPassword(process.env.PASSWORDBO!);
      await updatePassword.fillConfirmPassword(process.env.PASSWORDBO!);

      // Click validation button
      await updatePassword.clickValidatePasswordButton();

      // Verify success toaster
      const passwordSetupSuccessMessage = updatePassword.passwordSetupSuccessMessage();
      await expect(passwordSetupSuccessMessage).toContainText(`Mot de passe configuré`);

      // Clean up: Delete the test email from Google Group
      await deleteGmailMessage(receivedEmail.id);

    });
    
});