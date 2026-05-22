/**
 * Trace Analyzer CLI — PoC v2 (hybride filmstrip + action panel)
 *
 * Stratégie :
 *   1. Panel Actions → liste complète des actions (méthode, param, durée, erreur)
 *   2. Filmstrip hover → screenshots UI à chaque transition visible
 *   3. Action failed hors filmstrip → clic dans le panel + screenshot tab "Before"
 *
 * Usage:
 *   NODE_PATH=<project>/node_modules npx tsx /tmp/trace-analyzer.ts <trace.zip> [...]
 *   NODE_PATH=<project>/node_modules npx tsx /tmp/trace-analyzer.ts --parallel <t1.zip> <t2.zip>
 */

import { chromium, type Page } from 'playwright';
import path from 'path';

// --- Types ---

interface ActionInfo {
  index: number;
  method: string;
  param: string;
  duration: string;
  isHook: boolean;
}

interface Transition {
  x: number;
  action: string;
}

interface NetworkError {
  method: string;
  url: string;
  status: number;
  durationMs: number;
  responseBody: string;
}

interface TraceResult {
  file: string;
  actions: ActionInfo[];
  transitions: Transition[];
  screenshots: string[];
  consoleEntries: string[];
  networkErrors: NetworkError[];
  failedActionScreenshot?: string;
  durationMs: number;
  error?: string;
}

const SCAN_STEP = 3;
const HOOK_KEYWORDS = ['Before Hooks', 'After Hooks', 'Fixture', 'Close context', 'Worker Cleanup', 'Attach'];

// --- Helpers ---

async function waitForTraceLoaded(page: Page): Promise<void> {
  await page.waitForFunction(
    () => document.querySelectorAll('.film-strip-frame').length > 0,
    { timeout: 30000 }
  );
  await page.waitForTimeout(1000);
}

async function getFilmstripBounds(page: Page) {
  return page.evaluate(() => {
    const lane = document.querySelector('.film-strip-lane');
    const filmstrip = document.querySelector('.film-strip');
    if (!filmstrip || !lane) return null;
    const fsRect = filmstrip.getBoundingClientRect();
    const laneRect = lane.getBoundingClientRect();
    return {
      startX: Math.round(laneRect.left),
      endX: Math.round(laneRect.right),
      y: Math.round(fsRect.top + fsRect.height / 2)
    };
  });
}

// --- Phase 1: Action panel extraction ---

async function extractActions(page: Page): Promise<ActionInfo[]> {
  return page.evaluate(() => {
    const treeItems = document.querySelectorAll('[role="treeitem"]');
    const results: { index: number; method: string; param: string; duration: string; isHook: boolean }[] = [];
    const hookKeys = ['Before Hooks', 'After Hooks', 'Fixture', 'Close context', 'Worker Cleanup', 'Attach'];

    treeItems.forEach((el, i) => {
      const method = el.querySelector('.action-title-method')?.textContent?.trim() || '';
      const param = (el.querySelector('.action-title-param')?.textContent?.trim()
                  || el.querySelector('.action-title-selector')?.textContent?.trim()
                  || '').substring(0, 100);
      const duration = el.querySelector('.action-duration')?.textContent?.trim() || '';
      const isHook = hookKeys.some(k => method.includes(k) || param.includes(k));
      results.push({ index: i, method, param, duration, isHook });
    });
    return results;
  });
}

// --- Phase 2: Filmstrip scan ---

async function scanTransitions(
  page: Page,
  bounds: { startX: number; endX: number; y: number }
): Promise<Transition[]> {
  const transitions: Transition[] = [];
  let lastAction = '';

  for (let x = bounds.startX; x <= bounds.endX; x += SCAN_STEP) {
    await page.mouse.move(x, bounds.y);
    const actionText = await page.evaluate(() => {
      const title = document.querySelector('.film-strip-hover-title');
      if (title) return title.textContent?.trim() || '';
      const hover = document.querySelector('.film-strip-hover');
      if (hover) return hover.textContent?.trim() || '';
      return '';
    });
    if (actionText && actionText !== lastAction) {
      transitions.push({ x, action: actionText.substring(0, 120) });
      lastAction = actionText;
    }
  }

  return transitions;
}

function findLastTestAction(transitions: Transition[]): number {
  for (let i = transitions.length - 1; i >= 0; i--) {
    if (!HOOK_KEYWORDS.some(k => transitions[i].action.includes(k))) return i;
  }
  return transitions.length - 1;
}

