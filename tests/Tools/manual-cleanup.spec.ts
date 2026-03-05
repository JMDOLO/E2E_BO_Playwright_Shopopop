import { test } from '@playwright/test';
import { cleanupTestData } from '@root/global-teardown';
import { getDBPool, closeDBPool } from '@utils/DB_Utils/db.config';
import { TestDataRegistry } from '@utils/DB_Utils/testDataRegistry';

/**
 * Manual Database Cleanup Tool
 *
 * Workflow:
 * 1. Open "test-data-registry.json" in VS Code explorer (E2E_BO/test-data-registry.json)
 * 2. Copy desired IDs from "errands"/"users" into "errandstodelete"/"userstodelete"
 * 3. Run "Clean data" to cleanup the selected IDs
 *    - Cleans from database
 *    - Removes from "errands"/"users" arrays
 *    - Empties "errandstodelete"/"userstodelete" automatically
 *
 * Optional:
 * - Run "Clear registry" to completely empty the registry (does NOT affect database)
 *
 * Note: These tests are automatically ignored in CI and when running `npm run test`
 * or `npx playwright test` locally. They only run when launched from VS Code
 * Playwright extension. See playwright.config.ts (testIgnore configuration).
 */

const ERRANDS_TO_CLEAN: number[] = TestDataRegistry.getErrandsToDelete();
const USERS_TO_CLEAN: number[] = TestDataRegistry.getUsersToDelete();

test('Clean data', async () => {
  // Validate IDs
  if (ERRANDS_TO_CLEAN.length === 0 && USERS_TO_CLEAN.length === 0) {
    console.log('\n⚠️  No IDs specified in ERRANDS_TO_CLEAN or USERS_TO_CLEAN.');
    console.log('💡 Please open test-data-registry.json and copy IDs.\n');
    return;
  }

  // Initialize DB and cleanup
  console.log('\n🔌 Initializing database connection...\n');
  getDBPool();

  try {
    console.log('🧹 Starting cleanup...\n');
    console.log(`🗑️  Items to delete:`);
    console.log(`   - ${ERRANDS_TO_CLEAN.length} errands (+ related tables)`);
    console.log(`   - ${USERS_TO_CLEAN.length} users (+ related tables)\n`);

    // Use the same cleanup logic as global teardown
    await cleanupTestData(ERRANDS_TO_CLEAN, USERS_TO_CLEAN);

    // Remove cleaned IDs from TestDataRegistry
    TestDataRegistry.remove(ERRANDS_TO_CLEAN, USERS_TO_CLEAN);

    console.log('✅ Manual database cleanup completed!');
    console.log('✅ IDs removed from TestDataRegistry\n');
  } finally {
    // Close database connection pool
    console.log('🔌 Closing database connection...\n');
    await closeDBPool();
  }
});

test('Clear registry', async () => {
  console.log('\n' + '='.repeat(60));
  console.log('⚠️  WARNING: CLEAR REGISTRY');
  console.log('='.repeat(60) + '\n');

  const stats = TestDataRegistry.getStats();

  if (stats.errands === 0 && stats.users === 0) {
    console.log('ℹ️  Registry is already empty. Nothing to clear.\n');
    console.log('='.repeat(60) + '\n');
    return;
  }

  console.log('📋 Current registry contains:');
  console.log(`   - ${stats.errands} errands`);
  console.log(`   - ${stats.users} users\n`);

  console.log('⚠️  This will clear ALL IDs from the registry.');
  console.log('⚠️  Database is NOT affected - deliveries remain in QA3.\n');

  TestDataRegistry.clear();

  console.log('✅ Registry cleared successfully!\n');
  console.log('💡 Note: Database is NOT affected.\n');
  console.log('='.repeat(60) + '\n');
});
