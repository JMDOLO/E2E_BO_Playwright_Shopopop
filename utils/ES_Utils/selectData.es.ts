/**
 * Elasticsearch query helpers for E2E tests
 *
 * Waits for delivery documents to be indexed in Elasticsearch.
 * Useful when a test creates a delivery via API and needs it to appear
 * on ES-powered list pages (e.g. recipient detail, delivery list).
 */

import { getESConfig } from '@utils/ES_Utils/es.config';

const ES_INDEX_PATTERN = 'deliveries-*';

/**
 * Wait for an errand to be indexed in Elasticsearch
 *
 * Polls ES with retry until the document is found or max attempts reached.
 *
 * @param errandId - The errand ID to search for
 * @param maxAttempts - Maximum number of polling attempts (default: 10)
 * @param delayMs - Delay between attempts in ms (default: 1000)
 * @throws Error if errand is not found after all attempts
 */
export async function waitForErrandInES(
  errandId: number,
  maxAttempts = 10,
  delayMs = 1000
): Promise<void> {
  const config = getESConfig();

  if (!config.host || !config.user || !config.password) {
    console.log('  ⚠️  ES credentials not configured, skipping ES wait');
    return;
  }

  const url = `https://${config.host}/${ES_INDEX_PATTERN}/_search`;
  const auth = Buffer.from(`${config.user}:${config.password}`).toString('base64');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify({
        query: {
          terms: { id: [errandId] },
        },
        size: 0,
      }),
    });

    if (response.ok) {
      const result = (await response.json()) as { hits?: { total?: { value?: number } } };
      const count = result.hits?.total?.value || 0;

      if (count > 0) {
        return;
      }
    }

    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw new Error(`Errand ${errandId} not found in ES after ${maxAttempts} attempts`);
}