async function captureFilmstripScreenshots(
  page: Page,
  transitions: Transition[],
  bounds: { startX: number; endX: number; y: number },
  traceId: string
): Promise<string[]> {
  const lastTestAction = findLastTestAction(transitions);
  const paths: string[] = [];

  for (let i = 0; i < transitions.length; i++) {
    let targetX: number;
    if (i === lastTestAction) {
      targetX = transitions[i].x; // Last test action → screenshot at START
    } else if (i < transitions.length - 1) {
      targetX = transitions[i + 1].x - SCAN_STEP; // Normal → screenshot at END
    } else {
      targetX = transitions[i].x;
    }

    await page.mouse.move(targetX, bounds.y);
    await page.waitForTimeout(200);

    const label = transitions[i].action.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);
    const p = `/tmp/trace-cli-${traceId}-${String(i).padStart(2, '0')}-${label}.png`;
    await page.screenshot({ path: p, scale: 'css', type: 'png' });
    paths.push(p);
  }

  return paths;
}

// --- Phase 3: Failed action screenshot via panel click ---

async function captureFailedActionScreenshot(
  page: Page,
  actions: ActionInfo[],
  traceId: string
): Promise<string | undefined> {
  // Find the last non-hook action (likely the failed one)
  const testActions = actions.filter(a => !a.isHook);
  if (testActions.length === 0) return undefined;
  const lastAction = testActions[testActions.length - 1];

  // Click on that action in the panel to select it
  const clicked = await page.evaluate((targetIndex: number) => {
    const treeItems = document.querySelectorAll('[role="treeitem"]');
    const el = treeItems[targetIndex] as HTMLElement | undefined;
    if (!el) return false;
    el.click();
    return true;
  }, lastAction.index);

  if (!clicked) return undefined;
  await page.waitForTimeout(500);

  // Click "Before" tab to see UI state at START of this action
  await page.evaluate(() => {
    const tabs = document.querySelectorAll('[role="tab"]');
    for (const tab of tabs) {
      if (tab.textContent?.trim() === 'Before') {
        (tab as HTMLElement).click();
        break;
      }
    }
  });
  await page.waitForTimeout(500);

  const p = `/tmp/trace-cli-${traceId}-FAILED-${lastAction.method.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
  await page.screenshot({ path: p, scale: 'css', type: 'png' });
  return p;
}

// --- Phase 4: Console ---

async function extractConsole(page: Page): Promise<string[]> {
  await page.evaluate(() => {
    const tabs = document.querySelectorAll('[role="tab"]');
    for (const tab of tabs) {
      if (tab.textContent?.includes('Console')) { (tab as HTMLElement).click(); break; }
    }
  });
  await page.waitForTimeout(500);

  return page.evaluate(() => {
    const items = document.querySelectorAll('.console-line, [class*="console-message"]');
    const texts: string[] = [];
    items.forEach(e => {
      const t = e.textContent?.trim();
      if (t && t.length > 5) texts.push(t.substring(0, 200));
    });
    return texts;
  });
}

// --- Phase 5: Network errors (extracted directly from zip, no browser needed) ---

async function extractNetworkErrors(zipPath: string): Promise<NetworkError[]> {
  const { execSync } = await import('child_process');
  const errors: NetworkError[] = [];

  try {
    // Extract network trace from zip
    const networkData = execSync(`unzip -p "${zipPath}" "0-trace.network" 2>/dev/null`, {
      maxBuffer: 10 * 1024 * 1024,
      encoding: 'utf-8',
    });

    // Collect all resource SHA references to resolve later
    const shaToResolve: Map<string, number> = new Map(); // sha -> index in errors

    for (const line of networkData.split('\n')) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line);
        if (obj.type !== 'resource-snapshot') continue;
        const snap = obj.snapshot;
        const status = snap?.response?.status ?? 0;
        if (status < 400) continue;

        const url = snap?.request?.url ?? '';
        const method = snap?.request?.method ?? '';
        const duration = Math.round(snap?.time ?? 0);
        const content = snap?.response?.content ?? {};
        const sha = content._sha1 ?? '';

        const entry: NetworkError = {
          method,
          url: url.length > 150 ? url.substring(0, 150) + '...' : url,
          status,
          durationMs: duration,
          responseBody: '',
        };
        errors.push(entry);

        if (sha) {
          shaToResolve.set(sha, errors.length - 1);
        }
      } catch { /* skip unparseable lines */ }
    }

    // Resolve response bodies from zip resources
    for (const [sha, idx] of shaToResolve) {
      try {
        const body = execSync(`unzip -p "${zipPath}" "resources/${sha}" 2>/dev/null`, {
          maxBuffer: 1024 * 1024,
          encoding: 'utf-8',
          timeout: 5000,
        });
        errors[idx].responseBody = body.trim().substring(0, 500);
      } catch { /* resource not found or too large */ }
    }
  } catch {
    // No network trace file or extraction failed — not critical
  }

  return errors;
}

// --- Main analysis ---

async function analyzeTrace(page: Page, zipPath: string): Promise<TraceResult> {
  const traceId = path.basename(zipPath, '.zip').substring(0, 12);
  const start = Date.now();

  // Phase 5: Network errors (extracted from zip in parallel with browser work)
  const networkPromise = extractNetworkErrors(zipPath);

  try {
    await page.goto('https://trace.playwright.dev');
    await page.waitForSelector('button:has-text("Select file")');

    const fcPromise = page.waitForEvent('filechooser');
    await page.click('button:has-text("Select file")');
    const fc = await fcPromise;
    await fc.setFiles(zipPath);

    await waitForTraceLoaded(page);

    // Phase 1: Actions panel
    const actions = await extractActions(page);
    console.log(`  [${traceId}] ${actions.length} actions (${actions.filter(a => !a.isHook).length} test)`);

    // Phase 2: Filmstrip scan + screenshots
    const bounds = await getFilmstripBounds(page);
    if (!bounds) throw new Error('Could not find filmstrip bounds');

    const transitions = await scanTransitions(page, bounds);
    console.log(`  [${traceId}] ${transitions.length} filmstrip transitions (x=${bounds.startX}..${bounds.endX})`);

    const screenshots = await captureFilmstripScreenshots(page, transitions, bounds, traceId);

    // Phase 3: Failed action screenshot (if action is outside filmstrip)
    const failedActionScreenshot = await captureFailedActionScreenshot(page, actions, traceId);
    if (failedActionScreenshot) {
      console.log(`  [${traceId}] Failed action screenshot captured`);
    }

    // Phase 4: Console
    const consoleEntries = await extractConsole(page);
    console.log(`  [${traceId}] ${consoleEntries.length} console entries`);

    // Await network results
    const networkErrors = await networkPromise;
    if (networkErrors.length > 0) {
      console.log(`  [${traceId}] ⚠️  ${networkErrors.length} network error(s) (HTTP >= 400)`);
    }

    return {
      file: zipPath, actions, transitions, screenshots,
      consoleEntries, networkErrors, failedActionScreenshot,
      durationMs: Date.now() - start
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  [${traceId}] ERROR: ${msg}`);
    const networkErrors = await networkPromise;
    return {
      file: zipPath, actions: [], transitions: [], screenshots: [],
      consoleEntries: [], networkErrors, durationMs: Date.now() - start, error: msg
    };
  }
}

