# État du projet Thower

Point au 12 octobre 2026, branche `optimisation` (à partir du commit `4ae3338`, avec les modifications de ce jour non encore commitées). Ne jamais fusionner avec `main`.

## En bref

- **Optimisations sport et nutrition terminées** : génération du cadencier en \~5 requêtes au lieu de \~550, verrou et reprise de génération, cache du plan sport, cycles de 91 jours pour les renouvellements, rattrapage automatique par le cron.
- **Toute l'application est documentée** dans `docs/app/`, en 6 zones. Chaque règle renvoie au test qui la vérifie.
- **415 tests automatisés passent** : 290 unitaires, 16 d'intégration sur une vraie base MongoDB éphémère, 104 de bout en bout (Playwright). Google, Stripe et Cloudflare sont joués par de faux services locaux : plus aucune zone n'est « non couverte ».
- **Une trentaine de défauts trouvés en écrivant les tests ont été corrigés**, dont un défaut de sécurité alimentaire (allergies ignorées), des accès sans paiement, des codes de récupération 2FA inutilisables et une fiche utilisateur admin qui n'enregistrait rien.
- **Reste à faire** : cinq actions de déploiement, puis les points « à explorer » ci-dessous.

## Où lire quoi

| Fichier                  | Contenu                                                                                 |
| ------------------------ | --------------------------------------------------------------------------------------- |
| `ETAT-DU-PROJET.md`      | Ce point d'étape.                                                                       |
| `OPTIMISATION.md`        | Détail des optimisations, des décisions prises et des tests restant à écrire.           |
| `docs/app/README.md`     | Index de la documentation et lancement des tests.                                       |
| `docs/app/01-…` à `06-…` | Une page par zone : parcours, règles, technique, écarts connus, défauts corrigés.       |
| `e2e/`                   | Tests Playwright (`support/` : base, comptes, paiement simulé, parcours réutilisables). |

## Ce qui est fait

### Optimisations (détail : `OPTIMISATION.md`, section 1)

- **Sport** : plan partagé mis en cache et invalidé à chaque écriture admin ; ordre 1 → 2 → 3 par semaine ; anti double validation ; personnalisation du plan par utilisateur (masquer, remplacer, ajouter des vidéos).
- **Nutrition** : génération par lots, verrou de génération avec bail de 10 min, recalcul des portions seulement si les cibles changent, liste de courses remplacée en transaction (cases cochées conservées).
- **Renouvellement** : chaque paiement après le premier ouvre un nouveau cycle de 91 jours. L'historique est conservé ; l'affichage passe à « Cycle 2 · Jour 5 ».
- **Transverse** : une seule lecture d'authentification par requête, dates de la checklist en heure de Paris, module unique d'attribution des points, cron protégé par `CRON_SECRET`.

### Défauts corrigés pendant les tests (détail : section « Corrigé » de chaque page `docs/app/`)

