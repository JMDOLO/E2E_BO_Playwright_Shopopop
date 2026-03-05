---
description: "Scanne les TODO liés à des tickets Jira dans le code et vérifie leur statut"
allowed-tools: [Grep, Read, mcp__atlassian__getJiraIssue]
---

# Check TODOs liés à des tickets Jira

## Objectif

Scanner le codebase E2E_BO pour trouver les commentaires contenant des IDs Jira (BO-XXXX, BACK-XXXX), vérifier le statut de chaque ticket via l'API Atlassian, et rapporter ceux qui sont prêts à être traités.

## Étapes

### 1. Scanner le code

Utiliser Grep pour trouver tous les commentaires contenant un ID Jira :

- Pattern : `//.*\b(BO|BACK)-\d{4}\b`
- Scope : `*.ts` dans `E2E_BO/`
- Mode : `content` pour voir le contexte

### 2. Vérifier le statut de chaque ticket

Pour chaque ID Jira trouvé, appeler `mcp__atlassian__getJiraIssue` pour récupérer :

- Le statut du ticket (ex: Terminé(e), En cours, À faire)
- Le titre du ticket

### 3. Rapport

Afficher un tableau récapitulatif en français :

| Fichier | Ligne | TODO | Ticket | Statut | Action |
|---------|-------|------|--------|--------|--------|

La colonne **Action** indique :

- ✅ **Prêt** : ticket terminé/mergé → le TODO peut être traité maintenant
- ⏳ **En attente** : ticket encore en cours ou à faire
- ❓ **Inconnu** : ticket introuvable ou erreur API

Si des TODOs sont prêts, proposer de les traiter immédiatement.
