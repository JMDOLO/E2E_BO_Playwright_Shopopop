/**
 * Database cleanup helpers for E2E tests
 *
 * These functions delete test data from the database in bulk for optimal performance.
 * Used by globalTeardown at the end of the test campaign.
 *
 * IMPORTANT: Deletion order respects foreign key constraints (children before parents)
 * Based on E2E_API project cleanup logic
 */

import { ResultSetHeader } from 'mysql2';
import { getDBPool } from '@utils/DB_Utils/db.config';
import { selectTable } from '@utils/DB_Utils/selectData.db';

/**
 * Configuration for errand-related tables
 * Order matters! Delete children before parents to respect FK constraints
 */
const ERRAND_RELATED_TABLES = [
  // Children first (tables with FK to errand)
  { table: 'delivery_attributes_values', column: 'delivery_id' },
  { table: 'delivery_comment', column: 'delivery_id' },
  { table: 'delivery_transport_size', column: 'delivery_id' },
  { table: 'errand_history', column: 'errand_id' },
  { table: 'errand_incident', column: 'errand_id' },
  { table: 'errand_ticket', column: 'errand_id' },
  { table: 'event', column: 'errand_id' },
  { table: 'push', column: 'errand_id' },
  { table: 'shifted_errand_event', column: 'errand_id' },
  { table: 'user_has_rate', column: 'errand_id' },
  { table: 'waiting_errand_operation', column: 'errand_id' },

  // Parent last (main table)
  { table: 'errand', column: 'id' },
];

/**
 * Configuration for address-related tables
 * Order matters! Delete children before parents to respect FK constraints
 */
const ADDRESS_RELATED_TABLES = [
  // Children first (tables with FK to address)
  { table: 'address_change_request', column: 'address_id' },
  { table: 'drive', column: 'address_id' },
  { table: 'drive_billing_info', column: 'address_id' },
  { table: 'errand', column: 'address_id' },
  { table: 'shop_user', column: 'address_mango_id' },
  { table: 'shop_user', column: 'address_localisation_id' },
  { table: 'user_has_address', column: 'address_id' },

  // Parent last (main table)
  { table: 'address', column: 'id' },
];

/**
 * Configuration for user-related tables
 *
 * IMPORTANT: This list does NOT include errand-related tables because:
 * 1. Errands and their children are already deleted by deleteErrandsByIds()
 * 2. Trying to delete errands again via user FK columns would fail with FK constraints
 * 3. The errand children (errand_history, errand_incident, errand_ticket, event, etc.)
 *    are already cleaned up in ERRAND_RELATED_TABLES
 *
 * This list only handles tables that reference shop_user but are NOT part of the errand cleanup.
 */
