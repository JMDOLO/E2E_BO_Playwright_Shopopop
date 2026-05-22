---
description: "Workflow complet de creation de test E2E BO : analyse UI, Jira, Testomat, POM, fichier Playwright"
argument-hint: "<feature-description or Jira ticket ID>"
allowed-tools: [Read, Write, Edit, Glob, Grep, Bash, Task, ToolSearch, mcp__playwright__browser_navigate, mcp__playwright__browser_click, mcp__playwright__browser_type, mcp__playwright__browser_snapshot, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_fill_form, mcp__playwright__browser_select_option, mcp__playwright__browser_hover, mcp__playwright__browser_wait_for, mcp__playwright__browser_close, mcp__playwright__browser_evaluate, mcp__playwright__browser_run_code, mcp__playwright__browser_press_key, mcp__playwright__browser_resize, mcp__atlassian__searchJiraIssuesUsingJql, mcp__atlassian__getJiraIssue, mcp__atlassian__search, mcp__testomatio__suites_create, mcp__testomatio__tests_create, mcp__testomatio__suites_get, mcp__testomatio__tests_get, mcp__testomatio__suites_search, mcp__testomatio__tests_search, mcp__testomatio__suites_list, mcp__testomatio__tests_update, mcp__testomatio__labels_list, mcp__testomatio__suites_issues_list, mcp__testomatio__tests_issues_list]
---

# Workflow de creation de test E2E BO automatise

L'utilisateur a invoque ce workflow avec : $ARGUMENTS

## Regles generales

- **Mode acceptEdits requis** : AVANT toute action, afficher ce message a l'utilisateur et attendre sa confirmation :
  > **Passe en mode acceptEdits (SHIFT+TAB)** pour que le workflow puisse modifier les fichiers en autonomie.
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

### 2.0 : Rafraichir les cookies d'auth (pour les scripts CLI des steps 5-6)

Executer le script d'extraction des cookies Testomat/Jira depuis le Chrome de l'utilisateur :

```bash
NODE_PATH=./node_modules npx tsx ~/.claude/scripts/refresh-session-cookies.ts
```

Le script est **transparent** (aucune popup, aucun onglet visible) grace a `PLAYWRIGHT_MCP_EXTENSION_TOKEN` dans `~/.zshrc`.
Il skip automatiquement si les cookies ont moins de 7 jours.

Prerequis : Chrome ouvert avec sessions actives sur Testomat et Jira.

### 2.1 : Explorer la page BO concernee

**Outil obligatoire : Playwright MCP** (`mcp__playwright__*`). Ne PAS utiliser Chrome DevTools MCP pour l'exploration QA3 (instance Chrome separee, pas de session partagee).

**Procedure d'authentification QA3 (Playwright MCP)** :

1. Naviguer vers la page QA3 cible
2. La page redirige vers le formulaire de login
3. Cliquer sur le bouton "Se connecter avec Google" → redirige vers Keycloak
4. Les credentials sont **pre-remplis** automatiquement (email + mot de passe depuis le `.env`)
5. Cliquer sur le bouton "Se connecter" → redirige vers la page QA3 authentifiee
6. Attendre le chargement complet puis prendre un snapshot

- URLs de base :
  - **BO Pro** : `https://app-qa3.engineering.shopopop.com`
  - **BO Interne** : `https://backoffice-qa3.engineering.shopopop.com`
- Identifier les elements UI a tester (de haut en bas, de gauche a droite)
- **Prendre un snapshot** pour reference
- **Verifier les IDs DOM reels** : utiliser `browser_evaluate` pour extraire les IDs des elements interactifs (tabs, selects, etc.) — ne pas deviner les IDs
- **Verifier le format des champs** : noter le format affiche (espaces, prefixes, separateurs) pour savoir quel format utiliser dans `fill()` et les assertions

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

### 3.3 : Determiner si `test.fixme()` est necessaire

Verifier le statut du ticket Jira (via `statusCategory`) :

- **Si `statusCategory` = `done` ET `name` = `Terminé(e)`** → ticket deploye, pas de `test.fixme()`
- **Tout autre statut** (y compris `Ready to deploy`) → ajouter `test.fixme()` dans le fichier Playwright (voir Step 7)

