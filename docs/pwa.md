# PWA et Service Worker — Tests et débogage

Ce document décrit comment tester et déboguer le service worker et la PWA Thower.

## Outils de développement (Chrome / Edge)

### Onglet Application

1. Ouvrir les **DevTools** (F12) → onglet **Application**.
2. Dans la barre latérale gauche :
   - **Service Workers** : état du SW (activated, waiting), boutons **Update on reload**, **Bypass for network**.
   - **Cache Storage** : liste des caches (precache Workbox, `thower-http-cache`). Clic droit sur un cache pour le vider ou le supprimer.
   - **Manifest** : aperçu du manifeste PWA (nom, icônes, start_url, etc.).

### Console du Service Worker

- Dans **Application → Service Workers**, cliquer sur le lien **inspect** à côté du SW pour ouvrir une fenêtre dédiée dont la console affiche les logs et erreurs du worker.

### Comportements utiles en dev

- **Update on reload** : à chaque rechargement, le navigateur tente de mettre à jour le SW. Utile pour tester les mises à jour sans fermer les onglets.
- **Bypass for network** : les requêtes ne passent plus par le SW ; tout part au réseau. Utile pour isoler des bugs réseau ou éviter le cache.
- Désactiver **Update on reload** pour tester le flux « nouvelle version en attente » → bandeau « Recharger » → activation du nouveau SW.

## Scénarios à vérifier

### 1. Enregistrement et precache

- Charger l’app (HTTPS ou localhost).
- Dans **Application → Service Workers**, vérifier qu’un SW est **activated**.
- Dans **Cache Storage**, vérifier la présence du precache Workbox (noms générés par le plugin) et du cache runtime `thower-http-cache` après navigation.

### 2. Mise à jour (nouvelle version)

Ce scénario est géré par le layout (enregistrement via `virtual:pwa-register`, bandeau + bouton Recharger) et par le SW (`skipWaiting` + écoute du message `SKIP_WAITING`).

- Avec **Update on reload** désactivé dans DevTools : déployer une nouvelle version (ou modifier `src/sw.ts` et rebuild).
- Recharger la page **ou** revenir sur l’onglet (un contrôle `registration.update()` est fait à chaque `visibilitychange` vers visible) : un nouveau SW peut apparaître en état **waiting**.
- Vérifier l’affichage du bandeau « Nouvelle version disponible. Rechargez pour mettre à jour. ».
- Cliquer sur **Recharger** : le SW en attente reçoit `SKIP_WAITING`, appelle `skipWaiting()`, la page se recharge et le nouveau SW devient **activated**.

### 3. Offline

- Dans **Application → Service Workers**, cocher **Offline** (ou via l’onglet Network).
- Recharger ou naviguer : les pages et assets en precache / runtime cache doivent continuer à s’afficher ; les requêtes non mises en cache échouent.

### 4. Notifications push

- Accorder la permission de notification (après un geste utilisateur).
- Envoyer une notification (backend ou outil type web-push) : elle doit s’afficher même si l’onglet est en arrière-plan.
- Cliquer sur la notification : l’app doit s’ouvrir ou se focaliser et naviguer vers l’URL dans `data.url`.

### 5. Rappel quotidien à 20h40

- L’utilisateur qui clique sur « Notification de test » (Paramètres) enregistre aussi son abonnement push côté serveur.
- Un cron Vercel appelle `/api/cron/daily-notification` à **20h40** (heure Paris, 19h40 UTC en hiver).
- Le serveur envoie une Web Push à tous les abonnements enregistrés : la notification s’affiche même si l’app est fermée.
- **Variables d’environnement requises** (Vercel ou `.env`) :
  - `VAPID_PUBLIC_KEY` et `VAPID_PRIVATE_KEY` : clés Web Push (générer avec `npx web-push generate-vapid-keys`).
  - `CRON_SECRET` : secret partagé pour sécuriser l’appel au cron (Vercel envoie `Authorization: Bearer <CRON_SECRET>`).

### Pourquoi je ne reçois pas les notifications ?

1. **Vercel (gratuit)** : les Cron Jobs sont inclus sur le plan Hobby. Pas besoin de payer. Sur le plan gratuit, l’exécution est « une fois par jour » avec une précision d’environ ±59 min.
2. **Variables d’environnement** (Vercel → Project → Settings → Environment Variables) : `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` et `CRON_SECRET` doivent être définis. Sinon l’abonnement ou l’envoi échoue.
3. **Base de données** : exécuter `npx prisma db push` (ou les migrations) pour créer la collection des abonnements push.
4. **Abonnement depuis le mobile** : pour recevoir sur ton téléphone, ouvre le site **en production (HTTPS)** sur ce téléphone, connecte-toi, puis clique sur « Notification de test » dans Paramètres. Chaque appareil enregistre son propre abonnement.
5. **Test manuel** : ouvre dans un navigateur (sans être connecté au site) :  
   `https://ton-domaine.vercel.app/api/cron/daily-notification?secret=TON_CRON_SECRET`  
   Tu devrais recevoir la notification sur les appareils abonnés. Vérifier dans les logs Vercel (Functions) la réponse `sent` / `failed` / `total`.

## Build et déploiement

- Le SW est construit par `vite-plugin-pwa` en mode **injectManifest** à partir de `src/sw.ts`.
- Le fichier généré est émis dans `.svelte-kit/output/client/sw.js` lors de `vite build`.
- En production, s’assurer que l’app est servie en **HTTPS** (requis pour les SW et les notifications).

## Dépannage rapide

- **Le bandeau « Recharger » n’apparaît pas** : vérifier que `registerSW` est bien appelé (virtual `virtual:pwa-register`) et que `onNeedRefresh` est déclenché ; vérifier qu’un SW **waiting** existe dans Application.
- **Ancienne version toujours servie** : vider **Cache Storage** et **Unregister** le SW dans Application, puis recharger.
- **Notifications ne s’affichent pas** : vérifier la permission du site, que le SW est **activated**, et que les handlers `push` / `notificationclick` sont bien dans le SW servi (fichier `src/sw.ts` avec injectManifest).
