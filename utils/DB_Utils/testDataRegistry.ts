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
   * Save registry data to file
   */
  private static save(data: RegistryData): void {
    try {
      fs.writeFileSync(this.REGISTRY_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error('❌ Failed to save registry file:', error);
    }
  }

  /**
   * Register an errand (delivery) for cleanup
   */
  static registerErrand(errandId: number): void {
    const data = this.load();
    const errandsSet = new Set(data.errands);
    errandsSet.add(errandId);
    data.errands = Array.from(errandsSet);
    this.save(data);
    console.log(`📝 Registered errand ${errandId} for cleanup`);
  }

  /**
   * Register a shop user for cleanup
   */
  static registerUser(userId: number): void {
    const data = this.load();
    const usersSet = new Set(data.users);
    usersSet.add(userId);
    data.users = Array.from(usersSet);
    this.save(data);
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
   * Clear all registered data (used after cleanup)
   */
  static clear(): void {
    this.save({ errands: [], users: [], errandstodelete: [], userstodelete: [] });
  }

  /**
   * Remove specific errands and users from the registry
   * Useful for manual cleanup where you only want to remove certain IDs
   *
   * @param errandIds - Array of errand IDs to remove
   * @param userIds - Array of user IDs to remove
   */
  static remove(errandIds: number[], userIds: number[]): void {
    const data = this.load();
    const errandIdsToRemove = new Set(errandIds);
    const userIdsToRemove = new Set(userIds);

    data.errands = data.errands.filter(id => !errandIdsToRemove.has(id));
    data.users = data.users.filter(id => !userIdsToRemove.has(id));
    data.errandstodelete = [];
    data.userstodelete = [];

    this.save(data);
  }
}