| Gravité      | Défaut                                                                                                                                                                                                                                                                                                                | Zone       |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **Critique** | Allergies ignorées : les recettes codent leurs allergènes en anglais, le profil en français ; seuls gluten et sésame étaient reconnus. Une personne allergique aux œufs, au lait, au poisson… recevait ces recettes.                                                                                                  | 4          |
| **Critique** | Un compte sans aucun paiement avait droit aux deux offres ; neuf actions et les API vidéo étaient ouvertes aux comptes non payants ou expirés (points gagnables).                                                                                                                                                     | 2          |
| Haute        | Formulaires de compte bloqués après une erreur, sans message (vérification d'email, Mon compte, 2FA, connexion).                                                                                                                                                                                                      | 1          |
| Haute        | Formulaire de démarrage : un champ invalide sur une étape précédente bloquait « Enregistrer » sans message.                                                                                                                                                                                                           | 1          |
| Haute        | Page de vérification en erreur 500 si l'email ne pouvait pas partir.                                                                                                                                                                                                                                                  | 1          |
| Haute        | Enregistrer une recette dans l'admin effaçait ses allergènes.                                                                                                                                                                                                                                                         | 4, 6       |
| Moyenne      | Code de récupération 2FA envoyé au navigateur sans raison ; déconnexion effaçant le mauvais cookie ; photos et bien-être accessibles sans email vérifié ni paiement.                                                                                                                                                  | 1          |
| Moyenne      | Rattrapage Stripe toujours en échec (filtre non accepté par l'API).                                                                                                                                                                                                                                                   | 1          |
| Basse        | \~100 messages en anglais traduits ; lien « Abonnement » en 404 ; barème des points faux (5 au lieu de 10 par vidéo).                                                                                                                                                                                                 | 1, 5       |
| **Critique** | Code de récupération 2FA inutilisable : la page de récupération exigeait 8 caractères pour un code de 16. Un utilisateur ayant perdu son appareil ne pouvait pas récupérer son compte.                                                                                                                                | 1          |
| Haute        | Formulaires de connexion et de mot de passe oublié : après une erreur (mauvais mot de passe, email inconnu), le formulaire disparaissait de la page jusqu'au rechargement. 62 messages d'erreur d'authentification corrigés.                                                                                          | 1          |
| Haute        | Fiche utilisateur admin, onglet Compte : les champs n'étaient pas envoyés, « Enregistrer » ne modifiait rien (rôle, abonnement, mot de passe, email).                                                                                                                                                                 | 6          |
| Moyenne      | Fiche utilisateur admin, onglet Profil : impossible d'enregistrer un profil dont le tri de la liste de courses était vide.                                                                                                                                                                                            | 6          |
| Moyenne      | Facture PDF jamais téléchargée (logo absent) ; la page quittait aussi avant la fin de la génération.                                                                                                                                                                                                                  | 1, 6       |
| Moyenne      | Mot de passe oublié : un échec d'envoi de l'email faisait tomber la demande en erreur 500.                                                                                                                                                                                                                            | 1          |
| Haute        | Limite de débit : le seau à jetons ne se rechargeait pas tant que les requêtes d'une IP arrivaient à moins d'une seconde d'écart. Une fois les 100 requêtes d'avance consommées, un trafic régulier restait bloqué (429) ; corrigé, avec test unitaire. Le plafond global se règle par `RATE_LIMIT_MAX` (défaut 100). | transverse |

### Tests

- **Isolation** : les tests ne touchent jamais la base ni les services du `.env`. Base éphémère, environnement factice (`e2e/env/.env`), paiements Stripe simulés par des webhooks signés, emails non envoyés, navigateur coupé de l'extérieur. Google, Stripe (SDK) et Cloudflare Stream sont redirigés vers un faux serveur local (`e2e/support/fakeExternals.ts`, détail dans `docs/app/README.md`).
- **Commandes** : `npm run test:unit`, `npm run test:integration`, `npm run test:e2e` (environ 5 min), `npm run check` (0 erreur, 0 avertissement ; les types de `$env/static/private` demandent les variables de `e2e/env/.env`).
- **Intégration continue** : `.github/workflows/ci.yml` lance les quatre commandes à chaque push (à vérifier à la première exécution sur GitHub).
- **Autre machine** : `npx playwright install chromium` une fois, et `npx prisma generate` après tout changement du schéma.

## À faire au déploiement

1. `npx prisma db push`, **jamais** avec `--accept-data-loss`. Le schéma ajoute `company_profiles`, `user_sport_overrides`, `programGenStatus`, `programGenStartedAt`, `programGenFinishedAt`, `nutritionTargetsKey`, `programCycleStarts` et deux index. Vérifier ensuite la collection et les index.
2. Définir `CRON_SECRET` dans Vercel, sinon le cron (rappels push et rattrapage des générations) répond 401.
3. Lancer `npm run migrate:checklist-dates`, qui affiche ce qu'il ferait, puis `npm run migrate:checklist-dates -- --apply` sur chaque base. On peut le relancer sans risque.
4. Faire un paiement en mode test Stripe pour vérifier de bout en bout la vraie page de paiement (les tests utilisent un faux Stripe).
5. Renseigner Admin > Entreprise (raison sociale, SIRET, adresse, e-mail, hébergeur, logo, mention de facture) : les mentions légales, la politique de confidentialité, les pieds de page et les PDF s'alimentent de cette fiche. Sans elle, les pages affichent seulement « Thower ».

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

Les parcours sont tous couverts. Restent, par nature, hors de portée d'un faux service :

- La vraie page de paiement Stripe, l'envoi réel de fichiers vers Cloudflare (le navigateur vers Cloudflare en tus) et la lecture réelle d'une vidéo.
- L'envoi réel des emails (SMTP) et des notifications push.
- La page de connexion Google chez Google (seul le retour vers l'application est testé).
- Le comportement d'un vrai catalogue de recettes plus grand que le seed : la qualité des journées est vérifiée sur les 91 jours de plusieurs profils par les tests unitaires de `dayPlanner`, avec 12 candidats par créneau.

### Dette technique

- **ESLint** : 292 erreurs sur `src`, toutes antérieures (surtout `no-navigation-without-resolve`, `require-each-key`, variables inutilisées).
- **Tests e2e en mode dev** : la première visite de chaque page compile à la volée (jusqu'à 30 s). Un mode « build + preview » serait plus rapide, mais écrirait un build avec l'environnement factice : à isoler (dossier de sortie séparé) avant de l'adopter.
- **Pages historiques** `/auth/photos` et `/auth/well-being` : protégées, mais plus utilisées par le parcours actuel. À supprimer ?
- **Divergence avec** `main` : `main` contient le commit `9214008` (« séance bonus hub »), absent de `optimisation`, qui regroupe Méditation, Mindset et Breathwork. La doc de la zone 5 décrit l'état de `optimisation`.
- **Autre machine sans AVX** : lancer les tests d'intégration et e2e avec `MONGOMS_VERSION=4.4.29` et la `libssl1.1` locale (voir `scripts/dev-mongo.mjs`).
