import { testInterne as test, expect } from '@fixtures/auth.fixture';
import { ProUserProfile } from '@pages/BO_Interne/Comptes_Pro/ProUserProfile';
import { InternalHomePageMenu } from '@pages/BO_Interne/InternalHomePageMenu';
import { ConfigurePassword } from '@pages/BO_Interne/Parametres/ConfigurePassword';
import * as users from '@testdata/users.json'
import * as urls from '@testdata/url.app.json';
import { InternalSendEmailSuccessMessage } from '@pages/BO_Both/SuccessMessages'
import { waitForGoogleGroupEmail, extractLinkFromEmail, deleteGmailMessage } from '@utils/Helpers/googleGroups.helpers'
import { UpdatePassword } from '@pages/BO_Both/Authentification/LoginPage';

test.describe(`BO-3759 - Réinitialiser le mot de passe d'un utilisateur partenaire depuis son profil  @S78885dae`, () => { // Bug BO-4028
  // Pas de retry : rate-limit bo-api de 60s par email sur /retry-send-welcome-mail
  // → un retry tomberait dans la fenêtre de blocage et l'email ne serait pas renvoyé.
  test.describe.configure({ retries: 0 });

  let proUserProfile: ProUserProfile;
  let menu: InternalHomePageMenu;
  let configurePassword: ConfigurePassword;
  let successMessage: InternalSendEmailSuccessMessage;
  let updatePassword: UpdatePassword;

  test.beforeEach(async ({page}) => {
    proUserProfile = new ProUserProfile(page);
    menu = new InternalHomePageMenu(page);
    configurePassword = new ConfigurePassword(page);
    successMessage = new InternalSendEmailSuccessMessage(page);
    updatePassword = new UpdatePassword(page);

    // Navigate to pro user profile
      await page.goto(`${urls.url_interne}/search-pro-users/${users.user_pro1.id}`);

  });

  test(`Envoi d'un email de réinitialisation - cas passant @Tf45baf81`, async () => {
      // Click Reset Password button and validate
      await proUserProfile.resetPasswordButton();

      // Check send email success alert message and close toaster
      await successMessage.sendEmailSuccessToaster(successMessage.sendEmail);

      //Logout
      await menu.clickLogout();

      // Wait for email to arrive in Google Group and retrieve its content
      const receivedEmail = await waitForGoogleGroupEmail(
        users.user_pro1.email,
        'Bienvenue sur Shopopop Pro',
        60000
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

      // Verify success message
      const passwordSetupSuccessMessage = updatePassword.passwordSetupSuccessMessage();
      await expect(passwordSetupSuccessMessage).toContainText(`Mot de passe configuré`);

      // Clean up: Delete the test email from Google Group
      await deleteGmailMessage(receivedEmail.id);

    });
    
});