---
description: "Analyse un run GitHub Actions E2E_BO : logs, rapport Playwright, traces des tests fail/flaky, synthèse des défauts"
arg_description: "URL du run GitHub Actions OU 'index' pour analyser un rapport local déjà présent dans playwright-report/"
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Agent, mcp__playwright__browser_navigate, mcp__playwright__browser_click, mcp__playwright__browser_snapshot, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_evaluate, mcp__playwright__browser_close, mcp__playwright__browser_file_upload, mcp__playwright__browser_run_code
---

# Debug E2E_BO CI Run

Tu es un expert QA qui analyse les résultats d'un run CI E2E Playwright.

## Mode acceptEdits requis

AVANT toute action, afficher ce message a l'utilisateur et attendre sa confirmation :

> **Passe en mode acceptEdits (SHIFT+TAB)** pour que le workflow puisse modifier les fichiers en autonomie.

## Input

Argument reçu : `$ARGUMENTS`

**Deux modes d'utilisation :**

- **Mode CI** (argument = URL GitHub Actions) : analyse complète d'un run CI (étapes 1 → 8)
- **Mode local** (argument = `index`) : le rapport `index.html` est déjà présent dans `E2E_BO/playwright-report/`. **Sauter les étapes 1, 2 et 3** et commencer directement à l'étape 4. L'agent GitHub (étape 1-2) n'est pas lancé.

## Architecture d'exécution

**Deux outils complémentaires :**

- **Script CLI `trace-analyzer.ts`** : analyse des traces en parallèle (headless, ~10s pour N traces). Extrait actions, transitions filmstrip, screenshots, console. C'est le **moteur principal** de l'analyse.
- **Playwright MCP** : navigation dans le rapport HTML (catégorisation fail/flaky) et reproduction des bugs app sur QA3 (étape 5bis).
- **Agent GitHub** : analyse CI en background (jobs, logs failed, patterns infra). Utile surtout quand il y a des problèmes CI/infra ou pour identifier un shard précis.

**Pipeline d'exécution :**

```
┌─────────────────────┐  ┌──────────────────────────────────────────────┐
│ Agent GitHub (bg)    │  │ Contexte principal                           │
│ - gh run view        │  │ 1. Télécharge rapport                        │
│ - --log-failed       │  │ 2. Playwright MCP : catégorise fail/flaky    │
│ - patterns infra     │  │ 3. Script CLI : analyse TOUTES les traces    │
│                      │  │    en parallèle (actions + filmstrip +       │
│                      │  │    screenshots + console)                    │
│                      │  │ 4. Read screenshots → diagnostic             │
│                      │  │ 5. (optionnel) Playwright MCP : reproduction │
│                      │  │ 6. Cleanup                                   │
│                      │  │ 7. ⚠️ GATE : Bug app détectés ?              │
│                      │  │    → OUI : analyse code source (étape 7)     │
│                      │  │    → NON : passer à la synthèse              │
└──────────┬───────────┘  └──────────────────┬─────────────────────────┘
           │                                 │
           └────────────┬────────────────────┘
                        ▼
  ⚠️ ATTENDRE les deux avant de rédiger la synthèse
              Synthèse finale (étape 8)
```

## Étapes

### 0. Caffeinate

```bash
caffeinate -d &
```

Stocker le PID pour le kill en fin de workflow.

### 1-2. Agent GitHub en background (MODE CI UNIQUEMENT — skip si mode local)

Lancer un Agent en background qui fait :

```
Agent (background, type: general-purpose):
  - gh run view <RUN_ID> --repo Shopopop/qa-E2E-tests → lister jobs passed/failed, ratio
  - Si run en cours → gh run watch
  - gh run view <RUN_ID> --repo Shopopop/qa-E2E-tests --log-failed 2>&1 | head -300
  - Identifier patterns répétitifs (même erreur tous les shards = systémique)
  - Distinguer erreurs infra (artifact, cache, timeout CI) vs erreurs de test
  - Retourner : statut global, jobs failed, patterns identifiés
```

### 3. Télécharger le rapport Playwright (MODE CI UNIQUEMENT — skip si mode local)

```bash
gh run download <RUN_ID> --repo Shopopop/qa-E2E-tests -n playwright-report-merged -D /tmp/playwright-report-download
cp -rf /tmp/playwright-report-download/* /Users/jean-michel/Documents/qa-E2E-tests/E2E_BO/playwright-report/
rm -rf /tmp/playwright-report-download
```

Si l'artifact n'existe pas, le signaler et s'arrêter à l'analyse des logs.

### 4. Ouvrir le rapport et catégoriser les fail/flaky

```bash
pkill -f "serve.*playwright-report" 2>/dev/null
npx serve /Users/jean-michel/Documents/qa-E2E-tests/E2E_BO/playwright-report -p 9323 &
```

