import { testInterne as test, expect } from '@fixtures/auth.fixture';
import { InternalHomePageMenu } from '@pages/BO_Interne/InternalHomePageMenu';
import { Country } from '@pages/BO_Interne/Paramètres/Settings';
import { getRandomWithIndex } from '@utils/Helpers/random.helpers';

test.describe(`BACK-6455 - Sélectionner Pays @S80f13bb8`, () => {
  let menu: InternalHomePageMenu;
  let country: Country;
  let availableCountries: string[];
  let randomCountry: { value: string; index: number };

  test.beforeEach(async ({page}) => {
    menu = new InternalHomePageMenu(page);
    country = new Country(page);

    // Click settings menu
    await menu.clickSettingsMenu();

    // Select a random available country
    availableCountries = await country.getAvailableCountries();
    randomCountry = getRandomWithIndex(availableCountries);
    await country.clickCountriesDropdown();
    await country.selectCountry(randomCountry.value);
  });

  test(`Sélectionner un pays @T3f57e98b`, async () => {
    // Check that the selected country is now in active countries
    const updatedActiveCountries = await country.activeCountries();
    expect(updatedActiveCountries).toContain(randomCountry.value);
 
  });

  test(`Supprimer le dernier pays du champ "Pays" @T7bc442a9`, async () => {
    // Delete selected country
    await country.deleteActiveCountry(randomCountry.value);

    // Check that active country is "Tous les pays"
    const updatedActiveCountries = await country.activeCountries();
    expect(updatedActiveCountries).toContain(`Tous les pays`);
 
  });
});