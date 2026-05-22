import { defineConfig, devices } from '@playwright/test';
import { expect } from '@playwright/test';
import { matchers } from 'playwright-expect';
import dotenv from 'dotenv';
import path from 'path';
import { getProStorageStatePath, getInterneStorageStatePath } from '@utils/Helpers/shardAccount.helpers';

// add custom matchers
expect.extend(matchers);

// Read from ".env" file.
dotenv.config({ path: path.resolve(__dirname, '.env'), quiet: true });

// Build reporters array conditionally
const reporters: any[] = [];

if (process.env.CI) {
  // CI with sharding: use blob reporter for merging + list for console output
  reporters.push(['list']);  // For detailed console logs
  reporters.push(['blob']);  // For report merging

  // Add Testomat reporter if API key is provided (for shared run with sharding)
  // DISABLE_TESTOMAT lets us simulate CI=true locally without polluting Testomat
  if (process.env.TESTOMATIO && !process.env.DISABLE_TESTOMAT) {
    reporters.push([
      '@testomatio/reporter/playwright',
      {
        apiKey: process.env.TESTOMATIO,
        envs: process.env.TESTOMATIO_ENV,
        title: process.env.TESTOMATIO_TITLE
      },
    ]);
  }
} else {
  // Local execution: use list and html reporters
  reporters.push(['list'], ['html']);

  // Add Testomat reporter only if not disabled
  const isVSCodeExecution = !!process.env.VSCODE_PID;
  const shouldDisableTestomat = process.env.DISABLE_TESTOMAT || isVSCodeExecution;

  if (!shouldDisableTestomat) {
    reporters.push([
      '@testomatio/reporter/playwright',
      {
        apiKey: process.env.TESTOMATIO,
        envs: process.env.TESTOMATIO_ENV,
        title: process.env.TESTOMATIO_TITLE
      },
    ]);
  }
}

/**
 * See https://playwright.dev/docs/test-configuration.
 */
/* Project-level testIgnore overrides the root one (no merge), so we share this list across projects. */
const draftIgnore = (process.env.CI || !process.env.VSCODE_PID) ? ['**/*.spec.claude.ts'] : [];

export default defineConfig({
  testDir: './tests',
  /* manual-cleanup is handled exclusively by playwright.cleanup.config.ts */
  /* *.spec.claude.ts (drafts) only runs from VS Code Playwright extension */
  testIgnore: ['**/manual-cleanup.spec.ts', ...draftIgnore],
  /* Global setup - runs once before all tests start */
  globalSetup: './global-setup.ts',
  /* Global teardown - runs once after all tests complete */
  globalTeardown: './global-teardown.ts',
  /* Maximum time each test can run for (default is 30000ms) */
  timeout: 60000, // 60 seconds
  /* Maximum time for expect() assertions (default is 5000ms) */
  expect: {
    timeout: 30000, // 30 seconds for assertions like toBeVisible(), toBeHidden()
  },
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 2,
  /* Run with 8 parallel workers for faster test execution */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: reporters,
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'retain-on-failure',

    // All available context options: https://playwright.dev/docs/api/class-browser#browser-new-context
    contextOptions: {
      ignoreHTTPSErrors: true,
      locale: 'fr-FR',
    },

    screenshot: 'on',

    video: 'retain-on-failure',

    // Block Google Analytics and Google Tag Manager
    extraHTTPHeaders: {
      'DNT': '1',
    },
  },

  /* Configure projects: pro, interne (with storageState), and no-auth (manual login) */
  projects: [
    {
      name: 'pro',
      testMatch: '**/BO_Pro/**',
      testIgnore: ['**/Authentification/**', ...draftIgnore],
      use: {
        ...devices['Desktop Chrome'],
        storageState: getProStorageStatePath(),
      },
    },
    {
      name: 'interne',
      testMatch: '**/BO_Interne/**',
      testIgnore: ['**/Authentification/**', '**/BO-2625*', ...draftIgnore],
      use: {
        ...devices['Desktop Chrome'],
        storageState: getInterneStorageStatePath(),
      },
    },
    {
      name: 'no-auth',
      testMatch: ['**/Authentification/**', '**/BO-2625*', '**/Tools/**'],
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
});
