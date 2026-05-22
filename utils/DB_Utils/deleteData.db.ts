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
  { table: 'shop_user', column: 'address_mango_id' },
  { table: 'shop_user', column: 'address_localisation_id' },
  { table: 'user_has_address', column: 'address_id' },

  // Parent last (main table)
  { table: 'address', column: 'id' },
];

/**
 * Configuration for user-related tables
 * Order matters! Delete children before parents to respect FK constraints
 */
/**
 * Errand FK columns that reference shop_user
 * Used to collect errand IDs before deleting them via deleteErrandsByIds()
 */
const ERRAND_USER_FK_COLUMNS = [
  'canceler_id',
  'added_by_id',
  'delivery_man_id',
];

const USER_RELATED_TABLES = [
  // Children first (tables with FK to shop_user)
  // NOTE: errand + errand children are handled separately via collectAndDeleteUserErrands()
  { table: 'address_change_request', column: 'user_id' },
  { table: 'delivery_comment', column: 'user_id' },
  { table: 'drive', column: 'user_id' },
  { table: 'drive_billing_info', column: 'modified_by' },
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
  { table: 'user_banned', column: 'added_by_id' },
  { table: 'user_banned', column: 'user_id' },
  { table: 'user_data_analysis', column: 'user_id' },
  { table: 'user_has_address', column: 'user_id' },
  { table: 'user_has_drive', column: 'user_id' },
  { table: 'user_has_kyc_documents', column: 'user_id' },
  { table: 'user_has_rate', column: 'rater_id' },
  { table: 'user_has_rate', column: 'treated_by_id' },
  { table: 'user_has_rate', column: 'ratee_id' },
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
  ids: (number | string)[]
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
    for (const { table, column } of ERRAND_RELATED_TABLES) {
      const deleted = await deleteFromTable(table, column, errandIds);
      totalDeleted += deleted;
    }

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
/**
 * Collect all errand IDs referencing the given user IDs (via delivery_man_id, canceler_id, added_by_id)
 * and delete them properly via deleteErrandsByIds() which handles children first.
 */
async function collectAndDeleteUserErrands(userIds: number[]): Promise<number> {
  const pool = getDBPool();
  const allErrandIds = new Set<number>();

  for (const column of ERRAND_USER_FK_COLUMNS) {
    const placeholders = userIds.map(() => '?').join(', ');
    const query = `SELECT id FROM errand WHERE ${column} IN (${placeholders})`;
    const [rows] = await pool.execute(query, userIds);
    for (const row of rows as { id: number }[]) {
      allErrandIds.add(row.id);
    }
  }

  if (allErrandIds.size === 0) {
    return 0;
  }

  console.log(`     ℹ️  Found ${allErrandIds.size} errand(s) referencing user(s)`);
  return deleteErrandsByIds([...allErrandIds]);
}

export async function deleteShopUsersByIds(userIds: number[]): Promise<number> {
  if (userIds.length === 0) {
    console.log('  ⏭️  No users to delete');
    return 0;
  }

  console.log(`  🗑️  Deleting ${userIds.length} users and related data...`);

  let totalDeleted = 0;

  try {
    // Step 1: Delete errands referencing these users (with proper children-first order)
    totalDeleted += await collectAndDeleteUserErrands(userIds);

    // Step 2: Delete remaining user-related tables, then shop_user
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
 * Collect drop_off IDs from errands
 *
 * @param errandIds - Array of errand IDs
 * @returns Promise<number[]> - Array of unique drop_off IDs
 */
export async function collectDropOffIdsFromErrands(errandIds: number[]): Promise<number[]> {
  if (errandIds.length === 0) {
    return [];
  }

  try {
    const rows = await selectTable(
      'errand',
      [{ field: 'id', value: errandIds, operator: 'IN' }],
      ['drop_off_id']
    );

    const dropOffIds = rows
      .map(row => row.drop_off_id)
      .filter(id => id !== null && id !== undefined) as number[];

    const uniqueIds = [...new Set(dropOffIds)];

    if (uniqueIds.length > 0) {
      console.log(`     ℹ️  Found ${uniqueIds.length} drop_off(s) from errands`);
    }

    return uniqueIds;
  } catch {
    console.log('     ℹ️  No drop_offs found from errands');
    return [];
  }
}

/**
 * Collect unique hashes from drop_off records
 *
 * @param dropOffIds - Array of drop_off IDs
 * @returns Promise<string[]> - Array of unique hashes
 */
export async function collectHashesFromDropOffs(dropOffIds: number[]): Promise<string[]> {
  if (dropOffIds.length === 0) {
    return [];
  }

  try {
    const rows = await selectTable(
      'drop_off',
      [{ field: 'id', value: dropOffIds, operator: 'IN' }],
      ['hash']
    );

    const hashes = rows
      .map(row => row.hash as string)
      .filter(hash => hash !== null && hash !== undefined);

    const uniqueHashes = [...new Set(hashes)];

    if (uniqueHashes.length > 0) {
      console.log(`     ℹ️  Found ${uniqueHashes.length} unique hash(es) from drop_offs`);
    }

    return uniqueHashes;
  } catch {
    console.log('     ℹ️  No hashes found from drop_offs');
    return [];
  }
}

/**
 * Delete drop_off records by IDs
 */
export async function deleteDropOffByIds(dropOffIds: number[]): Promise<number> {
  if (dropOffIds.length === 0) {
    return 0;
  }

  console.log(`  🗑️  Deleting ${dropOffIds.length} drop_offs...`);
  const deleted = await deleteFromTable('drop_off', 'id', dropOffIds);
  console.log(`  ✅ Deleted ${deleted} drop_off rows`);
  return deleted;
}

/**
 * Collect orphaned known_drop_off IDs — those whose hash is no longer referenced by any drop_off
 *
 * @param hashes - Array of hashes to check
 * @returns Promise<number[]> - Array of known_drop_off IDs safe to delete
 */
export async function collectKnownDropOffIdsFromKnownDropOffs(hashes: string[]): Promise<number[]> {
  if (hashes.length === 0) {
    return [];
  }

  const pool = getDBPool();

  try {
    const placeholders = hashes.map(() => '?').join(', ');
    const query = `
      SELECT id FROM known_drop_off
      WHERE hash IN (${placeholders})
      AND hash NOT IN (SELECT DISTINCT hash FROM drop_off WHERE hash IN (${placeholders}))
    `;

    const [rows] = await pool.execute(query, [...hashes, ...hashes]);
    const ids = (rows as { id: number }[]).map(row => row.id);

    if (ids.length > 0) {
      console.log(`     ℹ️  Found ${ids.length} orphaned known_drop_off(s)`);
    }

    return ids;
  } catch {
    console.log('     ℹ️  No orphaned known_drop_offs found');
    return [];
  }
}

/**
 * Delete known_drop_off records and their drive_known_drop_off children
 */
export async function deleteKnownDropOffByIds(knownDropOffIds: number[]): Promise<number> {
  if (knownDropOffIds.length === 0) {
    return 0;
  }

  console.log(`  🗑️  Deleting ${knownDropOffIds.length} known_drop_offs...`);

  try {
    // Child first (FK: drive_known_drop_off.known_drop_off_id → known_drop_off.id)
    await deleteFromTable('drive_known_drop_off', 'known_drop_off_id', knownDropOffIds);
    const deleted = await deleteFromTable('known_drop_off', 'id', knownDropOffIds);

    console.log(`  ✅ Deleted ${deleted} known_drop_off rows`);
    return deleted;
  } catch (error) {
    console.error(`     ✗ known_drop_off: failed to delete`, error);
    // Don't throw - this is best-effort cleanup
    return 0;
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
  } catch {
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