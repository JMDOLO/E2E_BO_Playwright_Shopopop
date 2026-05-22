import { test as base, expect } from './base.fixture';
import { LoginPage } from '@pages/BO_Both/Authentification/LoginPage';

export { expect };

/**
 * Creates an authenticated fixture for a specific BO type
 * Factory function that eliminates code duplication
 *
 * @param authMethod - The authentication method name from LoginPage
 * @returns A Playwright test fixture with automatic authentication
 */
function createAuthFixture(authMethod: 'authenticateProWithEnv' | 'authenticateInternalWithEnv') {
  return base.extend({
    page: async ({ page }, use) => {
      // Automatically authenticate before each test using the specified method
      const loginPage = new LoginPage(page);
      await loginPage[authMethod]();

      await use(page);
    },
  });
}

/**
 * Authenticated test fixture for BO Pro
 * Automatically logs in to BO Pro before each test using environment credentials
 *
 * @example
 * ```typescript
 * import { testPro as test, expect } from '@fixtures/auth.fixture';
 *
 * test('My BO Pro test', async ({ page }) => {
 *   // Already authenticated to BO Pro
 *   await expect(page).toHaveURL(/backoffice-qa3/);
 * });
 * ```
 */
export const testPro = createAuthFixture('authenticateProWithEnv');

/**
 * Authenticated test fixture for BO Interne
 * Automatically logs in to BO Interne before each test using environment credentials (Google SSO)
 *
 * @example
 * ```typescript
 * import { testInterne as test, expect } from '@fixtures/auth.fixture';
 *
 * test('My BO Interne test', async ({ page }) => {
 *   // Already authenticated to BO Interne
 *   await expect(page).toHaveURL(/backoffice-qa3/);
 * });
 * ```
 */
export const testInterne = createAuthFixture('authenticateInternalWithEnv');