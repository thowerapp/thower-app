# 5. Découverte, progression et paramètres

Les bibliothèques de vidéos Découverte (`/user/decouverte`), la page Progression (points, niveau, badges, bilan mensuel) et les Paramètres (profil, checklist, abonnement, déconnexion).

## Parcours

1. **Découverte** : cinq bibliothèques (Motivation, Méditation, Mindset, Breathwork, Explication), chacune avec son nombre de vidéos visibles. Une vidéo s'ouvre dans sa page et se marque « regardée » en fin de lecture (80 % pour une vidéo Cloudflare Stream).
2. **Progression** : semaine et jour du programme, niveau et statut, total de points, séances validées, score du jour, badges, barème des points, bilan mensuel (stress, sommeil, confiance, digestion, bonheur, motivation, sur 10, avec photos facultatives) et photos d'inscription.
3. **Paramètres** : Profil et données (mensurations, objectifs, alimentation, bien-être, date de départ, checklist à personnaliser), Abonnement, Se déconnecter.
4. **Accès expiré** (`/acces-expire`) : quand l'abonnement est terminé, propose le renouvellement ; renvoie vers l'espace si l'accès est valide.

## Règles

### Découverte

| Règle | Test |
|---|---|
| **V1** Chaque bibliothèque affiche le nombre de ses vidéos visibles. | `V1` |
| **V2** Une vidéo libre (rattachée à aucun jour) est toujours visible. Une vidéo rattachée à un jour du programme apparaît à partir de ce jour (ou plus tôt si une tâche visible du jour la propose). | `V2` |
| **V3** Une vidéo regardée jusqu'au bout affiche « Vidéo regardée » et rapporte 10 points, une seule fois. | `V3` |
| **V4** Une vidéo liée à la tâche « vidéo » du jour coche cette tâche et rapporte les points de la tâche (au lieu des 10 points). | `V4` |
| L'API de lecture et de progression est réservée aux comptes à l'accès valide. | zone 2 (`K7`) |

### Progression

| Règle | Test |
|---|---|
| **R1** La page affiche le jour du programme et un barème conforme aux points réellement attribués (séance 50, vidéo 10, photos 50, bilan mensuel 50 ; tâches selon la tâche). | `R1` |
| **R2** À partir du mois 2, le bilan mensuel s'enregistre une fois par mois (mois 1 à 3 par cycle ; 4 à 6 au cycle 2) et rapporte 50 points. Un second envoi le même mois est refusé. | `R2` |
| **R3** Le niveau et le statut se calculent à partir de la part des points possibles obtenus (tâches actives des jours écoulés + bilans mensuels) : seuils 0, 86, 90, 94, 98 et 100 %. | `R3` |

### Paramètres

| Règle | Test |
|---|---|
| **P1** Le profil reprend les dernières mensurations et le jour du programme ; une tâche désactivée dans « Checklist journalière » disparaît de la checklist du jour. | `P1` |
| **P2** « Abonnement » mène à la souscription ; « Se déconnecter » ferme la session. | `P2` |
| **P3** `/acces-expire` renvoie vers l'espace quand l'accès est valide (le cas expiré est couvert par `A4`). | `P3` |
| **USR1** Déplacer une séance : jours invalides, hors plage, identiques, autre semaine ou sans séance refusés. | `USR1` |
| **USR2** Démarrer le programme sport : la date de départ n'est posée qu'une fois. | `USR2` |
| **USR3** Liste de courses : régénération sur un jour, trois jours, la semaine ou un nombre de jours ; refus sans jour alloué. | `USR3` |
| **USR4** Jeûne : jour invalide ou sans cadencier refusé ; jeûne du matin réglable. | `USR4` |
| **USR5** Favoris depuis la liste des recettes : ajout, retrait, identifiant obligatoire. | `USR5` |
| **USR6** Bilan mensuel : données invalides, programme non démarré ou à venir refusés ; photos facultatives enregistrées. | `USR6` |

## Technique

- **Routes** : `src/routes/user/decouverte/**` (une page par bibliothèque, pages vidéo factorisées dans `src/lib/components/DiscoveryVideoPage.svelte` et `src/lib/server/discovery/discoveryVideo.ts`), `src/routes/user/progression/+page.*` (action `submitMonthlyCheckIn`), `src/routes/user/parametres/**` (action `toggleTaskOptOut`), `src/routes/acces-expire`.
- **Déblocage** : `getDiscoveryContentByCategoryProgressive` (`src/lib/prisma/discoveryContent`), en jour relatif du cycle.
- **Points** : montants dans `src/lib/server/pointsConfig.ts` (`POINTS`), crédités par `awardPoints`. Le barème de la page Progression est lu depuis cette même source.
- **Modèles** : `DiscoveryContent`, `UserVideoProgress`, `MonthlyCheckIn`, `ProgressPhoto`, `UserBadge`, `UserDailyTaskOptOut`.

## Écarts connus

- **Badges et défis non attribués** : la page Progression liste des badges (« 7 jours consécutifs », « Semaine parfaite »…) et annonce « Badge débloqué +100 pts » et « Défi 30 jours complété +200 pts », mais aucun code n'attribue de badge ni ces points. Ce sont des promesses visibles sans effet.
- **Libellés des bibliothèques** : Motivation est sous-titrée « Bienvenue · Programme » et Mindset « Motivation · Discipline ».
- **Déblocage** : les jours de rattachement sont lus sur tous les programmes, actifs ou non.
- **Évolution prévue** : la branche `main` regroupe Méditation, Mindset et Breathwork en une catégorie « Séance bonus ». Cette page décrit l'état de la branche `optimisation`.

Corrigé lors de la mise en place de ces tests :

- **Lien « Abonnement »** : il menait à `/user/parametres/abonnement`, une page inexistante (404). C'est couvert par `P2`.
- **Barème des points** : « Vidéo du jour regardée +5 pts » alors qu'une vidéo rapporte 10 points. Les montants viennent maintenant de `POINTS`. C'est couvert par `R1`.
