---
description: "Synthese quotidienne : tickets Jira, commits GitHub, runs et tests Testomat de la veille"
allowed-tools: [mcp__atlassian__searchJiraIssuesUsingJql, mcp__atlassian__getJiraIssue, mcp__testomatio__runs_list, Bash, Read]
---

# Daily - Synthese de la veille

## Objectif

Afficher dans le terminal une synthese structuree du travail de la veille, organisee par ticket Jira. Aucune action n'est attendue, uniquement de l'affichage. Toujours en francais.

## Constantes

- **Jira Cloud ID** : `93674ed8-babf-4447-b125-e6d2ac26406b`
- **Jira Account ID** (Jean-Michel DOLO) : `712020:9492414e-96ae-40fe-a401-4f618363c03d`
- **GitHub repo** : `Shopopop/qa-E2E-tests`
- **GitHub author** : `JMDShopopop`
- **Testomat project slug** : `back-office-c96f6`
- **Testomat user ID** : `30224`
- **Testomat API key** : lire `TESTOMATIO` depuis `/Users/jean-michel/Documents/qa-E2E-tests/E2E_BO/.env` (nettoyer les quotes `'` avec `tr -d "'"`)

## Anti-veille

Lancer `caffeinate -d &` en debut d'execution. Tuer le process (`kill <PID>`) une fois la synthese affichee.

## Regles d'execution Bash (IMPORTANT)

Ces regles evitent des echecs silencieux observes en pratique :

1. **Jamais de `cd`** : le harness Claude reset le cwd entre chaque appel Bash. Toujours utiliser des chemins absolus partout (`/tmp/daily-YYYY-MM-DD/...`, `/Users/jean-michel/...`).

2. **Jamais de Write/Edit** : cette commande est en lecture seule (affichage). Tout doit passer par `Bash` (heredoc inline). Ne pas creer de scripts intermediaires sur disque hors des fichiers JSON de cache temporaires.

3. **Glob zsh** : `ls /tmp/dir/td-*.json 2>/dev/null` echoue AVANT ls quand le glob est vide (`(eval): no matches found`). Utiliser au choix :
   - `find /tmp/dir -name "td-*.json" -maxdepth 1 2>/dev/null`
   - ou en debut de heredoc : `setopt nonomatch 2>/dev/null || shopt -s nullglob 2>/dev/null`

4. **Curl Testomat sequentiel** : ne PAS lancer 19 curls en parallele avec `&` + `wait`. Cloudflare devant Testomat peut rate-limiter ou retourner des erreurs silencieuses, et certains hooks d'environnement coupent la chaine. Faire une boucle for sequentielle — le delai cumule reste sous 10s pour ~20 appels.

5. **Python + URLs Cloudflare** : `urllib.request` defaut renvoie 403 Forbidden (UA `Python-urllib/X.Y` bloque). Soit rester sur curl, soit ajouter `User-Agent: Mozilla/5.0`. Pour le daily : utiliser curl pour l'auth/listing, Python uniquement pour le parsing local des JSON.

6. **Verifier la creation de fichiers** : apres une boucle qui produit N fichiers, verifier le compte avec `find ... | wc -l` et stopper si 0 (au lieu de continuer en silence).

## Execution

**Performance** : Maximiser le parallelisme entre sources independantes (Jira / GitHub / Testomat) via plusieurs appels Bash dans un meme tour. A l'interieur d'un appel Bash, sequentiel pour Testomat (cf. regle 4).

### Batch 1 — Requetes paralleles

Lancer en parallele :

1. **Jira — Tickets sortis de test** (MCP `searchJiraIssuesUsingJql`)

   ```
   assignee was 712020:9492414e-96ae-40fe-a401-4f618363c03d AND assignee != 712020:9492414e-96ae-40fe-a401-4f618363c03d AND assignee changed AFTER startOfDay(-1)
   ```

   Fields : `summary`, `status`, `assignee`, `issuetype`, `priority`, `parent`
   maxResults : 20

