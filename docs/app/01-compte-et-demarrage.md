# 1. Compte, paiement et formulaire de démarrage

Du premier passage sur le site jusqu'à l'ouverture de l'espace utilisateur (`/user`).

## Parcours

1. **Inscription** (`/auth/signup`, ou le formulaire en bas de l'accueil) : nom, email, mot de passe et confirmation.
2. **Vérification de l'email** (`/auth/verify-email`) : un code à 8 chiffres est envoyé par email, valable 10 minutes.
3. **Tableau de démarrage** (`/auth`) : trois étapes à cocher, dans l'ordre : souscription, photos, mensurations.
4. **Souscription** (`/auth/subscription`) : choix des offres Nutrition et/ou Sport (249,99 € chacune pour 3 mois), puis paiement Stripe. Un code d'accès peut remplacer le paiement.
5. **Formulaire de démarrage** (`/auth/measurement?new=1`), en 10 étapes :
   1. présentation de la méthode (vidéo) ;
   2. préparation des exercices et des photos ;
   3. photos de référence (face, profil, dos), étape facultative ;
   4. bienvenue ;
   5. morphologie (âge, taille, poids, % de masse grasse, tours de taille, de torse, de bras) ;
   6. lifestyle et activité (sédentaire, modéré, très actif) ;
   7. santé (douleurs, pathologies) ;
   8. objectifs (perte de graisse, prise de muscle…) et objectif de perte en kg ;
   9. alimentation (équipement de cuisine, petit-déjeuner, pain, allergènes, aliments à éviter) ;
   10. sport et contexte, puis « Enregistrer ».
6. **Génération du programme** : à l'enregistrement, le cadencier nutrition (91 jours de 3 repas) est généré en arrière-plan. Le programme démarre le lundi suivant (ou le jour même si l'on est lundi), à minuit heure de Paris.
7. **Espace utilisateur** (`/user`) : accessible une fois le paiement et les mensurations faits.

## Règles

### Inscription et vérification

| Règle | Test |
|---|---|
| **C1** Après l'inscription, l'utilisateur arrive sur la vérification de l'email. Un code faux affiche « Code incorrect. » sans bloquer le formulaire, et le bon code mène au tableau de démarrage. | `C1` |
| **C2** Le mot de passe doit faire au moins 8 caractères, avec une majuscule et un chiffre ; sinon aucun compte n'est créé. | `C2` |
| **C3** Un email déjà inscrit renvoie vers la connexion (`/auth/login?reason=already_registered`). | `C3` |
| **C4** Tant que l'email n'est pas vérifié, `/auth`, la souscription, les photos, le bien-être, le formulaire et l'espace renvoient vers la vérification. | `C4` |
| **C7** Si l'email de vérification ne peut pas partir, la page s'affiche quand même et le signale ; « Renvoyer le code » affiche son résultat. | `C7` |
| Le code expire au bout de 10 minutes ; une tentative après expiration envoie un nouveau code. | non couvert |
| Inscription et connexion avec Google. | non couvert (nécessite un faux fournisseur OAuth) |
| Double authentification (TOTP, codes de récupération) et mot de passe oublié. | non couvert |

### Connexion

