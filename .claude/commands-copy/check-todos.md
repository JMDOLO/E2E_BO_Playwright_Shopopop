---
description: "Scanne les TODO liés à des tickets Jira et les reviews en attente dans le code, vérifie leur statut"
allowed-tools: [Grep, Read, Edit, Bash, mcp__atlassian__getJiraIssue]
---

# Check TODOs liés à des tickets Jira

## Prérequis

AVANT toute action, afficher ce message à l'utilisateur et **STOPPER en attendant sa confirmation** (ne pas lancer le scan ni aucune autre étape) :

> **Prérequis avant de lancer le check :**
>
> 1. Passe en mode **acceptEdits** (SHIFT+TAB) pour que le workflow puisse modifier les fichiers en autonomie
> 2. Vérifie que tu es bien sur la branche **main** à jour (`git pull` si besoin)
>
> Confirme quand c'est bon.

Ne continuer qu'après la confirmation explicite de l'utilisateur.

## Objectif

Scanner le codebase E2E_BO pour trouver :

1. Les `test.fixme` avec un **ID Jira** (BO-XXXX, BACK-XXXX) → tickets pas encore déployés
2. Les `test.fixme` avec un commentaire **`//review`** → tests en attente de review utilisateur

Vérifier le statut de chaque ticket via l'API Atlassian et rapporter ceux qui sont prêts à être traités.

## Étapes

### 1. Scanner le code

Utiliser Grep pour trouver tous les commentaires contenant un ID Jira ou un marqueur review :

- **Tickets Jira** : Pattern `//.*\b(BO|BACK)-\d{4}\b`
- **Reviews en attente** : Pattern `//review`
- Scope : `*.ts` dans `E2E_BO/`
- Mode : `content` pour voir le contexte

### 2. Vérifier le statut de chaque ticket

Pour chaque ID Jira trouvé, appeler `mcp__atlassian__getJiraIssue` pour récupérer :

- Le statut du ticket (ex: Terminé(e), En cours, À faire)
- Le titre du ticket

### 3. Exécuter les tests des tickets Terminé(e)

**Condition** : exécuter `date` pour connaître le jour et l'heure. Vérifier que c'est un jour de semaine (lundi à vendredi) ET que l'heure est entre 8h et 20h heure de Paris (Europe/Paris) (QA3 disponible).

Si **hors créneau** → passer directement à l'étape 4 (colonne Test = ➖ pour tous).

Si **dans le créneau** → pour chaque TODO dont le ticket est au statut `Terminé(e)` :

1. **Désactiver le `.fixme`** : copier la ligne, retirer `.fixme` de la copie, commenter l'originale :

   ```typescript
   // test.describe.fixme(`BO-1234 - Ma suite @Sxxx`, () => { // raison  ← ORIGINAL commenté
   test.describe(`BO-1234 - Ma suite @Sxxx`, () => { // raison
   ```

   Même principe pour `test.fixme(...)` → `test(...)`.

   **Prérequis** : tous les `.fixme` du codebase doivent être sur la ligne de déclaration (`test.fixme(...)` ou `test.describe.fixme(...)`), jamais en `test.fixme()` isolé à l'intérieur d'un bloc.

2. **Lancer le test** : `npm run test:draft -- --grep "BO-XXXX"` (remplacer BO-XXXX par l'ID du ticket)
3. **Collecter le résultat** : pass ou fail
4. **Restaurer le `.fixme`** : supprimer la ligne ajoutée, décommenter l'originale — on ne retire le fixme définitivement qu'après validation par l'utilisateur

### 4. Rapport

Afficher **deux tableaux séparés** en français :

#### Tableau 1 : Tickets Jira (test.fixme avec ID Jira)

| Fichier | Ligne | TODO | Ticket | Statut | Action | Test |
|---------|-------|------|--------|--------|--------|------|

La colonne **Action** indique :

- ✅ **Prêt** : ticket au statut `Terminé(e)` (statusCategory = `done` ET name = `Terminé(e)`) → le TODO peut être traité maintenant
- ⏳ **En attente** : tout autre statut, y compris `Ready to deploy` (la branche n'est pas encore MEP dans la release)
- ❓ **Inconnu** : ticket introuvable ou erreur API

La colonne **Test** indique :

- 🟢 **Pass** : le test passe → le fixme peut être retiré en toute confiance
- 🔴 **Fail** : le test échoue → investiguer pourquoi (ticket terminé mais test KO)
- ➖ : non exécuté (hors créneau semaine 8h-20h, ou ticket pas encore Terminé(e))

**Attention** : seul le statut `Terminé(e)` signifie que le code est déployé. `Ready to deploy` = en attente de release, donc pas prêt.

Si des TODOs sont prêts et les tests passent, proposer de retirer définitivement les `test.fixme()`.

#### Tableau 2 : Reviews en attente (test.fixme avec //review)

| Fichier | Ligne | Test | Ticket |
|---------|-------|------|--------|

- **Fichier** : chemin du fichier
- **Ligne** : numéro de ligne
- **Test** : nom du test
- **Ticket** : ID Jira extrait du commentaire `//review {JIRA-ID}`

Ce tableau sert de rappel des reviews en attente. Proposer à l'utilisateur de lancer la review si des tests sont listés.