Cette mecanique permet a `/check-todos` de scanner les `test.fixme()` avec leur commentaire Jira et de signaler quand le ticket passe en Done → le `test.fixme()` peut alors etre retire.

---

## Step 4 : Creation sur Testomat

### 4.1 : Creer la suite

Utiliser l'API Testomat MCP (`suites_create`).

- **Projet Testomat** : `back-office-c96f6`
- **Nom de la suite** : `CLAUDE-{JIRA-ID} - {Titre du ticket Jira}`
  - Ex : `CLAUDE-BO-3468 - Recalculer la distance suite a la modif d'un drive`
- **Description** : le "En tant que / Je veux / Afin de" extrait de Jira
- **Organisation** : placer dans le bon dossier (`BO-Pro/` ou `BO-Interne/`). **Toujours verifier si un sous-dossier existant correspond** (ex: "Comptes pro", "Livraisons") via `suites_search` (par titre) ou `suites_list` avec `file_type=folder` (arbre complet des dossiers) avant d'en creer un nouveau. Utiliser le `parent_id` du dossier existant

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

**Separation Requirements / Steps** : la navigation vers la page et le setup des donnees sont des **Requirements** (prerequis) sauf si l'action de naviguer EST l'action testee (ex: acceder au detail pour verifier un contenu). Le Step commence a l'**action minimale** qui declenche le resultat attendu. Chaque prerequis sur sa propre ligne.

### 4.3 : Extraire les tags Testomat

Apres creation, noter :

- **Tag suite** : `@S<hash>` (ex: `@Sa77fe43b`)
- **Tag(s) test** : `@T<hash>` (ex: `@T54097eea`)

---

## Steps 5-6 : Liens Testomat ↔ Jira

### Cas 1 : Ajout a une suite EXISTANTE deja liee

Quand on ajoute un test a une suite deja liee a un ticket Jira, le test herite **automatiquement** du lien Jira. Dans ce cas, ne PAS re-executer les scripts. Verifier uniquement :

1. **Test heritant du lien** : appeler `tests_issues_list` avec le `test_id` du test cree et verifier qu'un item avec le bon `jira_id` (`BO-XXXX` ou `BACK-XXXX`) est present. En MCP v2, les liens Jira ne sont plus inclus dans le retour de `tests_get`/`suites_get` — ils sont accessibles via les tools dedies `tests_issues_list` (verifie l'heritage sur le test) ou `suites_issues_list` (verifie le lien sur la suite parente)
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
- Causes frequentes : cookies expires (relancer `refresh-session-cookies.ts --force`), Testomat single session (user deja connecte), locator Testomat change
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
# Chercher les fichiers existants pour ce ticket (find ne plante pas en zsh si aucun match)
find tests -type f \( -name "BACK-4619*" -o -name "BO-XXXX*" \) 2>/dev/null
```

#### Regles de nommage `.claude` et `//review` pour les fichiers existants

Quand on ajoute des tests a un **fichier `.spec.ts` deja actif en CI** (pas `.claude`), deux cas :

1. **Tests existants modifies** (refactoring, changement de locator, restructuration beforeEach...) → **renommer** le fichier en `.spec.claude.ts`. Tout le fichier doit etre review avant de repasser en CI.
2. **Tests existants intacts, nouveaux tests ajoutes** → **garder** le fichier en `.spec.ts` (le test actif continue de tourner en CI). Marquer chaque **nouveau** test avec `test.fixme` **inline dans la declaration** du test, pas a l'interieur du body. Cela permet a Playwright de skip le test sans commencer a l'executer :

```typescript
// CORRECT — skip immediat, aucune execution
test.fixme('Nom du test @T{hash}', async ({ page }) => { //review {JIRA-ID}

// INCORRECT — commence l'execution puis s'arrete
test('Nom du test @T{hash}', async ({ page }) => {
  test.fixme(); //review {JIRA-ID}
```

Le test existant ne doit PAS avoir de `test.fixme()`.

Le commentaire `//review` est distinct de `//BO-XXXX` (ticket pas deploye). Il signale un test en attente de review utilisateur. La commande `/check-todos` les traite separement.

### 7.1 : Nommage du fichier (si nouveau)

```
{JIRA-ID}-{Interne|Pro}-{KeywordsFeature}.spec.claude.ts
```