const USER_RELATED_TABLES = [
  // Children first (tables with FK to shop_user)
  { table: 'address_change_request', column: 'user_id' },
  { table: 'delivery_comment', column: 'user_id' },
  { table: 'drive', column: 'user_id' },
  { table: 'drive_billing_info', column: 'modified_by' },
  // NOTE: errand table entries removed - already deleted by deleteErrandsByIds()
  // { table: 'errand', column: 'canceler_id' },
  // { table: 'errand', column: 'added_by_id' },
  // { table: 'errand', column: 'delivery_man_id' },
  // { table: 'errand', column: 'shopper_id' },
  // NOTE: errand_history entries removed - already deleted by deleteErrandsByIds()
  // { table: 'errand_history', column: 'user_id' },
  // { table: 'errand_history', column: 'delivery_man_id' },
  // NOTE: errand_incident entries removed - already deleted by deleteErrandsByIds()
  // { table: 'errand_incident', column: 'updated_by' },
  // { table: 'errand_incident', column: 'added_by_id' },
  // NOTE: errand_ticket entries removed - already deleted by deleteErrandsByIds()
  // { table: 'errand_ticket', column: 'targeted_user_id' },
  // { table: 'errand_ticket', column: 'added_by_id' },
  // { table: 'errand_ticket', column: 'assigned_user_id' },
  { table: 'event', column: 'user_id' },
  { table: 'file', column: 'user_id' },
  { table: 'file_history', column: 'user_id' },
  { table: 'invitation', column: 'invitee_id' },
  { table: 'invitation', column: 'shopper_id' },
  { table: 'mango_document_history', column: 'user_id' },
  { table: 'mango_pay_in', column: 'added_by_id' },
  { table: 'mango_pay_in', column: 'credited_user_id' },
  { table: 'mango_pay_out', column: 'debited_user_id' },
  { table: 'mango_pay_out', column: 'added_by_id' },
  { table: 'mango_transfer', column: 'debited_user_id' },
  { table: 'mango_transfer', column: 'added_by_id' },
  { table: 'mango_transfer', column: 'credited_user_id' },
  // NOTE: push removed - already deleted by deleteErrandsByIds()
  // { table: 'push', column: 'added_by_id' },
  // NOTE: shifted_errand_event removed - already deleted by deleteErrandsByIds()
  // { table: 'shifted_errand_event', column: 'shifted_by_id' },
  // { table: 'shifted_errand_event', column: 'deliverer_id' },
  { table: 'user_banned', column: 'added_by_id' },
  { table: 'user_banned', column: 'user_id' },
  { table: 'user_banned_drive', column: 'user_id' },
  { table: 'user_data_analysis', column: 'user_id' },
  { table: 'user_has_address', column: 'user_id' },
  { table: 'user_has_drive', column: 'user_id' },
  { table: 'user_has_kyc_documents', column: 'user_id' },
  // NOTE: user_has_rate removed - already deleted by deleteErrandsByIds()
  // { table: 'user_has_rate', column: 'rater_id' },
  // { table: 'user_has_rate', column: 'treated_by_id' },
  // { table: 'user_has_rate', column: 'ratee_id' },
  { table: 'user_legal', column: 'user_id' },
  { table: 'user_onfido', column: 'user_id' },
  { table: 'user_reviews', column: 'user_id' },
  { table: 'user_reviews', column: 'created_by' },
  { table: 'users_deactivation_history', column: 'deactivated_by_id' },
  { table: 'users_deactivation_history', column: 'deliverer_id' },

  // Parent last
  { table: 'shop_user', column: 'id' },
];

/**
 * Generic function to delete rows from a single table by IDs
 */
async function deleteFromTable(
  tableName: string,
  columnName: string,
  ids: number[]
): Promise<number> {
  if (ids.length === 0) {
    return 0;
  }

  const pool = getDBPool();

  try {
    const placeholders = ids.map(() => '?').join(', ');
    const query = `DELETE FROM ${tableName} WHERE ${columnName} IN (${placeholders})`;

    const [result] = await pool.execute<ResultSetHeader>(query, ids);
    const deletedCount = result.affectedRows || 0;

    if (deletedCount > 0) {
      console.log(`     ✓ ${tableName}: deleted ${deletedCount} rows`);
    }

    return deletedCount;
  } catch (error) {
    console.error(`     ✗ ${tableName}: failed to delete`, error);
    throw error;
  }
}

/**
 * Delete all errand related data in correct order (respecting FK constraints)
 *
 * @param errandIds - Array of errand IDs to delete
 * @returns Promise<number> - Total number of deleted rows across all tables
 */
