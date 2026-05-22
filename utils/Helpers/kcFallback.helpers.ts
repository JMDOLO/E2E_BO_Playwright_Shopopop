/**
 * Keycloak Fallback Registry
 *
 * Per-shard singleton that holds a pool of Keycloak storageStates (cookies)
 * to swap mid-test when KC disconnects the session (KC 26.x intermittent bug — see OPS-1948).
 *
 * Flow:
 * 1. `loadPoolIfNeeded(type)` reads the shard's assigned storageState (.auth/{type}_{N}.json)
 *    plus up to 4 random fallback candidates from .auth-pool/. The assigned one starts active.
 * 2. `getActiveCookies(type)` returns the cookies of the currently active storageState.
 * 3. `swap(type)` marks the active as consumed, moves to the next candidate, and returns its cookies.
 *    Throws when the pool is exhausted.
 *
 * CI-only: in local mode there is a single .auth/{type}.json and no pool — all methods no-op.
 */

import fs from 'fs';
import path from 'path';
import type { Cookie } from '@playwright/test';
import { getRandomWithIndex } from '@utils/Helpers/random.helpers';

export type AuthType = 'pro' | 'interne';

interface StorageState {
  cookies: Cookie[];
  origins: unknown[];
}

interface PoolEntry {
  path: string;
  accountIndex: number;
  cookies: Cookie[];
}

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const AUTH_DIR = path.join(PROJECT_ROOT, '.auth');
const POOL_DIR = path.join(PROJECT_ROOT, '.auth-pool');
const ACCOUNT_COUNT = 20;
const FALLBACK_CANDIDATES_PER_TYPE = 4; // 1 assigned + 4 fallbacks = 5 attempts max

class KcFallbackRegistry {
  private pool: Record<AuthType, PoolEntry[]> = { pro: [], interne: [] };
  private activeIndex: Record<AuthType, number> = { pro: -1, interne: -1 };
  private loaded: Record<AuthType, boolean> = { pro: false, interne: false };

  private readState(filePath: string): PoolEntry | null {
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      const state = JSON.parse(raw) as StorageState;
      const match = path.basename(filePath).match(/_(\d+)\.json$/);
      const accountIndex = match ? parseInt(match[1], 10) : 1;
      return { path: filePath, accountIndex, cookies: state.cookies };
    } catch {
      return null;
    }
  }

  private loadPoolIfNeeded(type: AuthType): void {
    if (this.loaded[type]) return;
    this.loaded[type] = true;

    if (!process.env.CI) return;

    const shardIndex = parseInt(process.env.PLAYWRIGHT_SHARD_INDEX || '1', 10);
    const assignedIndex = ((shardIndex - 1) % ACCOUNT_COUNT) + 1;
    const assignedFile = `${type}_${assignedIndex}.json`;

    const assigned = this.readState(path.join(AUTH_DIR, assignedFile));
    if (assigned) {
      this.pool[type].push(assigned);
      this.activeIndex[type] = 0;
    }

    if (fs.existsSync(POOL_DIR)) {
      const candidates = fs.readdirSync(POOL_DIR)
        .filter(f => f.startsWith(`${type}_`) && f.endsWith('.json') && f !== assignedFile);

      const remaining = [...candidates];
      while (this.pool[type].length - (this.activeIndex[type] >= 0 ? 1 : 0) < FALLBACK_CANDIDATES_PER_TYPE && remaining.length > 0) {
        const { value, index } = getRandomWithIndex(remaining);
        remaining.splice(index, 1);
        const entry = this.readState(path.join(POOL_DIR, value));
        if (entry) this.pool[type].push(entry);
      }
    }

    // Edge case: no assigned file but fallbacks loaded — use first fallback as initial active
    if (this.activeIndex[type] === -1 && this.pool[type].length > 0) {
      this.activeIndex[type] = 0;
    }

    const activeName = this.activeIndex[type] >= 0
      ? path.basename(this.pool[type][this.activeIndex[type]].path)
      : 'none';
    console.log(`[kcFallback] ${type}: pool size ${this.pool[type].length}, active=${activeName}`);
  }

  // Cookies of the current active storageState. Null in local mode or if nothing is loaded.
  getActiveCookies(type: AuthType): Cookie[] | null {
    this.loadPoolIfNeeded(type);
    const idx = this.activeIndex[type];
    if (idx < 0) return null;
    return this.pool[type][idx].cookies;
  }

  // Account index (1..20) of the current active storageState. Falls back to 1 in local mode.
  getActiveAccountIndex(type: AuthType): number {
    this.loadPoolIfNeeded(type);
    const idx = this.activeIndex[type];
    if (idx < 0) return 1;
    return this.pool[type][idx].accountIndex;
  }

  // Move to the next fallback. Throws if pool exhausted.
  swap(type: AuthType): Cookie[] {
    this.loadPoolIfNeeded(type);
    const nextIdx = this.activeIndex[type] + 1;
    if (nextIdx >= this.pool[type].length) {
      throw new Error(`[kcFallback] ${type} pool exhausted after ${this.pool[type].length} attempt(s)`);
    }
    this.activeIndex[type] = nextIdx;
    const active = this.pool[type][nextIdx];
    console.log(`[kcFallback] ${type}: swapped to ${path.basename(active.path)} (${nextIdx + 1}/${this.pool[type].length})`);
    return active.cookies;
  }
}

export const kcFallback = new KcFallbackRegistry();
