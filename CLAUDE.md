# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## General Principles

**CRITICAL**: Take your time and produce quality work. Think carefully before implementing changes, ensure code is clean, well-documented, and follows project patterns. Quality over speed.

**SIMPLICITY FIRST**: Always prefer the simplest solution that works.

- Ask: "Can I solve this by moving/reordering existing code?"
- Ask: "Is a new function/abstraction truly necessary?"
- KISS principle: Keep It Simple, Stupid
- Three similar lines of code is better than a premature abstraction

**ANALYZE BEFORE IMPLEMENTING**: Before proposing ANY abstraction or helper:

1. Present options first - Don't jump straight to implementation
2. Analyze trade-offs: lines saved? easier to maintain? likely to change?
3. Let the user decide

**Markdown Formatting**: Blank lines around lists, code blocks, and headers. No multiple blank lines. End files with a single blank line.

## Project Overview

E2E test suite for Shopopop's back-office applications (BO Pro and BO Interne) using Playwright and TypeScript. Tests target QA3 environment and integrate with Testomat.io for test management.

## Development Commands

```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test "tests/BO_Pro/Authentification/BO-1151-AuthentificationBOPro.spec.ts"

# Run tests matching a pattern / by Testomat ID
npx playwright test --grep "BO-1151"
npx playwright test --grep "@T54097eea"

# Show last report / Install browsers
npx playwright show-report
npx playwright install --with-deps
```

**npm scripts** (disable Testomat reporter for local convenience):

```bash
npm test                  # npx playwright test
npm run test:draft        # DISABLE_TESTOMAT=true playwright test
npm run test:headed       # DISABLE_TESTOMAT=true playwright test --headed
npm run test:debug        # DISABLE_TESTOMAT=true playwright test --debug
npm run test:ui           # DISABLE_TESTOMAT=true playwright test --ui
```

## Coding Standards

### Export Syntax Convention

**IMPORTANT**: This project uses **named exports** (not default exports).

```typescript
// CORRECT
export class LoginPage { ... }
export function createDeliveryAPI() { ... }
import { LoginPage } from '@pages/BO_Both/Authentification/LoginPage';

// INCORRECT
export default class LoginPage { ... }
import LoginPage from '@pages/BO_Both/Authentification/LoginPage';
```

### Path Mapping (TypeScript)

**IMPORTANT**: **NEVER use relative imports** (`../`, `../../`). Always use path mapping aliases:

- `@fixtures/*` -> `fixtures/*`
- `@pages/*` -> `pages/*`
- `@utils/*` -> `utils/*`
- `@testdata/*` -> `testdata/*`
- `@root/*` -> `./*`

```typescript
// CORRECT
import { testPro as test, expect } from '@fixtures/auth.fixture';
import { CreateDeliveryStep1Page } from '@pages/BO_Both/Creer_une_livraison/CreateDeliveryStep1';
import { createDeliveryAPI } from '@utils/Helpers/createDeliveryAPI.helpers';
import * as drives from '@testdata/drives.json';

// INCORRECT
import { test, expect } from '../../../fixtures/auth.fixture';
```

Configuration in `tsconfig.json` under `compilerOptions.paths`.

### CI/CD Environment Variables Rule

**CRITICAL**: When adding or modifying environment variables:

1. **ALWAYS** update `.github/workflows/E2E_BO_Playwright_Tests.yml`
2. Add the variable to the `env:` section of the "Run Playwright tests" step
3. Document the variable in the `.env` file with a comment

### GitHub Workflow Synchronization Rule

**CRITICAL**: The workflow file exists at **two locations** and must remain **identical**:

1. `/E2E_BO/.github/workflows/E2E_BO_Playwright_Tests.yml`
2. `/.github/workflows/E2E_BO_Playwright_Tests.yml` (repository root)

Always apply changes to BOTH files and commit them together.

### Documentation Synchronization Rule

When making **refactorings or architecture changes**, update BOTH `CLAUDE.md` and `README.md`. Not needed for simple test additions or minor bug fixes.

## Project Structure

