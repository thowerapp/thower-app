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
| **SC8** Le code expire au bout de 10 minutes ; une tentative après expiration envoie un nouveau code (l'ancien ne vaut plus). | `SC8` |

### Mot de passe oublié et double authentification

| Règle | Test |
|---|---|
| **SC1** Un email inconnu est signalé ; un email connu crée la demande, et un envoi d'email en échec est annoncé (la demande reste enregistrée). | `SC1` |
| **SC2** Le code reçu, puis le nouveau mot de passe : les autres sessions sont fermées, l'ancien mot de passe ne marche plus, le nouveau ouvre une session. Un mot de passe trop faible est refusé. | `SC2` |
| **SC3** La page du nouveau mot de passe est inaccessible sans code vérifié ; une demande expirée est refusée et supprimée. | `SC3` |
| **SC4** Avec la 2FA, le nouveau mot de passe exige un code TOTP, ou le code de récupération (qui réinitialise la 2FA). | `SC4` |
| **SC5** La 2FA s'active dans Mon compte, se configure au prochain accès (code TOTP), affiche le code de récupération, puis un code est demandé à chaque connexion ; l'espace reste fermé tant qu'il n'est pas validé. | `SC5` |
| **SC6** Un code de récupération réinitialise la 2FA et se renouvelle. Un code de 16 caractères est accepté. | `SC6` |
| **SC7** Le code de récupération n'est montré qu'à un compte dont la 2FA est validée. | `SC7` |
| **SC9** Après une erreur (connexion, mot de passe oublié), le formulaire reste utilisable sans recharger la page. | `SC9` |

### Connexion avec Google

Le départ est lu sans quitter l'application ; l'échange du code OAuth est servi par un faux serveur Google (voir `docs/app/README.md`).

| Règle | Test |
|---|---|
| **G1** Première connexion : le compte est créé, email vérifié, nom et photo repris de Google, session ouverte. | `G1` |
| **G2** Un compte existant avec le même email est rattaché à Google, sans doublon ; le mot de passe n'ouvre alors plus de session (« Ce compte utilise Google »). | `G2` |
| **G3** Une seconde connexion retrouve le même compte. | `G3` |
| **G4** Un rappel sans état valide, ou dont le code est refusé par Google, ne crée ni compte ni session (400). | `G4` |

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
| **X1** Souscription : la session Stripe est créée avec les bonnes offres et le bon montant, le retour du checkout ouvre l'accès sans webhook. | `X1` |
| **X2** Rejouer le retour du checkout ne crédite qu'une fois. | `X2` |
| **X3** Une session non payée, ou celle d'un autre compte, n'ouvre aucun accès. | `X3` |
| **X4** Webhook en retard : le retour sans identifiant retrouve le paiement récent du compte. | `X4` |
| **X5** Un compte payé mais sans mensurations est rattrapé depuis le formulaire de démarrage. | `X5` |
| **X6** Renouvellement : un second paiement ouvre le cycle 2 et prolonge l'accès (voir `OPTIMISATION.md`, D2). | `X6` |
| **AUT1** Anonyme : les pages privées renvoient vers la connexion, la réinitialisation du mot de passe vers « mot de passe oublié ». | `AUT1` |
| **AUT2** Email non vérifié : toutes les pages renvoient vers la vérification. | `AUT2` |
| **AUT3** Compte vérifié : connexion, inscription et vérification renvoient vers l'espace ; la page 2FA aussi une fois la 2FA validée. | `AUT3` |
| **AUT4** 2FA exigée mais non configurée : tout renvoie vers sa configuration. | `AUT4` |
| **AUT5** 2FA configurée mais non validée sur la session : tout renvoie vers la saisie du code. | `AUT5` |
| **AUT6** Sans session, les actions de compte, de vérification et de réinitialisation sont refusées sans rien modifier. | `AUT6` |
| **AUT7** Sans session, souscription, mensurations, photos et bien-être sont refusés. | `AUT7` |
| **AUT8** La déconnexion ferme la session, par lien ou par formulaire. | `AUT8` |
| **AUT9** Saisie du code de vérification : format, demande absente, 5 essais puis blocage. | `AUT9` |
| **AUT10** Code valide : l'email est vérifié ; avec la 2FA exigée, la page de vérification reste accessible. | `AUT10` |
| **AUT11** Un code expiré est remplacé par un nouveau, envoyé par email. | `AUT11` |
| **AUT12** Renvoi du code : email envoyé, 3 par période, refusé pour un compte déjà vérifié. | `AUT12` |
| **AUT13** 2FA configurée mais non validée : la saisie et le renvoi du code renvoient vers la saisie du code 2FA. | `AUT13` |
| **AUT14** Changer d'email : adresse prise ou invalide refusée, échec d'envoi annoncé, puis code reçu et email remplacé. | `AUT14` |
| **AUT15** Mot de passe : ancien mot de passe exigé, nouveau valide, session conservée. | `AUT15` |
| **AUT16** Compte Google : le mot de passe ne peut pas être modifié. | `AUT16` |
| **AUT17** 2FA non validée : changement d'email et de mot de passe renvoyés vers la saisie du code 2FA. | `AUT17` |
| **AUT18** Mot de passe oublié : email invalide ou inconnu refusé, code envoyé, 3 demandes par période. | `AUT18` |
| **AUT19** Inscription (page dédiée et accueil) : formulaire invalide refusé, email de vérification envoyé, 3 inscriptions par intervalle. | `AUT19` |
| **AUT20** Contact : la notification part vers l'adresse configurée. | `AUT20` |
| **AUT21** Connexion : formulaire invalide, compte inconnu, compte Google, mauvais mot de passe, tentatives ralenties. | `AUT21` |
| **AUT22** Connexion réussie : redirection selon l'état du compte. | `AUT22` |
| **AUT23** Code TOTP : format, code faux, 5 essais puis blocage, refus si déjà validé ou sans 2FA. | `AUT23` |
| **AUT24** Code de récupération : code faux, 3 essais puis blocage, refus sans 2FA. | `AUT24` |
| **AUT25** Configuration de la 2FA : compte déjà configuré, email non vérifié ou clé invalide refusés. | `AUT25` |
| **AUT26** Photos de référence (adresse directe) : adresses invalides refusées, trois photos enregistrées, points une seule fois. | `AUT26` |
| **AUT27** Bien-être (adresse directe) : valeurs hors limites refusées, profil enregistré, suite vers les mensurations. | `AUT27` |
| **AUT28** Photos et bien-être exigent un email vérifié puis un paiement valide. | `AUT28` |
| **AUT29** Gardes de requête : l'outil de développement du navigateur reçoit 204, un cookie illisible est refusé, un jeton de session invalide est ignoré. | `AUT29` |
| **AUT30** Réinitialisation du mot de passe : la page de double authentification renvoie vers l'étape manquante. | `AUT30` |
| **AUT31** Réinitialisation, code TOTP : refusé hors contexte, champ vide ou absent, 5 essais puis blocage. | `AUT31` |
| **AUT32** Réinitialisation, code de récupération : refusé hors contexte, champ vide, 3 essais puis blocage. | `AUT32` |

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

Corrigé lors de la mise en place de ces tests :

- **Boucle de redirections** : un compte dont l'email n'était pas vérifié et dont la 2FA était exigée passait sans fin de la vérification de l'email à la configuration de la 2FA (`ERR_TOO_MANY_REDIRECTS`). La page de vérification reste accessible dans ce cas (`AUT10`).
- **Formulaires qui disparaissaient après une erreur** : un message d'erreur renvoyé sans statut d'échec comptait comme un succès pour le formulaire, qui était alors recréé et retiré de la page. Après un mauvais mot de passe ou un email inconnu, il fallait recharger. Toutes les erreurs de formulaires d'authentification (62 messages) portent maintenant le statut 400. C'est couvert par `SC9`.
- **Code de récupération 2FA inutilisable** : la page `/auth/2fa/reset` exigeait un code de 8 caractères alors que les codes de récupération en ont 16 : un utilisateur ayant perdu son appareil ne pouvait pas récupérer son compte. Elle utilise maintenant le schéma à 16 caractères (`SC6`).
- **Mot de passe oublié, email en échec** : l'échec d'envoi du code faisait tomber la demande en erreur 500. Il est désormais annoncé (`SC1`).

- **Vérification de l'email** : après un mauvais code, le formulaire n'envoyait plus rien et aucun message ne s'affichait. Il fallait recharger la page. C'est couvert par `C1`.
- **Blocage silencieux à l'enregistrement** : un champ invalide sur une étape précédente empêchait « Enregistrer » sans aucun message. C'est couvert par `D3`.
- **Messages de compte** : environ 100 messages en anglais (connexion, 2FA, mot de passe oublié, paramètres) sont traduits à partir d'une table unique. Plusieurs actions renvoyaient leurs erreurs dans un format qui empêchait leur affichage et bloquait le formulaire (même défaut que la vérification d'email) : elles passent toutes par `message(form, …, { status })`. Dans Mon compte, les erreurs s'affichaient comme des succès. C'est couvert par `C6`, `C8` et `C9`.
- **Email injoignable** : un échec d'envoi du code faisait tomber la page de vérification en erreur 500. C'est couvert par `C7`.
- **Photos et bien-être** : accessibles sans email vérifié ni paiement. Ils passent désormais par `requirePaidOnboarding` (`src/lib/server/access.ts`), au chargement comme à l'envoi. C'est couvert par `C4` et `P1`.
- **Code de récupération 2FA** : le tableau de démarrage le déchiffrait et l'envoyait au navigateur à chaque affichage, sans l'utiliser. Ce code mort est supprimé, avec trois actions dupliquées de Mon compte.
- **Déconnexion** : elle effaçait un cookie `session` inexistant ; elle efface désormais le cookie `auth_session` et renvoie vers la connexion.
