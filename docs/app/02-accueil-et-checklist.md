# 2. Accueil et checklist du jour

L'accueil de l'espace (`/user`) et la page Journée (`/user/journee`) : jour du programme, accès aux offres, checklist d'habitudes quotidiennes.

## Parcours

1. **Accueil** : en tête, le jour du programme (« Jour 3 / 91 », « Cycle 2 · Jour 5 / 91 » à partir d'un renouvellement) et la semaine.
2. **Bandeau du jour** : il signale ce qui reste à faire (checklist, séance sport) et mène à la page Journée.
3. **Cartes Sport et Nutrition** : elles ouvrent le planning sport et le cadencier, ou invitent à souscrire si l'offre n'est pas incluse.
4. **Checklist du jour** : chaque habitude affiche ses points. On coche, puis « Valider les habitudes » crédite les points et verrouille la checklist jusqu'au lendemain (minuit heure de Paris).
5. **Page Journée** : la même checklist, avec le total du jour (habitudes et vidéo).

Avant le lundi de départ, l'accueil affiche « Le programme démarre lundi » et ne propose pas de checklist.

## Règles

### Accueil

| Règle | Test |
|---|---|
| **A1** L'accueil affiche le jour du programme, et les cartes mènent au planning sport et au cadencier. | `A1` |
| **A2** Avant le départ du programme : bandeau « Le programme démarre lundi », pas de checklist. | `A2` |
| **A3** Une offre non incluse (par exemple Nutrition avec l'offre Sport seule) affiche « Non inclus · Souscrire » et mène à la souscription. | `A3` |
| **A4** Un abonnement expiré renvoie vers `/acces-expire`, qui propose le renouvellement. | `A4` |

### Checklist

| Règle | Test |
|---|---|
| **K1** « Valider les habitudes » reste désactivé tant que rien n'est coché. La validation crédite la somme des points des habitudes cochées, enregistre la complétion du jour (minuit heure de Paris) et verrouille la checklist (« Validée ✓ »). | `K1` |
| **K2** L'accueil et la page Journée partagent la même checklist : une validation sur l'une apparaît sur l'autre, sans double crédit. | `K2` |
| **K3** Une tâche ne s'affiche qu'entre son jour de début et son jour de fin (`showFromDay`, `showUntilDay`, en jours du cycle). | `K3` |
| **K4** Une tâche désactivée par l'utilisateur n'est plus proposée. | `K4` |
| Un double envoi simultané ne crédite qu'une fois (409). | couvert en intégration (`dailyChecklist.integration.spec.ts`) |
| Une tâche « vidéo » est cochée automatiquement quand la vidéo Découverte liée est regardée. | zone 5 |

### Garde-fous d'écriture

Les pages de l'espace sont protégées par le layout `/user`, mais les envois de formulaire et les API ne passent pas par ce layout. Un garde central (`userWriteGuard`, `src/hooks.server.ts`) protège donc toute écriture sous `/user/**`, ainsi que toutes les requêtes `/api/videos/**` : il faut un accès valide (paiement et abonnement non expiré, admin dispensé), sinon la réponse est 403.

| Règle | Test |
|---|---|
| **K5** Un compte sans paiement ne peut pas valider la checklist par un envoi direct. | `K5` |
| **K6** Un abonnement expiré non plus. | `K6` |
| **K7** Un compte sans paiement n'obtient pas de jeton de lecture pour une vidéo Découverte. | `K7` |

## Technique

- **Routes** : `src/routes/user/+page.*` (accueil), `src/routes/user/journee/+page.*`, layout `src/routes/user/+layout.server.ts` (accès, jour du cycle, éléments en attente).
- **Composant** : `src/lib/components/DailyChecklist.svelte`.
- **Validation** : `validateDailyChecklist` (`src/lib/server/dailyChecklist.ts`) écrit les complétions et les points dans une même transaction, et l'index unique (utilisateur, tâche, jour) empêche le double crédit.
- **Points** : `awardPoints` (`src/lib/server/awardPoints.ts`) ; niveau affiché par `computeLevel`.
- **Jour du programme** : `resolveProgramCycle` (`src/lib/utils/programCycle.ts`), en heure de Paris.
- **Modèles** : `DailyTask`, `DailyTaskCompletion`, `UserDailyTaskOptOut`, `PointEvent`.

## Écarts connus

- **Bouton de remise à zéro** : « ↺ Reset checklist (dev) » s'affiche hors production (donc aussi en préproduction). L'action est refusée en production.
- **Contenu figé** : « Élastiques & Matériel » (À la une) n'a pas de lien.

Corrigé lors de la mise en place de ces tests :

- **Actions sans contrôle d'accès** : neuf actions de l'espace (checklist de l'accueil et de la Journée, bilan mensuel, vidéos Découverte, désactivation d'une tâche) n'exigeaient qu'une session. Un compte non payant ou expiré pouvait les appeler directement et gagner des points. Elles passent toutes par `userWriteGuard`. C'est couvert par `K5` et `K6`.
- **Droits d'un compte sans paiement** : `getProgramOfferEntitlements` donnait accès aux deux offres à un compte sans aucune transaction payée (la règle visait les anciens paiements sans offre précisée). Un tel compte n'a plus aucun droit, sauf l'admin.
- **API vidéo Découverte** : jeton de lecture et progression (avec ses points) étaient ouverts à tout compte connecté. C'est couvert par `K7`.