async function analyzeAll(zipPaths: string[], parallel: boolean): Promise<TraceResult[]> {
  console.log(`\n=== ${parallel ? 'Parallel' : 'Sequential'} — ${zipPaths.length} trace(s) ===\n`);
  const browser = await chromium.launch({ headless: true });

  const analyze = async (zipPath: string) => {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const page = await ctx.newPage();
    console.log(`Analyzing: ${path.basename(zipPath)}`);
    const result = await analyzeTrace(page, zipPath);
    await page.close();
    await ctx.close();
    return result;
  };

  const results = parallel
    ? await Promise.all(zipPaths.map(analyze))
    : await asyncSequential(zipPaths, analyze);

  await browser.close();
  return results;
}

async function asyncSequential<T, R>(items: T[], fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (const item of items) results.push(await fn(item));
  return results;
}

// --- Output ---

function printResults(results: TraceResult[]): void {
  console.log('\n' + '='.repeat(60));
  console.log('RESULTS SUMMARY');
  console.log('='.repeat(60));

  for (const r of results) {
    const traceId = path.basename(r.file, '.zip').substring(0, 12);
    const secs = (r.durationMs / 1000).toFixed(1);
    console.log(`\n--- ${traceId} (${secs}s) ---`);

    if (r.error) { console.log(`  ERROR: ${r.error}`); continue; }

    // Actions from panel (complete list)
    console.log(`\n  Actions (${r.actions.length}):`);
    r.actions.forEach(a => {
      const hook = a.isHook ? ' [hook]' : '';
      console.log(`    ${String(a.index).padStart(2)}) ${a.method} ${a.param} ${a.duration}${hook}`);
    });

    // Filmstrip transitions
    const lastTest = findLastTestAction(r.transitions);
    console.log(`\n  Filmstrip transitions (${r.transitions.length}):`);
    r.transitions.forEach((t, i) => {
      const marker = i === lastTest ? ' ◀ LAST VISIBLE' : '';
      console.log(`    ${String(i).padStart(2)}) x=${String(t.x).padStart(4)} ${t.action}${marker}`);
    });

    // Screenshots
    console.log(`\n  Screenshots: ${r.screenshots.length} filmstrip`);
    if (r.failedActionScreenshot) {
      console.log(`  Failed action: ${r.failedActionScreenshot}`);
    }

    // Network errors (API)
    if (r.networkErrors.length > 0) {
      // Separate app API errors from other (analytics, static, etc.)
      const appErrors = r.networkErrors.filter(e =>
        e.url.includes('/api/') || e.url.includes('/deliveries') || e.url.includes('/deliverers') || e.url.includes('/users')
      );
      const otherErrors = r.networkErrors.filter(e => !appErrors.includes(e));

      if (appErrors.length > 0) {
        console.log(`  🔴 API errors (${appErrors.length}):`);
        appErrors.forEach(e => {
          console.log(`    ${e.method} ${e.status} ${e.url} (${e.durationMs}ms)`);
          if (e.responseBody) {
            console.log(`      → ${e.responseBody}`);
          }
        });
      }
      if (otherErrors.length > 0) {
        console.log(`  Network errors (non-API): ${otherErrors.length}`);
      }
    }

    // Console
    console.log(`  Console: ${r.consoleEntries.length} entries`);
    const hasKcDisconnect = r.consoleEntries.some(e => e.includes('error=login_required'));
    if (hasKcDisconnect) {
      console.log(`  ⚠️  KC disconnect detected in console!`);
    }

    // --- Auto-categorization ---
    const hasApiError = r.networkErrors.some(e =>
      (e.url.includes('/api/') || e.url.includes('/deliveries') || e.url.includes('/deliverers') || e.url.includes('/users'))
      && e.status >= 400
    );
    const hasWaitForDeliveryFail = r.actions.some(a =>
      a.method === 'Wait for selector' && a.param.includes('km') && parseFloat(a.duration) >= 14
    );
    const hasNotificationTimeout = r.actions.some(a =>
      (a.method.includes('toBeVisible') || a.method.includes('Expect')) &&
      a.param.includes('ant-notification') && parseFloat(a.duration) >= 29
    );

    let category = '❓ Unknown';
    if (hasKcDisconnect && (hasWaitForDeliveryFail || r.transitions.some(t => t.action.includes('Bonjour')))) {
      category = '🔌 Déco KC';
    } else if (hasApiError) {
      category = '🐛 Bug app (API error)';
    } else if (hasWaitForDeliveryFail) {
      category = '⏱️ Timeout backend (page data)';
    } else if (hasNotificationTimeout && !hasApiError) {
      category = '⏱️ Timeout backend (notification)';
    } else if (r.actions.length <= 5 && r.transitions.length <= 5) {
      category = '🔌 Erreur auth';
    }

    console.log(`  📋 Catégorie: ${category}`);
  }
}

// --- Entry point ---

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Usage: npx tsx /tmp/trace-analyzer.ts [--parallel] <trace1.zip> [trace2.zip ...]');
    process.exit(1);
  }

  const parallel = args.includes('--parallel');
  const zipPaths = args.filter(a => a !== '--parallel');

  const fs = await import('fs');
  for (const p of zipPaths) {
    if (!fs.existsSync(p)) { console.error(`File not found: ${p}`); process.exit(1); }
  }

  const start = Date.now();
  const results = await analyzeAll(zipPaths, parallel);
  printResults(results);
  console.log(`\nTotal: ${((Date.now() - start) / 1000).toFixed(1)}s`);
}

main().catch(console.error);
