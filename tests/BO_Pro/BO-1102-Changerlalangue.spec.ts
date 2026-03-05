import { testPro as test, expect } from '@fixtures/auth.fixture';
import { SelectLanguage } from '@pages/BO_Pro/ProHomePage';
import { ProDeliveryPage } from '@pages/BO_Pro/Livraisons/ProDeliveryPage';
import { getRandomWithIndex } from '@utils/Helpers/random.helpers';

test.describe(`BO-1102 - Changer la langue @S07de4aa1`, () => {
  let language: SelectLanguage;
  let deliveryPage: ProDeliveryPage;
  let randomLanguage: { value: string; index: number };

  test.beforeEach(async ({ page }) => {
    language = new SelectLanguage(page);
    deliveryPage = new ProDeliveryPage(page);

    // Select language
    await language.hoverSettingsLanguageButton();
    randomLanguage = getRandomWithIndex(language.languagelist);
    await language.selectLanguage(randomLanguage.value);
  });

  test(`Modifier la langue @Tf6689929`, async () => {
    // Check breadcrumb text is in selected language
    await expect(deliveryPage.breadcrumbText()).toHaveText(deliveryPage.breadcrumbTranslations[randomLanguage.index]);

    // Check highlighted language is selected one
    await language.hoverSettingsLanguageButton();
    await expect(language.highlightedLanguage(randomLanguage.value)).toBeVisible();
  });

  test(`Modifier la langue en Français @T018da5dd`, async () => {
    // Select French language
    await language.hoverSettingsLanguageButton();
    await language.selectLanguage('Français');

    // Check breadcrumb text is in French
    await expect(deliveryPage.breadcrumbText()).toHaveText('Livraisons');

    // Check highlighted language is French
    await language.hoverSettingsLanguageButton();
    await expect(language.highlightedLanguage('Français')).toBeVisible();
  });
});