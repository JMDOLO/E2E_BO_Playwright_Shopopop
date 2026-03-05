/**
 * Database queries to update delivery data in errand table
 */

import { ResultSetHeader } from 'mysql2';
import { getDBPool } from '@utils/DB_Utils/db.config';

/**
 * Interface for fields to update
 */
export interface UpdateField {
  field: string;
  value: string | number | null;
}

/**
 * Generic function to update the errand table
 * Updates specific fields for a delivery identified by its ID
 *
 * @param deliveryId - The ID of the delivery to update
 * @param updateFields - Array of fields to update with their new values
 * @returns Number of rows affected (should be 1 if successful)
 * @throws Error if no delivery found or update fails
 *
 * @example
 * ```typescript
 * // Update a single field
 * await updateErrandTable(12345, [
 *   { field: 'status', value: 'COMPLETED' }
 * ]);
 *
 * // Update multiple fields
 * await updateErrandTable(12345, [
 *   { field: 'status', value: 'IN_PROGRESS' },
 *   { field: 'tips', value: 5 },
 *   { field: 'amount', value: 150 }
 * ]);
 *
 * // Set a field to null
 * await updateErrandTable(12345, [
 *   { field: 'special_event', value: null }
 * ]);
 * ```
 */
export async function updateErrandTable(
  deliveryId: number,
  updateFields: UpdateField[]
): Promise<number> {
  if (updateFields.length === 0) {
    throw new Error('At least one field must be provided for update');
  }

  const pool = getDBPool();

  // Build SET clause
  const setClause = updateFields
    .map(field => `\`${field.field}\` = ?`)
    .join(', ');

  // Extract values for parameterized query
  const values = updateFields.map(field => field.value);
  values.push(deliveryId); // Add deliveryId as the last parameter for WHERE clause

  const query = `UPDATE \`errand\` SET ${setClause} WHERE \`id\` = ?`;
  const [result] = await pool.execute<ResultSetHeader>(query, values);

  // Check if any rows were affected
  const affectedRows = result.affectedRows;

  if (affectedRows === 0) {
    throw new Error(
      `No delivery found with ID ${deliveryId} or no changes were made`
    );
  }

  return affectedRows;
}
