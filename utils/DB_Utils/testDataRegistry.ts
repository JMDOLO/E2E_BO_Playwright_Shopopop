/**
 * Test Data Registry
 *
 * Centralized registry that tracks all test data created during the test campaign.
 * Data is deleted in bulk at the end via globalTeardown for maximum performance.
 *
 * IMPORTANT: Uses a file-based storage to persist data across Playwright worker processes.
 *
 * Usage in tests:
 * ```typescript
 * import { TestDataRegistry } from '@utils/testDataRegistry';
 *
 * test('My test', async ({ page }) => {
 *   const errandId = await createErrandAPI();
 *   TestDataRegistry.registerErrand(errandId);
 *
 *   const userId = await createUserAPI();
 *   TestDataRegistry.registerUser(userId);
 *
 *   // Test...
 * });
 * ```
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface RegistryData {
  errands: number[];
  users: number[];
  errandstodelete: number[]; // For manual cleanup
  userstodelete: number[];   // For manual cleanup
}

// Sync sleep without busy-spin — used while waiting for a contended file lock.
const SLEEP_BUFFER = new Int32Array(new SharedArrayBuffer(4));
function sleepSync(ms: number): void {
  Atomics.wait(SLEEP_BUFFER, 0, 0, ms);
}

export class TestDataRegistry {
  private static readonly REGISTRY_FILE = process.env.CI
    ? path.join(os.tmpdir(), 'playwright-test-data-registry.json')      // CI: /tmp/ (shared across shards)
    : path.join(process.cwd(), 'test-data-registry.json');               // Local: project root (robust, working directory)

  /**
   * Load registry data from file
   */
  private static load(): RegistryData {
    try {
      if (fs.existsSync(this.REGISTRY_FILE)) {
        const content = fs.readFileSync(this.REGISTRY_FILE, 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn('⚠️  Failed to load registry file:', error);
    }
    return { errands: [], users: [], errandstodelete: [], userstodelete: [] };
  }

  /**
   * Save registry data to file atomically (write to temp, then rename).
   * `rename` is atomic on POSIX, so readers never see a half-written file.
   */
  private static save(data: RegistryData): void {
    try {
      const tmp = `${this.REGISTRY_FILE}.tmp.${process.pid}.${Date.now()}`;
      fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tmp, this.REGISTRY_FILE);
    } catch (error) {
      console.error('❌ Failed to save registry file:', error);
    }
  }

  /**
   * Serialize a read-modify-write cycle across Playwright workers via an exclusive lockfile.
   * Without this, two workers can both read the same baseline and overwrite each other's writes.
   */
  private static withLock<T>(fn: (data: RegistryData) => T): T {
    const lockFile = `${this.REGISTRY_FILE}.lock`;
    const STALE_LOCK_MS = 30_000;
    const RETRY_MS = 20;
    const MAX_ATTEMPTS = 200; // ~4s worst case

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      let acquired = false;
      try {
        // 'wx' = create exclusive; throws EEXIST if the lock is already held
        fs.closeSync(fs.openSync(lockFile, 'wx'));
        acquired = true;
        const data = this.load();
        return fn(data);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;

        // Steal the lock if a previous worker crashed and left it behind
        try {
          const stats = fs.statSync(lockFile);
          if (Date.now() - stats.mtimeMs > STALE_LOCK_MS) {
            fs.unlinkSync(lockFile);
            continue;
          }
        } catch { /* lock vanished mid-check — loop will re-acquire */ }

        sleepSync(RETRY_MS);
      } finally {
        if (acquired) {
          try { fs.unlinkSync(lockFile); } catch { /* already gone */ }
        }
      }
    }
    throw new Error(`Failed to acquire registry lock after ${MAX_ATTEMPTS} attempts (lockfile: ${lockFile})`);
  }

  /**
   * Register an errand (delivery) for cleanup
   */
  static registerErrand(errandId: number): void {
    if (!Number.isInteger(errandId) || errandId <= 0) {
      console.warn(`⚠️  Skipped registering invalid errand id: ${errandId}`);
      return;
    }
    this.withLock((data) => {
      const errandsSet = new Set(data.errands);
      errandsSet.add(errandId);
      data.errands = Array.from(errandsSet);
      this.save(data);
    });
    console.log(`📝 Registered errand ${errandId} for cleanup`);
  }

  /**
   * Register a shop user for cleanup
   */
  static registerUser(userId: number): void {
    if (!Number.isInteger(userId) || userId <= 0) {
      console.warn(`⚠️  Skipped registering invalid user id: ${userId}`);
      return;
    }
    this.withLock((data) => {
      const usersSet = new Set(data.users);
      usersSet.add(userId);
      data.users = Array.from(usersSet);
      this.save(data);
    });
    console.log(`📝 Registered user ${userId} for cleanup`);
  }

  /**
   * Get errands selected for manual cleanup
   */
  static getErrandsToDelete(): number[] {
    return this.load().errandstodelete;
  }

  /**
   * Get users selected for manual cleanup
   */
  static getUsersToDelete(): number[] {
    return this.load().userstodelete;
  }

  /**
   * Get all registered errands
   */
  static getErrands(): number[] {
    const data = this.load();
    return data.errands;
  }

  /**
   * Get all registered users
   */
  static getUsers(): number[] {
    const data = this.load();
    return data.users;
  }

  /**
   * Get statistics about registered data
   */
  static getStats(): { errands: number; users: number } {
    const data = this.load();
    return {
      errands: data.errands.length,
      users: data.users.length,
    };
  }

  /**
   * Get statistics about manual delete lists
   */
  static getManualStats(): { errandstodelete: number; userstodelete: number } {
    const data = this.load();
    return {
      errandstodelete: data.errandstodelete.length,
      userstodelete: data.userstodelete.length,
    };
  }

  /**
   * Clear all registered data (used after cleanup)
   */
  static clear(): void {
    this.withLock(() => {
      this.save({ errands: [], users: [], errandstodelete: [], userstodelete: [] });
    });
  }

  /**
   * Remove specific errands and users from the registry
   * Useful for manual cleanup where you only want to remove certain IDs
   *
   * @param errandIds - Array of errand IDs to remove
   * @param userIds - Array of user IDs to remove
   */
  static remove(errandIds: number[], userIds: number[]): void {
    this.withLock((data) => {
      const errandIdsToRemove = new Set(errandIds);
      const userIdsToRemove = new Set(userIds);

      data.errands = data.errands.filter(id => !errandIdsToRemove.has(id));
      data.users = data.users.filter(id => !userIdsToRemove.has(id));
      data.errandstodelete = [];
      data.userstodelete = [];

      this.save(data);
    });
  }
}