```text
E2E_BO/
├── pages/
│   ├── BO_Both/                    # Shared pages
│   │   ├── Authentification/
│   │   │   └── LoginPage.ts        # Unified login (Pro + Interne)
│   │   ├── Creer_une_livraison/
│   │   │   ├── CreateDeliveryStep1.ts
│   │   │   ├── CreateDeliveryStep2.ts
│   │   │   ├── CreateDeliveryStep3.ts
│   │   │   └── CreateDeliveryStep4.ts
│   │   └── SuccessMessages.ts
│   ├── BO_Interne/
│   │   ├── InternalHomePageMenu.ts
│   │   ├── Livraisons/
│   │   │   ├── InternalDeliveryPage.ts
│   │   │   ├── Liste_des_livraisons/Detail_de_livraison/
│   │   │   │   ├── ChangeDelivery.ts
│   │   │   │   ├── IncidentDrawer.ts
│   │   │   │   └── InternalDeliveryDetails.ts
│   │   │   └── Historique/InternalHistory.ts
│   │   ├── Paramètres/ (Settings.ts, ConfigurePassword.ts)
│   │   └── Utilisateurs/Users.ts
│   └── BO_Pro/
│       ├── ProHomePage.ts
│       └── Livraisons/
│           ├── ProDeliveryPage.ts
│           └── Liste_des_livraisons/Detail_de_livraison/
│               └── ProDeliveryDetails.ts
├── fixtures/
│   ├── base.fixture.ts             # CSP bypass + CF Access headers + blocks analytics + skips tutorials
│   └── auth.fixture.ts             # Exports testPro and testInterne
├── testdata/
│   ├── drives.json                 # Pickup points
│   ├── users.json                  # Test recipients
│   ├── order_information.ts        # Random order data (reference, amount, size)
│   ├── new_recipients.ts           # Faker-generated recipients for new recipient tests
│   └── url.app.json                # QA3 base URLs (Pro + Interne)
├── utils/
│   ├── API_Utils/                  # GenericV2 API integration
│   │   ├── api.config.ts
│   │   ├── delivery.post.ts
│   │   ├── delivery.get.ts
│   │   └── payload.builder.ts
│   ├── DB_Utils/                   # MySQL database access
│   │   ├── db.config.ts
│   │   ├── selectData.db.ts
│   │   ├── updateData.db.ts
│   │   ├── deleteData.db.ts
│   │   └── testDataRegistry.ts
│   ├── ES_Utils/                   # Elasticsearch cleanup
│   │   ├── es.config.ts
│   │   └── deleteData.es.ts
│   └── Helpers/
│       ├── authentication.helpers.ts
│       ├── createDelivery.helpers.ts
│       ├── createDeliveryAPI.helpers.ts
│       ├── random.helpers.ts
│       └── googleGroups.helpers.ts
├── tests/
│   ├── BO_Pro/                     # 12 test files
│   ├── BO_Interne/                 # 25 test files
│   └── Tools/manual-cleanup.spec.ts
├── global-setup.ts                 # DB pool initialization
├── global-teardown.ts              # Bulk cleanup (DB + ES) + pool close
└── playwright.config.ts
```

## Test Architecture

### Playwright Configuration

Key settings in `playwright.config.ts`:

- **Timeout**: 90s per test, 30s for expect assertions
- **Parallel**: `fullyParallel: true`
- **Retries**: 2 (both local and CI)
- **Workers**: 1 in CI, `undefined` (auto) locally
- **Browser**: Chromium only
- **Locale**: `fr-FR`
- **HTTPS errors**: Ignored (`ignoreHTTPSErrors: true`)
- **Custom matchers**: Extended with `playwright-expect` package
- **Screenshots**: On all tests
- **Video/Trace**: Retained on failure
- **testIgnore**: `manual-cleanup.spec.ts` excluded except from VS Code Playwright extension

**Reporters:**

- CI: `list` + `blob` (for shard merging) + `@testomatio/reporter` (conditional)
- Local: `list` + `html` + `@testomatio/reporter` (disabled in VS Code)

### Test Identification

- Test suites: `@S<hash>` (e.g., `@Sa77fe43b`)
- Individual tests: `@T<hash>` (e.g., `@T54097eea`)
- Story/feature IDs: `BO-XXXX` or `BACK-XXXX` prefixes in describe blocks
- Draft tests: `*.specdraft.ts` files — work-in-progress, excluded from CI and local runs

