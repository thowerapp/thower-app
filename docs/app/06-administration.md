# 6. Administration

L'espace `/admin`, réservé au rôle `ADMIN` : tableau de bord, codes d'accès, tâches journalières, recettes, utilisateurs, vidéos et programme sport, messages de contact, ventes.

## Parcours

1. **Accueil** (`/admin`) : transactions, cumul mensuel, dernières inscriptions, produits vendus.
2. **Codes d'accès** (`/admin/codes`) : générer de 1 à 100 codes, avec une note facultative, pour les personnes qui ont payé hors application. Chaque code donne un accès complet à vie, une seule fois. La liste indique le statut et l'utilisateur de chaque code.
3. **Tâches journalières** (`/admin/daily-tasks`) : liste, création et modification. Type (habitude ou vidéo à consulter), libellé, points, ordre, jours de début et de fin, activation.
4. **Recettes** (`/admin/recettes`) : catalogue, création et modification (catégorie, temps, matériel, macros, allergènes, ingrédients, instructions).
5. **Utilisateurs** (`/admin/users/[id]`) : une fiche par compte, en onglets.
   - **Compte** : rôle, 2FA, email vérifié, mot de passe, fin d'abonnement, arrêt du programme avec motif.
   - **Profil et santé, Paiement, Calendrier, Points et badges, Nutrition et courses, Tâches et défis.**
   - **Sport** : personnalisation du plan (masquer, remplacer ou ajouter des vidéos un jour donné).
6. **Vidéos** (`/admin/videos`) : liste des vidéos Cloudflare Stream (sport et Découverte), envoi d'une nouvelle vidéo, synchronisation, et récap du programme sport jour par jour avec ses alertes.
7. **Contact et ventes** : messages reçus ; paiements encaissés, exportables en PDF sur une période.

## Règles

| Règle | Test |
|---|---|
| **AD1** Un compte non admin est renvoyé hors de `/admin`, et toute écriture admin lui est refusée (403). | `AD1` |
| **AD2** La génération crée le nombre demandé de codes, non utilisés, avec leur note. | `AD2` |
| **AD3** Une tâche créée par l'admin apparaît dans la checklist des utilisateurs. | `AD3` |
| **AD4** Enregistrer une recette du catalogue conserve ses allergènes (codes anglais d'origine convertis en codes français). | `AD4` |
| **AD5** Une personnalisation sport posée depuis la fiche d'un utilisateur est enregistrée avec son auteur et son motif ; elle ne concerne que cet utilisateur (zone 3, `S3`). | `AD5` |
| **AD6** Le récap du programme sport signale un jour dont aucune vidéo n'est typée (ordre des séances déduit). | `AD6` |
| **AD7** « Stopper le programme » enregistre la date et le motif. | `AD7` |
| **AD8** Les ventes listent les paiements encaissés. | `AD8` |
| Envoi d'une vidéo vers Cloudflare et synchronisation de statut. | non couvert (service externe) |
| Export PDF des ventes, factures et bordereaux. | non couvert |
| Modifier un utilisateur (rôle, abonnement, mesures, points…) depuis sa fiche. | non couvert en e2e |

## Technique

- **Accès** : layout `src/routes/admin/+layout.server.ts` pour les pages ; `adminWriteGuard` (`src/hooks.server.ts`) pour toute écriture sous `/admin/**` et `/api/admin/**`, car les actions ne passent pas par le layout.
- **Fiche utilisateur** : `src/routes/admin/users/[id]/+page.server.ts` (une action par onglet) et `tabs/*.svelte`.
- **Plan sport** : `src/routes/admin/videos/programme-sport` (récap et alertes). Chaque écriture invalide le cache du plan.
- **Recettes** : la modification remplace les ingrédients dans une transaction, puis régénère les listes de courses qui contiennent la recette.

## Écarts connus

- **Accueil en anglais** : « Latest Registrations », « Recent users who have joined the platform ».
- **Arrêt du programme** : il est enregistré et affiché, mais ne décale pas les jours du programme de l'utilisateur.
- **Personnalisation sport** : le formulaire de la fiche utilisateur n'a pas été testé dans le navigateur ; le test passe par l'action.

Corrigé lors de la mise en place de ces tests : enregistrer une recette du catalogue effaçait ses allergènes (zone 4). C'est couvert par `AD4`.
