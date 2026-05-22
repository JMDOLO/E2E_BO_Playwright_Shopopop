/**
 * Database helper to duplicate a row in any table
 *
 * Uses a per-table configuration to handle auto-increment, unique constraints,
 * and auto-generated columns. Add new table configs as needed.
 */

import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { faker } from '@faker-js/faker/locale/fr';
import { getDBPool } from '@utils/DB_Utils/db.config';
import { generateFrenchPhone } from '@testdata/new_recipients';

/**
 * Configuration for a table's copy behavior
 *
 * @property exclude - Columns to omit entirely (auto-increment, auto-generated)
 * @property nullify - Columns to set to NULL (unique constraints that are nullable)
 * @property uniquify - Columns that share one generated value (NOT NULL + UNIQUE)
 * @property randomize - Columns mapped to a faker generator (avoid collisions on non-unique but searchable fields)
 */
interface TableCopyConfig {
  exclude: string[];
  nullify: string[];
  uniquify: { generator: () => string; columns: string[] };
  randomize: Record<string, () => string>;
}

const TABLE_CONFIGS: Record<string, TableCopyConfig> = {
  shop_user: {
    exclude: ['id', 'updated_at'],
    nullify: ['address_mango_id', 'address_localisation_id', 'invitation_code'],
    uniquify: {
      generator: () => faker.internet.exampleEmail(),
      columns: ['username', 'username_canonical', 'email', 'email_canonical'],
    },
    randomize: {
      first_name: () => faker.person.firstName(),
      last_name: () => faker.person.lastName(),
      telephone: () => generateFrenchPhone(),
      access_token: () => faker.string.alphanumeric(40),
    },
  },
};

/**
 * Duplicate a row in a table, returning the new auto-increment id
 *
 * 1. SELECT * the source row
 * 2. Remove excluded columns, nullify unique columns (per TABLE_CONFIGS)
 * 3. INSERT the copy
 * 4. Return the new row's id
 *
 * @param tableName - The table to copy from
 * @param sourceId - The id of the row to duplicate
 * @returns The new row's auto-increment id
 * @throws Error if no config exists for the table, or source row not found
 *
 * @example
 * ```typescript
 * const newUserId = await copyRow('shop_user', users.CTP.id);
 * // Navigate to /deliverers/${newUserId}
 * // Register for cleanup: TestDataRegistry.registerUser(newUserId);
 * ```
 */
export async function copyRow(tableName: string, sourceId: number): Promise<number> {
  const config = TABLE_CONFIGS[tableName];
  if (!config) {
    throw new Error(
      `No copy config for table '${tableName}'. Add it to TABLE_CONFIGS in copyData.db.ts`
    );
  }

  const pool = getDBPool();

  // 1. Fetch source row
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM \`${tableName}\` WHERE id = ?`,
    [sourceId]
  );
  if (rows.length === 0) {
    throw new Error(`No row found in '${tableName}' with id ${sourceId}`);
  }
  const sourceRow = rows[0];

  // 2. Build column list: exclude auto-generated, nullify nullable uniques, uniquify NOT NULL uniques
  const columns: string[] = [];
  const values: unknown[] = [];
  const uniqueValue = config.uniquify.generator();

  for (const [column, value] of Object.entries(sourceRow)) {
    if (config.exclude.includes(column)) continue;

    columns.push(column);
    if (config.uniquify.columns.includes(column)) {
      values.push(uniqueValue);
    } else if (config.randomize[column]) {
      values.push(config.randomize[column]());
    } else if (config.nullify.includes(column)) {
      values.push(null);
    } else {
      values.push(value);
    }
  }

  // 3. Insert the copy
  const placeholders = columns.map(() => '?').join(', ');
  const columnList = columns.map(c => `\`${c}\``).join(', ');
  const query = `INSERT INTO \`${tableName}\` (${columnList}) VALUES (${placeholders})`;

  const [result] = await pool.execute<ResultSetHeader>(query, values);
  return result.insertId;
}
