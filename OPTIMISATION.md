# Plan d'optimisation : Sport & Nutrition

Branche de travail : `optimisation`. Analyse basée sur la lecture du code (aucune mesure de temps réelle : pas de `.env` local).

## 1. Constat

- **Sport** : le contenu est déjà global (`ProgramDayItem` → `WorkoutVideo`, défini par l'admin). Il n'y a **pas de génération par user** : au paiement, seul `programStartDate` est posé (`ensureProgramStartDate`). `UserWorkoutDay` n'est créé qu'au déplacement ou à la validation d'une séance. Le coût vient de la **lecture** : le plan global est recalculé pour chaque user et chaque requête, et il n'existe pas de mécanisme propre pour des éléments personnalisés par user.
- **Nutrition** : entièrement personnalisée, générée au paiement (91 jours, \~273 repas + liste de courses). La boucle de génération fait \~550 requêtes séquentielles, sans verrou ni état, et plusieurs `load` GET écrivent en base.

## 2. Architecture cible du sport

```
Admin (attach/detach vidéos, séances)
   → Plan global (ProgramDayItem + WorkoutVideo)
   → Snapshot / cache du plan (clé = dayIndex)
   → merge pur : plan ⊕ overrides user
   → pages /user/sport, séance, journée
```

- **Couche 1, plan global** : une seule vérité pour tous, indexée par `dayIndex` relatif (valable quelle que soit la date de départ).
- **Couche 2, éléments personnalisés** : modèle d'override par user, fusionné au plan par une fonction pure (prolonge `placeSportWeek`).
- **Aucune génération sport par user** : le paiement pose seulement `programStartDate` et l'entitlement.

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

- [x] **S9** Modèle `UserSportOverride` (`HIDE` / `REPLACE` / `ADD`, jour source du plan, `workoutVideoIds`, `note`, `createdById`). Un seul réglage par jour source. Le schéma est à pousser en base (`prisma db push`, sans `--accept-data-loss`) pour créer l'index `userId`.
- [x] **S10** Fusion pure `applySportOverrides` (`src/lib/server/sport/sportOverrides.ts`) : le plan partagé n'est jamais modifié ; appliquée par `resolveSportWeek` et `getSportVideosForProgramDay(dayIndex, userId)`. Les vidéos viennent du snapshot (`videosById`).
- [x] **S11** Sans objet : `UserWorkoutDay` reste la source des déplacements et validations, les overrides agissent sur le contenu du jour source ; aucune migration.
- [x] **S12** UI admin : carte « Personnalisation du plan sport » dans l'onglet Sport de `admin/users/[id]` (actions `addSportOverride` / `deleteSportOverride`, réservées au rôle `ADMIN`).
- [x] **S12b** Décision : seuls admin / coach créent des overrides (l'utilisateur ne peut pas). Il n'existe pas de rôle coach : seul `ADMIN` écrit pour l'instant, `createdById` garde l'auteur pour un futur rôle.

### P3 : nettoyage

- [x] **S13** La date de départ du programme est posée dès la validation du paiement/des mensurations (`scheduleProgramGenerationAfterPayment`), avant et indépendamment de la génération nutrition : le sport ne dépend plus de son succès.
- [ ] **S14** Index Mongo : `program_day_items(type, workoutVideoId)` et `user_workout_days(userId, dayIndex)` si absents.
- [ ] **S15** `requireSportAccess` cohérent sur toutes les actions (le layout couvre déjà les `load`).

## 4. Nutrition

### P0 : fiabilité de la génération

- [x] **N1** État de génération sur le user (`programGenStatus` : `IDLE`/`RUNNING`/`DONE`/`FAILED`, `programGenStartedAt`, `programGenFinishedAt`, champs optionnels) et verrou atomique avec bail de 10 min (`src/lib/server/program-generation/generationLock.ts`). Une 2e passe rattrape un paiement arrivé pendant la génération. Le cadencier affiche « en cours » / « n'a pas abouti ». Schéma à pousser en base (`prisma db push`, sans `--accept-data-loss`).
- [x] **N2** `reconcilePaidCheckoutSession` lance la génération via `dispatchProgramGeneration` (waitUntil) au lieu de l'attendre dans le webhook ; un rejeu (retry Stripe) relance la génération si elle a échoué, n'a pas démarré ou si le bail a expiré (`shouldResumeProgramGeneration`).
- [x] **N2b** `maxDuration: 300` sur `/auth/subscription` et sur le webhook Stripe `/api/webhooks`.
- [x] **N2c** `_tmp-gen-test.spec.ts` exclu de vitest (`src/**/_tmp-*.spec.ts` dans `vite.config.ts`) ; le fichier est conservé, à supprimer si tu n'en as plus besoin.
- [x] **N2d** Verrou contre les générations concurrentes (webhook + retour checkout + measurement) : voir N1, un appel concurrent est ignoré (`schedule_skip_running`).

### P1 : performance de la génération

- [x] **N3** `generateNutritionDaysForUser` planifie en mémoire (`planNutritionDays`, pur et testé) puis écrit par lots : 1 lecture des jours/repas existants, `createMany` des jours, 1 relecture des ids, `createMany` des repas (300 par lot), mises à jour en transactions de 60. Environ 5 requêtes au lieu de ~550 pour 91 jours.
- [ ] **N3b** Coût CPU du calcul (mesuré en test, hors base) : ~1,7 à 2 s pour 91 jours, surtout `pickDayRecipes` (jusqu'à 6 tirages évalués par `fitDay`). À réduire si besoin (moins de tirages, cache des évaluations).
- [x] **N4** `generateShoppingListFromPlanning` remplace la liste dans une transaction (suppression, création, articles) : un échec laisse l'ancienne liste intacte. Les cases cochées sont conservées à la régénération automatique (clé ingrédient + unité) ; le bouton « Régénérer » de la page courses supprime d'abord la liste et repart donc de zéro. Reste à faire : alléger la lecture 1..91 (recette + ingrédients dupliqués par repas).
- [x] **N5** `refreshStaleDays`, le rattrapage du petit-déjeuner et `regenerateShoppingListsForRecipe` régénèrent chaque liste une seule fois (`regenerateShoppingListsOverlappingDays`, dédupliquée par plage) au lieu d'une fois par jour modifié. Les écritures dans les `load` GET restent à sortir (N7).
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
- [x] **T7** Les actions de formulaire `/admin/**` et les API `/api/admin/**` ne passaient pas par le layout admin : seule la session était exigée. Garde ajouté dans `hooks.server.ts` (`adminWriteGuard` : toute écriture non-GET d'un non-`ADMIN` renvoie 403).

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

- S12b : tranché (admin / coach seulement).
- N14 : `weightLossGoalKg` doit-il piloter la cible calorique ?
- N15 : un second paiement redémarre-t-il un programme de 91 jours ?
- Mongo en replica set (Atlas) pour les transactions de lots : déjà utilisé dans `rescaleUserMeals` (7 jours par transaction, limite de 60 s).
