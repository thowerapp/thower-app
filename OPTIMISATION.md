# Optimisation : Sport & Nutrition

Branche `optimisation` (ne jamais fusionner avec `main`). État au 2026-10-11, vérifié avec le `.env`.

## 1. Fait

**Sport** : plan global partagé (`ProgramDayItem` → `WorkoutVideo`), aucune génération par utilisateur ; personnalisations par utilisateur fusionnées à la lecture.
- **S1–S4** Snapshot du plan en cache par instance (TTL 60 s, `sportPlanCache.ts`), invalidé à chaque écriture admin et synchro Cloudflare ; page séance : une requête `userWorkoutDay`, total de points par `aggregate`.
- **S5–S7** Pré-requis A → B → C borné à la semaine (`isPrerequisiteMet`) ; anti double validation (réservation + `PointEvent` en transaction, 409 sur conflit) ; points séance centralisés (`WORKOUT_COMPLETION_POINTS`).
- **S8** Affectation A/B/C selon le `sessionType` choisi par l'admin, repli par rang ; avertissement admin si deux jours d'une semaine ont le même type.
- **S9–S12** `UserSportOverride` (`HIDE` / `REPLACE` / `ADD`), fusion pure `applySportOverrides`, UI admin dans `admin/users/[id]` (rôle `ADMIN` seulement).
- **S13–S15** Date de départ posée au paiement indépendamment de la nutrition ; index `program_day_items(type, workoutVideoId)` et `user_workout_days(userId, dayIndex)` ; API vidéo sport en 403 sans l'offre sport.

**Nutrition**
- **N1–N2d** État et verrou de génération (`programGenStatus`, bail 10 min, `generationLock.ts`), génération lancée en `waitUntil`, reprise sur rejeu Stripe, `maxDuration: 60`.
- **N3–N3b** Planification en mémoire (`planNutritionDays`) puis écriture par lots : ~5 requêtes au lieu de ~550 ; 12 candidats par créneau (~1,5 s pour 91 jours).
- **N4–N6** Liste de courses remplacée en transaction (cases cochées conservées), une régénération par plage, recalage des portions seulement si les cibles changent (`nutritionTargetsKey`).
- **N7–N11** 3 repas par jour générés ; profil et cibles chargés une fois par page ; cache du catalogue de recettes (TTL 60 s) ; `requireNutritionAccess` sur les actions.
- **N12–N13** Filtre allergènes, tirage pseudo-aléatoire et fonctions d'affichage des repas en un seul exemplaire testé.
- **N16** Plus aucun cast du client Prisma ni `as any` ; `serializeData` et `superforms-zod` typés ; pages `decouverte/*/[id]` factorisées (`discoveryVideo.ts`, `DiscoveryVideoPage.svelte`) ; code mort `lib/prisma/measurement/*` supprimé.