| Règle | Test |
|---|---|
| **C5** Email et mot de passe ouvrent une session ; « Se déconnecter » la ferme (l'espace renvoie alors vers la connexion). | `C5` |
| **C6** Un mauvais mot de passe affiche « Email ou mot de passe incorrect. » et ne crée aucune session. | `C6` |
| **C8** Un email inconnu affiche « Aucun compte avec cet email : créez un compte. » | `C8` |
| **C9** Dans Mon compte, un mot de passe actuel faux est signalé comme une erreur ; un changement réussi ferme les autres sessions et garde celle du navigateur. | `C9` |

### Paiement et accès

| Règle | Test |
|---|---|
| **P1** Sans paiement valide, `/user`, les photos, le bien-être et le formulaire de démarrage renvoient vers la souscription (l'admin est dispensé). | `P1` |
| **P2** Un paiement confirmé par Stripe (webhook `checkout.session.completed`) crée une transaction payée, ouvre 3 mois d'accès et alloue 91 jours de nutrition. Un même événement rejoué ne crédite rien de plus. | `P2` |
| **P3** L'offre Sport seule ouvre l'accès sans allouer de jours nutrition. | `P3` |
| **P4** Un webhook à la signature invalide est rejeté (400), sans transaction. | `P4` |
| **P5** Un code d'accès valide donne un accès à vie, une seule fois ; un code inconnu ou déjà utilisé est refusé. La saisie ne tient pas compte des majuscules. | `P5` |
| Retour du checkout Stripe (`?success=1&session_id=…`) : la transaction est rattrapée si le webhook n'est pas encore arrivé. | non couvert (nécessite un faux serveur Stripe) |
| Renouvellement : un paiement après le premier ouvre un nouveau cycle de 91 jours (voir `OPTIMISATION.md`, D2). | couvert en tests unitaires, pas en e2e |

### Formulaire de démarrage

| Règle | Test |
|---|---|
| **D1** Impossible de quitter l'étape Morphologie sans âge, taille, poids et les trois tours. Un message le signale. | `D1` |
| **D3** Au clic sur « Enregistrer », tout le formulaire est validé. Si un champ d'une étape précédente est invalide (par exemple une masse grasse au-delà de 70 %, ou une photo encore en cours d'envoi), un message nomme le champ et le motif, et le formulaire revient à l'étape concernée. Rien n'est enregistré avant correction. | `D3` |
| **D2** Formulaire complet : mensuration, profil et 3 photos enregistrés, retour au tableau de démarrage, date de départ posée, cadencier de 91 jours généré, espace utilisateur ouvert. | `D2` |

## Technique

- **Routes** : `src/routes/auth/{signup,verify-email,login,subscription,measurement}`, `src/routes/api/webhooks` (Stripe), `src/routes/auth/+page.*` (tableau de démarrage).
- **Garde-fous de navigation** : chaque `load` vérifie dans cet ordre : session, puis email vérifié, puis 2FA, puis paiement, puis mensurations. Les écritures `/admin/**` sont protégées dans `src/hooks.server.ts`.
- **Authentification** : Lucia v3 (`src/lib/lucia`), sessions en base (`Session`), mots de passe argon2id, cookie `auth_session`.
- **Paiement** : `src/lib/server/stripe/reconcileCheckoutSession.ts`. Le crédit est idempotent par transaction (`nutritionSegmentCreditedAt`) ; le webhook, le retour du checkout et la page des mensurations passent tous par ce module.
- **Codes d'accès** : `src/lib/prisma/redemptionCode/redeemCode.ts` (modèle `RedemptionCode`).
- **Formulaire** : `src/routes/auth/measurement/+page.svelte` et ses `Step*.svelte`, schéma `src/lib/schema/measurement/measurementSchema.ts`. Les photos sont envoyées à `/api/cloudflare/r2/upload`.
- **Génération** : `scheduleProgramGenerationAfterPayment` (`src/lib/server/program-generation`), lancée en arrière-plan avec un verrou.

## Écarts connus

- **Pages historiques** : `/auth/photos` et `/auth/well-being` appartiennent à l'ancien parcours (photos, bien-être, puis mensurations). Le parcours actuel passe par le formulaire en 10 étapes. Elles ne sont plus liées depuis l'application mais restent protégées comme les autres étapes.
- **Appel réseau en test** : la page des mensurations interroge l'API Stripe pour rattraper un paiement, même dans les tests e2e (clé factice refusée, sans effet).

Corrigé lors de la mise en place de ces tests :

- **Vérification de l'email** : après un mauvais code, le formulaire n'envoyait plus rien et aucun message ne s'affichait. Il fallait recharger la page. C'est couvert par `C1`.
- **Blocage silencieux à l'enregistrement** : un champ invalide sur une étape précédente empêchait « Enregistrer » sans aucun message. C'est couvert par `D3`.
- **Messages de compte** : environ 100 messages en anglais (connexion, 2FA, mot de passe oublié, paramètres) sont traduits à partir d'une table unique. Plusieurs actions renvoyaient leurs erreurs dans un format qui empêchait leur affichage et bloquait le formulaire (même défaut que la vérification d'email) : elles passent toutes par `message(form, …, { status })`. Dans Mon compte, les erreurs s'affichaient comme des succès. C'est couvert par `C6`, `C8` et `C9`.
- **Email injoignable** : un échec d'envoi du code faisait tomber la page de vérification en erreur 500. C'est couvert par `C7`.
- **Photos et bien-être** : accessibles sans email vérifié ni paiement. Ils passent désormais par `requirePaidOnboarding` (`src/lib/server/access.ts`), au chargement comme à l'envoi. C'est couvert par `C4` et `P1`.
- **Code de récupération 2FA** : le tableau de démarrage le déchiffrait et l'envoyait au navigateur à chaque affichage, sans l'utiliser. Ce code mort est supprimé, avec trois actions dupliquées de Mon compte.
- **Déconnexion** : elle effaçait un cookie `session` inexistant ; elle efface désormais le cookie `auth_session` et renvoie vers la connexion.
