import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Elasticsearch configuration interface
 */
export interface ESConfig {
  host: string;
  user: string;
  password: string;
}

/**
 * Get Elasticsearch configuration from environment variables
 *
 * @returns Elasticsearch connection configuration
 */
export function getESConfig(): ESConfig {
  return {
    host: process.env.ES_HOST_QA3 || '',
    user: process.env.ES_USER_QA3 || '',
    password: process.env.ES_PASSWORD_QA3 || '',
  };
}