2. **Jira — Tickets commentes** (MCP `searchJiraIssuesUsingJql`)

   ```
   project in (BO, BACK) AND updated >= startOfDay(-1) AND updated < startOfDay() ORDER BY updated DESC
   ```

   Fields : `summary`, `status`, `comment`
   maxResults : 30

   Filtrer les commentaires dont `author.accountId` == mon ID et `created` dans la plage de la veille. Extraire le texte (pas l'ADF brut) : parcourir `[.. | .text? // empty] | join("")` puis tronquer a 100 chars.

   Si la reponse est trop volumineuse, utiliser `getJiraIssue` sur les tickets pertinents.

3. **GitHub — Commits sur main** (Bash `gh api`)

   ```bash
   gh api "repos/Shopopop/qa-E2E-tests/commits?sha=main&since=$(date -v-1d +%Y-%m-%dT00:00:00Z)&until=$(date +%Y-%m-%dT00:00:00Z)&author=JMDShopopop" --jq '.[] | "\(.sha[0:7]) \(.commit.message | split("\n")[0])"'
   ```

4. **Testomat — Runs** (MCP `runs_list`)

5. **Testomat — Tests et Suites** (Bash unique avec JWT)

   **Auth** : POST `https://app.testomat.io/api/login` avec `{"api_token": "<cle>"}` -> champ `jwt`. Stocker dans un fichier (`/tmp/daily-YYYY-MM-DD/jwt.txt`) pour eviter de re-auth a chaque appel.

   Paginer tests et suites **sequentiellement** dans un seul script Bash (cf. regle 4) :
   - Tests : GET `/api/back-office-c96f6/tests?limit=50&page={1..N}` — paginer jusqu'a page vide
   - Suites : GET `/api/back-office-c96f6/suites?limit=50&page={1..N}` — idem
   - Detail tests sans suite-id : boucle for sequentielle sur les IDs concernes, jamais en parallele avec `&`

### Batch 2 — Traitement

Apres reception de toutes les reponses, traiter et fusionner.

## Regles de traitement par source

### Jira

**Fusion en une seule liste "Tickets travailles"** : Combiner les tickets sortis de test (source 1) et les tickets commentes (source 2) dans une seule liste. Un ticket peut apparaitre dans les deux sources — le deduire par cle.

Pour chaque ticket unique :
- **Cle + titre** : toujours affiches
- **Assignee + statut** : affiches si le ticket est sorti de test (reassigne)
- **Commentaire** : affiche si un commentaire a ete ecrit hier (extrait max 100 chars)

### GitHub

**Dedup commits PR** : Les commits de merge PR (titre avec `(#NNN)`) et leurs commits source (meme titre sans `(#NNN)`) sont le meme sujet. N'afficher que le merge commit. Si un commit n'a pas de merge associe, l'afficher tel quel.

### Testomat — Runs

**Exclusion** : Ignorer les runs dont le titre est exactement "Playwright Automation" (schedule quotidien, aucun interet au daily).

Filtrer les runs dont `created-at` contient la date de la veille.

### Testomat — Tests et Suites

**Filtrage suites** :
1. Exclure les items dont `attributes.file-type` = `"folder"` (dossiers d'organisation, pas de vraies suites).
2. Une suite n'a d'interet que si elle a des tests modifies hier. Si aucun test CREATED ou UPDATED hier sous cette suite -> la masquer.

**Filtrage tests** : `attributes.created-at` ou `attributes.updated-at` contient la date de la veille.

**Regroupement par suite** : Les tests ne sont PAS affiches individuellement. Ils sont regroupes sous leur suite parente. Affichage :

```
  {suite titre}  (N tests modifies)
    - {titre test 1}
    - {titre test 2}
```

Si la suite elle-meme a ete creee hier :

```
  {suite titre}  (suite creee, N tests)
    - {titre test 1}
```

**Resolution de la suite parente** :

1. Champ `suite-id` dans `relationships.suite.data.id` du listing tests → correspondance dans le listing suites
2. Si `suite-id` est absent ou null : GET `/api/back-office-c96f6/tests/{id}` → `relationships.suite.data.id`, puis chercher le titre dans le listing suites (ou GET `/api/back-office-c96f6/suites/{suite-id}` si absent du listing)
3. Regrouper tous les appels detail dans un seul script Bash avec le meme JWT (boucle sequentielle, cf. regle 4)
4. **Note observee 2026-05-06** : le listing v2 `/tests?limit=50` retourne `relationships.suite.data` souvent absent → l'etape 2 (detail par test) est quasi systematique pour les tests crees par import suite. Prevoir le temps necessaire (~10s pour 20 tests).

Tests sans suite meme apres resolution : listes individuellement en fallback.

## Agregation par ticket Jira

**Principe** : 1 ticket Jira = 1 bloc au daily. Toutes les actions liees a un meme ticket sont agregees.

### Resolution des liens Jira

Pour rattacher un item Testomat (run, suite) a un ticket Jira :
1. **Nommage** (prioritaire, rapide) : regex `(BO|BACK)-\d+` dans le titre
2. **API detail** (fallback si pas de cle dans le titre) : GET `/api/back-office-c96f6/suites/{id}` -> `attributes.jira-issues[].jira_id`

Ne faire les appels detail que pour les items sans cle Jira dans le titre. Regrouper tous les appels dans un seul script Bash avec le meme JWT.

### Construction des blocs

**Etape 1** : Partir de la liste Jira "Tickets travailles" comme pivot.

**Etape 2** : Pour chaque ticket Jira, y rattacher :
- Les runs Testomat lies (par cle Jira dans le titre du run)
- Les suites/tests lies (par cle Jira dans le titre de la suite)

**Etape 3** : Les items Testomat NON rattaches a un ticket Jira sont affiches dans leurs propres sections residuelles.

### Tri des tickets par proximite thematique

Regrouper les tickets lies au meme sujet pour faciliter la presentation orale.

**Methode 1 — Epic parent** (prioritaire) : champ `parent` recupere dans la requete JQL. Les tickets partageant le meme parent Epic sont regroupes.

**Methode 2 — Mots communs** (fallback si pas d'Epic ou Epics differents) : Regrouper les tickets dont les titres partagent 2+ mots significatifs consecutifs. Retirer les prefixes entre crochets (`[BO-INT]`, `[TECH]`) et les stop words : `le, la, les, un, une, de, du, des, et, ou, en, au, aux, par, sur, pour, dans, avec, sans, son, ses, sa, ce, cette, qui, que, dont, est, sont, etre, avoir, faire, d'un, d'une, l'`.

Au sein de chaque groupe, trier par numero decroissant. Tickets isoles a la fin.

## Format de sortie

**Ne pas afficher les sections vides.** Ne jamais afficher de meta-commentaires sur le fonctionnement de la commande.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 DAILY — {jour de la semaine} {date du jour}
 Resume de la veille ({jour} {date veille})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## JIRA — Tickets travailles

  {cle}  {titre}
    -> {assignee actuel} | {statut}
    "extrait du commentaire..."
    Run : {titre run} — {X/Y passed}
    {N tests modifies}

{Autre groupe thematique :}

  {cle}  {titre}
    ...

## GITHUB — Commits sur main

  {sha}  {message}

## TESTOMAT — Tests & Suites (non rattaches)

  {titre de la suite}  (N tests modifies)
    - {titre test 1}
    - {titre test 2}

## TESTOMAT — Runs (non rattaches)

  {titre}  {STATUT}
    {passed}/{total} passed | {failed} failed | {skipped} skipped

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Details format ticket Jira :**
- Ligne 1 : cle + titre (toujours)
- Ligne 2 : `-> assignee | statut` (uniquement si sorti de test)
- Ligne 3 : `"extrait commentaire..."` (uniquement si commentaire ecrit hier)
- Ligne 4 : `Run : {titre} — {X/Y passed}` (uniquement si run rattache, hors Playwright Automation)
- Ligne 5+ : `{suite titre} (N tests)` puis liste des titres de tests (uniquement si tests/suites rattaches)

Chaque ligne est optionnelle. Un ticket peut n'avoir qu'une ligne (cle + titre) si c'est un commentaire seul sans run ni tests.

## Regles generales

- Toujours en francais
- Requetes independantes en parallele
- Si une source echoue : "Erreur de recuperation : {raison}" pour cette section, continuer les autres
- Ne proposer aucune action, uniquement afficher la synthese
- Ne pas afficher les donnees brutes des API
- `caffeinate -d &` en debut, `kill` en fin
