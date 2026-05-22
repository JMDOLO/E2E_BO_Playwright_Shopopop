/**
 * PostgreSQL queries to retrieve data from PG databases
 *
 * Same interface as selectData.db.ts but with PG syntax:
 * - $1, $2, $3 parameterized placeholders (instead of ?)
 * - "field" double-quoted identifiers (instead of `field` backticks)
 */

import { connectPG, PGDatabaseKey } from '@utils/PG_Utils/pg.config';

/**
 * Interface for WHERE clause conditions (same as MySQL WhereCondition)
 */
export interface PGWhereCondition {
  field: string;
  value: string | number | (string | number)[];
  operator?: '=' | '>' | '<' | '>=' | '<=' | '!=' | 'LIKE' | 'IN';
}

/**
 * Generic function to select data from any PG table with flexible WHERE conditions
 *
 * @param database - PG database key ('backoffice', 'payment', 'kyc')
 * @param tableName - The table name to query
 * @param whereConditions - Array of WHERE conditions
 * @param selectFields - Array of fields to return (default: ['id'])
 * @param logicalOperator - 'AND' or 'OR' to combine conditions (default: 'AND')
 * @returns Array of rows matching the query
 * @throws Error if no rows found
 *
 * @example
 * ```typescript
 * // Get dispute by errand_id from backoffice database
 * const dispute = await selectPgTable(
 *   'backoffice',
 *   'dispute',
 *   [{ field: 'errand_id', value: 12345 }],
 *   ['id', 'status']
 * );
 *
 * // Get KYC documents with IN operator
 * const docs = await selectPgTable(
 *   'kyc',
 *   'kyc_document',
 *   [{ field: 'user_id', value: [100, 200], operator: 'IN' }],
 *   ['id', 'status', 'type']
 * );
 * ```
 */
export async function selectPgTable(
  database: PGDatabaseKey,
  tableName: string,
  whereConditions: PGWhereCondition[],
  selectFields: string[] = ['id'],
  logicalOperator: 'AND' | 'OR' = 'AND'
): Promise<any[]> {
  const pool = await connectPG(database);

  // Build SELECT clause with double-quoted identifiers
  const selectClause = selectFields.map((field) => `"${field}"`).join(', ');

  // Build WHERE clause with $1, $2, ... placeholders
  const values: (string | number)[] = [];
  let paramIndex = 1;

  const whereClause = whereConditions
    .map((condition) => {
      const operator = condition.operator || '=';

      // Handle IN operator with array values
      if (operator === 'IN' && Array.isArray(condition.value)) {
        const placeholderList = condition.value
          .map((val) => {
            values.push(val);
            return `$${paramIndex++}`;
          })
          .join(', ');
        return `"${condition.field}" IN (${placeholderList})`;
      }

      // Handle standard operators
      values.push(condition.value as string | number);
      return `"${condition.field}" ${operator} $${paramIndex++}`;
    })
    .join(` ${logicalOperator} `);

  const query = `SELECT ${selectClause} FROM "${tableName}" WHERE ${whereClause}`;
  const result = await pool.query(query, values);

  if (result.rows.length > 0) {
    return result.rows;
  }

  throw new Error(
    `No rows found in PG table '${tableName}' (${database}) with conditions: ${JSON.stringify(whereConditions)}`
  );
}
