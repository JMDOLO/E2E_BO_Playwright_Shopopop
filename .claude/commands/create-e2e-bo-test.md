---
description: "Workflow complet de creation de test E2E BO : analyse UI, Jira, Testomat, POM, fichier Playwright"
argument-hint: "<feature-description or Jira ticket ID>"
allowed-tools: [Read, Write, Edit, Glob, Grep, Bash, Task, ToolSearch, mcp__playwright__browser_navigate, mcp__playwright__browser_click, mcp__playwright__browser_type, mcp__playwright__browser_snapshot, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_fill_form, mcp__playwright__browser_select_option, mcp__playwright__browser_hover, mcp__playwright__browser_wait_for, mcp__playwright__browser_close, mcp__playwright__browser_evaluate, mcp__playwright__browser_run_code, mcp__playwright__browser_press_key, mcp__playwright__browser_resize, mcp__atlassian__searchJiraIssuesUsingJql, mcp__atlassian__getJiraIssue, mcp__atlassian__search, mcp__testomatio__create_suite, mcp__testomatio__create_test, mcp__testomatio__get_suite, mcp__testomatio__get_test, mcp__testomatio__search_suites, mcp__testomatio__search_tests, mcp__testomatio__get_root_suites, mcp__testomatio__update_test, mcp__testomatio__get_labels]
---

# Workflow de creation de test E2E BO automatise

L'utilisateur a invoque ce workflow avec : $ARGUMENTS

## Regles generales

- **Autonomie totale** : enchainer toutes les etapes SANS demander d'autorisation ni de confirmation (sauf step 3.1 si doute sur le ticket Jira)
- **Qualite > vitesse** : respecter l'ordre des steps pour accumuler le contexte. La parallelisation est possible UNIQUEMENT pour des actions independantes
- **Headless obligatoire** : toutes les actions browser (MCP et CLI) en headless
- **Langue** : toujours communiquer en francais
- **Nettoyage** : supprimer les screenshots et artefacts temporaires apres usage

---

## Step 1 : Caffeinate

```bash
caffeinate -d &
```

Stocker le PID pour le kill en fin de workflow.

---

## Step 2 : Analyse UI et recuperation de locators

### 2.0 : Extraire l'auth Google (pour les scripts CLI des steps 5-6)

Avant de fermer le browser MCP, sauvegarder le storageState :

```javascript
// Via browser_run_code dans le MCP Playwright
await page.context().storageState({ path: '/tmp/testomat-jira-auth/storage-state.json' });
```

Creer le dossier `/tmp/testomat-jira-auth/` si besoin.

### 2.1 : Explorer la page BO concernee

- Naviguer sur la page QA3 correspondante (BO Pro ou BO Interne)
- URLs de base :
  - **BO Pro** : `https://app-qa3.engineering.shopopop.com`
  - **BO Interne** : `https://backoffice-qa3.engineering.shopopop.com`
- Identifier les elements UI a tester (de haut en bas, de gauche a droite)
- **Prendre un snapshot** pour reference

### 2.2 : Recuperer les locators manquants du POM

**Strategie en 2 temps** :

1. **D'abord** : lire le POM existant de la page concernee et chercher des patterns similaires deja implementes (liste deroulante, checkbox, input, bouton). Reproduire le MEME style XPath.
2. **Ensuite** : si aucun pattern existant ne correspond, creer le XPath soi-meme en explorant le DOM via le snapshot MCP. Le but est de s'inspirer de l'existant quand c'est possible, pas de se limiter a ce qui existe deja.

**Patterns de reference courants** (extraits des POM existants) :

```typescript
// Liste deroulante Ant Design - recuperer valeur active
readonly dropdownValue = '//div[contains(@class, "ant-select-selection-item")]';

// Liste deroulante - ouvrir
readonly dropdown = '//div[contains(@class, "ant-select-selector")]';

// Option dans une liste
async selectOption(value: string) {
  await this.page.locator(`//div[@class="ant-select-item-option-content" and text()="${value}"]`).click();
}

// Checkbox Ant Design
readonly checkbox = '//input[@value="frozen"]/ancestor::label';

// Bouton dans un bloc specifique
async clickEditButton(blocTitle: string) {
  await this.page.locator(`//div[text()='${blocTitle}']/following::button[1]`).click();
}

