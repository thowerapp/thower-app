# État du projet Thower

Point au 12 octobre 2026, branche `optimisation` (commit `13d9df7`, synchronisée avec `origin`). Ne jamais fusionner avec `main`.

## En bref

- **Optimisations sport et nutrition terminées** : génération du cadencier en ~5 requêtes au lieu de ~550, verrou et reprise de génération, cache du plan sport, cycles de 91 jours pour les renouvellements, rattrapage automatique par le cron.
- **Toute l'application est documentée** dans `docs/app/`, en 6 zones. Chaque règle renvoie au test qui la vérifie.
- **354 tests automatisés passent** : 273 unitaires, 16 d'intégration sur une vraie base MongoDB éphémère, 65 de bout en bout (Playwright) sur les 6 zones.
- **Une vingtaine de défauts trouvés en écrivant les tests ont été corrigés**, dont un défaut de sécurité alimentaire (allergies ignorées) et des accès sans paiement.
- **Reste à faire** : trois actions de déploiement, puis les points « à explorer » ci-dessous.

## Où lire quoi

| Fichier | Contenu |
|---|---|
| `ETAT-DU-PROJET.md` | Ce point d'étape. |
| `OPTIMISATION.md` | Détail des optimisations, des décisions prises et des tests restant à écrire. |
| `docs/app/README.md` | Index de la documentation et lancement des tests. |
| `docs/app/01-…` à `06-…` | Une page par zone : parcours, règles, technique, écarts connus, défauts corrigés. |
| `e2e/` | Tests Playwright (`support/` : base, comptes, paiement simulé, parcours réutilisables). |

## Ce qui est fait

### Optimisations (détail : `OPTIMISATION.md`, section 1)

- **Sport** : plan partagé mis en cache et invalidé à chaque écriture admin ; ordre 1 → 2 → 3 par semaine ; anti double validation ; personnalisation du plan par utilisateur (masquer, remplacer, ajouter des vidéos).
- **Nutrition** : génération par lots, verrou de génération avec bail de 10 min, recalcul des portions seulement si les cibles changent, liste de courses remplacée en transaction (cases cochées conservées).
- **Renouvellement** : chaque paiement après le premier ouvre un nouveau cycle de 91 jours. L'historique est conservé ; l'affichage passe à « Cycle 2 · Jour 5 ».
- **Transverse** : une seule lecture d'authentification par requête, dates de la checklist en heure de Paris, module unique d'attribution des points, cron protégé par `CRON_SECRET`.

### Défauts corrigés pendant les tests (détail : section « Corrigé » de chaque page `docs/app/`)