### Fixtures System

**Hierarchy:**

```text
base.fixture.ts (CSP bypass + CF Access headers + blocks analytics + skips tutorials)
    ↓ extends
auth.fixture.ts → exports testPro and testInterne (auto-login)
```

**Usage in tests:**

```typescript
// For BO Pro tests
import { testPro as test, expect } from '@fixtures/auth.fixture';

// For BO Interne tests
import { testInterne as test, expect } from '@fixtures/auth.fixture';

// Page is already authenticated when test starts
test('My test', async ({ page }) => {
  // Already logged in
});
```

### Authentication Architecture

The auth logic in `utils/Helpers/authentication.helpers.ts` uses **Promise.race** for multi-state detection with auto-correction:

1. **State detection**: Races 4 conditions (home/login/sso/timeout)
2. **Action verification**: Combined condition (URL changed AND element hidden) OR home page loaded
3. **Auto-correction**: Timeout → reload → retry (up to 3 attempts)
4. **All timeouts**: 15s aligned with API patterns

All locators are centralized in `LoginPage` POM (`pages/BO_Both/Authentification/LoginPage.ts`). Key implementation rules:

- Always store URL BEFORE action: `const currentURL = page.url()`
- Use `.href` to compare URL strings
- Define home page locator once and reuse

### Page Object Model (POM)

Locators and actions are encapsulated in Page Objects, not directly in tests:

```typescript
import { Page, expect } from '@playwright/test';

export class ProDeliveryDetails {
  readonly page: Page;
  constructor(page: Page) { this.page = page; }

  async clickEditButton(blocTitle: string) {
    await this.page.locator(`//div[text()='${blocTitle}']/following::button[1]`).click();
  }
}
```

**Organization**: `pages/BO_Pro/` (Pro-specific), `pages/BO_Interne/` (Interne-specific), `pages/BO_Both/` (shared).

### Global Setup and Teardown

**`global-setup.ts`** - Runs once before all tests:

- Initializes MySQL connection pool (`getDBPool()`)
- Verifies database connection

**`global-teardown.ts`** - Runs once after all tests:

1. Collects registered errand/user IDs from TestDataRegistry
2. Collects associated address IDs
3. Bulk deletes: errands (+ 11 related tables) → ES cleanup → users → addresses
4. Clears registry, closes DB pool

## Helper Functions

### createDeliveryAPI (API - fastest method)

```typescript
import { createDeliveryAPI } from '@utils/Helpers/createDeliveryAPI.helpers';

// All parameters optional (defaults: drive_alim1, recipient_pro)
const deliveryId = await createDeliveryAPI();

// With custom values
const deliveryId2 = await createDeliveryAPI(
  drives.drive_alim1,
  users.recipient_pro,
  { amount: "500", size: "M", reference: "TESTREF1" }
);
```

**Signature**: `createDeliveryAPI(drive?, recipient?, orderInfo?) → Promise<number>`

- Auto-registers errand in TestDataRegistry (always, no opt-out)
- Up to 5 attempts on transient API errors
- Waits 2s for DB propagation, then retrieves ID via `selectTable`

### buildAndGotoDeliveryURL

```typescript
import { buildAndGotoDeliveryURL } from '@utils/Helpers/createDeliveryAPI.helpers';

const deliveryId = await createDeliveryAPI();
const deliveryURL = await buildAndGotoDeliveryURL(page, deliveryId);
```

Uses `waitForDeliveryPageData` with Promise.race + retry for page load verification. Tests using it don't need extra distance assertions.

### createDeliveryForPro / createDeliveryForInternal (UI flow)

```typescript
import { createDeliveryForPro, createDeliveryForInternal } from '@utils/Helpers/createDelivery.helpers';

// BO Pro (includes Step 4 payment)
const { url, id } = await createDeliveryForPro(page, drive, recipient, orderInfo?);