// Champ texte par label
readonly field = '//label[text()="Nom"]/following::input[1]';
```

**XPath exclusivement** — pas de CSS, pas de getByRole/getByText/getById.

### 2.3 : Fermer le browser MCP apres exploration

Toujours appeler `browser_close` une fois l'exploration terminee.

---

## Step 3 : Recherche du ticket Jira

### 3.1 : Recherche JQL avec fallback (ne jamais bloquer le flux)

**Chaine de fallback :**

**1. API Atlassian MCP** (rapide, donnees completes) :

- **CloudId Shopopop** : `93674ed8-babf-4447-b125-e6d2ac26406b`
- **Projets** : toujours inclure `BO-` ET `BACK-` (ancien et nouveau)
- **Filtre type** : commencer par `issuetype = Story` (features). Si pas de resultat satisfaisant, etendre a Task et Epic. Ne jamais inclure Bug.
- **JQL** : chercher par mots-cles de la feature

```
project in (BO, BACK) AND summary ~ "mot-cle" AND issuetype = Story ORDER BY created DESC
```

- 2-3 tentatives max en cas d'erreur. Ne PAS boucler avec des sleep.

**2. Playwright MCP via URL** (fallback si API KO) :

- Naviguer vers `https://shopopop.atlassian.net/issues?jql=<JQL_ENCODE>`
- Extraire les resultats via `browser_run_code` :

```javascript
const rows = document.querySelectorAll('tr[data-testid="native-issue-table.ui.issue-row"]');
rows.forEach(row => {
  const cell = row.querySelector('[data-testid="native-issue-table.ui.row.issue-row.merged-cell"]');
  const key = cell?.querySelector('a[href*="/browse/"]')?.textContent?.trim();
  const summary = cell?.textContent?.trim().replace(key, '').trim();
});
```

- **WebFetch KO** : Jira est une SPA, WebFetch ne recupere que du JS minifie → inutilisable.

**3. Analyse des resultats :**

Si DOUTE sur le resultat → demander validation a l'utilisateur (unique exception a la regle d'autonomie). Apres sa reponse, reprendre en **100% autonome**.
Si SUR du resultat → continuer sans demander.

### 3.2 : Lire le ticket

Utiliser `getJiraIssue` pour extraire :

- **Numero** : `BO-XXXX` ou `BACK-XXXX`
- **Titre** : resume court
- **Description** : extraire le "En tant que... Je veux... Afin de..."
- **Statut** : pour determiner `.spec.claude.ts` vs `.specdraft.claude.ts`

---

## Step 4 : Creation sur Testomat

### 4.1 : Creer la suite

Utiliser l'API Testomat MCP (`create_suite`).

- **Projet Testomat** : `back-office-c96f6`
- **Nom de la suite** : `CLAUDE-{JIRA-ID} - {Titre du ticket Jira}`
  - Ex : `CLAUDE-BO-3468 - Recalculer la distance suite a la modif d'un drive`
- **Description** : le "En tant que / Je veux / Afin de" extrait de Jira
- **Organisation** : placer dans le bon dossier (`BO-Pro/` ou `BO-Interne/`)

### 4.2 : Creer le(s) cas de test

Regles strictes :

- **1 cas de test = 1 assertion** (2 max si tres similaires)
- **1 action = une vraie action UI** (cliquer, saisir, naviguer) — PAS une verification
- **State** : toujours `manual` (passe en `automated` apres execution Playwright)
- **Pas de Gherkin** : format Action + Expected Result

**Redaction des tests** :

- **Pas de donnees en dur** dans les descriptions (pas de "TESTREF42", "150€"). Utiliser des formulations generiques : "noter la valeur saisie"
- **Ecrire comme un testeur manuel** : le test doit etre reproductible par un humain qui lit les steps
- **Utiliser "noter"** pour indiquer qu'une donnee doit etre memorisee pour comparaison ulterieure
- **Actions = actions UI** : "Acceder a", "Cliquer sur", "Saisir" — JAMAIS "Verifier", "Consulter"
- **Expected** : decrire le resultat attendu de facon generique (ex: "correspond a celle saisie en prerequis")

Format du test :