- Ex : `BO-3468-Interne-Recalculdistancemodifdrive.spec.claude.ts`
- Si le ticket Jira est Done/MEP → `.specdraft.claude.ts` au lieu de `.spec.claude.ts` (rare)
- Placement dans le bon dossier : `tests/BO_Interne/` ou `tests/BO_Pro/`. **Toujours verifier si un sous-dossier existant correspond** au theme du test (ex: `Livraisons/`, `Comptes_Pro/`, `Authentification/`) avant d'en creer un nouveau

### 7.2 : Structure du fichier

```typescript
import { testInterne as test, expect } from '@fixtures/auth.fixture';
// ou testPro as test pour BO Pro

import { createDeliveryAPI, buildAndGotoDeliveryURL } from '@utils/Helpers/createDeliveryAPI.helpers';
// Imports POM necessaires
import { InternalDeliveryDetails } from '@pages/BO Interne/Livraisons/...';

// Tag suite Testomat dans le describe
// .fixme uniquement si ticket Jira PAS Done (voir Step 3.3)
// //review {JIRA-ID} TOUJOURS present sur les .spec.claude.ts (en attente de review)
test.describe.fixme('{Nom identique a la suite Testomat} @S{hash}', () => { //review {JIRA-ID}
// OU si ticket Done :
// test.describe('{Nom identique a la suite Testomat} @S{hash}', () => { //review {JIRA-ID}
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

**Sans beforeEach** (inline dans la declaration) :

```typescript
// Si ticket PAS Done :
test.describe.fixme('{Nom de la suite} @S{hash}', () => { //review {JIRA-ID}
// Si ticket Done :
test.describe('{Nom de la suite} @S{hash}', () => { //review {JIRA-ID}

  test('{Nom du test} @T{hash}', async ({ page }) => {
    // Actions...
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
- **Commentaires par bloc logique (en anglais)** : regrouper les lignes de code par intention UI et les preceder d'un commentaire ("Open incident drawer and select category", "Submit and confirm", "Check tips remain unchanged"). Sauts de ligne entre chaque bloc pour aerer. Le commentaire decrit l'action utilisateur, pas le code
- **Noms identiques** : le describe = nom de la suite Testomat, le test = nom du test Testomat
- **`//review {JIRA-ID}` sur TOUT fichier `.spec.claude.ts`** : toujours present sur la ligne du `test.describe`, inline apres l'accolade ouvrante. Signale a `/check-todos` que le fichier est en attente de review. Retire apres validation par l'utilisateur (le fichier est alors renomme en `.spec.ts`)
- **`.fixme` si ticket pas Done** : `test.describe.fixme(...)` pour skipper tous les tests du describe. Retire quand le ticket passe en `Terminé(e)`, independamment de la review
- **Combiner les deux** : `test.describe.fixme('{Nom} @S{hash}', () => { //review {JIRA-ID}` — le `.fixme` et le `//review` sont independants et se retirent separement
- **`//review` pour ajout a un fichier `.spec.ts` existant** : meme principe mais au niveau de chaque `test.fixme(...)` individuel, pas du describe (voir 7.0)

**Post-validation (apres review utilisateur)** : 3 actions a realiser quand l'utilisateur valide un test

1. **Dans le fichier `.spec.claude.ts`** : retirer `//review {JIRA-ID}` du describe (garder `//JIRA-ID` seul si `.fixme` est encore present pour `/check-todos`), retirer le prefixe `CLAUDE-` du nom de la suite dans le describe
2. **Sur Testomat** : renommer la suite via API REST (format JSON:API) :
   ```bash
   TESTOMATIO_KEY="$(grep TESTOMATIO /path/to/.env | head -1 | cut -d= -f2 | tr -d "'")"
   JWT=$(curl -s -X POST "https://app.testomat.io/api/login" \
     -H "Content-Type: application/json" \
     -d "{\"api_token\": \"$TESTOMATIO_KEY\"}" | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")
   python3 -c "import json; print(json.dumps({'data':{'type':'suite','id':'SUITE_ID','attributes':{'title':'NOUVEAU_TITRE'}}}))" | \
   curl -s -X PUT "https://app.testomat.io/api/back-office-c96f6/suites/SUITE_ID" \
     -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" -d @-
   # Supprimer une suite :
   curl -s -X DELETE "https://app.testomat.io/api/back-office-c96f6/suites/SUITE_ID" \
     -H "Authorization: Bearer $JWT"
   ```
3. **Renommage fichier** : le fichier passe de `.spec.claude.ts` a `.spec.ts` des que la review est validee. Le `.claude` signifie "pas encore review", il est independant du `.fixme` (ticket pas deploye). Un fichier `.spec.ts` avec `test.describe.fixme` est normal — il sera en CI mais skipped jusqu'au deploiement

**Arrange (beforeEach) : creer ses donnees, minimum d'etapes**

- **TOUJOURS creer ses propres donnees** — JAMAIS dependre de donnees existantes en base (non reproductible, fragile)
- Creer la livraison via `createDeliveryAPI()` puis **seulement** les modifications DB strictement necessaires au scenario
- **Tests qui modifient un etat utilisateur** (desactiver, bannir, etc.) : `copyRow('shop_user', users.CTP.id)` + `TestDataRegistry.registerUser(newUserId)` pour creer un user jetable. Evite les race conditions entre tests paralleles et le `serial`
- **JAMAIS de `test.describe.configure({ mode: 'serial' })` entre tests** : chaque test doit etre independant. Si deux tests semblent dependants (ex: desactiver puis reactiver), creer un fichier par ticket avec son propre setup DB
- Ne pas empiler les etapes DB inutilement : si `insertRows('errand_history', ...)` suffit, ne pas ajouter `waitForErrandInES` + `updateErrandTable` en plus
- **`updateErrandTable` : TOUJOURS inclure `updated_at`** — c'est la condition de trigger de la reindexation ES de l'errand. Sans ce champ, les pages ES-powered (done-deliveries, listes filtrees) ne voient pas les valeurs modifiees. A appliquer meme si le test ne depend pas d'ES, pour uniformiser les call sites. Pattern :

  ```typescript
  const dateStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
  await updateErrandTable(deliveryId, [
    { field: 'status', value: 8 },
    { field: 'delivery_man_id', value: users.CTP.id },
    { field: 'updated_at', value: dateStr },
  ]);
  ```

- **Question a se poser** : quel est le minimum pour que la page affiche ce qu'on veut tester ?
- Le `selectTab()` / navigation vers l'onglet fait partie du beforeEach si TOUS les tests du describe en ont besoin

**Assertions**

- **1 assertion par test** (2 max si tres similaires)
- **`toBeVisible()` sur un locator precis** (counter `//sup`, lien avec `@href`) plutot que compter des elements ou naviguer
- Ne pas comparer un compteur avec un `.count()` d'elements — faux positif si les deux sont a 0
- Lien de detail : verifier la presence du `href` exact (`/delivery/${deliveryId}`) suffit, pas besoin de cliquer + verifier l'URL d'arrivee
- **Assertions sur valeurs fixes** : toujours asserter sur des `const` declarees au niveau du `describe` (valeur testdata fixe ou faker figee dans une variable). Ne jamais asserter directement sur un getter ou une source qui pourrait retourner une valeur differente a chaque appel
- **Apres save** : toaster de succes + `page.reload()` + assertions sur les valeurs = pattern le plus robuste (verifie la persistance serveur, pas juste le state front)
- Privilegier les assertions web-first (`toHaveValue`, `not.toHaveValue`) plutot que capturer une valeur puis comparer en memoire
- `not.toHaveValue(initial)` est preferable a capturer la nouvelle valeur quand on teste un increment
- **`toHaveAttribute` : JAMAIS d'asymmetric matcher** (`expect.stringContaining`, `expect.stringMatching`) — Playwright accepte uniquement `string | RegExp`. Avec un asymmetric matcher, l'evaluation foire silencieusement et le test passe quoi qu'il arrive (faux positif). Pour egalite exacte → string brute (`toHaveAttribute('href', '/deliverers/36')`) ; pour pattern → RegExp (`toHaveAttribute('href', /\/deliverers\/\d+/)`). Meme regle pour `toHaveText`, `toHaveValue` : si l'assertion semble passer "trop facilement", grep les asymmetric matchers
- **`.all()` sur un locator** : toujours `first().waitFor()` avant `.all()` pour garantir que les resultats sont charges. Sinon `.all()` retourne `[]`, la boucle s'execute 0 fois, le test passe sans rien verifier
- **Test vert ≠ test valide** : verifier que les assertions s'executent reellement (console.log, --headed, ou count des assertions)

**Donnees**

- **Pas de donnees en dur** : utiliser `@testdata/` (`generateOrderInformation()`, drives, users) — JAMAIS de valeurs hardcodees dans les assertions. Appeler `generateOrderInformation()` **une fois par test** (stocker dans une const locale) pour obtenir des valeurs fraiches — evite le rate-limit bo-api sur la reference (1 call / 30s par reference)
- **`testdata/` = fonctions uniquement, JAMAIS de constantes avec faker** : tout fichier dans `testdata/` qui genere de l'aleatoire doit exposer une **fonction** (`generateOrderInformation()`, `newRecipient()`). Raison : un `export const X = faker.X()` est evalue **une seule fois au chargement du module** → toutes les invocations d'un meme worker/shard partagent la meme valeur → collisions (rate limit backend, duplicates DB, etc.). Le JSON statique (`drives.json`, `users.json`) est ok car les valeurs sont partagees volontairement
- **Centraliser les donnees hors des tests** : ne pas dupliquer un faker deja realise dans testData, autant l'appeler directement
- **Faker pour les champs texte libre** : `faker.string.alphanumeric(25)` plutot qu'une string hardcodee (`'Test automatise E2E'`)
- **Faker email = `exampleEmail()` obligatoire** : toujours `faker.internet.exampleEmail()` (domaines safe : example.com/org/net), JAMAIS `faker.internet.email()` (genere yahoo.fr, hotmail.com → hard bounces Braze en prod)
- **Choix multiples = `getRandomWithIndex()`** : quand plusieurs valeurs sont possibles pour un meme champ (raisons, types, statuts), les stocker en `readonly string[]` dans le POM et utiliser `getRandomWithIndex()` dans le test. Acces direct par index avec commentaire si le test a besoin d'une valeur specifique
- Pas de donnees en dur non plus dans les descriptions Testomat

**Locators et actions**

- **Priorite de selection XPath** (du plus resilient au plus fragile) :
  1. **Attributs robustes** — `@data-testid`, `@data-transaction-name`, `@id`, `@name`, `@value`, `@type`, `@role`, `@aria-label`, `@title` : stables par contrat, peu modifies
  2. **Texte visible** — `text()` ou `contains(.,'texte')` : resilient aux changements DOM/CSS tant que le libelle UI ne change pas
  3. **`@class`** : **dernier recours uniquement**. Les classes CSS changent souvent (refactoring, design system Ant Design). A n'utiliser que si rien d'autre ne distingue l'element
- **Strategie de scoping (minimal-first, puis etendre)** : commencer par le locator le plus court possible cible directement sur l'element. Si non unique, etendre au plus proche :
  1. Ajouter un filtre sur l'element lui-meme (attribut supplementaire, index `[N]`, `text()`)
  2. Etendre aux siblings les plus proches : `preceding-sibling::`, `following-sibling::`
  3. Seulement si necessaire, remonter aux parents : `parent::`, `ancestor::`
  4. En dernier, descendre dans un conteneur : `ancestor::X//descendant::Y`
- **Combiner plutot qu'empiler** : `//span[text()='${label}']/following::span[1]` est preferable a `//span[contains(@class, 'ant-typography-secondary') and text()='${label}']/parent::div/following-sibling::div/span` — la classe n'apporte rien si le texte suffit, et la navigation DOM intermediaire est remplacee par un index
- **Index `[N]`** : uniquement dans un contexte **pre-filtre** (sibling, parent cible, ou sous-arbre scoped). Exemples OK : `//div[@id='block']/span[2]`, `//label[text()='Nom']/following-sibling::input[1]`. **A eviter** : index sur tout le DOM sans prefiltre (`//label[3]`, `//button[2]`) → casse au moindre ajout/reordonnancement d'element ailleurs sur la page
- **Fonctions XPath avancees** (pour les locators difficiles a cibler) :
  - `last()` : cibler le dernier element (`//tr[last()]`, `//span[last()-1]`)
  - `not()` : exclure des elements (`//input[not(@disabled)]`, `//div[not(contains(@class,'hidden'))]`)
  - `starts-with()` : match partiel plus strict que `contains()` (`//div[starts-with(@id,'delivery-')]`)
  - `|` : combiner plusieurs chemins en un seul locator (`//h2 | //span[@role='alert']`)
- **XPath exclusivement** pour les locators
- **Un seul XPath complet** plutot que des locators chaines (`.locator().locator()`) : plus lisible, copiable dans DevTools, erreurs Playwright plus claires. Si un XPath de base est reutilise, l'extraire en methode privee string (`private tabXPath()`) et composer via template literal
- **`.//` dans `.locator()` = piege** : Playwright auto-detecte XPath seulement si le selecteur commence par `//` ou `(//`. `.//` est interprete comme CSS → prefixer `xpath=.//`
- **`contains(.,'texte')` plutot que `./span[text()='texte']`** : plus resilient aux changements DOM. `.` = textContent complet (noeud + descendants), `text()` = texte direct du noeud uniquement
- **Texte lisible dans les XPath** : garder le texte reel tel qu'affiche dans l'UI. Si un caractere special empeche l'usage de single quotes, basculer sur double quotes → `contains(.,"Déclarer l'incident")`. Jamais d'escape unicode (`\u2019`)
- **Ant Design radio/checkbox** : cibler `//input[@value='...']/ancestor::label`. Radio → `.click()` suffit, checkbox → `.check()`/`.uncheck()` (idempotent)
- **Ant Design dropdown (Select)** : les options sont rendues dans un portal detache (bas du `<body>`), pas dans le combobox parent. Cibler `ant-select-item-option-content` avec `contains(., ...)`
- **Explorer le DOM avant d'ecrire le locator** : ne pas deviner le composant UI (Select vs radio group, input vs span). Verifier via `browser_evaluate` ou snapshot MCP
- **Pas de waitForTimeout** — utiliser des waits explicites
- **Pas de `clear()` avant `fill()`** : `fill()` vide deja le champ automatiquement
- `buildAndGotoDeliveryURL` inclut deja Promise.race + retry → pas d'assertions supplementaires

**Testomat**

- Ecrire comme un testeur manuel (actions UI : "Acceder a", "Cliquer sur", "Saisir" — JAMAIS "Verifier", "Consulter")
- **Pas d'action sans expected result** : chaque action doit avoir un resultat attendu. La derniere action avant l'assertion doit etre representative de la feature testee — si trop generique seule (ex: "Sauvegarder"), combiner avec l'action precedente (ex: "cocher push + sauvegarder")
- Utiliser "noter" pour indiquer qu'une donnee doit etre memorisee pour comparaison ulterieure
- Ne jamais omettre les contraintes metier dans les descriptions
- 1 test par suite quand possible

**POM**

- **Ajouter dans le POM existant** (ne pas creer de nouveau fichier POM sauf si la page n'en a pas)
- **Ordre des methodes** : suivre l'ordre d'apparence sur la page (de haut en bas, gauche a droite)
- S'inspirer des POM existants pour le style des locators, creer de nouveaux XPath via snapshot MCP quand aucun pattern existant ne correspond
- **Nommer par l'action utilisateur**, pas par la structure DOM (`checkPush()` au lieu de `pushRadioLabel()`)
- **Commentaires POM (en anglais)** : un commentaire par methode ou groupe de methodes liees (ex: clic dropdown + selection option). Un seul commentaire chapeau pour un ensemble de `readonly` qui concernent le meme champ/choix — les valeurs parlent d'elles-memes, pas besoin de les detailler individuellement
- **Une ligne par locator** : `return this.page.locator(`//span[text()='${label}']`);` sur une seule ligne. Le multiligne avec trailing comma ne se justifie que si la ligne depasse ~120 caracteres
- **Pas de dead code** : uniquement les locators/methodes utilises par les tests. Apres toute modification d'un POM, verifier qu'il ne reste pas de code inutilise
- **Toasters de succes** : utiliser `SuccessMessages` centralise (`@pages/BO_Both/SuccessMessages`) — ne pas creer de `successToaster()` dans chaque POM
- **Unicite obligatoire** : tout locator doit matcher exactement 1 element dans le DOM (1 of 1). Verifier en Step 2 via `browser_evaluate` (Playwright MCP) avant de l'ajouter au POM
- **Pas de parametre generique inutile** : si un locator n'a qu'un seul usage concret, signature simple sans parametre

---

## Step 8 : Verification et debug

**Condition** : cette etape ne s'execute QUE si le ticket Jira est en Done (pas de `test.fixme()`). Si le ticket n'est pas Done, les tests contiennent `test.fixme()` et sont donc skip par Playwright — passer directement au Step 9.

### 8.1 : Executer les tests

Lancer les tests de la suite creee/modifiee :

```bash
npm run test:draft -- --grep "@Sc{hash}"
```

- Utiliser le tag `@Sc{hash}` de la suite pour cibler TOUS les tests (nouveaux + existants modifies)
- **JAMAIS** `npx playwright test` directement (voir feedback `always-use-draft-scripts`)

### 8.2 : Analyser les erreurs (si echec)

Si un ou plusieurs tests echouent, invoquer la commande `/debug-e2e-bo index` pour analyser le rapport Playwright local (genere dans `E2E_BO/playwright-report/`).

La commande `/debug-e2e-bo` contient deja toutes les instructions de debug (lecture du rapport, traces, screenshots). Suivre ses recommendations.

### 8.3 : Corriger et reiterer

1. Corriger les fichiers (test `.spec.claude.ts` et/ou POM) selon l'analyse
2. Relancer `npm run test:draft -- --grep "@Sc{hash}"`
3. Si echec → retour au 8.2
4. Si succes (tous les tests passent) → passer au Step 9

**Regle** : ne pas iterer plus de 5 fois. Si apres 5 tentatives les tests ne passent toujours pas, signaler le blocage a l'utilisateur avec le detail des erreurs restantes, puis continuer vers les steps 9 et 10 (sauvegarde + cleanup) pour que le workflow se termine proprement.

---

## Step 8bis : Lint Playwright et TypeScript check

**Condition** : uniquement si le Step 8 est termine avec succes (tous les tests passent).

Executer le lint (inclut eslint-plugin-playwright : bonnes pratiques Playwright) et le check TypeScript :

```bash
# Lint Playwright + TS sur le fichier de test
npx eslint "tests/.../{fichier}.spec.claude.ts"

# TypeScript check global
npx tsc --noEmit
```

- **Si erreurs** : corriger (imports inutilises, assertions manquantes, anti-patterns Playwright, etc.)
- **Si clean** : passer au Step 9

---

## Step 9 : Sauvegarde pour review

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
4. **Noter les lecons apprises** dans DEUX endroits :
   - **Memoire** (`~/.claude/projects/-Users-jean-michel-Documents-qa-E2E-tests/memory/`) pour le contexte inter-sessions
   - **Ce fichier command** (sections 4.2, 7.3) pour que les regles soient appliquees des la prochaine invocation du workflow
5. **Supprimer** la sauvegarde des fichiers reviews
6. **Conserver** les sauvegardes des fichiers pas encore reviews

---

## Step 10 : Desactiver caffeinate

```bash
kill {PID_CAFFEINATE}
```

---

## Reference rapide des outils

| Step | Outil principal | Fallback |
|---|---|---|
| 2.0 (Auth cookies) | Script CLI `refresh-session-cookies.ts` | `--force` si cookies expires |
| 2.1 (UI exploration) | `mcp__playwright__*` | Env local `localhost:3000` hors QA3 |
| 3 (Jira) | `mcp__atlassian__*` (JQL) | Rovo Search |
| 4 (Testomat) | `mcp__testomatio__*` | - |
| 5 (Link suite-Jira) | Script CLI `link-suite-to-jira.ts` | Corriger le script |
| 6 (Testomat on Jira) | Script CLI `activate-testomat-on-jira.ts` | Corriger le script |
| 7 (Fichiers test) | Write/Edit tools | - |
| 8 (Verification) | `npm run test:draft` + `/debug-e2e-bo index` | Max 5 iterations |

## Conventions de nommage (resume)

| Element | Format | Exemple |
|---|---|---|
| Suite Testomat | `CLAUDE-{JIRA-ID} - {Titre}` | `CLAUDE-BO-3468 - Recalculer la distance...` |
| Fichier Playwright | `{JIRA-ID}-{App}-{Keywords}.spec.claude.ts` | `BO-3468-Interne-Recalculdistancemodifdrive.spec.claude.ts` |
| Describe | identique au nom de la suite Testomat | - |
| Test | identique au nom du test Testomat | - |