// BO Interne (no Step 4)
const { url, id } = await createDeliveryForInternal(page, drive, recipient, orderInfo?);
```

Returns `{ url: string, id: number }`. Auto-registers in TestDataRegistry.

### API_Utils

**`api.config.ts`**: `getAPIConfig()` → returns `{ url, partnerId, apiKey, cfClientId, cfClientSecret }`

**`delivery.post.ts`**: `createDelivery(url, payload, partnerId, apiKey, cfClientId, cfClientSecret)` → POST to GenericV2 API

**`delivery.get.ts`**: `getDeliveryStatus(url, reference, partnerId, apiKey, cfClientId, cfClientSecret)` → GET delivery info

**`payload.builder.ts`**: `buildDeliveryPayload(drive, recipient, orderInfo?)` → Exhaustive GenericV2 payload. Size/packs coherence via `getCoherentPacks(size)`:

| Size | Packs |
| ---- | ----- |
| XS   | 0     |
| S    | 1-2   |
| M    | 3-8   |
| L    | 9-15  |
| XL   | 16-29 |
| XXL  | 30-40 |

### DB_Utils

**`db.config.ts`**: `getDBPool()` (singleton), `closeDBPool()`

**`selectData.db.ts`**: `selectTable(table, conditions[], fields?, logicalOperator?)`

```typescript
import { selectTable } from '@utils/DB_Utils/selectData.db';

const delivery = await selectTable(
  'errand',
  [{ field: 'reference', value: 'TESTREF1' }],
  ['id', 'status']
);
// Operators: =, >, <, >=, <=, !=, LIKE, IN
```

**`updateData.db.ts`**: `updateErrandTable(deliveryId, updateFields[])`

```typescript
await updateErrandTable(12345, [
  { field: 'status', value: 'COMPLETED' },
  { field: 'tips', value: 5 }
]);
```

**`deleteData.db.ts`**: `deleteErrandsByIds(ids)`, `deleteShopUsersByIds(ids)`, `deleteAddressByIds(ids)` - Used by global teardown. Don't call directly in tests.

**`testDataRegistry.ts`**: File-based registry persisting across Playwright workers.

```typescript
TestDataRegistry.registerErrand(id);    // Register for cleanup
TestDataRegistry.registerUser(id);
TestDataRegistry.getErrands();          // Get all registered IDs
TestDataRegistry.getStats();            // { errands: N, users: N }
TestDataRegistry.clear();               // Reset
```

### ES_Utils

**`es.config.ts`**: `getESConfig()` → `{ host, user, password }` from `ES_HOST_QA3`, `ES_USER_QA3`, `ES_PASSWORD_QA3`

**`deleteData.es.ts`**: `deleteErrandsFromES(errandIds)` → Deletes delivery documents from Elasticsearch via `_delete_by_query`. Called automatically in global teardown after SQL cleanup. Gracefully skips if ES credentials are not configured.

### Other Helpers

- **`random.helpers.ts`**: `getRandomWithIndex<T>(list)` — returns `{ value, index }` from an array
- **`googleGroups.helpers.ts`**: Gmail API integration for Google Groups (OAuth2, message reading)

## Test Data

### drives.json

3 pickup points: `drive_alim1` (ALIMENTAIRE), `drive_fleur1` (FLEURISTE), `drive_vin1` (VINS).

```json
{
  "drive_alim1": { "name": "testAutoBOAlim1", "id": "14417", "phone": "+33606060606", "trade_type": "ALIMENTAIRE", "trade_name": "testAutoBOAlim" }
}
```

### users.json

5 entries: `recipient_pro`, `recipient_interne` (destinataires), `CTP` (livreur), `user_pro`, `user_interne`, `user_pro1` (utilisateurs BO).

```json
{
  "recipient_pro": { "name": "Bo Pro", "firstname": "Bo", "lastname": "Pro", "email": "bopro@test.com", "phone": "+33612345678", "address": "305 Bouchais 44119 Grandchamp-des-Fontaines", "id": "521906", "internal_uuid": "bfc81496-..." }
}
```

### order_information.ts

Generates random: reference (8 chars), amount (3 digits), size (XS-XXL), additionalInfos (25 chars). Also exports `deliveryDefaults` for API payloads.

### new_recipients.ts

Faker-generated recipients (`newRecipientPro`, `newRecipientInterne`, `newRecipient`) with unique names and valid French phone numbers.

### url.app.json

QA3 base URLs: `url_pro` (`https://app-qa3.engineering.shopopop.com`) and `url_interne` (`https://backoffice-qa3.engineering.shopopop.com`).

## Environment Configuration

