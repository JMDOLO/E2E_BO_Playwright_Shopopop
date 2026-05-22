/**
 * Database helpers to insert rows into tables
 */

import { ResultSetHeader } from 'mysql2';
import { getDBPool } from '@utils/DB_Utils/db.config';

/**
 * Interface for a field-value pair to insert
 */
export interface InsertField {
  field: string;
  value: string | number | boolean | null;
}

/**
 * Insert one or more rows into a table in a single query
 *
 * All rows must have the same fields (columns are taken from the first row).
 *
 * @param tableName - The table to insert into
 * @param rows - Array of rows, each row being an array of field-value pairs
 * @returns The insertId of the first created row
 *
 * @example
 * ```typescript
 * // Single row
 * const id = await insertRows('errand', [
 *   [
 *     { field: 'reference', value: 'REF1' },
 *     { field: 'status', value: 'AVAILABLE' },
 *   ],
 * ]);
 *
 * // Multiple rows
 * const firstId = await insertRows('errand', [
 *   [
 *     { field: 'reference', value: 'REF1' },
 *     { field: 'status', value: 'AVAILABLE' },
 *   ],
 *   [
 *     { field: 'reference', value: 'REF2' },
 *     { field: 'status', value: 'AVAILABLE' },
 *   ],
 * ]);
 * ```
 */
export async function insertRows(
  tableName: string,
  rows: InsertField[][]
): Promise<number> {
  if (rows.length === 0) {
    throw new Error('No rows to insert');
  }

  const pool = getDBPool();

  const columns = rows[0].map(f => `\`${f.field}\``).join(', ');
  const rowPlaceholder = `(${rows[0].map(() => '?').join(', ')})`;
  const allPlaceholders = rows.map(() => rowPlaceholder).join(', ');
  const values = rows.flatMap(row => row.map(f => f.value));

  const query = `INSERT INTO \`${tableName}\` (${columns}) VALUES ${allPlaceholders}`;
  const [result] = await pool.execute<ResultSetHeader>(query, values);

  return result.insertId;
}