```markdown
### Requirements
Acces au BO Interne
Creer une livraison et **noter** la reference saisie

### Steps
- Acceder au detail de la livraison
  *Expected:* La "reference", du bloc "Commande", correspond a celle saisie en prerequis.
```

### 4.3 : Extraire les tags Testomat

Apres creation, noter :

- **Tag suite** : `@S<hash>` (ex: `@Sa77fe43b`)
- **Tag(s) test** : `@T<hash>` (ex: `@T54097eea`)

---

## Steps 5-6 : Liens Testomat ↔ Jira

### Cas 1 : Ajout a une suite EXISTANTE deja liee

Quand on ajoute un test a une suite deja liee a un ticket Jira, le test herite **automatiquement** du lien Jira. Dans ce cas, ne PAS re-executer les scripts. Verifier uniquement :

1. **Suite liee au ticket** : dans le resultat de `get_tests`, verifier que `jira-issues` contient le bon `JIRA-ID`
2. **Option Testomat activee sur le ticket Jira** : utiliser `getJiraIssue` et verifier que le bloc Testomat est present/actif sur le ticket

Si les deux sont OK → passer directement au Step 7.

### Cas 2 : Nouvelle suite (pas encore liee)

#### Step 5 : Lier la suite Testomat au ticket Jira

Executer le script CLI headless :

```bash
NODE_PATH=/Users/jean-michel/Documents/qa-E2E-tests/E2E_BO/node_modules npx tsx ~/.claude/scripts/testomat-jira/link-suite-to-jira.ts {suiteHash}:{JIRA-ID}
```

- `{suiteHash}` = hash de la suite SANS le `S` prefix (ex: `a77fe43b`)
- `{JIRA-ID}` = `BO-XXXX` ou `BACK-XXXX`

##### En cas d'echec

- **Ne PAS utiliser playwright-mcp** (trop lent)
- Debugger et corriger le script CLI directement
- Causes frequentes : Testomat single session (user deja connecte), SSO expiree, locator Testomat change
- Si l'utilisateur est connecte sur Testomat, le script cree sa propre session → deconnecte l'utilisateur (normal, pas un bug)

##### Fallback si le script echoue vraiment

- Faire un `hard-refresh` et re-naviguer sur l'URL de la suite
- Reporter le probleme et corriger le script pour la prochaine fois

#### Step 6 : Activer Testomat sur le ticket Jira

Executer le script CLI headless :

```bash
NODE_PATH=/Users/jean-michel/Documents/qa-E2E-tests/E2E_BO/node_modules npx tsx ~/.claude/scripts/testomat-jira/activate-testomat-on-jira.ts {JIRA-ID}
```

Memes regles de fallback que le step 5.

**Note** : les steps 5 et 6 peuvent etre chainees :

```bash
NODE_PATH=/Users/jean-michel/Documents/qa-E2E-tests/E2E_BO/node_modules npx tsx ~/.claude/scripts/testomat-jira/link-suite-to-jira.ts {suiteHash}:{JIRA-ID} && \
NODE_PATH=/Users/jean-michel/Documents/qa-E2E-tests/E2E_BO/node_modules npx tsx ~/.claude/scripts/testomat-jira/activate-testomat-on-jira.ts {JIRA-ID}
```

---

## Step 7 : Creer le fichier de test Playwright

### 7.0 : Fichier existant ou nouveau ?

**Regle** : si l'US Jira est deja utilisee pour d'autres tests ET que la nouvelle feature est dans le **meme bloc UI**, ajouter le test dans le fichier existant (meme `describe`, meme `beforeEach`).

Si la feature est dans un **bloc UI different** malgre la meme US → creer un nouveau fichier.

Exemple concret avec BACK-4619 :
- `Modifier la reference de la commande` et `Modifier le montant de la commande` → meme bloc "Commande" → **meme fichier** `BACK-4619-Interne-Modifierinformationscommande.spec.claude.ts`
- `Modifier le point de retrait` → bloc "Point de retrait" → **autre fichier** `BACK-4619-Interne-Modifierpointderetrait.spec.claude.ts`

**Avant de creer un fichier**, toujours chercher s'il en existe deja un pour le meme ticket :

