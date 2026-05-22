/**
 * PostgreSQL helpers to insert rows into PG tables
 *
 * Same interface as insertData.db.ts but with PG syntax:
 * - $1, $2, $3 parameterized placeholders (instead of ?)
 * - "field" double-quoted identifiers (instead of `field` backticks)
 */

import { connectPG, PGDatabaseKey } from '@utils/PG_Utils/pg.config';

/**
 * Interface for a field-value pair to insert
 */
export interface PGInsertField {
  field: string;
  value: string | number | boolean | null;
}

/**
 * Insert a single row into a PG table
 *
 * @param database - PG database key ('backoffice', 'payment', 'kyc')
 * @param tableName - The table to insert into
 * @param fields - Array of field-value pairs for the row
 * @returns The inserted row (all columns via RETURNING *)
 *
 * @example
 * ```typescript
 * const dispute = await insertPgRow('backoffice', 'disputes', [
 *   { field: 'delivery_id', value: 12345 },
 *   { field: 'status', value: 'in_progress' },
 *   { field: 'reason', value: 'Vol' },
 * ]);
 * ```
 */
export async function insertPgRow(
  database: PGDatabaseKey,
  tableName: string,
  fields: PGInsertField[]
): Promise<Record<string, unknown>> {
  if (fields.length === 0) {
    throw new Error('No fields to insert');
  }

  const pool = await connectPG(database);

  const columns = fields.map((f) => `"${f.field}"`).join(', ');
  const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
  const values = fields.map((f) => f.value);

  const query = `INSERT INTO "${tableName}" (${columns}) VALUES (${placeholders}) RETURNING *`;
  const result = await pool.query(query, values);

  return result.rows[0];
}