| Gravité | Défaut | Zone |
|---|---|---|
| **Critique** | Allergies ignorées : les recettes codent leurs allergènes en anglais, le profil en français ; seuls gluten et sésame étaient reconnus. Une personne allergique aux œufs, au lait, au poisson… recevait ces recettes. | 4 |
| **Critique** | Un compte sans aucun paiement avait droit aux deux offres ; neuf actions et les API vidéo étaient ouvertes aux comptes non payants ou expirés (points gagnables). | 2 |
| Haute | Formulaires de compte bloqués après une erreur, sans message (vérification d'email, Mon compte, 2FA, connexion). | 1 |
| Haute | Formulaire de démarrage : un champ invalide sur une étape précédente bloquait « Enregistrer » sans message. | 1 |
| Haute | Page de vérification en erreur 500 si l'email ne pouvait pas partir. | 1 |
| Haute | Enregistrer une recette dans l'admin effaçait ses allergènes. | 4, 6 |
| Moyenne | Code de récupération 2FA envoyé au navigateur sans raison ; déconnexion effaçant le mauvais cookie ; photos et bien-être accessibles sans email vérifié ni paiement. | 1 |
| Moyenne | Rattrapage Stripe toujours en échec (filtre non accepté par l'API). | 1 |
| Basse | ~100 messages en anglais traduits ; lien « Abonnement » en 404 ; barème des points faux (5 au lieu de 10 par vidéo). | 1, 5 |

### Tests

- **Isolation** : les tests ne touchent jamais la base ni les services du `.env`. Base éphémère, environnement factice (`e2e/env/.env`), paiements Stripe simulés par des webhooks signés, emails non envoyés, navigateur coupé de l'extérieur.
- **Commandes** : `npm run test:unit`, `npm run test:integration`, `npm run test:e2e` (environ 7 min), `npm run check` (0 erreur, 0 avertissement).

## À faire au déploiement

1. `npx prisma db push`, **jamais** avec `--accept-data-loss`. Le schéma ajoute `user_sport_overrides`, `programGenStatus`, `programGenStartedAt`, `programGenFinishedAt`, `nutritionTargetsKey`, `programCycleStarts` et deux index. Vérifier ensuite la collection et les index.
2. Définir `CRON_SECRET` dans Vercel, sinon le cron (rappels push et rattrapage des générations) répond 401.
3. Lancer `npm run migrate:checklist-dates`, qui affiche ce qu'il ferait, puis `npm run migrate:checklist-dates -- --apply` sur chaque base. On peut le relancer sans risque.
4. Faire un paiement en mode test Stripe pour vérifier le rattrapage de paiement depuis les mensurations (non testable sans Stripe).

## À explorer

### Décisions produit (rien n'a été changé)

- **Badges et défis** : la page Progression annonce des badges, « Badge débloqué +100 pts » et « Défi 30 jours +200 pts », mais rien ne les attribue. Les implémenter ou les retirer ?
- **Pages maquettes** : Jeûne, Suivi (poids, historique, macros), Défis et Défi 30 jours n'ont aucune donnée et ne sont liées depuis aucun menu. Les brancher ou les supprimer ?
- **Liste de courses** : l'action « Régénérer » existe, mais aucun bouton ne l'appelle.
- **Arrêt du programme par l'admin** : enregistré et affiché, mais il ne décale pas les jours du programme.
- **Second achat d'offre** : acheter plus tard la seconde offre ouvre un nouveau cycle, comme un renouvellement. Faut-il une règle à part ?
- **Allergène « seeds »** (graines) : il ne fait pas partie des 14 allergènes réglementaires ; il n'est ni affiché ni filtré.
- **Textes** : accueil admin en anglais, sous-titres des bibliothèques Découverte incohérents, unité doublée sur la fiche recette (« 450 g · g »).

### Non couvert par les tests

- Connexion Google, double authentification (TOTP, codes de récupération), mot de passe oublié : il faudrait un faux fournisseur et une horloge TOTP.
- Retour depuis le checkout Stripe et renouvellement de bout en bout : il faudrait un faux serveur Stripe.
- Envoi et synchronisation des vidéos Cloudflare, export PDF des ventes, factures et bordereaux.
- Gestes tactiles du planning sport (appui long et glisser) : seul le déplacement est testé, par son action.
- Qualité des journées générées sur de vrais profils (12 candidats par créneau, `OPTIMISATION.md` T-d).

### Dette technique

- **Pas de CI** : aucun `.github/workflows`. À créer pour lancer `check`, `test:unit`, `test:integration` et `test:e2e` à chaque push.
- **ESLint** : 292 erreurs sur `src`, toutes antérieures (surtout `no-navigation-without-resolve`, `require-each-key`, variables inutilisées).
- **Tests e2e en mode dev** : la première visite de chaque page compile à la volée (jusqu'à 30 s). Un mode « build + preview » serait plus rapide, mais écrirait un build avec l'environnement factice : à isoler (dossier de sortie séparé) avant de l'adopter.
- **Pages historiques** `/auth/photos` et `/auth/well-being` : protégées, mais plus utilisées par le parcours actuel. À supprimer ?
- **Appels réseau sortants en test** : la page des mensurations interroge Stripe, et le jeton vidéo interroge Cloudflare, avec des identifiants factices refusés et sans effet.
- **Divergence avec `main`** : `main` contient le commit `9214008` (« séance bonus hub »), absent de `optimisation`, qui regroupe Méditation, Mindset et Breathwork. La doc de la zone 5 décrit l'état de `optimisation`.
- **Autre machine sans AVX** : lancer les tests d'intégration et e2e avec `MONGOMS_VERSION=4.4.29` et la `libssl1.1` locale (voir `scripts/dev-mongo.mjs`).
