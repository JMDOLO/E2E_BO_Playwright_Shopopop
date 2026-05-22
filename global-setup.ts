/**
 * Global setup for Playwright tests
 * Runs once before all tests start
 *
 * Responsibilities:
 * - Initialize the database connection pool
 */

import { getDBPool } from '@utils/DB_Utils/db.config';

async function globalSetup() {
  console.log('🚀 Initializing global resources...\n');

  try {
    // Initialize the database connection pool
    const pool = getDBPool();
    console.log('✅ Database connection pool initialized successfully');

    // Test the connection to ensure it's working
    await pool.query('SELECT 1');
    console.log('✅ Database connection verified\n');
  } catch (error) {
    console.error('❌ Error initializing database pool:', error);
    throw error;
  }
}

export default globalSetup;
