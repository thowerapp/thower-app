# Documentation de l'application Thower

Ce dossier décrit l'application fonctionnalité par fonctionnalité. Chaque page est organisée de la même façon :

1. **Parcours** : ce que vit l'utilisateur, étape par étape.
2. **Règles** : le comportement attendu, numérotées (`C1`, `P2`…). Chaque règle renvoie au test Playwright qui la vérifie.
3. **Technique** : routes, modèles de données et fichiers clés.
4. **Écarts connus** : comportements constatés qui ne sont pas encore corrigés ou testés.

Une règle sans test est signalée « non couvert ».

## Zones

| Zone | Page | Tests |
|---|---|---|
| 1. Compte, paiement et formulaire de démarrage | [01-compte-et-demarrage.md](01-compte-et-demarrage.md) | `e2e/01-compte-et-demarrage.spec.ts` |
| 2. Accueil et checklist du jour | [02-accueil-et-checklist.md](02-accueil-et-checklist.md) | `e2e/02-accueil-et-checklist.spec.ts` |
| 3. Sport | [03-sport.md](03-sport.md) | `e2e/03-sport.spec.ts` |
| 4. Nutrition et liste de courses | [04-nutrition.md](04-nutrition.md) | `e2e/04-nutrition.spec.ts` |
| 5. Découverte, progression et paramètres | [05-decouverte-progression-parametres.md](05-decouverte-progression-parametres.md) | `e2e/05-decouverte-progression-parametres.spec.ts` |
| 6. Administration | [06-administration.md](06-administration.md) | `e2e/06-administration.spec.ts` |
| 1 (suite). Sécurité du compte | [01-compte-et-demarrage.md](01-compte-et-demarrage.md) | `e2e/07-securite-du-compte.spec.ts` |
| 1 et 6 (suite). Services externes | [01-compte-et-demarrage.md](01-compte-et-demarrage.md), [06-administration.md](06-administration.md) | `e2e/08-services-externes.spec.ts` |
| 6 (suite). Fiche entreprise | [06-administration.md](06-administration.md) | `e2e/09-entreprise.spec.ts` |

Les règles métier transverses (cycles de 91 jours, points, dates en heure de Paris) sont détaillées dans [`OPTIMISATION.md`](../../OPTIMISATION.md) tant qu'elles n'ont pas leur page.

## Lancer les tests

| Commande | Ce qu'elle vérifie | Durée |
|---|---|---|
| `npm run test:unit` | Logique pure, base simulée | ~1 min |
| `npm run test:integration` | Logique serveur sur une vraie base MongoDB éphémère | ~40 s |
| `npm run test:e2e` | 104 parcours dans un navigateur mobile (Pixel 7), sur les 6 zones | ~5 min |

`npx playwright test --ui` ouvre l'interface de Playwright (rejouer un test, voir chaque étape). Après un échec, `npx playwright show-report` affiche les captures et traces.

### Isolation des tests e2e

Les tests de bout en bout ne touchent **jamais** la base ni les services du `.env` :

- **Base** : MongoDB éphémère en replica set (`127.0.0.1:27037/thower_e2e`), créée au lancement et vidée avant chaque test. Un garde-fou refuse toute autre base.
- **Environnement** : l'application démarre avec `e2e/env/.env` (valeurs factices, versionnées) à la place du `.env` racine (`THOWER_ENV_DIR`, voir `svelte.config.js`). Ces valeurs sont aussi passées au processus, ce qui les rend prioritaires sur tout fichier `.env`.
- **Emails** : serveur SMTP injoignable, donc aucun envoi. Les codes de vérification sont lus en base.
- **Paiement** : aucun appel à Stripe. Les tests envoient au webhook des événements signés avec le secret factice, et le SDK Stripe de l'application est redirigé vers un faux serveur local (voir plus bas).
- **Photos** : l'upload vers Cloudflare R2 est intercepté dans le navigateur.
- **Port** : l'application tourne sur `4380` et un serveur existant n'est jamais réutilisé (il pourrait viser une vraie base).

**Faux services externes** : `e2e/support/fakeExternals.ts` est un serveur local (port 4381) qui joue Google (échange du code OAuth), Stripe (création, lecture et liste des sessions de paiement) et Cloudflare Stream (vidéos, jetons, envoi). L'application y est redirigée par `e2e/support/externalsPreload.mjs`, chargé au démarrage du serveur de test (`NODE_OPTIONS=--import`) : aucun appel réel ne sort. Les tests le pilotent avec `fakes` (`e2e/support/fakes.ts`) : identité Google d'un code, sessions Stripe, vidéos Cloudflare ; il est remis à zéro avant chaque test.

### Écrire un test

- Importer `test` et `expect` depuis `e2e/support/test.ts` (base vidée automatiquement).
- Données et connexion : `e2e/support/db.ts` (`createUser`, `loginAs`, `latestVerificationCode`, `signStripeWebhook`).
- Gestes réutilisables : `e2e/support/flows.ts` (formulaire de démarrage, webhook de paiement, catalogue de recettes).
- Nommer le test avec l'identifiant de la règle documentée (`C1 · …`) et compléter la page de la zone.
- En mode dev, la première visite d'une page déclenche sa compilation (jusqu'à 30 s) : les délais de navigation sont larges.
