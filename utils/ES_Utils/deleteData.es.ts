/**
 * Elasticsearch cleanup helpers for E2E tests
 *
 * Deletes delivery and user documents from Elasticsearch to keep ES in sync with SQL.
 * ES reindexes from SQL once per day, but this ensures immediate cleanup
 * so list pages (powered by ES) don't show deleted test data.
 *
 * Uses the direct ES REST API with basic auth (no Kibana proxy needed).
 */

import { getESConfig } from '@utils/ES_Utils/es.config';

const ES_DELIVERIES_PATTERN = 'deliveries-*';
const ES_RECIPIENTS_PATTERN = 'recipients*';

/**
 * Delete documents from Elasticsearch by IDs on a given index pattern
 *
 * Uses _delete_by_query to remove documents across all matching indices.
 * If no documents are found (already cleaned by daily reindexation), this is treated as success.
 *
 * @param indexPattern - ES index pattern to target (e.g. 'deliveries-*', 'recipients*')
 * @param ids - Array of document IDs to delete
 * @param label - Human-readable label for logs (e.g. 'errands', 'users')
 * @returns Promise<number> - Number of deleted documents
 */
async function deleteFromES(indexPattern: string, ids: number[], label: string): Promise<number> {
  if (ids.length === 0) {
    console.log(`  ⏭️  No ${label} to delete from ES`);
    return 0;
  }

  const config = getESConfig();

  if (!config.host || !config.user || !config.password) {
    console.log('  ⚠️  ES credentials not configured, skipping ES cleanup');
    return 0;
  }

  console.log(`  🔍 Deleting ${ids.length} ${label} from Elasticsearch...`);

  try {
    const url = `https://${config.host}/${indexPattern}/_delete_by_query`;
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
            id: ids,
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`  ❌ ES ${label} delete failed (HTTP ${response.status}): ${errorText}`);
      return 0;
    }

    const result = (await response.json()) as { deleted?: number };
    const deleted = result.deleted || 0;

    if (deleted > 0) {
      console.log(`  ✅ Deleted ${deleted} ${label} documents from Elasticsearch`);
    } else {
      console.log(`  ✅ No ${label} documents found in ES (already cleaned by daily reindex)`);
    }

    return deleted;
  } catch (error) {
    console.error(`  ❌ ES ${label} cleanup failed:`, error);
    // Don't throw - ES cleanup is best-effort, SQL cleanup is the primary mechanism
    return 0;
  }
}

export async function deleteErrandsFromES(errandIds: number[]): Promise<number> {
  return deleteFromES(ES_DELIVERIES_PATTERN, errandIds, 'errands');
}

export async function deleteUsersFromES(userIds: number[]): Promise<number> {
  return deleteFromES(ES_RECIPIENTS_PATTERN, userIds, 'users');
}
