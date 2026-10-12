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

| Règle                                                                                                                                                                         | Test   |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| **AD1** Un compte non admin est renvoyé hors de `/admin`, et toute écriture admin lui est refusée (403).                                                                      | `AD1`  |
| **AD2** La génération crée le nombre demandé de codes, non utilisés, avec leur note.                                                                                          | `AD2`  |
| **AD3** Une tâche créée par l'admin apparaît dans la checklist des utilisateurs.                                                                                              | `AD3`  |
| **AD4** Enregistrer une recette du catalogue conserve ses allergènes (codes anglais d'origine convertis en codes français).                                                   | `AD4`  |
| **AD5** Une personnalisation sport posée depuis la fiche d'un utilisateur est enregistrée avec son auteur et son motif ; elle ne concerne que cet utilisateur (zone 3, `S3`). | `AD5`  |
| **AD6** Le récap du programme sport signale un jour dont aucune vidéo n'est typée (ordre des séances déduit).                                                                 | `AD6`  |
| **AD7** « Stopper le programme » enregistre la date et le motif.                                                                                                              | `AD7`  |
| **AD8** Les ventes listent les paiements encaissés.                                                                                                                           | `AD8`  |
| **AD9** Onglet Compte : identité, rôle, abonnement et mot de passe modifiés par l'admin ; le nouveau mot de passe ouvre une session ; un email déjà pris est refusé.          | `AD9`  |
| **AD10** Onglet Points : un événement ajouté par l'admin entre dans le total de l'utilisateur.                                                                                | `AD10` |
| **AD11** Onglet Profil : allergènes et objectif de perte enregistrés.                                                                                                         | `AD11` |
| **AD12** La fiche utilisateur s'ouvre avec toutes ses relations ; le résumé du programme répond. | `AD12` |
| **AD13** Réglages du programme : début obligatoirement un lundi, confirmation de régénération, pause et reprise. | `AD13` |
| **AD14** Mensurations : ajout, modification, suppression, avec confirmation de régénération. | `AD14` |
| **AD15** Photos de suivi (adresse interne seulement) et bilans mensuels (un seul par mois). | `AD15` |
| **AD16** Jours de nutrition (jeûne) et repas (quantités, valeurs manuelles). | `AD16` |
| **AD17** Jours de séance (verrou, fin) et suppression d'une personnalisation sport ; refus d'une vidéo inconnue. | `AD17` |
| **AD18** Points (type, montant, métadonnées), progression des badges et fin des défis. | `AD18` |
| **AD19** Complétions de tâches à minuit de Paris, désactivation, validation d'éléments du programme, progression vidéo. | `AD19` |
| **AD20** Suppression d'une session et d'un abonnement aux notifications. | `AD20` |
| **AD21** Favoris, plage d'une liste de courses et article modifié. | `AD21` |
| **AD22** Une action de la fiche est refusée (403) à un non-admin. | `AD22` |
| **AD23** Messages de contact : liste, détail, suppression, message inconnu en 404. | `AD23` |
| **AD24** Comptes : liste et suppression ; les paiements sont conservés sans compte. | `AD24` |
| **AD25** Tâches quotidiennes : modification, activation, suppression avec leurs complétions. | `AD25` |
| **AD26** Recettes : création depuis l'admin, suppression. | `AD26` |
| **AD27** Création d'une vidéo (séance ou Découverte) avec sa tâche de checklist ; fiche incomplète refusée. | `AD27` |
| **AD28** Fiche vidéo Découverte : synchronisation Cloudflare, modification, rattachement à un jour, détachement. | `AD28` |
| **AD29** Fiche vidéo de séance : mise à jour, synchronisation ; vidéo inconnue en 404. | `AD29` |
| **AD30** Liste des vidéos, suppression par identifiant composite, purge complète. | `AD30` |
| **AD31** Les actions vidéo sont refusées à un non-admin. | `AD31` |
| **PUB1** Contact public : message enregistré, champs invalides refusés, limite de 5 envois par minute. | `PUB1` |
| **PUB2** Le sitemap liste les pages publiques, pas l'admin, l'authentification ni l'API. | `PUB2` |
| **PUB3** La page des réglementations répond. | `PUB3` |
| **AD32** Calendrier de la fiche : cocher ou décocher un repas pour l'utilisateur. | `AD32` |
| **AD33** Calendrier de la fiche : cocher ou décocher la séance d'un jour. | `AD33` |
| **AD34** Le résumé du programme liste les jours de sport et de nutrition de l'utilisateur. | `AD34` |
| **AD35** Ces trois adresses sont réservées aux admins : un client ne lit ni ne modifie le programme d'un autre. | `AD35` |
| **AD36** Fiche utilisateur : un formulaire sans identifiant est refusé (400) pour chaque action d'édition. | `AD36` |
| **AD37** Fiche utilisateur : la régénération du programme doit être confirmée (profil, suppression d'une mensuration). | `AD37` |
| **AD38** Fiche utilisateur : compte introuvable ou adresse déjà utilisée refusés sans modification. | `AD38` |
| **API1** Abonnement push : session et champs obligatoires ; un même appareil n'est enregistré qu'une fois. | `API1` |
| **API2** La clé publique Web Push est publiée. | `API2` |
| **API3** Le cron exige son secret, envoie le rappel à chaque abonné et compte les échecs. | `API3` |
| **API4** Sans abonné, le cron l'indique et rattrape tout de même les générations. | `API4` |
| **API5** Recherche d'adresse (`/api/adresse`) : session requise, critère obligatoire, suggestions, aucun résultat. | `API5` |
| **API6** Statut des photos d'inscription : session requise, présence des photos. | `API6` |
| **API7** Envoi d'une photo (R2) : session, fichier, type et taille contrôlés ; stockage et lecture par son propriétaire. | `API7` |
| **API8** Lecture d'une photo : propriétaire ou admin seulement, clé inconnue en 404. | `API8` |
| **API9** En développement, la route de démonstration d'envoi vidéo renvoie une URL Cloudflare. | `API9` |
| **API10** Progression vidéo : session, format et offre sport exigés. | `API10` |
| **API11** Une vidéo rattachée à la tâche du jour rapporte les points de la tâche, une seule fois. | `API11` |
| **API12** Webhook Stripe : signature absente refusée, événements sans effet acquittés. | `API12` |
| **CF1** Le jeton de lecture est signé par Cloudflare ; une vidéo marquée « pas prête » se resynchronise avec l'état réel côté Cloudflare.                                     | `CF1`  |
| **CF2** Webhook Cloudflare : état, durée et vignette mis à jour ; une signature fausse est refusée.                                                                           | `CF2`  |
| **CF3** Envoi d'une vidéo : l'admin obtient une URL d'envoi Cloudflare (simple, puis tus au-delà de 200 Mio) ; un non-admin est refusé.                                       | `CF3`  |
| **CF4** Synchronisation admin : les vidéos Cloudflare inconnues s'importent, inactives ; un doublon est refusé.                                                               | `CF4`  |
| **PDF1** Export du chiffre d'affaires : PDF téléchargé avec les paiements encaissés de la période ; une période invalide est signalée.                                        | `PDF1` |
| **PDF2** Bordereau de paiement (admin) : PDF avec montant et client.                                                                                                          | `PDF2` |
| **PDF3** Facture : le client télécharge la sienne, l'admin celle de n'importe quel client.                                                                                    | `PDF3` |
| **PDF4** Un client ne peut pas télécharger la facture d'un autre client.                                                                                                      | `PDF4` |
| **ENT1** Formulaire Admin > Entreprise : la fiche est enregistrée (SIRET, TVA et code APE normalisés) ; une valeur invalide est signalée sous le champ, sans perdre la saisie ni modifier la fiche. | `ENT1` |
| **ENT2** Les mentions légales (éditeur, hébergeur, directeur de la publication), la politique de confidentialité (responsable du traitement, e-mail) et les pieds de page reprennent la fiche. | `ENT2` |
| **ENT3** Sans fiche enregistrée, les pages restent servies avec le nom « Thower » et sans bloc hébergeur. | `ENT3` |
| **ENT4** Les PDF reprennent la fiche : facture (raison sociale, adresse, SIRET, contact, mention de pied de facture, logo), bordereau et chiffre d'affaires. | `ENT4` |
| **ENT5** Seul un admin peut modifier la fiche (403 sinon). | `ENT5` |

## Technique

- **Fiche entreprise** : modèle `CompanyProfile` (une seule fiche, clé `main`), lue par `src/lib/server/company.ts` (cache 60 s, fiche par défaut si la base ne répond pas) et fournie à toutes les pages par `src/routes/+layout.server.ts` (`data.company`). Validation et mise en forme partagées : `src/lib/company/companyProfile.ts`. Formulaire : `src/routes/admin/entreprise`. Reprise : mentions légales, politique de confidentialité, pieds de page, e-mail de support, PDF.

- **Accès** : layout `src/routes/admin/+layout.server.ts` pour les pages ; `adminWriteGuard` (`src/hooks.server.ts`) pour toute écriture sous `/admin/**` et `/api/admin/**`, car les actions ne passent pas par le layout.
- **Fiche utilisateur** : `src/routes/admin/users/[id]/+page.server.ts` (une action par onglet) et `tabs/*.svelte`.
- **Plan sport** : `src/routes/admin/videos/programme-sport` (récap et alertes). Chaque écriture invalide le cache du plan.
- **Recettes** : la modification remplace les ingrédients dans une transaction, puis régénère les listes de courses qui contiennent la recette.

## Écarts connus

- **Accueil en anglais** : « Latest Registrations », « Recent users who have joined the platform ».
- **Arrêt du programme** : il est enregistré et affiché, mais ne décale pas les jours du programme de l'utilisateur.
- **Personnalisation sport** : le formulaire de la fiche utilisateur n'a pas été testé dans le navigateur ; le test passe par l'action.
- **Facture** : le logo se renseigne par son adresse (chemin du site ou https) ; il doit être en PNG ou JPEG, et la facture se génère sans lui s'il est absent ou illisible.
- **Menu du rôle sur mobile** : la liste Admin / Client de l'onglet Compte s'ouvre hors de l'écran sur petit écran (les tests la commandent au clavier).
- **Allergènes saisis à la main** : dans l'onglet Profil, un seul code inconnu vide toute la liste (le schéma remplace le tableau par `[]`) ; à remplacer par un refus explicite ou un sélecteur.

Corrigé lors de la mise en place de ces tests :

- **Résumé du programme lisible par tous** : `/admin/users/[id]/program-summary` ne vérifiait que la présence d'une session, donc n'importe quel compte connecté pouvait lire les repas et séances d'un autre. Le rôle ADMIN est maintenant exigé, ainsi que sur les deux adresses du calendrier (`AD35`).
- **Contact** : la limite de débit du formulaire ne limitait rien (le seau se rechargeait toutes les 0,08 s au lieu de 12 s). Elle autorise maintenant 5 envois par minute et par adresse. C'est couvert par `PUB1`.
- Enregistrer une recette du catalogue effaçait ses allergènes (zone 4). C'est couvert par `AD4`.
- **Fiche utilisateur, onglet Compte** : les champs n'avaient pas de nom, donc rien n'était envoyé au serveur : « Enregistrer » renvoyait « Format email invalide » et remettait le formulaire à zéro. Les champs sont nommés et l'identifiant et le rôle sont envoyés. C'est couvert par `AD9`.
- **Fiche utilisateur, onglet Profil** : « Tri liste de courses » laissé sur « — » (cas de tout nouveau profil) faisait refuser l'enregistrement du profil. Une valeur vide est maintenant acceptée. C'est couvert par `AD11`.
- **Facture PDF** : le téléchargement ne se faisait pas, car le logo absent faisait échouer la génération. Le logo est désormais facultatif. C'est couvert par `PDF3`.
