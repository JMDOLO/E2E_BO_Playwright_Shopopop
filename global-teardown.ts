/**
 * Global teardown for Playwright tests
 * Runs once after all tests are completed
 *
 * Responsibilities:
 * 1. Delete all test data registered during the test campaign
 * 2. Close the database connection pool
 */

import { closeDBPool } from '@utils/DB_Utils/db.config';
import { TestDataRegistry } from '@utils/DB_Utils/testDataRegistry';
import {
  deleteErrandsByIds,
  deleteShopUsersByIds,
  deleteAddressByIds,
  collectAddressIdsFromErrands,
  collectAddressIdsFromUsers,
} from '@utils/DB_Utils/deleteData.db';
import { deleteErrandsFromES } from '@utils/ES_Utils/deleteData.es';

/**
 * Cleanup test data from the database
 * Reusable function for both global teardown and manual cleanup
 *
 * @param errands - Array of errand IDs to delete
 * @param users - Array of user IDs to delete
 */
export async function cleanupTestData(errands: number[], users: number[]): Promise<void> {
  // Step 1: Collect address IDs BEFORE deleting errands and users
  console.log('📋 Collecting address IDs for cleanup...\n');

  const addressIdsFromErrands = await collectAddressIdsFromErrands(errands);
  const addressIdsFromUsers = await collectAddressIdsFromUsers(users);

  // Merge and deduplicate address IDs
  const allAddressIds = [...new Set([...addressIdsFromErrands, ...addressIdsFromUsers])];

  console.log(`   Total unique addresses to delete: ${allAddressIds.length}\n`);

  // Step 2: Delete all registered test data in bulk
  console.log('🗑️  Deleting test data...\n');

  // Delete sequentially to respect FK constraints:
  // 1. Errands first (errand has FK to shop_user: shopper_id, delivery_man_id)
  // 2. Then users and all related tables
  // 3. Finally addresses (referenced by both errands and users)
  await deleteErrandsByIds(errands);
  await deleteErrandsFromES(errands);
  await deleteShopUsersByIds(users);
  await deleteAddressByIds(allAddressIds);

  console.log('\n✅ Test data cleanup completed\n');
}

async function globalTeardown() {
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
      // Step 2: Get registered test data
      const errands = TestDataRegistry.getErrands();
      const users = TestDataRegistry.getUsers();

      // Step 3: Cleanup test data using reusable function
      await cleanupTestData(errands, users);

      // Step 4: Clear the registry
      TestDataRegistry.clear();
    }

    // Step 5: Close the database connection pool
    await closeDBPool();
    console.log('✅ Database connection pool closed successfully\n');
  } catch (error) {
    console.error('❌ Error during global teardown:', error);
    console.error('⚠️  WARNING: Test data may not have been cleaned up!');
    console.error('   Check database manually for orphaned test data\n');
    // Don't throw - we still want to close DB pool
  }

  console.log('🎉 Global teardown completed\n');
}

export default globalTeardown;
