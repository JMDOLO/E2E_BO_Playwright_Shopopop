/**
 * Shard Account Helpers
 * Maps CI shards to rotating Keycloak accounts to reduce session conflicts.
 *
 * CI: 20 Pro accounts (pro1..pro20) + 20 Interne accounts (int1..int20),
 * distributed across 55 shards via modulo.
 * Local: always uses account 1 (default behavior, no env var needed).
 *
 * Emails track the currently active account (via kcFallback singleton) so they
 * follow swaps triggered by KC disconnects. Storage state paths remain tied to
 * the shard-assigned index (the initial context is loaded once by Playwright).
 */

import { kcFallback } from '@utils/Helpers/kcFallback.helpers';

const ACCOUNT_COUNT = 20;

/**
 * Returns the 1-based account index assigned to the current shard.
 * Shard 1 → 1, Shard 20 → 20, Shard 21 → 1, Shard 55 → 15.
 * Local (no PLAYWRIGHT_SHARD_INDEX) → 1.
 */
export function getAccountIndex(): number {
  const shardIndex = parseInt(process.env.PLAYWRIGHT_SHARD_INDEX || '1');
  return ((shardIndex - 1) % ACCOUNT_COUNT) + 1;
}

/**
 * Returns the Pro email for the currently active account.
 * CI: tracks kcFallback — follows swaps after KC disconnects.
 * Local: qa-team+pro1@example.com (always account 1).
 */
export function getShardProEmail(): string {
  const index = process.env.CI ? kcFallback.getActiveAccountIndex('pro') : 1;
  return `qa-team+pro${index}@example.com`;
}

/**
 * Returns the Interne email for the currently active account.
 * CI: tracks kcFallback — follows swaps after KC disconnects.
 * Local: qa-team+int1@example.com (always account 1).
 */
export function getShardInterneEmail(): string {
  const index = process.env.CI ? kcFallback.getActiveAccountIndex('interne') : 1;
  return `qa-team+int${index}@example.com`;
}

/**
 * Returns the storageState file path for Pro tests.
 * CI: .auth/pro_{N}.json (per-account)
 * Local: .auth/pro.json (single file)
 */
export function getProStorageStatePath(): string {
  if (!process.env.CI) {
    return '.auth/pro.json';
  }
  return `.auth/pro_${getAccountIndex()}.json`;
}

/**
 * Returns the storageState file path for Interne tests.
 * CI: .auth/interne_{N}.json (per-account)
 * Local: .auth/interne.json (single file)
 */
export function getInterneStorageStatePath(): string {
  if (!process.env.CI) {
    return '.auth/interne.json';
  }
  return `.auth/interne_${getAccountIndex()}.json`;
}
