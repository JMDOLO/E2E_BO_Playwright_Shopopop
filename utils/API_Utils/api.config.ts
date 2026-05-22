import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * API configuration interface
 */
export interface APIConfig {
  url: string;
  partnerId: string;
  apiKey: string;
  cfClientId: string;
  cfClientSecret: string;
}

/**
 * Get API configuration from environment variables
 * Automatically selects the correct environment (QA3 or Staging)
 *
 * @returns API configuration object with credentials and endpoints
 */
export function getAPIConfig(): APIConfig {
  // Determine the environment URL based on STAGING variable
  const isStaging = process.env.STAGING === '1';
  const url = isStaging
    ? 'https://partners-api-staging.engineering.shopopop.com'
    : 'https://partners-api-qa3.engineering.shopopop.com';

  // Get credentials from environment
  const partnerId = process.env.PARTNER_ID || '';
  const apiKey = process.env.PARTNER_API_KEY || '';
  const cfClientId = process.env.CF_ACCESS_CLIENT_ID_PARTNERS || '';
  const cfClientSecret = process.env.CF_ACCESS_CLIENT_SECRET_PARTNERS || '';

  return { url, partnerId, apiKey, cfClientId, cfClientSecret };
}
