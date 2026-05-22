# E2E Tests - Back-Office Shopopop

Suite de tests End-to-End pour les applications back-office de Shopopop (BO Pro et BO Interne) utilisant Playwright et TypeScript.

## Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Installation](#installation)
- [Configuration](#configuration)
- [Architecture du projet](#architecture-du-projet)
- [Fixtures](#fixtures)
- [Fonctions Helper](#fonctions-helper-utils)
- [Test Data](#test-data)
- [Exécution des tests](#exécution-des-tests)
- [Intégration CI/CD](#intégration-cicd)
- [Conventions de code](#conventions-de-code)
- [Bonnes pratiques](#bonnes-pratiques)

## Vue d'ensemble

Cette suite de tests couvre deux applications back-office de Shopopop :

- **BO Pro** : Back-office pour les professionnels (commerçants)
- **BO Interne** : Back-office pour les équipes internes Shopopop

Les tests s'exécutent sur l'environnement **QA3** et sont intégrés avec **Testomat.io** pour la gestion et le reporting des tests.

## Installation

### Prérequis

- Node.js (version 16 ou supérieure)
- npm

### Installation des dépendances

```bash
# Installer les dépendances du projet
npm ci

# Installer les navigateurs Playwright avec les dépendances système
npx playwright install --with-deps
```

## Configuration

### Variables d'environnement

Créez un fichier `.env` à la racine du projet (`E2E_BO/.env`) avec les variables suivantes :

```env
# Environnement
STAGING=0                                    # 0 pour QA3, 1 pour staging

# Authentification - Comptes rotatifs pour exécution parallèle en CI
# 20 comptes BO Pro (rotation automatique sur 60 shards CI)
LOGINBOPRO_1='qa-team+pro1@example.com'
# ... (LOGINBOPRO_2 à LOGINBOPRO_20)

# 20 comptes BO Interne (rotation automatique sur 60 shards CI)
LOGINBOINT_1='qa-team+int1@example.com'
# ... (LOGINBOINT_2 à LOGINBOINT_20)

# Mot de passe partagé pour tous les comptes
PASSWORDBO=votremotdepasse

# API GenericV2 (Shopopop Partners API)
PARTNER_ID=votre_partner_id
PARTNER_API_KEY=votre_partner_api_key

# Cloudflare Access (protection des endpoints)
CF_ACCESS_CLIENT_ID_PARTNERS=client_id
CF_ACCESS_CLIENT_SECRET_PARTNERS=secret

# Base de données MySQL (QA3)
DB_HOST_QA3=host.exemple.com
DB_DATABASE_QA3=nom_database
DB_USER_QA3=utilisateur
DB_PASSWORD_QA3=password
DB_PORT_QA3=3306

# Elasticsearch (QA3)
ES_HOST_QA3=host
ES_USER_QA3=user
ES_PASSWORD_QA3=password

# Testomat.io (reporting des tests)
TESTOMATIO=votre_clé_api
TESTOMATIO_ENV=QA3
TESTOMATIO_TITLE=E2E_BO_Tests

# Google Groups API (gestion des groupes de test)
GOOGLE_GROUPS_REFRESH_TOKEN=token
GOOGLE_OAUTH_CLIENT_ID=client_id
GOOGLE_OAUTH_CLIENT_SECRET=client_secret
GOOGLE_GROUP_ID=group_id
```

**Notes importantes** :

- Le fichier `.env` est exclu de Git (`.gitignore`)
- En CI, ces variables sont configurées directement dans le workflow (sauf le password qui reste un secret)
- **Rotation des comptes** : Le système sélectionne automatiquement le bon compte en fonction du shard en CI (modulo 20) ou utilise le compte 1 en local
- **Variables minimales pour tests basiques** : `STAGING`, `LOGINBOPRO_1` à `LOGINBOPRO_20`, `LOGINBOINT_1` à `LOGINBOINT_20`, `PASSWORDBO`
- **Pour création API** : Ajouter `PARTNER_*`, `CF_ACCESS_*`
- **Pour accès DB** : Ajouter `DB_*`
- **Pour cleanup ES** : Ajouter `ES_*`

## Architecture du projet

```text
E2E_BO/
├── pages/
│   ├── BO_Both/                    # Pages communes aux deux applications
│   │   ├── Authentification/
│   │   │   └── LoginPage.ts        # Login unifié (Pro + Interne)
│   │   ├── Creer_une_livraison/
│   │   │   ├── CreateDeliveryStep1.ts
│   │   │   ├── CreateDeliveryStep2.ts
│   │   │   ├── CreateDeliveryStep3.ts
│   │   │   └── CreateDeliveryStep4.ts
│   │   └── SuccessMessages.ts
│   ├── BO_Interne/
│   │   ├── InternalHomePageMenu.ts
│   │   ├── Livraisons/ (InternalDeliveryPage, InternalDeliveryDetails, ChangeDelivery, IncidentDrawer)
│   │   ├── Livraisons/Historique/InternalHistory.ts
│   │   ├── Paramètres/ (Settings.ts, ConfigurePassword.ts)
│   │   └── Utilisateurs/Users.ts
│   └── BO_Pro/
│       ├── ProHomePage.ts
│       └── Livraisons/ (ProDeliveryPage, ProDeliveryDetails)
├── fixtures/
│   ├── base.fixture.ts             # Bypass CSP + headers CF + blocage analytics + skip tutoriels
│   └── auth.fixture.ts             # Exporte testPro et testInterne
├── testdata/
│   ├── drives.json                 # Points de retrait
│   ├── users.json                  # Destinataires de test
│   ├── order_information.ts        # Données de commande aléatoires
│   ├── new_recipients.ts           # Destinataires générés par Faker
│   └── url.app.json                # URLs de base QA3
├── utils/
│   ├── API_Utils/                  # Intégration API GenericV2
│   │   ├── api.config.ts
│   │   ├── delivery.post.ts
│   │   ├── delivery.get.ts
│   │   └── payload.builder.ts
│   ├── DB_Utils/                   # Accès MySQL
│   │   ├── db.config.ts
│   │   ├── selectData.db.ts
│   │   ├── updateData.db.ts
│   │   ├── deleteData.db.ts
│   │   └── testDataRegistry.ts
│   ├── ES_Utils/                   # Cleanup Elasticsearch
│   │   ├── es.config.ts
│   │   └── deleteData.es.ts
│   └── Helpers/
│       ├── authentication.helpers.ts
│       ├── createDelivery.helpers.ts
│       ├── createDeliveryAPI.helpers.ts
│       ├── random.helpers.ts
│       └── googleGroups.helpers.ts
├── tests/
│   ├── BO_Pro/                     # 12 fichiers de test
│   ├── BO_Interne/                 # 19 fichiers de test
│   └── Tools/manual-cleanup.spec.ts
├── global-setup.ts                 # Initialisation pool DB
├── global-teardown.ts              # Cleanup bulk (DB + ES) + fermeture pool
└── playwright.config.ts
```

### Page Object Model (POM)

Le projet utilise le pattern **Page Object Model** pour encapsuler les locators et actions :

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

**Organisation** : `BO_Pro/` (spécifique Pro), `BO_Interne/` (spécifique Interne), `BO_Both/` (partagé).

## Fixtures

### Structure des fixtures

```text
base.fixture.ts (bypass CSP + headers CF Access + blocage analytics + skip tutoriels)
    ↓ (extends)
auth.fixture.ts → exporte testPro et testInterne (auto-login)
```

### Utilisation dans les tests

```typescript
// Pour les tests BO Pro
import { testPro as test, expect } from '@fixtures/auth.fixture';

// Pour les tests BO Interne
import { testInterne as test, expect } from '@fixtures/auth.fixture';

// La page est déjà authentifiée au démarrage du test
test('Mon test', async ({ page }) => {
  // Déjà connecté
});
```

**Architecture d'authentification** : La logique (dans `utils/Helpers/authentication.helpers.ts`) utilise une détection d'état multi-niveaux avec Promise.race et auto-correction en cas d'échec. Voir `CLAUDE.md` pour les détails techniques.

## Fonctions Helper (Utils)

### Création de livraison via API (méthode recommandée)

```typescript
import { createDeliveryAPI } from '@utils/Helpers/createDeliveryAPI.helpers';

// Tous les paramètres sont optionnels (defaults: drive_alim1, recipient_pro)
const deliveryId = await createDeliveryAPI();

// Avec des valeurs personnalisées
const deliveryId2 = await createDeliveryAPI(
  drives.drive_alim1,
  users.recipient_pro,
  { amount: "500", size: "M", reference: "TESTREF1" }
);
```

**Signature** : `createDeliveryAPI(drive?, recipient?, orderInfo?) → Promise<number>`

- Auto-enregistrement dans TestDataRegistry (toujours, pas d'opt-out)
- Retry automatique (3 tentatives) en cas d'erreur transitoire
- 10x plus rapide que la création via UI

### Navigation vers une livraison

```typescript
import { buildAndGotoDeliveryURL } from '@utils/Helpers/createDeliveryAPI.helpers';

const deliveryId = await createDeliveryAPI();
const deliveryURL = await buildAndGotoDeliveryURL(page, deliveryId);
```

### Création via UI

```typescript
import { createDeliveryForPro, createDeliveryForInternal } from '@utils/Helpers/createDelivery.helpers';

// BO Pro (inclut Step 4 - paiement)
const { url, id } = await createDeliveryForPro(page, drive, recipient, orderInfo?);

// BO Interne (sans Step 4)
const { url, id } = await createDeliveryForInternal(page, drive, recipient, orderInfo?);
```

Retourne `{ url: string, id: number }`. Auto-enregistrement dans TestDataRegistry.

### API_Utils

- **`api.config.ts`** : `getAPIConfig()` → configuration centralisée (URL, clés API, Cloudflare Access)
- **`delivery.post.ts`** : `createDelivery(url, payload, partnerId, apiKey, cfClientId, cfClientSecret)` → POST GenericV2
- **`delivery.get.ts`** : `getDeliveryStatus(url, reference, partnerId, apiKey, cfClientId, cfClientSecret)` → GET livraison
- **`payload.builder.ts`** : `buildDeliveryPayload(drive, recipient, orderInfo?)` → Payload exhaustif avec cohérence size/packs

### DB_Utils

- **`db.config.ts`** : `getDBPool()` (singleton), `closeDBPool()`
- **`selectData.db.ts`** : `selectTable(table, conditions[], fields?, logicalOperator?)` — Opérateurs : `=`, `>`, `<`, `>=`, `<=`, `!=`, `LIKE`, `IN`
- **`updateData.db.ts`** : `updateErrandTable(deliveryId, updateFields[])`
- **`deleteData.db.ts`** : Suppression en masse (utilisé par global teardown uniquement)
- **`testDataRegistry.ts`** : Registre centralisé pour le tracking des données de test

### ES_Utils

- **`es.config.ts`** : `getESConfig()` → Configuration Elasticsearch depuis variables d'environnement
- **`deleteData.es.ts`** : `deleteErrandsFromES(errandIds)` → Supprime les documents ES après le cleanup SQL. Ignoré si les credentials ES ne sont pas configurés.

### Autres Helpers

- **`random.helpers.ts`** : Génération de données aléatoires (téléphone français, etc.)
- **`googleGroups.helpers.ts`** : Intégration Gmail API pour Google Groups

## Test Data

### drives.json

Points de retrait pour les tests :

```json
{
  "drive_alim1": { "name": "testAutoBOAlim1", "id": "14455", "trade_type": "ALIMENTAIRE" }
}
```

### users.json

Destinataires de test :

```json
{
  "recipient_pro": { "name": "Bo Pro", "lastname": "Pro", "address": "305 Bouchais", "id": "521906" }
}
```

### order_information.ts

Données de commande aléatoires : reference (8 chars), amount (3 digits), size (XS-XXL), additionalInfos (25 chars). Exporte aussi `deliveryDefaults` pour les payloads API.

### new_recipients.ts

Destinataires Faker (`newRecipientPro`, `newRecipientInterne`, `newRecipient`) avec noms uniques et téléphones français valides.

### url.app.json

URLs de base QA3 : `url_pro` (`https://app-qa3.engineering.shopopop.com`) et `url_interne` (`https://backoffice-qa3.engineering.shopopop.com`).

## Exécution des tests

### Commandes de base

```bash
# Exécuter tous les tests
npx playwright test

# Exécuter un fichier spécifique
npx playwright test "tests/BO_Pro/Authentification/BO-1151-AuthentificationBOPro.spec.ts"

# Par pattern / par ID Testomat.io
npx playwright test --grep "BO-1151"
npx playwright test --grep "@T54097eea"

# Mode headed / debug
npx playwright test --headed
npx playwright test --debug

# Afficher le rapport / Installer les navigateurs
npx playwright show-report
npx playwright install --with-deps
```

### Configuration Playwright

Principales configurations dans `playwright.config.ts` :

- **Timeout** : 90s par test, 30s pour les assertions expect
- **Parallèle** : `fullyParallel: true`
- **Retries** : 2 (local et CI)
- **Workers** : 1 en CI, `undefined` (auto) en local
- **Navigateur** : Chromium uniquement
- **Locale** : `fr-FR`
- **Screenshots** : Sur tous les tests
- **Vidéo/Trace** : Conservés uniquement en échec
- **testIgnore** : `manual-cleanup.spec.ts` exclu sauf depuis l'extension VS Code Playwright extension

**Reporters** :

- CI : `list` + `blob` + `@testomatio/reporter` (conditionnel)
- Local : `list` + `html` + `@testomatio/reporter` (désactivé dans VS Code)

### Global Setup & Teardown

**`global-setup.ts`** : Initialise le pool MySQL et vérifie la connexion.

**`global-teardown.ts`** : Récupère les IDs du TestDataRegistry, supprime en masse (errands + 11 tables liées → ES cleanup → users → addresses), ferme le pool DB.

**Performance** : 97% plus rapide que le cleanup par test (bulk `WHERE id IN (...)`).

### Cleanup manuel

Outil `tests/Tools/manual-cleanup.spec.ts` :

1. Ajouter les IDs dans `errandstodelete`/`userstodelete` de `test-data-registry.json`
2. Lancer uniquement le test "Clean data" via l'extension VS Code Playwright
3. Ignoré en CI et en ligne de commande locale

## Intégration CI/CD

### GitHub Actions

**Déclenchement** :

- Manuel (`workflow_dispatch`) avec checkbox Testomat.io
- Planifié : lundi-vendredi à 11h45 UTC

**Stratégie de sharding** : 60 shards parallèles (`fail-fast: false`).

**Optimisations** : Cache npm + navigateurs Playwright. Installation conditionnelle uniquement en cas de cache miss.

**Fusion des rapports** : Job 2 télécharge les 60 blob reports et fusionne en un rapport HTML unique (`playwright-report-merged`).

**Testomat.io** : Utilise `TESTOMATIO_RUN` (depuis le job `launch-testomat-run`) + flag `TESTOMATIO_PROCEED`. Activé uniquement pour les runs planifiées ou manuelles avec checkbox.

**Variables d'environnement** : Les comptes login sont hardcodés (pas de secrets) sauf `PASSWORDBO`. Les credentials API/DB/ES utilisent `${{ secrets.* }}`. `PLAYWRIGHT_SHARD_INDEX` est passé pour la rotation des comptes.

### Déboguer un échec CI

1. Consulter les logs du workflow dans GitHub Actions
2. Télécharger l'artefact `playwright-report-merged`
3. Ouvrir `index.html` localement pour les résultats détaillés

## Conventions de code

### Named Exports

**IMPORTANT** : Toujours utiliser les **named exports** (pas de default exports) :

```typescript
// Correct
export class LoginPage { ... }
import { LoginPage } from '@pages/BO_Both/Authentification/LoginPage';

// Incorrect
export default class LoginPage { ... }
import LoginPage from '@pages/BO_Both/Authentification/LoginPage';
```

### Path Mapping

**IMPORTANT** : Toujours utiliser les **alias de path mapping** (jamais d'imports relatifs) :

- `@fixtures/*`, `@pages/*`, `@utils/*`, `@testdata/*`, `@root/*`

```typescript
// Correct
import { testPro as test, expect } from '@fixtures/auth.fixture';
import * as drives from '@testdata/drives.json';

// Incorrect
import { test, expect } from '../../../fixtures/auth.fixture';
```

### Synchronisation Workflows

Le fichier workflow GitHub Actions existe à **deux emplacements** qui doivent rester **identiques** :

1. `/E2E_BO/.github/workflows/E2E_BO_Playwright_Tests.yml`
2. `/.github/workflows/E2E_BO_Playwright_Tests.yml` (racine du repository)

## Bonnes pratiques

### Tests atomiques

- Chaque test crée ses propres données
- Pas de dépendance à l'ordre d'exécution
- Utiliser les fixtures pour la configuration commune

### Gestion des attentes

```typescript
// Bon : attente explicite avec assertion
await expect(page.locator('selector')).toBeVisible();
await page.waitForURL('**/expected-path');

// Éviter : attentes arbitraires
await page.waitForTimeout(5000);
```

### Quand utiliser quel outil

- **Création rapide** : `createDeliveryAPI()` (API, 10x plus rapide)
- **Test du flux complet** : `createDeliveryForPro/Internal()` (UI)
- **Navigation** : `buildAndGotoDeliveryURL(page, deliveryId)`
- **Lecture DB** : `selectTable()`
- **Modification DB** : `updateErrandTable()`
- **Cleanup** : Automatique via TestDataRegistry + global teardown

### Pattern de test standard

```typescript
import { testPro as test, expect } from '@fixtures/auth.fixture';
import { createDeliveryAPI, buildAndGotoDeliveryURL } from '@utils/Helpers/createDeliveryAPI.helpers';
import { ProDeliveryDetails } from '@pages/BO_Pro/Livraisons/Liste_des_livraisons/Detail_de_livraison/ProDeliveryDetails';

test('BO-XXXX: Description @T<hash>', async ({ page }) => {
  // 1. Setup
  const deliveryId = await createDeliveryAPI();

  // 2. Navigation
  await buildAndGotoDeliveryURL(page, deliveryId);

  // 3. Actions
  const details = new ProDeliveryDetails(page);
  await details.clickEditButton('Informations sur la commande');

  // 4. Assertions
  await expect(page.locator('...')).toBeVisible();
});
```

---

**Environnements** :

- **QA3 Pro** : `https://app-qa3.engineering.shopopop.com/`
- **QA3 Interne** : `https://backoffice-qa3.engineering.shopopop.com/`

**Stack technique** : Playwright + TypeScript, Page Object Model, Testomat.io, GitHub Actions (60 shards), MySQL + Elasticsearch, GenericV2 Partners API

Dernière mise à jour : 2026-02-14
