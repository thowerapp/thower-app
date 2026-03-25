# Lot 6 — Liste de courses — Spécifications techniques

Document de référence : **THOWER — Spécifications techniques PWA · Février 2026**

## Flux métier (Lot 4 + Lot 6)

1. **Au démarrage** (inscription ou début de programme) : le planning repas est **pré-rempli** sur les 91 jours — chaque jour (NutritionDay) a des repas (Meal) avec recette et quantités calculées (ex. cycle de recettes, formules macros, coefficient famille). *Ex. démo Lucas : 90 jours, 3 repas/jour, cycle de 7 jours depuis lucasDemoData.json.*
2. **L’utilisateur peut modifier** ce planning : changer une recette, une quantité, déplacer ou dupliquer un repas (swap, duplication). Les modifications sont persistées (Meal / NutritionDay).
3. **La liste de courses** est **générée automatiquement** à partir de ce planning (période au choix : 3, 7, 10, 15 jours, etc.). Dès qu’un repas ou une recette est modifié, les listes dont la période couvre les jours concernés sont **régénérées** (MAJ auto).

Donc : **repas générés dès le départ → modifiables → liste de courses dérivée et mise à jour automatiquement.**

---

## Résumé des exigences (cahier des charges)

- **Générée automatiquement** depuis le planning repas (Lot 4).
- **Durée** : 7 jours par défaut, extensible au nombre de jours souhaité.
- **Tri** : par catégorie ou alphabétique (choix utilisateur, profil `shoppingListSortOrder`).
- **Cochage** en temps réel : élément coché → barré.
- **Report** : éléments non cochés reportés automatiquement à la prochaine liste.
- **Mise à jour** : si une recette ou une quantité est modifiée dans le planning, la liste se met à jour.
- **Quantités** : intègrent le coefficient famille (UserProfile.familyCoefficients).

---

## Modèles Prisma concernés

| Modèle | Rôle |
|--------|------|
| **User** | Propriétaire des listes et du profil (coefficient famille, tri). |
| **UserProfile** | `familyCoefficients` (Json), `shoppingListSortOrder` ('category' \| 'alphabetical'). |
| **NutritionDay** | Jours du programme (1–91) avec repas. |
| **Meal** | Repas d’un jour : `recipeId`, `quantityG` (quantité calculée, déjà avec coeff famille). |
| **Recipe** | Fiche recette (catalogue ou perso). |
| **RecipeIngredient** | Ingrédient d’une recette : `name`, `quantityG`, `unit`, `allergens`. |
| **ShoppingList** | Une liste : `userId`, `startDayIndex`, `endDayIndex`, `generatedAt`. |
| **ShoppingItem** | Ligne de liste : `ingredientName`, `category`, `totalQuantityG`, `unit`, `isChecked`, `isReported`. |

---

## Flux fonctionnel attendu

### 1. Génération d’une liste (période Jstart → Jend)

1. Récupérer les **NutritionDay** de l’utilisateur pour `dayIndex` dans `[startDayIndex .. endDayIndex]`.
2. Pour chaque jour, récupérer les **Meal** avec **Recipe** et **Recipe.ingredients**.
3. Pour chaque repas :
   - Pour chaque **RecipeIngredient** de la recette :
     - Calculer la quantité pour ce repas :  
       `quantité_ingr = (meal.quantityG / référence_recette_g) × ingredient.quantityG`  
       *(référence_recette_g : à définir — ex. portion de référence en grammes sur Recipe ou formule client).*
     - Agréger par `(ingredientName, category, unit)` : somme des `quantité_ingr`.
4. Appliquer le **tri** selon `UserProfile.shoppingListSortOrder` (catégorie ou alphabétique).
5. Créer **ShoppingList** (startDayIndex, endDayIndex) et autant de **ShoppingItem** que de lignes agrégées.
6. Gérer le **report** : au moment de la génération (ou à l’affichage), inclure les **ShoppingItem** non cochés (`isChecked: false`) de la liste précédente avec `isReported: true`, et les fusionner / réinclure dans la nouvelle liste selon la règle métier (report auto à la prochaine liste).

