/**
 * Global teardown for Playwright tests
 * Runs once after all tests are completed
 *
 * Responsibilities:
 * 1. Delete all test data registered during the test campaign
 * 2. Close the database connection pool
 */

import { closeDBPool, ensureDBConnection } from '@utils/DB_Utils/db.config';
import { closeAllPGPools } from '@utils/PG_Utils/pg.config';
import { TestDataRegistry } from '@utils/DB_Utils/testDataRegistry';
import {
  deleteErrandsByIds,
  deleteShopUsersByIds,
  deleteAddressByIds,
  deleteDropOffByIds,
  deleteKnownDropOffByIds,
  collectAddressIdsFromUsers,
  collectDropOffIdsFromErrands,
  collectHashesFromDropOffs,
  collectKnownDropOffIdsFromKnownDropOffs,
} from '@utils/DB_Utils/deleteData.db';
import { deleteErrandsFromES, deleteUsersFromES } from '@utils/ES_Utils/deleteData.es';
import { deletePgRows, deleteTransactionsByErrandIds } from '@utils/PG_Utils/deleteData.pg';

/**
 * Cleanup test data from the database
 * Reusable function for both global teardown and manual cleanup
 *
 * @param errands - Array of errand IDs to delete
 * @param users - Array of user IDs to delete
 */
export async function cleanupTestData(errands: number[], users: number[]): Promise<void> {
  // Step 1: Collect IDs BEFORE deleting (FK references won't exist after deletion)
  console.log('📋 Collecting IDs for cleanup...\n');

  // Addresses are only linked to users via user_has_address (errand.address_id is no longer populated)
  const allAddressIds = await collectAddressIdsFromUsers(users);

  const dropOffIds = await collectDropOffIdsFromErrands(errands);
  const hashes = await collectHashesFromDropOffs(dropOffIds);
  const knownDropOffIds = await collectKnownDropOffIdsFromKnownDropOffs(hashes);

  console.log(`   Total unique addresses to delete: ${allAddressIds.length}`);
  console.log(`   Total drop_offs to delete: ${dropOffIds.length}`);
  console.log(`   Total orphaned known_drop_offs to delete: ${knownDropOffIds.length}\n`);

  // Step 2: Delete in FK-safe order (PG first, then MySQL)
  console.log('🗑️  Deleting test data...\n');

  await deletePgRows('backoffice', 'disputes', 'delivery_id', errands);
  await deleteTransactionsByErrandIds(errands);
  await deletePgRows('kyc', 'moderation_events', 'delivery_id', errands);
  await deleteErrandsByIds(errands);
  await deleteDropOffByIds(dropOffIds);
  await deleteKnownDropOffByIds(knownDropOffIds);
  await deleteErrandsFromES(errands);
  await deletePgRows('kyc', 'users_documents', 'user_id', users);
  await deletePgRows('kyc', 'moderation_levels', 'user_id', users);
  await deleteShopUsersByIds(users);
  await deleteUsersFromES(users);
  await deleteAddressByIds(allAddressIds);

  console.log('\n✅ Test data cleanup completed\n');
}

async function globalTeardown() {
  // Skip teardown in CI setup-auth job (no DB, no tests, nothing to clean)
  if (process.env.AUTH_SETUP_ONLY) {
    console.log('\n⏭️  AUTH_SETUP_ONLY mode, skipping global teardown\n');
    return;
  }

  console.log('\n🧹 === GLOBAL TEARDOWN ===\n');

  try {
    // Step 1: Get statistics about registered test data
    const stats = TestDataRegistry.getStats();
    console.log('📊 Test data statistics:');
    console.log(`   - Errands to delete: ${stats.errands}`);
    console.log(`   - Users to delete: ${stats.users}\n`);

    if (stats.errands === 0 && stats.users === 0) {
      console.log('✅ No test data to clean up\n');
    } else {
      // Timeout to avoid hanging indefinitely on stale DB connections
      const TEARDOWN_TIMEOUT = 30000;
      await Promise.race([
        (async () => {
          await ensureDBConnection();
          const errands = TestDataRegistry.getErrands();
          const users = TestDataRegistry.getUsers();
          await cleanupTestData(errands, users);
          TestDataRegistry.clear();
        })(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Teardown cleanup timed out after ${TEARDOWN_TIMEOUT / 1000}s`)), TEARDOWN_TIMEOUT)
        ),
      ]);
    }
  } catch (error) {
    console.error('❌ Error during global teardown:', error);
    console.error('⚠️  WARNING: Test data may not have been cleaned up!');
    console.error('   Check database manually for orphaned test data\n');
  } finally {
    await Promise.race([
      Promise.all([closeDBPool(), closeAllPGPools()]),
      new Promise(resolve => setTimeout(resolve, 5000)),
    ]);
    console.log('✅ Database connection pools closed (or timed out)\n');
  }

  console.log('🎉 Global teardown completed\n');
}

export default globalTeardown;
