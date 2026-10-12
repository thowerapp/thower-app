# 4. Nutrition

Le cadencier de 91 jours (`/user/nutrition/cadencier`), la fiche du jour, le choix d'un repas, le jeûne intermittent, la liste de courses et la bibliothèque de recettes. Tout est personnalisé : les portions découlent du profil (poids, % de masse grasse, activité, pain quotidien) et des allergies.

## Parcours

1. **Accueil nutrition** (`/user/nutrition`) : accès au cadencier, à la liste de courses, à la bibliothèque et à la création de recette.
2. **Cadencier** : une semaine parmi 13, le jour courant marqué « AUJ. ». Pour le jour choisi : les cibles (kcal, protéines, glucides, lipides, fibres) et 3 repas (petit-déjeuner ou collation à 8 h, déjeuner à 12 h 30, dîner à 19 h), chacun avec ses macros.
3. **Jeûne intermittent** : un interrupteur par jour. Activé, il masque le petit-déjeuner et répartit la journée sur le déjeuner et le dîner (50 % chacun au lieu de 40 %).
4. **Fiche du jour** (`/cadencier/[jour]`) : pour chaque repas, la description, le temps, les grammes planifiés, les allergènes, les ingrédients ajustés à la portion, les compléments pour atteindre les cibles, et la préparation.
5. **Modifier un repas** (`/cadencier/[jour]/edit-meal/[créneau]`) : la liste des recettes du créneau, chacune avec ses calories recalculées pour la journée. La quantité s'ajuste par pas de 10 g, puis « Valider cette recette ». Les autres repas du jour sont recalculés autour.
6. **Liste de courses** (`/user/nutrition/courses`) : aujourd'hui, 3 jours, semaine ou un nombre de jours libre, par catégorie ou par ordre alphabétique. Les articles se cochent.
7. **Recettes** (`/user/nutrition/recettes`) : onglets Catalogue, Programme, Favoris, Mes recettes, Nouvelles. Chaque fiche affiche les valeurs nutritionnelles et se met en favori (☆ / ★).
8. **Créer une recette** : nom, catégorie, description, temps, portions, poids de référence, macros, instructions.

## Règles

### Cadencier et repas

| Règle | Test |
|---|---|
| **N1** Le cadencier s'ouvre sur la semaine en cours, affiche les cibles du jour et ses 3 repas. | `N1` |
| **N2** La fiche du jour détaille ingrédients et préparation ; les allergènes s'affichent en français. | `N2` |
| **N3** Choisir une autre recette remplace le repas du créneau. | `N3` |
| **N4** Activer le jeûne d'un jour recalcule le déjeuner et le dîner à la hausse (le petit-déjeuner est masqué, la journée garde ses cibles). | `N4` |
| **N5** Aucune recette du cadencier ne contient un allergène déclaré, quel que soit le codage de la recette (codes français, ou anglais du catalogue d'origine). | `N5` |
| **N6** Sans l'offre Nutrition, les pages nutrition renvoient vers la souscription (`?besoin=nutrition`). | `N6` |
| La génération planifie 91 jours de 3 repas, sans recette identique le même jour ni sur 3 jours consécutifs. | couvert en intégration et en tests unitaires |
| Un repas déjà mangé ou saisi à la main n'est jamais recalculé. | couvert en tests unitaires |
| Changer de poids ou de profil recalcule les portions encore à venir. | couvert en tests unitaires |
| La page de choix d'un repas n'affiche que les recettes compatibles avec les allergies et aliments à éviter. | non couvert en e2e |

### Courses et recettes

| Règle | Test |
|---|---|
| **N7** La liste porte sur la période choisie (par défaut, du jour courant à la fin de la semaine) ; un article coché le reste après rechargement. | `N7` |
| **N8** Une recette mise en favori apparaît dans l'onglet Favoris. | `N8` |
| **N9** Une recette créée par l'utilisateur apparaît dans « Mes recettes ». | `N9` |
| Les cases cochées survivent à une régénération de la liste. | couvert en intégration |

## Technique

- **Génération** : `generateNutritionDaysForUser` (`src/lib/server/program-generation/nutrition`) planifie en mémoire (`planNutritionDays`), puis écrit par lots. Elle est lancée au paiement, aux mensurations ou par le cron de rattrapage.
- **Portions** : `fitDay` (`src/lib/nutrition/dayPlanner.ts`) ajuste les repas d'une journée ensemble ; `refreshStaleDays` et `rescaleUserMeals` (`src/lib/server/nutrition/rescaleUserMeals.ts`) réécrivent les portions périmées.
- **Allergènes** : `filterRecipesForUser` (`recipeFilterUtils.ts`) compare des codes normalisés (`normalizeAllergen`, `src/lib/schema/recipe/allergens.ts`). Il s'applique à la génération, au rattrapage du petit-déjeuner et au choix d'un repas.
- **Catalogue** : `getCatalogRecipes` (mis en cache 60 s par instance, invalidé à chaque modification de recette).
- **Courses** : `generateShoppingListFromPlanning` remplace la liste dans une transaction, en gardant les cases cochées.
- **Modèles** : `NutritionDay`, `Meal`, `Recipe`, `RecipeIngredient`, `ShoppingList`, `ShoppingItem`, `UserFavoriteRecipe`.

## Écarts connus

- **Pages non branchées** : Jeûne intermittent (`/jeune`), Suivi nutritionnel (`/suivi`, `/suivi-poids`, `/suivi-poids-historique`, `/suivi-macros`), Défis (`/defis`, `/defi-30-jours`, « Jour 5 / 30 » écrit en dur) sont des maquettes sans données ni lien depuis l'application.
- **Régénérer la liste de courses** : l'action existe côté serveur, mais aucun bouton ne l'appelle.
- **Allergène « seeds »** : le catalogue d'origine utilise un code « seeds » (graines) qui ne fait pas partie des 14 allergènes réglementaires ; il n'est ni affiché ni filtré.
- **Unités** : la fiche recette affiche « 450 g · g » (quantité et unité redondantes).

Corrigé lors de la mise en place de ces tests :

- **Allergies ignorées (sécurité alimentaire)** : les recettes du catalogue codent leurs allergènes en anglais (`eggs`, `milk`, `fish`…), le profil en français (`oeufs`, `lait`, `poisson`…). Seuls `gluten` et `sesame` étaient reconnus : une personne allergique aux œufs, au lait, au poisson, aux arachides, aux fruits à coque, au soja ou aux crustacés recevait ces recettes. Les codes sont désormais normalisés à la comparaison. `N5` échoue avec l'ancien code et passe avec la correction.
- **Choix d'un repas** : la page proposait aussi les recettes incompatibles avec les allergies ; elle applique maintenant le même filtre que la génération.
- **Formulaire admin des recettes** : ouvrir puis enregistrer une recette du catalogue effaçait ses allergènes (codes anglais rejetés par le schéma, remplacés par une liste vide). Ils sont désormais convertis au chargement.
- **Affichage des allergènes** : codes anglais affichés tels quels (« soy, eggs, milk ») ; ils sont remplacés par leurs libellés français.