```bash
# Chercher les fichiers existants pour ce ticket
ls tests/**/BACK-4619* tests/**/BO-XXXX* 2>/dev/null
```

### 7.1 : Nommage du fichier (si nouveau)

```
{JIRA-ID}-{Interne|Pro}-{KeywordsFeature}.spec.claude.ts
```

- Ex : `BO-3468-Interne-Recalculdistancemodifdrive.spec.claude.ts`
- Si le ticket Jira est Done/MEP → `.specdraft.claude.ts` au lieu de `.spec.claude.ts` (rare)
- Placement dans le bon dossier : `tests/BO Interne/` ou `tests/BO Pro/`

### 7.2 : Structure du fichier

```typescript
import { testInterne as test, expect } from '@fixtures/auth.fixture';
// ou testPro as test pour BO Pro

import { createDeliveryAPI, buildAndGotoDeliveryURL } from '@utils/Helpers/createDeliveryAPI.helpers';
// Imports POM necessaires
import { InternalDeliveryDetails } from '@pages/BO Interne/Livraisons/...';

// Tag suite Testomat dans le describe
test.describe('{Nom identique a la suite Testomat} @S{hash}', () => {
  let deliveryDetails: InternalDeliveryDetails;
  // Autres variables POM...

  test.beforeEach(async ({ page }) => {
    // Instanciation POM
    deliveryDetails = new InternalDeliveryDetails(page);

    // Actions communes (ex: creer livraison, naviguer)
    const deliveryId = await createDeliveryAPI();
    await buildAndGotoDeliveryURL(page, deliveryId);
  });

  // Tag test Testomat dans chaque test
  test('{Nom identique au test Testomat} @T{hash}', async ({ page }) => {
    // Actions specifiques
    // Assertion(s)
    await expect(page.locator('...')).toBeVisible();
  });
});
```

### 7.3 : Regles et bonnes pratiques (mis a jour apres chaque review)

**Structure fichier**

- **Imports** : toujours des path aliases (`@fixtures/`, `@pages/`, `@utils/`) — JAMAIS de `../`
- **Named exports** : `import { Class }` — JAMAIS `import default`
- **Pas d'import inutile** : verifier que chaque import est utilise dans le fichier
- **Tags Testomat** : `@S<hash>` dans le describe, `@T<hash>` dans chaque test
- **beforeEach** : declarer variables POM dans le describe, instancier dans beforeEach
- **Noms identiques** : le describe = nom de la suite Testomat, le test = nom du test Testomat

**Arrange (beforeEach) : creer ses donnees, minimum d'etapes**

- **TOUJOURS creer ses propres donnees** — JAMAIS dependre de donnees existantes en base (non reproductible, fragile)
- Creer la livraison via `createDeliveryAPI()` puis **seulement** les modifications DB strictement necessaires au scenario
- Ne pas empiler les etapes DB inutilement : si `insertRows('errand_history', ...)` suffit, ne pas ajouter `waitForErrandInES` + `updateErrandTable` en plus
- **Question a se poser** : quel est le minimum pour que la page affiche ce qu'on veut tester ?
- Le `selectTab()` / navigation vers l'onglet fait partie du beforeEach si TOUS les tests du describe en ont besoin

**Assertions**

