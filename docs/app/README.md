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
| 2. Accueil et checklist du jour | à venir | |
| 3. Sport | à venir | |
| 4. Nutrition et liste de courses | à venir | |
| 5. Découverte et progression | à venir | |
| 6. Administration | à venir | |

Les règles métier transverses (cycles de 91 jours, points, dates en heure de Paris) sont détaillées dans [`OPTIMISATION.md`](../../OPTIMISATION.md) tant qu'elles n'ont pas leur page.

## Lancer les tests

| Commande | Ce qu'elle vérifie | Durée |
|---|---|---|
| `npm run test:unit` | Logique pure, base simulée | ~1 min |
| `npm run test:integration` | Logique serveur sur une vraie base MongoDB éphémère | ~40 s |
| `npm run test:e2e` | Parcours complets dans un navigateur mobile (Pixel 7) | ~4 min pour la zone 1 |

`npx playwright test --ui` ouvre l'interface de Playwright (rejouer un test, voir chaque étape). Après un échec, `npx playwright show-report` affiche les captures et traces.

### Isolation des tests e2e

Les tests de bout en bout ne touchent **jamais** la base ni les services du `.env` :

- **Base** : MongoDB éphémère en replica set (`127.0.0.1:27037/thower_e2e`), créée au lancement et vidée avant chaque test. Un garde-fou refuse toute autre base.
- **Environnement** : l'application démarre avec `e2e/env/.env` (valeurs factices, versionnées) à la place du `.env` racine (`THOWER_ENV_DIR`, voir `svelte.config.js`). Ces valeurs sont aussi passées au processus, ce qui les rend prioritaires sur tout fichier `.env`.
- **Emails** : serveur SMTP injoignable, donc aucun envoi. Les codes de vérification sont lus en base.
- **Paiement** : aucun checkout Stripe. Les tests envoient au webhook des événements signés avec le secret factice.
- **Photos** : l'upload vers Cloudflare R2 est intercepté dans le navigateur.
- **Port** : l'application tourne sur `4380` et un serveur existant n'est jamais réutilisé (il pourrait viser une vraie base).

Seule exception connue : la page des mensurations appelle l'API Stripe pour rattraper un paiement. La clé factice est refusée par Stripe, ce qui est sans effet, mais l'appel sort sur le réseau.

### Écrire un test

- Importer `test` et `expect` depuis `e2e/support/test.ts` (base vidée automatiquement).
- Données et connexion : `e2e/support/db.ts` (`createUser`, `loginAs`, `latestVerificationCode`, `signStripeWebhook`).
- Gestes réutilisables : `e2e/support/flows.ts` (formulaire de démarrage, webhook de paiement, catalogue de recettes).
- Nommer le test avec l'identifiant de la règle documentée (`C1 · …`) et compléter la page de la zone.
- En mode dev, la première visite d'une page déclenche sa compilation (jusqu'à 30 s) : les délais de navigation sont larges.
