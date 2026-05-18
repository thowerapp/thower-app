# Thower

Site d’accompagnement Thower — coach et programme personnalisé.

stripe listen --forward-to localhost:2000/api/webhooks

### Logs génération programme nutrition

Filtrer les logs serveur sur le préfixe **`[program-gen]`** (toujours actif en prod).

| `step` | Signification |
|--------|----------------|
| `trigger` | Déclencheur (mensurations, retour Stripe, webhook) |
| `schedule_start` / `schedule_ok` / `schedule_denied` | Contrôles paiement / admin |
| `generate_start` / `generate_done` / `generate_abort` | Génération BDD |
| `schedule_complete` | Pipeline terminé sans erreur |

Détail verbeux : `PROGRAM_GENERATION_LOG=1` dans `.env` → préfixe `[program-generation]`.

- **Stack** : SvelteKit, Vite, PWA (vite-plugin-pwa, injectManifest).
- **Déploiement** : Vercel. Un push sur `main` déclenche un déploiement automatique.
- **PWA** : voir [docs/pwa.md](docs/pwa.md) pour les tests et le débogage du service worker.


la génération doit prendre en charge plusieurs choses.

~~-les allergènes (faire une liste des allergène dans le formulaire afin de pouvoir faire quelque chose de dynamique)~~

-ingérendients non désirés (faire une liste des ingérendients non désirés dans le formulaire afin de pouvoir faire quelque chose de dynamique)

-les coefficients familiaux (une portions sur la recette -pas de calcul)

-les mensurations

-le jeune intermittent (si breakfast 30% / lunch 35% / dinner 35% sinon lunch 50% / dinner 50%)

-extraire les ingrédients des recettes et les ajouter dans la liste de courses

-Le raccourci de l'application doit ramener directement sur l'accueil de /user/

-Le score des joueurs doit remonter dans leur data sur le dashboard admin