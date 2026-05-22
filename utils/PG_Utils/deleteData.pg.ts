/**
 * PostgreSQL helpers to delete test data from PG tables
 *
 * Used by global-teardown to clean up test data across PG databases.
 */

import { connectPG, PGDatabaseKey } from '@utils/PG_Utils/pg.config';

/**
 * Generic delete from a PG table by column IN (values)
 *
 * @param database - PG database key ('backoffice', 'payment', 'kyc')
 * @param table - Table name
 * @param column - Column to match against
 * @param values - Array of values to match (string or number)
 */
export async function deletePgRows(database: PGDatabaseKey, table: string, column: string, values: (string | number)[]): Promise<void> {
  if (values.length === 0) return;

  try {
    const pool = await connectPG(database);

    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    const query = `DELETE FROM "${table}" WHERE "${column}" IN (${placeholders})`;
    const result = await pool.query(query, values);

    if (result.rowCount && result.rowCount > 0) {
      console.log(`   🗑️  Deleted ${result.rowCount} ${table} row(s) from PG ${database}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('SSH') || message.includes('ECONNREFUSED')) {
      console.log(`   ⏭️  Skipping PG ${table} cleanup (PG not configured)`);
      return;
    }
    console.error(`   ⚠️  Failed to delete ${table} from PG:`, message);
  }
}

/**
 * Delete transactions from PG payment DB by their associated delivery (errand) IDs
 * Kept separate due to JSONB column access: metadata->>'delivery_id'
 */
export async function deleteTransactionsByErrandIds(errandIds: number[]): Promise<void> {
  if (errandIds.length === 0) return;

  try {
    const pool = await connectPG('payment');

    const placeholders = errandIds.map((_, i) => `$${i + 1}`).join(', ');
    const query = `DELETE FROM "transactions" WHERE (metadata->>'delivery_id')::int IN (${placeholders})`;
    const result = await pool.query(query, errandIds);

    if (result.rowCount && result.rowCount > 0) {
      console.log(`   🗑️  Deleted ${result.rowCount} transactions row(s) from PG payment`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('SSH') || message.includes('ECONNREFUSED')) {
      console.log('   ⏭️  Skipping PG transactions cleanup (PG not configured)');
      return;
    }
    console.error('   ⚠️  Failed to delete transactions from PG:', message);
  }
}
