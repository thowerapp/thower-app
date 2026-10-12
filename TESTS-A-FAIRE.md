# Tests à faire pour une couverture de 100 %

État au 12 octobre 2026 : 598 tests (352 unitaires, 57 d'intégration, 189 e2e). Cette liste regroupe ce qui n'est pas encore vérifié. Les cases cochées dans `OPTIMISATION.md` ne sont pas reprises ici.

Les points des sections 1 et 2 sont issus d'un relevé des routes et actions serveur sans aucune référence dans `e2e/`. Ils sont à confirmer à la mesure (section 0).

## 0. Mesure

Couverture des lignes de `src/lib`, `src/routes/**/*.ts` (actions, API) et `hooks.server.ts`, mesurée le 12 octobre 2026 : **88,0 %** des lignes de code (343 fichiers, 6 203 lignes de code). Unitaires 24,1 %, intégration 19,6 %, e2e 80,0 % (chevauchement possible). Les composants `.svelte` ne sont pas mesurés.

Commandes : `npm run test:coverage:unit`, `npm run test:coverage:integration`, `npm run test:coverage:e2e` (serveur de dev instrumenté, environ 7 min), puis `npm run coverage:report` (fusion par ligne et liste des lignes manquantes dans `coverage/merged-uncovered.txt`).

Plus gros écarts (lignes de code manquantes) : `src/routes/auth` (87 % couvert, 117 lignes), `src/routes/admin` (87 %, 110), `src/lib/prisma` (82 %, 109), `src/routes/user` (91 %, 77), `src/lib/utils` (73 %, 59), `src/lib/server` (96 %, 38), `src/routes/api` (86 %, 35). Hors serveur : `store`, `animation`, `components`, `client` (navigateur).

Une ligne de code est une ligne où commence une instruction. Les chiffres publiés plus tôt (46,4 % puis 51,6 %) étaient sous-estimés : le rapport comptait des lignes fantômes et plaçait les compteurs de l'e2e sur le code transformé. Le script remappe maintenant vers le source d'origine.

- [x] Outil de couverture installé, rapports unitaire, intégration et e2e serveur, fusion par ligne.
- [ ] Code exécuté dans le navigateur (`animation`, `store`, `utils/particles`, `components`, `client`) ; `pdf` et `pwa/notifications` sont couverts en unitaire avec un navigateur et jsPDF factices : non mesuré par les e2e, qui n'instrumentent que le serveur. Récupérer `window.__coverage__` de chaque page dans les tests, ou le couvrir en unitaire.
- [ ] Fixer un seuil dans la CI, le relever à mesure que la liste ci-dessous avance.
- [x] Auth : redirections selon l'état du compte, actions sans session, emails (vérification, renvoi, changement d'email, mot de passe oublié, inscription, contact) avec un faux serveur SMTP, limites de tentatives, 2FA, étapes de démarrage isolées, gardes de requête, réinitialisation du mot de passe (`AUT1` à `AUT32`).
- [x] API et services (push, cron, géocodage, photos R2, statut des photos) et erreurs de l'espace utilisateur (`API1` à `API12`, `USR1` à `USR6`).
- [x] Unitaires : facture PDF, notifications PWA, client Cloudflare Stream, lancement de génération, utilitaires ; intégration : comptes, chiffrement, mots de passe, sessions de réinitialisation et de vérification, génération du programme.
- [x] `src/lib/server/photoValidatedEmail.ts` supprimé (jamais appelé).
- [x] Code jamais appelé supprimé : `updateUserSecurity.ts`, `getPublicIdFromUrl.ts`, `validateSessionToken` et `handleGoogleOAuth` (session et utilisateur), ainsi que les accès base devenus inutiles (`findSessionById`, `deleteSessionById`, `updateSessionExpiry`).
- [ ] Mesurer aussi les branches pour l'e2e (le rapport fusionné ne compte que les lignes).

## 1. Fonctions annoncées mais absentes (décision avant tests)

Rien à tester tant que la fonction n'existe pas. Pour chacune : l'implémenter puis écrire les tests, ou la retirer de l'interface.

- [ ] **Badges** (`BADGE_UNLOCK`, « +100 pts ») : attribution à la condition remplie, une seule fois, points crédités, affichage sur Progression, édition admin (`updateUserBadge`).
- [ ] **Défi 30 jours et défis** (`CHALLENGE_COMPLETE`, « +200 pts ») : démarrage, avancement, fin, points une seule fois, édition admin (`updateUserChallenge`).
- [ ] **Boutique de récompenses partenaires** (`PointReward`, `POINT_SPENT`, `getActiveRewards`) : liste, échange avec solde suffisant, refus si solde insuffisant, double clic (une seule dépense), code promo affiché, solde jamais négatif.
- [ ] **Affiliation / parrainage** : aucune base dans le code. À spécifier d'abord.
- [ ] **Pages maquettes** (Jeûne, Suivi, Défis, Défi 30 jours) : brancher puis tester, ou supprimer.

