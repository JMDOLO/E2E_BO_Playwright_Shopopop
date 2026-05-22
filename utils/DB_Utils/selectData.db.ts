/**
 * Database queries to retrieve delivery data from errand table
 */

import { getDBPool } from '@utils/DB_Utils/db.config';

/**
 * Interface for WHERE clause conditions
 */
export interface WhereCondition {
  field: string;
  value: string | number | (string | number)[];
  operator?: '=' | '>' | '<' | '>=' | '<=' | '!=' | 'LIKE' | 'IN';
}

/**
 * Generic function to select data from any table with flexible WHERE conditions
 * Supports multiple conditions (AND/OR), multiple return fields, and IN operator
 *
 * @param tableName - The table name to query
 * @param whereConditions - Array of WHERE conditions
 * @param selectFields - Array of fields to return (e.g., ['id', 'drive_id'])
 * @param logicalOperator - Logical operator to combine conditions ('AND' or 'OR')
 * @returns Array of rows matching the query
 * @throws Error if no rows found
 *
 * @example
 * ```typescript
 * // Get id by reference from errand table
 * const deliveryData = await selectTable(
 *   'errand',
 *   [{ field: 'reference', value: 'TESTREF1' }],
 *   ['id']
 * );
 * console.log(`Delivery ID: ${deliveryData[0].id}`);
 *
 * // Get multiple fields with multiple conditions (AND)
 * const deliveryData2 = await selectTable(
 *   'errand',
 *   [
 *     { field: 'reference', value: 'TESTREF1' },
 *     { field: 'tips', value: 6, operator: '>' }
 *   ],
 *   ['id', 'drive_id', 'drop_off_id'],
 *   'AND'
 * );
 *
 * // Use IN operator with array of values
 * const deliveryData3 = await selectTable(
 *   'errand',
 *   [{ field: 'id', value: [123, 456, 789], operator: 'IN' }],
 *   ['id', 'address_id']
 * );
 *
 * // Query user_has_address table
 * const addressData = await selectTable(
 *   'user_has_address',
 *   [{ field: 'user_id', value: [10, 20, 30], operator: 'IN' }],
 *   ['address_id']
 * );
 * ```
 */
export async function selectTable(
  tableName: string,
  whereConditions: WhereCondition[],
  selectFields: string[] = ['id'],
  logicalOperator: 'AND' | 'OR' = 'AND'
): Promise<any[]> {
  const pool = getDBPool();

  // Build SELECT clause
  const selectClause = selectFields.map(field => `\`${field}\``).join(', ');

  // Build WHERE clause and collect values
  const values: (string | number)[] = [];
  const whereClause = whereConditions
    .map(condition => {
      const operator = condition.operator || '=';

      // Handle IN operator with array values
      if (operator === 'IN' && Array.isArray(condition.value)) {
        const placeholders = condition.value.map(() => '?').join(', ');
        values.push(...condition.value);
        return `\`${condition.field}\` IN (${placeholders})`;
      }

      // Handle standard operators
      values.push(condition.value as string | number);
      return `\`${condition.field}\` ${operator} ?`;
    })
    .join(` ${logicalOperator} `);

  const query = `SELECT ${selectClause} FROM \`${tableName}\` WHERE ${whereClause}`;
  const [rows] = await pool.execute(query, values);

  if (Array.isArray(rows) && rows.length > 0) {
    return rows as any[];
  }

  throw new Error(
    `No rows found in table '${tableName}' with conditions: ${JSON.stringify(whereConditions)}`
  );
}