**Transverses**
- **T1** Cron protégé par `CRON_SECRET`. **T2** Page `/acces-expire`. **T3** Totaux de points par `aggregate`, montants dans `pointsConfig.ts`.
- **T5** Une seule lecture d'authentification par requête (attributs portés par Lucia, `locals.ts`). **T6** Checklist du jour unique (`validateDailyChecklist`, 409 sur double envoi).
- **T7** Garde `adminWriteGuard` : toute écriture `/admin/**` ou `/api/admin/**` d'un non-admin renvoie 403.
- **T9** Accès : `userWriteGuard` (`src/hooks.server.ts`) exige un accès valide pour toute écriture `/user/**` et toute requête `/api/videos/**` ; `getProgramOfferEntitlements` ne donne plus aucun droit sans transaction payée (sauf admin). Avant, un compte non payant ou expiré pouvait appeler ces actions et gagner des points.
- **T10** Allergènes (sécurité alimentaire) : les recettes du catalogue sont codées en anglais, le profil en français ; seuls gluten et sésame étaient reconnus. Codes normalisés à la comparaison (`normalizeAllergen`), filtre appliqué aussi au choix d'un repas, libellés français à l'affichage, allergènes conservés à l'enregistrement admin.
- **T11** Documentation fonctionnelle et technique de toute l'application (`docs/app/`) avec des tests Playwright reliés à ses règles (base éphémère, services simulés, aucun appel au `.env`).
- **T8** Rattrapage Stripe depuis les mensurations : `checkout.sessions.list` ne filtre pas par `client_reference_id` (l'appel échouait toujours) ; lecture des sessions terminées sur 7 jours filtrées par utilisateur. À tester avec un paiement Stripe en mode test.

## 2. Déploiement

Voir `ETAT-DU-PROJET.md`, section « À faire au déploiement ».

## 3. Décisions (tranchées le 2026-10-11)

**Sans changement de code**
- **D1** `weightLossGoalKg` reste indicatif (affiché, hors calcul) : la Méthode Thower fixe le déficit d'après le % de masse grasse.
- **D3** Recalcul des portions au changement de données + recalage à l'affichage en filet de sécurité : confirmé.
- **D6** Pas de rôle coach : seul `ADMIN` personnalise le plan sport (`createdById` garde l'auteur).
- **D9** Le petit-déjeuner est toujours généré ; le jeûne et `breakfastEnabled` le masquent à l'affichage.
- **D10** API vidéo sport réservée à l'offre sport (admin autorisé, anciens paiements sans slug = les deux offres).
- **T-a** Caches par instance, TTL 60 s : acceptés.
- **T-g** Comptes sans `nutritionTargetsKey` recalés une fois à la prochaine génération ou sauvegarde des mensurations : accepté.

**À implémenter, par ordre**
1. [x] **T-b** Plan Vercel Hobby : `maxDuration` 300 → 60 (le webhook, `/auth/subscription`, `/auth/measurement`) ; une génération dure ~2 s. Bail du verrou (10 min) inchangé.
2. [x] **D8** Mise à jour d'une recette par l'admin : ingrédients remplacés dans une transaction, puis régénération des listes contenant la recette (comme `updateRecipe`).
3. [x] **D7** Le bouton « Régénérer » de la liste de courses conserve les cases cochées, comme la régénération automatique.
4. [x] **D4** Découverte : facultative, ne rapporte que les points de ses vidéos (10 pts) ; une séance Découverte réelle ne crédite plus les 50 pts de séance.
5. [x] **D5** Page admin `programme-sport` : alerte sur les vidéos rattachées sans `sessionType`.
6. [x] **D11** Accueil : masquer YouTube et TikTok tant qu'ils n'ont pas d'URL (Instagram seul).
7. [x] **T-f** `awardPoints` (`src/lib/server/awardPoints.ts`) : seule voie de création d'un `PointEvent` (hors édition admin), montant par défaut depuis `POINTS`, utilisable seule, en lot `$transaction([...])` ou avec un `tx`. `createPointEvent` supprimé. Bug corrigé : renvoyer ses photos d'inscription recréditait 50 pts à chaque fois.
8. [x] **T-e** Checklist datée à minuit Europe/Paris (`todayStartParis`) partout, y compris la saisie et l'affichage admin (`parisDayStartFromISODate`, `parisISODate`) ; `startOfUtcDay` supprimé. Migration des dates existantes : `npm run migrate:checklist-dates` (simulation), puis `-- --apply` (base de dev : 0 complétion).
9. [x] **D2** Renouvellement = nouveau cycle de 91 jours. Jour **absolu** continu dans les tables utilisateur (cycle 2 = 92..182), jour **relatif** (1..91) à l'affichage et pour le plan partagé (plan sport, personnalisations, tâches, popups) ; seul ajout au schéma : `User.programCycleStarts`. Au crédit d'un paiement sur un compte déjà démarré, départ du cycle suivant = fin du cycle en cours (un lundi) ou lundi suivant le paiement si renouvellement tardif (`nextCycleStart`). Calcul pur et testé dans `src/lib/utils/programCycle.ts` (`resolveProgramCycle`, `absoluteDayIndex`, `absoluteProgressMonth`), lu côté serveur par `getUserProgramCycle`. Vidéos de séance à revoir à chaque cycle (points regagnés, `cycleStart` dans `upsertVideoProgress`) ; photos et bilans en mois 4..6 (affichés « Cycle 2 · Mois 1..3 ») ; libellé « Cycle 2 · Jour 5 » à partir du cycle 2. La liste de courses générée couvre le dernier cycle alloué.
   - Règle de facturation inchangée : tout paiement crédité après le premier (y compris l'achat ultérieur d'une seconde offre) prolonge de 3 mois et ouvre donc un cycle.
   - Non couvert : l'admin (`admin/users/[id]`, calendrier, date de départ) affiche les jours absolus et ne modifie que le départ du cycle 1 ; la pause admin (`programPausedAt`) reste sans effet sur le calcul du jour, comme avant.
10. [x] **T-c** Rattrapage dans le cron existant (`/api/cron/daily-notification`, `maxDuration: 60`) : `catchUpProgramGenerations` relance au plus 5 comptes par passage (accès valide, mensurations présentes, et `FAILED`, `RUNNING` au-delà du bail ou jours générés < jours alloués). Sélection pure testée (`selectCatchUpCandidates`). Le résultat figure dans la réponse JSON du cron (`generation`).

**Reste ouvert**
- [ ] **T-d** 12 candidats par créneau : qualité des journées vérifiée sur 91 jours pour plusieurs profils par `dayPlanner.spec.ts` ; à revoir seulement si le catalogue de production grossit fortement.

## 4. Tests

Suites en place et reste à écrire : `ETAT-DU-PROJET.md` (section « Tests ») et `TESTS-A-FAIRE.md`.

## 5. Reprise

- **Mise en route** : `npm ci` (lance `prisma generate`). Variables : `.env.example` (dont `CRON_SECRET`).
- **Tests unitaires** : `DATABASE_URL="mongodb://127.0.0.1:1/dummy" npx vitest --run src` : 322 tests. L'URL factice empêche toute écriture en base ; `_tmp-*.spec.ts` et `*.integration.spec.ts` sont exclus.
- **Tests d'intégration** : `npm run test:integration` (~40 s, MongoDB téléchargé au premier lancement). Sur un CPU sans AVX : `MONGOMS_VERSION=4.4.29` avec la `libssl1.1` locale (voir `scripts/dev-mongo.mjs`).
- **Types** : `npm run check` : 0 erreur, 0 avertissement, à garder à 0.
- **ESLint** : voir `ETAT-DU-PROJET.md` (dette technique).
- **Règles** : ne jamais lancer `prisma db push --accept-data-loss` (l'utilisateur pousse le schéma) ; ne pas committer sans demande ; tabulations et formateur automatique : relire un fichier avant de l'éditer.
