import { defineConfig, devices } from '@playwright/test';
import { expect } from '@playwright/test';
import { matchers } from 'playwright-expect';
import dotenv from 'dotenv';
import path from 'path';

// add custom matchers
expect.extend(matchers);

// Read from ".env" file.
dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

// Build reporters array conditionally
const reporters: any[] = [];

if (process.env.CI) {
  // CI with sharding: use blob reporter for merging + list for console output
  reporters.push(['list']);  // For detailed console logs
  reporters.push(['blob']);  // For report merging

  // Add Testomat reporter if API key is provided (for shared run with sharding)
  if (process.env.TESTOMATIO) {
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
export default defineConfig({
  testDir: './tests',
  /* Ignore manual cleanup test except when running from VS Code Playwright extension */
  testIgnore: (process.env.CI || !process.env.VSCODE_PID)
    ? '**/manual-cleanup.spec.ts'
    : undefined,
  /* Global setup - runs once before all tests start */
  globalSetup: './global-setup.ts',
  /* Global teardown - runs once after all tests complete */
  globalTeardown: './global-teardown.ts',
  /* Maximum time each test can run for (default is 30000ms) */
  timeout: 90000, // 90 seconds
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
    /* Base URL to use in actions like `await page.goto('')`. */
    // baseURL: 'http://localhost:3000',

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

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    /*{
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },*/

    /*{
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },*/

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
