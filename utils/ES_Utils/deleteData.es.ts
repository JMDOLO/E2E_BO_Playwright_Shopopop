/**
 * Elasticsearch cleanup helpers for E2E tests
 *
 * Deletes delivery documents from Elasticsearch to keep ES in sync with SQL.
 * ES reindexes from SQL once per day, but this ensures immediate cleanup
 * so list pages (powered by ES) don't show deleted test deliveries.
 *
 * Uses the direct ES REST API with basic auth (no Kibana proxy needed).
 */

import { getESConfig } from '@utils/ES_Utils/es.config';

const ES_INDEX_PATTERN = 'deliveries-*';

/**
 * Delete deliveries from Elasticsearch by errand IDs
 *
 * Uses _delete_by_query to remove documents across all date-partitioned indices.
 * If no documents are found (already cleaned by daily reindexation), this is treated as success.
 *
 * @param errandIds - Array of errand IDs to delete from ES
 * @returns Promise<number> - Number of deleted documents
 */
export async function deleteErrandsFromES(errandIds: number[]): Promise<number> {
  if (errandIds.length === 0) {
    console.log('  ⏭️  No errands to delete from ES');
    return 0;
  }

  const config = getESConfig();

  if (!config.host || !config.user || !config.password) {
    console.log('  ⚠️  ES credentials not configured, skipping ES cleanup');
    return 0;
  }

  console.log(`  🔍 Deleting ${errandIds.length} errands from Elasticsearch...`);

  try {
    const url = `https://${config.host}/${ES_INDEX_PATTERN}/_delete_by_query`;
    const auth = Buffer.from(`${config.user}:${config.password}`).toString('base64');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify({
        query: {
          terms: {
            id: errandIds,
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`  ❌ ES delete failed (HTTP ${response.status}): ${errorText}`);
      return 0;
    }

    const result = (await response.json()) as { deleted?: number };
    const deleted = result.deleted || 0;

    if (deleted > 0) {
      console.log(`  ✅ Deleted ${deleted} documents from Elasticsearch`);
    } else {
      console.log('  ✅ No documents found in ES (already cleaned by daily reindex)');
    }

    return deleted;
  } catch (error) {
    console.error('  ❌ ES cleanup failed:', error);
    // Don't throw - ES cleanup is best-effort, SQL cleanup is the primary mechanism
    return 0;
  }
}