# 3. Sport

Le planning hebdomadaire (`/user/sport`) et les séances vidéo (`/user/sport/seance/[id]`). Le contenu est le même pour tous les utilisateurs (plan défini par l'admin), avec des personnalisations possibles par utilisateur.

## Parcours

1. **Planning** : une semaine du lundi au dimanche, à choisir parmi les 13 du programme. Chaque jour avec séance est marqué, et la liste « Séances semaine N » donne la séance, le jour, la date et les points à gagner.
2. **Ordre de la semaine** : Séance 1, puis 2, puis 3, puis la Découverte, facultative. La Découverte mène aux vidéos Mindset, Breathwork et Méditation (zone 5).
3. **Déplacer une séance** : un appui long sur un jour avec séance, puis glisser vers un jour libre de la même semaine.
4. **Séance** : une pré-séance facultative, puis deux vidéos obligatoires (Séance 1 et Séance 2) à regarder dans l'ordre. La deuxième vidéo est verrouillée tant que la première n'est pas validée.
5. **Validation** : quand les vidéos obligatoires sont « Validée », le bouton « Valider la séance » apparaît. La séance est alors « enregistrée comme terminée » et rapporte 50 points.

## Règles

### Planning

| Règle | Test |
|---|---|
| **S1** Les séances du plan apparaissent sur leurs jours, numérotées dans l'ordre de la semaine ; la Découverte est proposée comme facultative sur un jour libre. | `S1` |
| **S2** Une séance se déplace vers un jour libre de la même semaine ; elle garde les vidéos de son jour d'origine. Un déplacement vers une autre semaine est refusé. | `S2` |
| **S3** Une personnalisation posée par l'admin (ici masquer une séance) ne concerne que l'utilisateur visé : les autres voient le plan normal. | `S3` |
| **S4** Sans l'offre Sport, le planning renvoie vers la souscription (`?besoin=sport`). | `S4` |
| Une séance déjà validée ne se déplace pas ; le jour cible doit être libre. | non couvert en e2e |
| Le geste d'appui long et de glisser. | non couvert (testé par l'action directement) |
| Les types Séance 1 / 2 / 3 posés par l'admin fixent l'ordre ; un jour sans type prend le premier rang libre. | couvert en tests unitaires |

### Séance et validation

| Règle | Test |
|---|---|
| **S5** Le bouton n'apparaît qu'une fois les deux vidéos obligatoires validées (la pré-séance ne compte pas). La validation rapporte 50 points une seule fois ; chaque vidéo terminée rapporte 10 points. Une seconde validation est refusée (« déjà validée »). | `S5` |
| **S6** La Séance 2 de la semaine attend la validation de la Séance 1 (et la 3 celle de la 2) : un message l'indique et le bouton n'apparaît pas. | `S6` |
| **S7** Une séance d'un jour futur se consulte, mais ne se valide pas avant son jour. | `S7` |
| **S8** L'API de progression des vidéos sport refuse un compte sans l'offre Sport (403). | `S8` |
| Une vidéo est validée à 80 % de sa durée, ou à la fin de la lecture. | couvert en tests unitaires |
| Une séance Découverte se valide sans les 50 points (seules ses vidéos rapportent). | couvert en intégration |
| Au cycle 2, les vidéos sont à revoir et rapportent de nouveau leurs points. | couvert en tests unitaires |
| Double clic sur « Valider » : une seule validation, un seul gain. | couvert en intégration |

## Technique

- **Routes** : `src/routes/user/sport/+page.*` (planning, action `moveSession`), `src/routes/user/sport/seance/[sessionId]/+page.*` (action `markCompleted`), `src/routes/user/sport/+layout.server.ts` (offre Sport), `src/routes/api/videos/[kind]/[id]/{playback-token,progress}`.
- **Plan partagé** : `ProgramDayItem` (type `SPORT_SESSION`) relie un jour du programme à une `WorkoutVideo` (position `PRE`, `VID1` ou `VID2`, et type de séance). Il est chargé une fois et mis en cache 60 s par instance (`sportPlanCache.ts`), invalidé à chaque écriture admin.
- **Placement de la semaine** : `resolveSportWeek` (`src/lib/server/sport/programSportDays.ts`) fusionne le plan, les personnalisations (`UserSportOverride` : `HIDE`, `REPLACE`, `ADD`) et les déplacements ou validations de l'utilisateur (`UserWorkoutDay`).
- **Validation** : `completeWorkoutDay` et `isPrerequisiteMet` (`src/lib/server/sport/workoutCompletion.ts`) ; points par `awardPoints`.
- **Lecteur** : `CloudflareVideoPlayer.svelte` demande un jeton signé, puis envoie la progression toutes les 15 s.
- **Cycles** : jours relatifs à l'affichage, jours absolus en base (voir `OPTIMISATION.md`, D2).

## Écarts connus

- **Jeton de lecture en test** : le serveur appelle l'API Cloudflare avec un identifiant factice (refusé, sans effet) ; le lecteur affiche « Impossible de générer le token de lecture ». Les tests simulent le visionnage par l'API de progression.
- **Nombre de semaines** : un programme qui ne démarre pas un lundi (cas d'un départ modifié par l'admin) compte 14 semaines calendaires, dont une première partielle.