export async function deleteErrandsByIds(errandIds: number[]): Promise<number> {
  if (errandIds.length === 0) {
    console.log('  ⏭️  No errands to delete');
    return 0;
  }

  console.log(`  🗑️  Deleting ${errandIds.length} errands and related data...`);

  let totalDeleted = 0;

  try {
    // STEP 1: Collect drop_off IDs BEFORE deleting errands
    // (we need errand.drop_off_id to still exist to find which drop_offs to delete)
    const dropOffRows = await selectTable(
      'errand',
      [{ field: 'id', value: errandIds, operator: 'IN' }],
      ['drop_off_id']
    ).catch(() => []);

    const dropOffIds = dropOffRows
      .map(row => row.drop_off_id)
      .filter(id => id !== null && id !== undefined) as number[];

    // STEP 2: Delete in order: children first, then parent
    for (const { table, column } of ERRAND_RELATED_TABLES) {
      const deleted = await deleteFromTable(table, column, errandIds);
      totalDeleted += deleted;
    }

    // STEP 3: Delete drop_offs AFTER errands have been deleted
    if (dropOffIds.length > 0) {
      await deleteFromTable('drop_off', 'id', dropOffIds);
    }

    // STEP 4: Clean up orphaned drop_off records (any drop_off not referenced by any errand)
    // Note: This uses a different approach (NOT IN) as per E2E_API logic
    await cleanupOrphanedDropOffs();

    console.log(`  ✅ Deleted ${totalDeleted} total rows for ${errandIds.length} errands`);
    return totalDeleted;
  } catch (error) {
    console.error(`  ❌ Failed to delete errands:`, error);
    throw error;
  }
}

/**
 * Delete all shop-user related data in correct order (respecting FK constraints)
 *
 * @param userIds - Array of user IDs to delete
 * @returns Promise<number> - Total number of deleted rows across all tables
 */
export async function deleteShopUsersByIds(userIds: number[]): Promise<number> {
  if (userIds.length === 0) {
    console.log('  ⏭️  No users to delete');
    return 0;
  }

  console.log(`  🗑️  Deleting ${userIds.length} users and related data...`);

  let totalDeleted = 0;

  try {
    // Delete in order: children first, then parent
    for (const { table, column } of USER_RELATED_TABLES) {
      const deleted = await deleteFromTable(table, column, userIds);
      totalDeleted += deleted;
    }

    console.log(`  ✅ Deleted ${totalDeleted} total rows for ${userIds.length} users`);
    return totalDeleted;
  } catch (error) {
    console.error(`  ❌ Failed to delete users:`, error);
    throw error;
  }
}

/**
 * Clean up orphaned drop_off records
 * (drop_off records that are not referenced by any errand)
 *
 * Based on E2E_API logic:
 * DELETE FROM drop_off WHERE id NOT IN (SELECT drop_off_id FROM errand WHERE drop_off_id IS NOT NULL)
 *
 * Note: We use direct SQL for this operation as it's more efficient than:
 * 1. SELECT all drop_off.id
 * 2. SELECT all errand.drop_off_id
 * 3. Compute difference in JavaScript
 * 4. DELETE the difference
 *
 * The database can optimize the NOT IN subquery much better than we can in application code.
 */
async function cleanupOrphanedDropOffs(): Promise<number> {
  const pool = getDBPool();

  try {
    const query = `
      DELETE FROM drop_off
      WHERE id NOT IN (
        SELECT drop_off_id
        FROM errand
        WHERE drop_off_id IS NOT NULL
      )
    `;

    const [result] = await pool.execute<ResultSetHeader>(query);
    const deletedCount = result.affectedRows || 0;

    if (deletedCount > 0) {
      console.log(`     ✓ drop_off: cleaned up ${deletedCount} orphaned records`);
    }

    return deletedCount;
  } catch (error) {
    console.error(`     ✗ drop_off: failed to cleanup orphans`, error);
    // Don't throw - this is a "nice to have" cleanup
    return 0;
  }
}

/**
 * Collect all address IDs associated with errands
 * These addresses need to be deleted after errand cleanup
 *
 * @param errandIds - Array of errand IDs
 * @returns Promise<number[]> - Array of unique address IDs
 */
