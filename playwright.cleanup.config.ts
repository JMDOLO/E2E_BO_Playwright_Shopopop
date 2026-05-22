import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

/**
 * Dedicated config for manual cleanup (tests/Tools/manual-cleanup.spec.ts).
 *
 * Why a separate config:
 * - No globalSetup → no QA3 authentication (works offline / weekends)
 * - No globalTeardown → no auto-cleanup of the registry as a fallback
 * - The "Clean data" test handles its own DB pool lifecycle
 * - "Clear registry" needs no DB connection at all
 *
 * Usage:
 *   npm run cleanup
 *   or via VS Code Playwright extension after adding this file to
 *   "playwright.configs" in .vscode/settings.json
 */

dotenv.config({ path: path.resolve(__dirname, '.env'), quiet: true });

export default defineConfig({
  testDir: './tests/Tools',
  timeout: 60000,
  expect: { timeout: 30000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list']],
});