### Required Variables

```env
# Environment
STAGING=0                                    # 0 for QA3, 1 for staging

# Authentication - 20 rotating accounts per type
LOGINBOPRO_1='qa-team+pro1@example.com'      # through LOGINBOPRO_20
LOGINBOINT_1='qa-team+int1@example.com'      # through LOGINBOINT_20
PASSWORDBO=password

# API Authentication (GenericV2)
PARTNER_ID=partner_id
PARTNER_API_KEY=api_key

# Cloudflare Access
CF_ACCESS_CLIENT_ID_PARTNERS=client_id
CF_ACCESS_CLIENT_SECRET_PARTNERS=secret

# MySQL Database (QA3)
DB_HOST_QA3=host
DB_DATABASE_QA3=database
DB_USER_QA3=user
DB_PASSWORD_QA3=password
DB_PORT_QA3=3306

# Elasticsearch (QA3)
ES_HOST_QA3=host
ES_USER_QA3=user
ES_PASSWORD_QA3=password

# Testomat.io Reporting
TESTOMATIO=api_key
TESTOMATIO_ENV=QA3
TESTOMATIO_TITLE=E2E_BO_Tests
DISABLE_TESTOMAT=true                       # Set to disable reporter (used by npm scripts)

# Google Groups API
GOOGLE_GROUPS_REFRESH_TOKEN=token
GOOGLE_OAUTH_CLIENT_ID=client_id
GOOGLE_OAUTH_CLIENT_SECRET=secret
GOOGLE_GROUP_ID=group_id
```

**Account rotation**: Shard 1 → account 1, Shard 2 → account 2, etc. (modulo 20). Local always uses account 1.

## CI/CD Integration

### GitHub Actions Workflow

**Triggers**: Manual dispatch (with Testomat.io checkbox) + Scheduled weekdays 11:45 UTC.

**Strategy**: 60 parallel shards (`fail-fast: false`). Each shard uploads a blob report.

**Optimizations**: npm + Playwright browsers cached. Conditional installation only on cache miss.

**Report merging**: Job 3 downloads all 60 blob reports, merges into single HTML report (`playwright-report-merged`).

**Testomat.io**: 4 jobs total: `launch-testomat-run` → `test` (60 shards) → `merge-reports` → `finish-testomat-run`. Uses `TESTOMATIO_RUN` + `TESTOMATIO_PROCEED` flag. Only activated for scheduled runs or manual with checkbox.

**Environment variables in workflow**: Login accounts are hardcoded (not secrets) except `PASSWORDBO`. API/DB/ES credentials use `${{ secrets.* }}`. `PLAYWRIGHT_SHARD_INDEX` is passed for account rotation.

### Manual Database Cleanup

Tool at `tests/Tools/manual-cleanup.spec.ts`:

1. Add IDs to `errandstodelete`/`userstodelete` in `test-data-registry.json`
2. Run only the "Clean data" test via VS Code Playwright extension
3. Ignored in CI and local command line (controlled by `testIgnore`)

## Common Test Patterns

```typescript
import { testPro as test, expect } from '@fixtures/auth.fixture';
import { createDeliveryAPI, buildAndGotoDeliveryURL } from '@utils/Helpers/createDeliveryAPI.helpers';
import { ProDeliveryDetails } from '@pages/BO_Pro/Livraisons/Liste_des_livraisons/Detail_de_livraison/ProDeliveryDetails';

test('BO-XXXX: Test description @T<hash>', async ({ page }) => {
  // 1. Setup: Create test data via API
  const deliveryId = await createDeliveryAPI();

  // 2. Navigate to delivery details
  await buildAndGotoDeliveryURL(page, deliveryId);

  // 3. Perform actions
  const details = new ProDeliveryDetails(page);
  await details.clickEditButton('Informations sur la commande');

  // 4. Assert
  await expect(page.locator('...')).toBeVisible();
});
```

**Key rules:**

- Use `expect().toBeVisible()` for element assertions (web-first, auto-waits)
- Use `waitForURL()` for navigation assertions
- Avoid `waitForTimeout()` - use explicit waits
- `page.url()` after a click is a race condition - use `getAttribute('href')` or `waitForURL()`
- Each test must be independent (no shared state between tests)
