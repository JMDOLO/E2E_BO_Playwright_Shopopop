import { Response } from '@playwright/test';

// Validates a network Response: status must be 2xx/304, and for 2xx the body must be non-empty.
// Guards against the case where headers arrive OK but the body is interrupted/unavailable,
// which makes the front-end fail to parse while Playwright still sees .ok() === true.
export async function isResponseValid(res: Response | null): Promise<boolean> {
  if (!res) return false;
  if (res.status() === 304) return true;
  if (!res.ok()) return false;
  try {
    const body = await res.text();
    return body.length > 0;
  } catch {
    return false;
  }
}