Naviguer vers `http://localhost:9323` avec Playwright MCP.

**Extraire la liste complète des fail/flaky** via `evaluate` :

```js
// Cliquer sur le tab Flaky (ou Failed), puis extraire
() => {
  const results = [];
  document.querySelectorAll('a[href*="testId"]').forEach(item => {
    const text = item.textContent?.trim();
    if (text && text.length > 10) results.push(text.substring(0, 150));
  });
  const traceLinks = [];
  document.querySelectorAll('a').forEach(a => {
    if (a.href && a.href.includes('.zip')) traceLinks.push(a.href);
  });
  return { testNames: results, traces: traceLinks };
}
```

**Catégoriser par erreur** : pour chaque test, ouvrir sa page dans le rapport et extraire le message d'erreur. Regrouper les tests qui ont la même erreur (même locator timeout, même assertion failed) → ce sont des "cas" à analyser.

**⚠️ IMPORTANT** : La catégorisation par erreur sert uniquement à regrouper les cas pour éviter d'analyser 10 fois la même chose. Le diagnostic réel vient TOUJOURS de l'analyse timeline (étape 5).

### 5. Analyse des traces — Script CLI parallèle (OBLIGATOIRE)

**⚠️ RÈGLE CRITIQUE** : Ne JAMAIS diagnostiquer un échec uniquement à partir du message d'erreur textuel. Un `waitForDistanceLoading timeout` peut être la CONSÉQUENCE d'une déconnexion KC (la page de login n'a pas de locator "distance"). Seule l'analyse de trace (actions + screenshots UI) montre la cause réelle.

#### Étape 1 — Extraire les chemins des traces

Depuis l'étape 4, on a les URLs de trace. En extraire les hash pour construire les chemins locaux :

```
URL: http://localhost:9323/data/<hash>.zip
Chemin local: /Users/jean-michel/Documents/qa-E2E-tests/E2E_BO/playwright-report/data/<hash>.zip
```

#### Étape 2 — Lancer le script CLI sur TOUTES les traces en parallèle

```bash
REPORT_DIR="/Users/jean-michel/Documents/qa-E2E-tests/E2E_BO/playwright-report/data"
NODE_PATH=/Users/jean-michel/Documents/qa-E2E-tests/E2E_BO/node_modules \
  npx tsx /Users/jean-michel/.claude/scripts/trace-analyzer.ts --parallel \
  "$REPORT_DIR/<hash1>.zip" \
  "$REPORT_DIR/<hash2>.zip" \
  "$REPORT_DIR/<hash3>.zip"
```

Le script produit pour chaque trace :

- **Actions panel** : liste complète des actions (méthode, locator, durée, hook/test)
- **Filmstrip transitions** : transitions d'actions visibles dans la filmstrip avec screenshots
- **Screenshot action failed** : capturé via le tab "Before" du trace viewer (état UI au début de l'action en échec)
- **Console** : entrées console avec détection automatique de `error=login_required` (déco KC)
- **Fichiers PNG** dans `/tmp/trace-cli-<hash>-*.png`

**Temps estimé** : ~10-15s pour N traces en parallèle (headless, pas de limite de contexte).

#### Étape 3 — Lire les screenshots clés avec Read

Pour chaque trace, lire :

1. Le **screenshot de l'action failed** (`/tmp/trace-cli-<hash>-FAILED-*.png`) — c'est le plus important
2. Les screenshots filmstrip des moments clés (auth, navigation page, moment du fail)

**⚠️ RÈGLE CRITIQUE — Début vs Fin d'action :**

Le script applique automatiquement cette règle :

- **Actions normales** : screenshot en **fin** d'action → UI stabilisée après l'action
- **Dernière action test (potentiellement failed)** : screenshot au **début** → UI telle que le test la voyait quand il a commencé à attendre. La zone de timeout (30s+) est vide dans la filmstrip.

**Grille de lecture des screenshots :**

- **Page de login KC ("Bonjour !")** apparaissant APRÈS une page applicative dans la séquence = **déconnexion KC mid-test**
- **Page blanche** = page en cours de chargement ou redirect
- **Page applicative avec contenu** = fonctionnement normal
- **Page d'erreur KC** ("Erreur inattendue") = erreur serveur Keycloak
- **Drawer/modal ouvert + timeout** = **bug app** (action qui ne complète pas)
- **Page applicative normale au début de l'action failed** = le test attend une condition qui ne se réalise pas (mismatch de valeur, élément absent, etc.) — ce n'est PAS une déco KC

**⚠️ PIÈGE FRÉQUENT** : L'iframe SSO (`silent-check-sso.html`) tourne régulièrement en arrière-plan et peut apparaître dans les miniatures sans que l'app soit déconnectée. Toujours vérifier **la séquence chronologique complète** : si la page applicative est visible au début de l'action failed, c'est un bug test/app, pas une déco.

#### Catégorisation du diagnostic

À la fin de chaque analyse de trace, catégoriser :

| Catégorie | Critère visuel dans la timeline |
|---|---|
| **Déco KC** | Page de login KC ("Bonjour !") apparaît APRÈS une page applicative |
| **Bug app** | Page applicative visible, action exécutée, mais résultat inattendu (texte pas mis à jour, modal bloquée, etc.) |
| **Timeout backend** | Page applicative visible mais un élément ne charge pas (spinner, données manquantes) |
| **Erreur auth initiale** | Page de login KC dès le début, Before Hooks échoue |
| **Bug test** | Le test fait une action incorrecte (mauvais locator, données de test invalides, condition non remplie) |

### 5bis. Reproduction des bugs app via Playwright MCP

Après l'analyse des traces, **uniquement pour les bugs app** (PAS les décos KC, PAS les timeouts infra) :

**Critères de sélection** — reproduire uniquement si :

- L'auth a réussi (beforeEach OK)
- La page s'est chargée correctement
- L'action UI s'est exécutée
- Mais le résultat est inattendu (erreur API, état UI incorrect, donnée manquante)

**Ne PAS reproduire** si l'échec est clairement lié à : SSO instable, timeout auth, env QA3 down, problème de test data.

**Procédure de reproduction :**

1. Se connecter à QA3 via Playwright MCP (naviguer vers l'URL du BO Interne/Pro, auth Keycloak)
2. Reproduire le scénario exact du test (mêmes étapes, mêmes données si possible)
3. **Capturer** : payloads API, réponses, erreurs console JS, état DOM, messages d'erreur UI
4. Prendre un screenshot si le bug est visuel
5. Tester les variantes si pertinent

**Résultat attendu** : Reproduit oui/non/intermittent, étapes exactes, réponse API/état UI, hypothèse cause racine.

#### Boîte à outils pour la reproduction

**Auth QA3 via Playwright MCP** :

1. Naviguer vers `https://backoffice-qa3.engineering.shopopop.com` (Interne) ou `https://app-qa3.engineering.shopopop.com` (Pro)
2. Cliquer "Se connecter avec Google" → les credentials Keycloak sont pré-remplis
3. Cliquer "Se connecter" → attendre la redirection vers la home page

**Créer une livraison via API** :

- `curl` avec credentials `.env` (PARTNER_ID, PARTNER_API_KEY, CF_ACCESS_*)
- Consulter `utils/API_Utils/payload.builder.ts` pour la structure
- `testdata/drives.json` pour les drives, `testdata/users.json` pour les destinataires
- Retourne 204, récupérer l'ID via `SELECT id FROM errand WHERE reference='...'`

**Modifier l'état d'une livraison** : `UPDATE errand SET status=X, delivery_man_id=Y WHERE id=Z`

**Intercepter les requêtes API dans le browser** :

```js
window.__apiLogs = [];
const origFetch = window.fetch;
window.fetch = async function(...args) {
  const response = await origFetch.apply(this, args);
  const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
  if (url.includes('deliver') || url.includes('event') || url.includes('errand')) {
    const clone = response.clone();
    try {
      const body = await clone.text();
      window.__apiLogs.push({ url, method: args[1]?.method || 'GET', status: response.status,
        body: body.substring(0, 2000),
        requestBody: typeof args[1]?.body === 'string' ? args[1].body.substring(0, 1000) : null });
    } catch(e) {}
  }
  return response;
};
```

**Nettoyer les données** : enregistrer les IDs dans `test-data-registry.json` (clés `errandstodelete`, `userstodelete`). **JAMAIS** y mettre des users existants (CTP, recipients des fixtures).

### 6. Cleanup

```bash
# Killer le serveur du rapport
pkill -f "serve.*playwright-report" 2>/dev/null

# Fermer le browser Playwright MCP (si utilisé pour étape 4 ou 5bis)
# → browser_close

# Supprimer les artefacts MCP (find -delete : ne plante pas en zsh si aucun match, contrairement a rm + glob)
rm -rf /Users/jean-michel/Documents/qa-E2E-tests/E2E_BO/.playwright-mcp/ 2>/dev/null
find /Users/jean-michel/Documents/qa-E2E-tests/E2E_BO -maxdepth 1 -name "*.png" -delete 2>/dev/null

# Supprimer les screenshots de trace CLI
find /tmp -maxdepth 1 \( -name "trace-cli-*.png" -o -name "trace-*.png" -o -name "bo*.png" -o -name "back*.png" \) -delete 2>/dev/null
```

### 7. Analyse du code source et identification de la cause racine

**Objectif** : dégrossir le travail du dev. **⛔ LECTURE SEULE sur les repos Shopopop.**

**⚠️ RÈGLE DE DÉCLENCHEMENT** : cette étape est **obligatoire** pour tout test catégorisé **Bug app** (y compris les problèmes de timing/refresh UI). Un bug app a toujours une explication dans le code, même si la reproduction n'est pas pertinente (ex : race condition visible uniquement sous latence CI). Ne pas attendre la reproduction pour analyser le code.

#### 7a. Mettre à jour les repos locaux

```bash
bash /Users/jean-michel/Documents/update-local-env.sh
```

#### 7b. Identifier le(s) repo(s) à analyser

- **Erreur UI** → `Backoffice` (`/Users/jean-michel/Documents/Backoffice`)
- **Erreur API** → `bo-api` / `delivery-api`
- Outils : `Read`, `Grep`, `Glob`, `git log`, `git blame`, `git diff`

#### 7c. Chercher les PRs récentes liées

```bash
gh pr list --repo Shopopop/<repo> --state merged --limit 20
gh pr view <PR_NUMBER> --repo Shopopop/<repo>
```

#### 7d. Exploiter les tickets Jira

Consulter via MCP Atlassian (`getJiraIssue`) pour comprendre le contexte métier.

#### 7e. Conclure avec un niveau de confiance

| Niveau | Quand l'utiliser |
|---|---|
| **Confirmé** | Ligne de code fautive identifiée, lien de causalité clair |
| **Probable** | Composant/endpoint ciblé, scénario cohérent, pas vérifié à 100% |
| **Hypothèse** | Piste basée sur le comportement observé, plusieurs causes possibles |

### 8. Synthèse

**⚠️ PRÉREQUIS NON NÉGOCIABLE** : ne rédiger la synthèse QUE quand TOUTES les analyses sont terminées :
- **Agent GitHub** : attendre sa complétion (notification automatique). Ne PAS commencer la synthèse en lisant son fichier output — attendre la notification.
- **Script CLI** : toutes les traces analysées et tous les screenshots clés lus via Read
- **Étape 7 (analyse code source)** : vérifier si des tests ont été catégorisés **Bug app**. Si oui, l'étape 7 est **obligatoire** et doit être complétée AVANT la synthèse. Ne pas confondre "timeout backend" (données qui ne chargent pas) avec "bug app" (action UI complète mais résultat inattendu) — les deux nécessitent des investigations différentes.

Si un test n'a pas été analysé en trace, le noter explicitement comme "trace non analysée" — ne JAMAIS deviner le diagnostic à partir du nom du test ou d'un diagnostic d'un run précédent.

Compiler les résultats de l'agent GitHub + les analyses de traces. Produire en français :

- **Statut global** : X passed / Y failed / Z flaky sur N total
- **Tableau des fail/flaky avec diagnostic timeline** :

| Test | Projet | Catégorie | Diagnostic timeline |
|---|---|---|---|
| BO-XXXX @Tyyy | pro/interne | Déco KC / Bug app / Timeout backend | Description visuelle de ce que montre la timeline |

- **Problèmes systémiques** si pattern répétitif
- **Bugs app reproduits** (5bis) : paragraphe Jira-ready avec titre, environnement, étapes, résultat observé/attendu, cause racine (niveau de confiance), tests E2E impactés
- **Actions recommandées** : classées par priorité
- **Incertitudes** : diagnostic non confirmé → indiquer clairement

### 9. Désactiver caffeinate

```bash
kill {PID_CAFFEINATE}
```

## Règles

- **ZÉRO HALLUCINATION** : chaque diagnostic doit être basé sur un fait vérifié (log, screenshot, trace, code). Ne jamais supposer ou extrapoler. Si l'information n'est pas disponible ou vérifiable, écrire "je ne sais pas" ou "trace non analysée". Ne JAMAIS réutiliser un diagnostic d'un run précédent sans vérifier la trace du run actuel — chaque run est indépendant, un même test peut échouer pour des raisons différentes. Débugger sur des hypothèses fait perdre du temps.
- **TIMELINE D'ABORD** : ne JAMAIS diagnostiquer un fail/flaky sans avoir analysé sa timeline de trace. Le message d'erreur seul est insuffisant — il montre la conséquence, pas la cause.
- **SYNTHÈSE APRÈS ANALYSE COMPLÈTE** : ne JAMAIS rédiger la synthèse tant que toutes les traces et l'agent GitHub ne sont pas terminés. Un diagnostic partiel est pire qu'un diagnostic absent.
- **REPOS SHOPOPOP EN LECTURE SEULE** : ne JAMAIS modifier, commiter, pusher, checkout, stash dans Backoffice, bo-api ou delivery-api.
- Toujours utiliser `npm run test:draft` si besoin de lancer un test, JAMAIS `npx playwright test`
- Ne pas modifier de code sans demander — cette commande est en lecture seule (analyse uniquement)
- Répondre en français
- Être concis dans la synthèse, vulgariser les erreurs techniques