- **1 assertion par test** (2 max si tres similaires)
- **`toBeVisible()` sur un locator precis** (counter `//sup`, lien avec `@href`) plutot que compter des elements ou naviguer
- Ne pas comparer un compteur avec un `.count()` d'elements — faux positif si les deux sont a 0
- Lien de detail : verifier la presence du `href` exact (`/delivery/${deliveryId}`) suffit, pas besoin de cliquer + verifier l'URL d'arrivee
- Toaster de succes = assertion suffisante (pas besoin de reload pour verifier l'etat)
- Privilegier les assertions web-first (`toHaveValue`, `not.toHaveValue`) plutot que capturer une valeur puis comparer en memoire
- Formulation "conserve" / "is preserved" pour indiquer que la valeur saisie persiste sans reload
- `not.toHaveValue(initial)` est preferable a capturer la nouvelle valeur quand on teste un increment

**Donnees**

- **Pas de donnees en dur** : utiliser `@testdata/` (orderInformation, drives, users) — JAMAIS de valeurs hardcodees dans les assertions
- **Centraliser les donnees hors des tests** : ne pas dupliquer un faker deja realise dans testData, autant l'appeler directement
- Pas de donnees en dur non plus dans les descriptions Testomat

**Locators et actions**

- **XPath exclusivement** pour les locators
- **Un seul XPath complet** plutot que des locators chaines (`.locator().locator()`) : plus lisible, copiable dans DevTools, erreurs Playwright plus claires. Si un XPath de base est reutilise, l'extraire en methode privee string (`private tabXPath()`) et composer via template literal
- **Pas de waitForTimeout** — utiliser des waits explicites
- **Pas de `clear()` avant `fill()`** : `fill()` vide deja le champ automatiquement
- `buildAndGotoDeliveryURL` inclut deja Promise.race + retry → pas d'assertions supplementaires

**Testomat**

- Ecrire comme un testeur manuel (actions UI : "Acceder a", "Cliquer sur", "Saisir" — JAMAIS "Verifier", "Consulter")
- Utiliser "noter" pour indiquer qu'une donnee doit etre memorisee pour comparaison ulterieure
- Ne jamais omettre les contraintes metier dans les descriptions
- 1 test par suite quand possible

**POM**

- **Ajouter dans le POM existant** (ne pas creer de nouveau fichier POM sauf si la page n'en a pas)
- Organiser par bloc UI (de haut en bas, gauche a droite)
- S'inspirer des POM existants pour le style des locators, creer de nouveaux XPath via snapshot MCP quand aucun pattern existant ne correspond
- Pas de locator mort — uniquement ceux utilises par le test
- **Unicite obligatoire** : tout locator doit matcher exactement 1 element dans le DOM (1 of 1). Verifier en Step 2 via `browser_evaluate` ou DevTools MCP avant de l'ajouter au POM
- Checkbox Ant Design : cibler `//input[@value='X']/ancestor::label`

---

## Step 8 : Sauvegarde pour review

Creer une copie de sauvegarde des fichiers crees/modifies dans un emplacement **persistant** (survit au redemarrage Mac) :

```
~/.claude/projects/-Users-jean-michel-Documents-qa-E2E-tests/review-backups/{JIRA-ID}/
```

Fichiers a sauvegarder :

- Fichier(s) `.spec.claude.ts` crees
- Fichier(s) POM modifies (copie complete du fichier)
- Scripts CLI modifies (si corriges en step 5/6)

### Workflow de review

1. L'utilisateur review les fichiers
2. L'utilisateur indique "review terminee pour {fichier}"
3. **Comparer** le fichier actuel avec la sauvegarde pour identifier les modifications de l'utilisateur
4. **Noter dans la memoire** (`~/.claude/projects/-Users-jean-michel-Documents-qa-E2E-tests/memory/`) les lecons apprises pour mieux faire la prochaine fois
5. **Supprimer** la sauvegarde des fichiers reviews
6. **Conserver** les sauvegardes des fichiers pas encore reviews

---

## Step 9 : Desactiver caffeinate

```bash
kill {PID_CAFFEINATE}
```

---

## Reference rapide des outils

| Step | Outil principal | Fallback |
|---|---|---|
| 2 (UI exploration) | `mcp__playwright__*` | Env local `localhost:3000` hors QA3 |
| 3 (Jira) | `mcp__atlassian__*` (JQL) | Rovo Search |
| 4 (Testomat) | `mcp__testomatio__*` | - |
| 5 (Link suite-Jira) | Script CLI `link-suite-to-jira.ts` | Corriger le script |
| 6 (Testomat on Jira) | Script CLI `activate-testomat-on-jira.ts` | Corriger le script |
| 7 (Fichiers test) | Write/Edit tools | - |

## Conventions de nommage (resume)

| Element | Format | Exemple |
|---|---|---|
| Suite Testomat | `CLAUDE-{JIRA-ID} - {Titre}` | `CLAUDE-BO-3468 - Recalculer la distance...` |
| Fichier Playwright | `{JIRA-ID}-{App}-{Keywords}.spec.claude.ts` | `BO-3468-Interne-Recalculdistancemodifdrive.spec.claude.ts` |
| Describe | identique au nom de la suite Testomat | - |
| Test | identique au nom du test Testomat | - |