*Point à clarifier avec le client : formule exacte de passage de `Meal.quantityG` et portions de recette aux quantités ingrédients (voir « Points à clarifier »).*

### 2. Mise à jour quand le planning change

- Lorsqu’un **Meal** est créé / modifié / supprimé, ou qu’une **Recipe** ou **RecipeIngredient** change :
  - Soit **régénérer** les listes dont la période couvre les jours impactés.
  - Soit **invalider** (flag ou `generatedAt`) et régénérer à la prochaine consultation.
- Les items **reportés** (non cochés de la liste précédente) doivent être réinjectés dans la nouvelle liste (ou conservés selon la règle métier).

### 3. Cohérence avec le schéma actuel

- **ShoppingList** / **ShoppingItem** : le schéma permet déjà de stocker listes par période, ingrédients, catégorie, quantités, coché, report.
- **Recipe.referenceYieldG** (optionnel) : portion de référence en grammes pour le calcul des ingrédients. Si null, 100 g est utilisé.
- **RecipeIngredient.category** (optionnel) : catégorie pour le tri liste de courses (ex. Viandes, Légumes).

---

## Implémentation actuelle (état des lieux)

| Fonctionnalité | Statut |
|---------------|--------|
| Modèles **ShoppingList** / **ShoppingItem** | ✅ Présents (Prisma). |
| **UserProfile** : `shoppingListSortOrder`, `familyCoefficients` | ✅ Présents. |
| **Recipe.referenceYieldG**, **RecipeIngredient.category** | ✅ Ajoutés (schéma + seed). |
| Récupération « liste courante » (`getCurrentShoppingList`) | ✅ Existe. |
| Coché / décoché (`toggleShoppingItemChecked`) | ✅ Existe. |
| **Génération** liste depuis planning (`generateShoppingListFromPlanning`) | ✅ Implémentée : agrégation par ingrédient, tri (catégorie / alphabétique), report. |
| **Report** des non cochés à la prochaine liste | ✅ Intégré à la génération (liste précédente endDayIndex = startDayIndex - 1). |
| **Mise à jour** liste quand repas/recette change | ✅ `upsertMeal` et `updateRecipe` appellent la régénération des listes concernées. |
| Tri catégorie / alphabétique à la génération | ✅ Utilise `UserProfile.shoppingListSortOrder`. |

---

## Points à clarifier (alignement avec le cahier des charges)

1. **Formules macros et quantités** : `Meal.quantityG` est supposé déjà calculé (formules + coeff famille). Le scaling ingrédient = `(meal.quantityG / recipe.referenceYieldG) × ingredient.quantityG`.
2. **Report** : les articles non cochés de la liste dont la période se termine à `startDayIndex - 1` sont fusionnés dans la nouvelle liste avec `isReported: true`.
3. **Catégorie** : champ `RecipeIngredient.category` utilisé pour le tri « par catégorie » et reporté sur `ShoppingItem.category`.

---

## Lien Planning → Recettes → Liste de courses (résumé)

```
User (programStartDate, profile)
  → NutritionDay (dayIndex 1..91)
      → Meal (position, recipeId, quantityG)   ← quantité déjà calculée (formules + coeff famille)
          → Recipe (ingredients)
              → RecipeIngredient (name, quantityG, unit, allergens)
  → ShoppingList (startDayIndex, endDayIndex)
      → ShoppingItem (ingredientName, category, totalQuantityG, unit, isChecked, isReported)
          ↑ générés par agrégation des repas de la période + tri + report
```

Ce document sert de référence pour implémenter la **génération automatique** des listes depuis le planning et le **report** des éléments non cochés, en restant aligné avec le schéma Prisma et le Lot 6 des spécifications Thower.
