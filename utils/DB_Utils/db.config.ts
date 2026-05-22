import mysql from 'mysql2/promise';

/**
 * Database configuration interface
 */
export interface DBConfig {
  host: string;
  database: string;
  user: string;
  password: string;
  port: number;
}

/**
 * Get database configuration from environment variables
 *
 * @returns Database connection configuration
 */
export function getDBConfig(): DBConfig {
  return {
    host: process.env.DB_HOST_QA3 || '',
    database: process.env.DB_DATABASE_QA3 || '',
    user: process.env.DB_USER_QA3 || '',
    password: process.env.DB_PASSWORD_QA3 || '',
    port: parseInt(process.env.DB_PORT_QA3 || '3306'),
  };
}

/**
 * Connection pool for database operations
 * Reuses connections instead of creating new ones for each query
 */
let pool: mysql.Pool | null = null;

/**
 * Get or create the database connection pool
 *
 * @returns MySQL connection pool
 */
export function getDBPool(): mysql.Pool {
  if (!pool) {
    const config = getDBConfig();
    pool = mysql.createPool({
      host: config.host,
      database: config.database,
      user: config.user,
      password: config.password,
      port: config.port,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 30000,
    });
  }
  return pool;
}

/**
 * Close the database connection pool
 * Useful for cleanup in tests or when shutting down
 */
export async function closeDBPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Check if the DB pool is still alive, refresh it if stale
 * Connections can become stale when idle during test execution
 * (cut by network proxies, firewalls, or NAT gateways)
 */
export async function ensureDBConnection(): Promise<void> {
  const currentPool = getDBPool();

  try {
    await currentPool.query('SELECT 1');
  } catch {
    console.log('⚠️  DB connection stale, refreshing pool...');
    await currentPool.end().catch(() => {});
    pool = null;
    getDBPool();
    console.log('✅ DB pool refreshed');
  }
}
