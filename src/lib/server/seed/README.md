# Données factices (seed)

## `lucasDemoData.json`

Fichier de données factices pour l’utilisateur de démo **Lucas** (nutrition + sport, **90 jours**). Utilisé par `seed.js` pour générer :

- **Sport** : 39 séances sur 90 jours (J2=A, J4=B, J6=C, puis répétition chaque semaine jusqu’à J90). Les séances avec `dayIndex <= completedBeforeDayIndex` (10) sont marquées complétées.
- **Nutrition** : 90 jours avec 3 repas/jour (BREAKFAST, LUNCH, DINNER). Cycle de 7 jours de recettes (`recipeCycle`) ; recette 2 (saumon) exclue (allergie Lucas). Macros par position dans `mealMacros`.
- **Courses** : 13 listes (périodes 1–7, 8–14, …, 85–90). `itemsByPeriod[i]` pour les périodes personnalisées, sinon `defaultItems`.

### Structure

| Section      | Clé principale   | Description |
|-------------|------------------|-------------|
| `sport`     | `sessionDays`    | `{ dayIndex, sessionIndex }` (0=A, 1=B, 2=C). |
| `nutrition` | `recipeCycle`    | 7 jours × `{ BREAKFAST, LUNCH, DINNER }` = index recette (0–3). |
| `shopping`  | `periods` + `itemsByPeriod` / `defaultItems` | Périodes et ingrédients par liste. |

### Modifier les données

- **Sport** : ajouter/retirer des entrées dans `sessionDays`, ou changer `completedBeforeDayIndex`.
- **Nutrition** : modifier `recipeCycle` (7 jours) ou `mealMacros` (quantités/macros par repas).
- **Courses** : éditer `itemsByPeriod` (une entrée par période personnalisée) ou `defaultItems` (utilisé pour les périodes sans entrée dédiée).

Après modification, relancer : `node src/lib/server/seed.js` (après suppression des utilisateurs de démo au prochain run).