export async function collectAddressIdsFromErrands(errandIds: number[]): Promise<number[]> {
  if (errandIds.length === 0) {
    return [];
  }

  try {
    const rows = await selectTable(
      'errand',
      [{ field: 'id', value: errandIds, operator: 'IN' }],
      ['address_id']
    );

    // Filter out null values and extract unique address IDs
    const addressIds = rows
      .map(row => row.address_id)
      .filter(id => id !== null && id !== undefined) as number[];

    const uniqueAddressIds = [...new Set(addressIds)];

    if (uniqueAddressIds.length > 0) {
      console.log(`     ℹ️  Found ${uniqueAddressIds.length} address(es) from errands`);
    }

    return uniqueAddressIds;
  } catch (error) {
    // If no rows found, return empty array (not an error)
    console.log('     ℹ️  No addresses found from errands');
    return [];
  }
}

/**
 * Collect all address IDs associated with users
 * These addresses need to be deleted after user cleanup
 *
 * @param userIds - Array of user IDs
 * @returns Promise<number[]> - Array of unique address IDs
 */
export async function collectAddressIdsFromUsers(userIds: number[]): Promise<number[]> {
  if (userIds.length === 0) {
    return [];
  }

  try {
    const rows = await selectTable(
      'user_has_address',
      [{ field: 'user_id', value: userIds, operator: 'IN' }],
      ['address_id']
    );

    // Filter out null values and extract unique address IDs
    const addressIds = rows
      .map(row => row.address_id)
      .filter(id => id !== null && id !== undefined) as number[];

    const uniqueAddressIds = [...new Set(addressIds)];

    if (uniqueAddressIds.length > 0) {
      console.log(`     ℹ️  Found ${uniqueAddressIds.length} address(es) from users`);
    }

    return uniqueAddressIds;
  } catch (error) {
    // If no rows found, return empty array (not an error)
    console.log('     ℹ️  No addresses found from users');
    return [];
  }
}

/**
 * Delete all address related data in correct order (respecting FK constraints)
 *
 * @param addressIds - Array of address IDs to delete
 * @returns Promise<number> - Total number of deleted rows across all tables
 */
export async function deleteAddressByIds(addressIds: number[]): Promise<number> {
  if (addressIds.length === 0) {
    console.log('  ⏭️  No addresses to delete');
    return 0;
  }

  console.log(`  🗑️  Deleting ${addressIds.length} addresses and related data...`);

  let totalDeleted = 0;

  try {
    // Delete in order: children first, then parent
    for (const { table, column } of ADDRESS_RELATED_TABLES) {
      const deleted = await deleteFromTable(table, column, addressIds);
      totalDeleted += deleted;
    }

    console.log(`  ✅ Deleted ${totalDeleted} total rows for ${addressIds.length} addresses`);
    return totalDeleted;
  } catch (error) {
    console.error(`  ❌ Failed to delete addresses:`, error);
    throw error;
  }
}

/**
 * Delete test data by custom criteria (advanced usage)
 *
 * @param tableName - The table name
 * @param whereClause - The WHERE clause (without "WHERE")
 * @param params - Parameters for the WHERE clause
 * @returns Promise<number> - Number of deleted rows
 *
 * @example
 * ```typescript
 * // Delete all errands created today with test recipient
 * await deleteByCustomCriteria(
 *   'errand',
 *   'created_at >= CURDATE() AND recipient_name LIKE ?',
 *   ['%test%']
 * );
 * ```
 */
export async function deleteByCustomCriteria(
  tableName: string,
  whereClause: string,
  params: (string | number | boolean | null)[] = []
): Promise<number> {
  const pool = getDBPool();

  try {
    const query = `DELETE FROM ${tableName} WHERE ${whereClause}`;
    const [result] = await pool.execute<ResultSetHeader>(query, params);
    const deletedCount = result.affectedRows || 0;

    console.log(`  ✅ Deleted ${deletedCount} rows from ${tableName}`);
    return deletedCount;
  } catch (error) {
    console.error(`  ❌ Failed to delete from ${tableName}:`, error);
    throw error;
  }
}