## 2. Parcours e2e à ajouter

**Public**

- [x] Formulaire `/contact` : message valide enregistré, champs invalides refusés, limite de débit.
- [x] `sitemap.xml` : pages publiques listées, pages privées absentes.
- [x] `/reglementations`.

**Admin**

- [x] Contact : liste, détail, suppression d'un message (`deleteContact`).
- [x] Utilisateurs : liste, suppression d'un compte (`deleteUser`) et de ses données.
- [x] Fiche utilisateur, onglets hors `AD1`–`AD11` : mensurations (ajout, suppression), photos de suivi, bilans mensuels, repas du cadencier (`updateNutritionDay`, `updateMeal`), séances (`updateWorkoutDay`), suppression d'une personnalisation sport, tâches (complétion, désactivation), progression vidéo, sessions et abonnements push, favoris, liste de courses, reprise du programme.
- [x] Calendrier de la fiche : valider un repas et une séance pour l'utilisateur (`complete-meal`, `complete-workout`), `program-summary` (`AD32` à `AD35`) ; refus de la fiche (`AD36` à `AD38`).
- [x] Tâches quotidiennes : modifier, activer / désactiver, supprimer.
- [x] Recettes : créer, supprimer depuis l'admin.
- [x] Vidéos : créer, modifier, supprimer, rattacher / détacher d'un jour, resynchroniser depuis Cloudflare, tout purger.
- [ ] Personnalisation sport saisie dans le navigateur (aujourd'hui testée par l'action seule, `AD5`).

**Utilisateur**

- [x] Découverte : marquer une vidéo vue dans chacune des cinq bibliothèques (explication, motivation, mindset, méditation, breathwork).
- [x] Liste de courses : bouton « Régénérer » (cases cochées conservées).
- [x] Photos d'inscription : envoi, statut (`check-photo-status`), rejet des fichiers invalides.
- [x] Notifications : abonnement push (`push-subscribe`, `push-vapid-public`) et désabonnement.
- [x] Recherche d'adresse (`/api/adresse`, API gouvernementale gratuite sans clé, session requise).
- [x] Envoi d'une vidéo par l'utilisateur (`cloudflare/stream/upload-url`) : refusé si non autorisé.
- [ ] Mobile : menu du rôle de l'onglet Compte hors écran (défaut connu), à corriger puis tester à la souris.

## 3. Intégration (vraie base MongoDB éphémère)

Reprend les cases restantes de `OPTIMISATION.md`.

- [ ] Verrou de génération : `FAILED` puis reprise ; paiement concurrent pendant une génération.
- [ ] Webhook Stripe rejoué : crédit unique, abonnement prolongé ; rattrapage depuis les mensurations.
- [ ] Renouvellement : un seul cycle ajouté même rejoué ; départ à l'heure et en retard.
- [ ] Cycle 2 de bout en bout : cadencier J1..J91 sur les jours 92..182, séances et vidéos à refaire, historique du cycle 1 intact, mois de suivi 4..6, rattrapage du cron.
- [ ] Liste de courses : remplacement atomique, cases conservées, une régénération par plage.
- [ ] Recalage des portions : empreinte identique sans effet, seuls les repas périmés réécrits.
- [ ] Plan sport : invalidation du snapshot après écriture admin et synchro Cloudflare, affectation A/B/C.
- [ ] Cron `daily-notification` : 401 sans `CRON_SECRET`, rattrapage de 5 comptes au plus.
- [ ] Suppression d'un utilisateur : aucune donnée orpheline dans les collections liées.

## 4. Unitaires

- [ ] Fichiers de `src/lib` sans `.spec.ts` (252 fichiers pour 35 specs) : établir la liste par la mesure de la section 0, puis couvrir en priorité les règles métier (points, droits d'accès, dates, génération) avant les simples accesseurs Prisma.
- [ ] Gardes `adminWriteGuard` et `userWriteGuard` : tableau complet méthode × chemin × rôle × accès.

## 5. Performance (budget en CI)

- [ ] Nombre de requêtes Prisma par page : `/user`, cadencier, jour, séance, courses (`countQueries` existe déjà).
- [ ] Durée de génération des 91 jours (seuil à fixer).

## 6. Hors de portée d'un faux service

À vérifier à la main avant chaque mise en production : vraie page de paiement Stripe (paiement en mode test), envoi réel vers Cloudflare et lecture vidéo, envoi réel des emails (SMTP) et des notifications push, page de connexion chez Google, catalogue de recettes de production.
