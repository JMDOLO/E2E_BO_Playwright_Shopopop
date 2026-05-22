import { testInterne as test, expect } from '@fixtures/auth.fixture';
import { InternalHomePageMenu } from '@pages/BO_Interne/InternalHomePageMenu';
import { Language, Settings } from '@pages/BO_Interne/Paramètres/Settings';
import { getRandomWithIndex } from '@utils/Helpers/random.helpers';

test.describe(`BACK-3963 - Changer la langue  @Sc5e47de3`, () => {
  let menu: InternalHomePageMenu;
  let language: Language;
  let settings: Settings;
  let randomLanguage: { value: string; index: number };

  test.beforeEach(async ({page}) => {
    menu = new InternalHomePageMenu(page);
    language = new Language(page);
    settings = new Settings(page);

    // Click settings menu
    await menu.clickSettingsMenu();

    // Select language
    await language.clickSettingsLanguageField();
    randomLanguage = getRandomWithIndex(language.languagelist);
    await language.selectLanguage(randomLanguage.value);
  
    // Check settings bloc title text is in selected language
    await expect(settings.settingsBlocTitle()).toHaveText(settings.settingsTranslations[randomLanguage.index]);
  });

  test(`Modifier la langue @T87a07b46`, async () => {
    // Check highlighted language is selected one
    await language.clickSettingsLanguageField();
    await expect(language.highlightedLanguage(randomLanguage.value)).toBeVisible();
  });
  
  test(`Modifier la langue en Français @Tff68ec10`, async () => {
    // Now change to French language
    await language.clickSettingsLanguageField();
    await language.selectLanguage('Français');

    // Check settings bloc title text is in French
    await expect(settings.settingsBlocTitle()).toHaveText('Vos paramètres');

    // Check highlighted language is French
    await language.clickSettingsLanguageField();
    await expect(language.highlightedLanguage('Français')).toBeVisible();
  });
});