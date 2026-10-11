# Plan d'optimisation : Sport & Nutrition

Branche de travail : `optimisation`. Analyse basée sur la lecture du code (aucune mesure de temps réelle : pas de `.env` local).

## 1. Constat

* **Sport** : le contenu est déjà global (`ProgramDayItem` → `WorkoutVideo`, défini par l'admin). Il n'y a **pas de génération par user** : au paiement, seul `programStartDate` est posé (`ensureProgramStartDate`). `UserWorkoutDay` n'est créé qu'au déplacement ou à la validation d'une séance. Le coût vient de la **lecture** : le plan global est recalculé pour chaque user et chaque requête, et il n'existe pas de mécanisme propre pour des éléments personnalisés par user.
* **Nutrition** : entièrement personnalisée, générée au paiement (91 jours, \~273 repas + liste de courses). La boucle de génération fait \~550 requêtes séquentielles, sans verrou ni état, et plusieurs `load` GET écrivent en base.

## 2. Architecture cible du sport

```
Admin (attach/detach vidéos, séances)
   → Plan global (ProgramDayItem + WorkoutVideo)
   → Snapshot / cache du plan (clé = dayIndex)
   → merge pur : plan ⊕ overrides user
   → pages /user/sport, séance, journée
```

* **Couche 1, plan global** : une seule vérité pour tous, indexée par `dayIndex` relatif (valable quelle que soit la date de départ).
* **Couche 2, éléments personnalisés** : modèle d'override par user, fusionné au plan par une fonction pure (prolonge `placeSportWeek`).
* **Aucune génération sport par user** : le paiement pose seulement `programStartDate` et l'entitlement.

## 3. Sport

### P0 : gains immédiats, risque faible

- [x] **S1** Snapshot global du plan sport (vidéos ordonnées par `dayIndex` + catalogue de séances), mis en cache par instance (TTL 60 s) : remplace `fetchSportItems` et la lecture de `workoutSession` à chaque page. (`src/lib/server/sport/sportPlanCache.ts`, `programSportDays.ts`)
- [x] **S2** Invalidation du cache à l'écriture admin : `attachVideoToDay`, `detachProgramDayItem`, `createProgramDayItem`, `updateProgramDayItem`, `updateVideo`/`deleteVideo` (workout), synchro de statut Cloudflare (webhook, page admin vidéo, `playback-token`), purge. La page admin `programme-sport` force une relecture. Les autres instances serverless rattrapent au plus tard après le TTL.
- [x] **S3** Total de points via `getTotalPointsForUser` (`aggregate`) dans la page séance au lieu de `pointEvent.findMany` + `reduce`.
- [x] **S4** Page séance : `resolveSportWeek` ne fait plus qu'une requête (`userWorkoutDay`) ; `getSportVideosForProgramDay` lit le plan en mémoire.

### P1 : bugs et cohérence

- [x] **S5** Pré-requis A → B → C borné à la semaine sport (`isPrerequisiteMet`, `src/lib/server/sport/workoutCompletion.ts`), utilisé par le `load` et l'action.
- [x] **S6** Anti double validation : `completeWorkoutDay` réserve la validation (`updateMany` sur `completedAt` nul ou absent) et crée le `PointEvent` dans la même transaction ; un conflit concurrent (P2002/P2034) renvoie 409 sans points.
- [x] **S7** Source unique des points séance : `WORKOUT_COMPLETION_POINTS` dans `workoutCompletion.ts`, utilisée par le planning et la page séance.
- [x] **S8** Affectation A/B/C fondée sur le `sessionType` déjà choisi par l'admin sur les vidéos du jour (`assignWeekSessionTypes`, sans changement de schéma) ; repli sur le rang A/B/C pour les jours sans type exploitable. La page admin `programme-sport` avertit quand deux jours d'une même semaine portent le même type.

### P2 : éléments personnalisés par user

- [ ] **S9** Nouveau modèle d'override (`UserSportOverride` ou équivalent) : `userId`, `dayIndex`, `kind` (`ADD` / `HIDE` / `REPLACE` / `MOVE`), `workoutVideoId` ou `sessionId` optionnel, `label`, `points`, `createdBy`.
- [ ] **S10** Fusion pure et testable `resolveSport(plan, overrides, userRows)` ; les cas de `programSportDays.spec.ts` servent de non-régression.
- [ ] **S11** Migration douce : `UserWorkoutDay` conservé pour l'historique des validations, déplacements lus des deux sources pendant la transition.
- [ ] **S12** UI admin (onglet Sport de `admin/users/[id]`) : ajouter, masquer, remplacer par user.
- [ ] **S12b** Décision à prendre : l'override peut-il être créé par l'user lui-même (déplacer/masquer) ou seulement par l'admin ? (permissions + validation)

### P3 : nettoyage

- [ ] **S13** Sortir le sport de `generateProgramForUser` : `ensureProgramStartDate` indépendant, appelé au paiement.
- [ ] **S14** Index Mongo : `program_day_items(type, workoutVideoId)` et `user_workout_days(userId, dayIndex)` si absents.
- [ ] **S15** `requireSportAccess` cohérent sur toutes les actions (le layout couvre déjà les `load`).

## 4. Nutrition

### P0 : fiabilité de la génération

- [ ] **N1** État de génération sur le user (`idle` / `running` / `done` / `failed` + horodatage) : sert de verrou atomique (`updateMany` conditionnel, comme `claimNutritionSegmentCredit`) et d'indicateur UI (aujourd'hui « Non planifié »).
- [ ] **N2** Webhook Stripe : `reconcilePaidCheckoutSession` attend la génération en synchrone, sans `waitUntil` ni `maxDuration`. Utiliser `dispatchProgramGeneration` + `maxDuration`, et permettre le rejeu si l'état n'est pas `done` (un retry Stripe sort aujourd'hui sur « déjà crédité » sans relancer).
- [ ] **N2b** `maxDuration` sur `/auth/subscription` (seul `/auth/measurement` en a un).
- [ ] **N2c** Supprimer ou exclure `src/lib/server/program-generation/_tmp-gen-test.spec.ts` du glob vitest (il écrit dans la base réelle dès que `DATABASE_URL` est défini).
- [ ] **N2d** Verrou contre les générations concurrentes (webhook + retour checkout + measurement) : P2002 sur `[userId, dayIndex]` et `[nutritionDayId, position]`.

### P1 : performance de la génération

- [ ] **N3** Réécrire la boucle de `generateNutritionDaysForUser` : un `findMany` des jours + repas existants sur 1..N, calcul en mémoire (`fitDay`, `pickDayRecipes`), puis `createMany` par lots (\~550 requêtes → quelques-unes).
- [ ] **N4** Liste de courses (`generateShoppingListFromPlanning`) : écriture atomique (aujourd'hui `deleteMany` puis `create`), conservation des `isChecked` (réinitialisés à chaque régénération), allègement de la lecture 1..91 (recette + ingrédients dupliqués par repas).
- [ ] **N5** `refreshStaleDays` : une seule régénération de liste par plage au lieu d'une par jour modifié (jusqu'à 7 régénérations complètes d'une liste 1..91).
- [ ] **N6** `rescaleUserMeals` uniquement si les cibles (poids, % MG, activité, pain) ont changé ; ne pas le relancer à chaque génération ni à chaque sauvegarde de `/auth/measurement`.

### P2 : runtime

- [ ] **N7** Aucune écriture dans les `load` GET (`cadencier`, `cadencier/[day]` : `refreshStaleDays`, `backfillMissingBreakfastMeals`). Déclencher le recalcul à la modification du profil ou en tâche dédiée.
- [ ] **N8** Mutualiser profil / poids / cibles entre le layout nutrition et les pages enfants (`parent()`) au lieu de les relire 2-3 fois par navigation.
- [ ] **N9** `edit-meal` : `fitDay` est exécuté pour chaque recette du catalogue à chaque `load`. Calculer à la sélection ou limiter / mettre en cache.
- [ ] **N10** Cache serveur du catalogue de recettes (TTL court / invalidation à l'action admin).
- [ ] **N11** `requireNutritionAccess` sur l'action `save` de `edit-meal` (aujourd'hui seulement `locals.user`).

### P3 : dette et décisions produit

- [ ] **N12** Dédupliquer `normalize`, `parseTextTerms`, `recipeConflictsUser`, `catalogPickSeed`, `mulberry32`, `recipeCatalogSelect` entre `generateNutrition91Days.ts` et `ensureBreakfastMeal.ts` ; utiliser `recipeFilterUtils.ts` (testé mais importé par aucun code de prod).
- [ ] **N13** Dédupliquer `positionLabel` / `positionOrder` / `defaultTimeLabel` / mapping des macros entre `cadencier` et `cadencier/[day]` ; remplacer les `TOTAL_DAYS = 91` locaux par `TOTAL_PROGRAM_DAYS`.
- [ ] **N14** Décision : `weightLossGoalKg` est saisi et stocké mais n'entre dans aucun calcul (cibles basées sur le % de masse grasse).
- [ ] **N15** Décision : second paiement (+91 jours alloués) génère `J92..J182` jamais affichés (index plafonné à 91, cadencier à 13 semaines, pas de reset de `programStartDate`).
- [ ] **N16** Retirer les casts `as unknown as Prisma.UserSelect`, `(prisma as any)` : forcer `prisma generate` en CI.

## 5. Transverses (hors sport/nutrition, identifiés dans la première analyse)

- [ ] **T1** `api/cron/daily-notification` sans authentification : ajouter `CRON_SECRET`.
- [ ] **T2** Route `/acces-expire` inexistante (redirigée par `checkAccess`).
- [ ] **T3** Points : un module unique `awardPoints`, `aggregate` pour le total (4 pages font `findMany` + `reduce`).
- [ ] **T4** Dates : checklist en minuit UTC (`startOfUtcDay`) vs programme en minuit Europe/Paris.
- [ ] **T5** `hooks.server.ts` : 3 lectures DB par requête (session, user, session Prisma).
- [ ] **T6** `validateChecklist` dupliqué entre `user/+page.server.ts` et `user/journee/+page.server.ts`.

## 6. Ordre de travail proposé


1. **S1 + S2 + S4** : snapshot du plan global et invalidation.
2. **S5 + S6 + S7** : bugs de validation sport.
3. **S8, puis S9 + S10 + S12** : conception de l'override user (décision S12b d'abord).
4. **S13** : retirer le sport de la génération.
5. **N2c, N1, N2, N2d** : fiabilité de la génération nutrition.
6. **N3, N4, N5, N6** : performance de la génération.
7. **N7 à N11** : runtime nutrition.
8. **N12 à N16, T1 à T6** : dette et transverses.

## 7. Points de validation avant de coder

* S12b : qui crée un override (user, admin, coach) ?
* N14 : `weightLossGoalKg` doit-il piloter la cible calorique ?
* N15 : un second paiement redémarre-t-il un programme de 91 jours ?
* Mongo en replica set (Atlas) pour les transactions de lots : déjà utilisé dans `rescaleUserMeals` (7 jours par transaction, limite de 60 s).


