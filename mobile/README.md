# baticost AI — Application Mobile (React Native / Expo)

Application **mobile native Android** (React Native + Expo) de la plateforme **baticost AI** :
estimation immobilière et locative par intelligence artificielle pour le marché tunisien.

> **Ce n'est pas une WebView.** L'application est un client natif complet qui parle
> directement à la **même base de données Convex** et aux **mêmes moteurs IA** que la
> plateforme Web : mêmes comptes utilisateurs, même authentification (Convex Auth,
> email + mot de passe), mêmes estimations. L'architecture est prête pour iOS
> (React Native est multiplateforme).

---

## 1. Architecture

```
mobile/
├── app/                    # Routes (expo-router, file-based routing)
│   ├── _layout.tsx         # ConvexAuthProvider (SecureStore) + gate d'auth + bannière réseau
│   ├── (auth)/             # Connexion · Inscription · Réinitialisation mot de passe
│   ├── (tabs)/             # Bottom navigation : Accueil · Estimer · Annonce · Messages · Profil
│   ├── estimation/         # Formulaire vente + résultat (PDF, partage)
│   ├── location/           # Formulaire loyer + résultat (prévisions, conseiller IA)
│   ├── historique.tsx      # Toutes les estimations (vente + loyer)
│   ├── notifications.tsx   # Notifications push + messages récents
│   └── settings.tsx        # Profil, préférences, à propos
├── src/
│   ├── api/                # 🔌 COUCHE API — wrappers typés des fonctions Convex
│   │   ├── convex.ts       #   Client Convex (EXPO_PUBLIC_CONVEX_URL) + référence api
│   │   ├── estimations.ts  #   createProperty → estimateProperty (BIM Engine serveur)
│   │   ├── rent.ts         #   createRentEstimation (moteur loyer serveur)
│   │   ├── listings.ts     #   analyzeListingUrl (scraping + IA serveur)
│   │   ├── plans.ts        #   Quotas mensuels & abonnement
│   │   ├── messages.ts     #   Boîte de réception agences
│   │   └── geocode.ts      #   Recherche d'adresse + géocodage inverse
│   ├── auth/
│   │   └── secure-storage.ts  # 🔐 TokenStorage expo-secure-store (Keystore Android)
│   ├── components/         # UI réutilisable (champs, pickers, cascades, sections de résultat…)
│   ├── hooks/              # use-auth · use-network (NetInfo) · use-location (GPS natif)
│   ├── lib/
│   │   ├── locations.ts    # 🇹🇳 24 gouvernorats / ~470 villes / quartiers (hors-ligne)
│   │   ├── format.ts       # Formatage TND, m², %, dates (fr-FR)
│   │   ├── offline.ts      # 💾 Cache AsyncStorage + consultation hors-ligne
│   │   ├── pdf.ts          # 📄 Export PDF natif (expo-print) + partage (expo-sharing)
│   │   └── report-html.ts  # Générateur de rapports PDF (vente & loyer)
│   └── theme/              # Palette cohérente avec le Web (bleu + émeraude)
├── scripts/
│   └── generate-icons.mjs  # Génère icône/splash (Node pur, zlib) → assets/
├── assets/                 # Icône, icône adaptative, splash, favicon (générés)
├── app.json                # 🧾 Identité, applicationId, permissions Android, splash
└── eas.json                # Profils EAS Build (development / preview / production)
```

### Flux de données (identique au Web)

```
Écran mobile ──▶ Couche API (src/api) ──▶ Convex (même déploiement que le Web)
                    │                          │
                    │                          ├─ estimateProperty    (moteur vente, serveur)
                    │                          ├─ createRentEstimation (moteur loyer, serveur)
                    │                          ├─ analyzeListingUrl    (scraping + verdict IA)
                    │                          └─ currentUser / remainingEstimations / …
                    └── Cache hors-ligne (AsyncStorage) — lecture des derniers résultats
```

**Les moteurs d'estimation restent côté serveur** (une seule source de vérité) :
l'application mobile envoie les caractéristiques du bien et reçoit le même résultat
que la plateforme Web — il n'y a aucune divergence de calcul.

---

## 2. Prérequis

| Outil | Version | Rôle |
|---|---|---|
| Node.js | ≥ 20 | Runtime |
| Bun ou npm | — | Gestionnaire de paquets |
| Expo CLI | via `npx expo` | Développement et builds |
| Compte [expo.dev](https://expo.dev) | — | Builds cloud (EAS) — optionnel |
| Android Studio | (recommandé) | Build APK local, émulateur |

L'URL du déploiement Convex est **identique** à `VITE_CONVEX_URL` de la plateforme Web
(elle est publique : elle est déjà embarquée dans le client Web).

---

## 3. Installation

```bash
cd mobile

# 1. Installer les dépendances
npm install            # ou : bun install

# 2. Configurer l'URL Convex (même valeur que VITE_CONVEX_URL du Web)
# Déploiement actuel du projet : https://acrobatic-warthog-930.convex.cloud
cp .env.example .env   # puis renseigner EXPO_PUBLIC_CONVEX_URL=https://acrobatic-warthog-930.convex.cloud
# (ou créer .env avec la variable ; elle sera embarquée dans le bundle)

# 3. Aligner les versions natives avec le SDK (optionnel mais recommandé)
npx expo install --fix

# 4. Lancer sur émulateur/appareil Android
npx expo start --android
```

> 💡 Les icônes sont déjà générées dans `assets/`. Pour les régénérer :
> `node scripts/generate-icons.mjs`.

### Tester sans build (Expo Go)

`npx expo start` puis scannez le QR code avec **Expo Go** (Play Store). Le mode Expo Go
couvre tout sauf les fonctionnalités natives qui nécessitent un build (certaines
permissions). Pour tester les notifications push natives, utilisez un build de
développement.

---

## 4. Génération de l'APK

### 4.1 APK de développement (non signé)

```bash
# Build local avec Android Studio / SDK (nécessite le SDK Android + JDK 17)
npx expo prebuild --platform android   # génère le dossier android/
cd android
./gradlew assembleDebug                # → android/app/build/outputs/apk/debug/app-debug.apk
```

### 4.2 APK de développement via EAS (cloud, recommandé)

```bash
npm install -g eas-cli
eas login
eas build -p android --profile development --local   # ou sans --local (cloud)
```

### 4.3 APK de production (signé)

```bash
# Premier build : EAS génère et stocke les clés de signature automatiquement
eas build -p android --profile preview --local        # APK interne signé (distribuable)
# ou en cloud :
eas build -p android --profile preview
```

Le profil `preview` produit un **APK** (`buildType: "apk"`) signé avec votre clé de
signature EAS — c'est le fichier à distribuer aux testeurs / clients.

> **Clés de signature** : conservez précieusement la clé générée par EAS
> (téléchargeable depuis `eas credentials`). Une fois l'app publiée, changer la clé
> rend impossible la mise à jour des installations existantes.

---

## 5. Publication Google Play

### 5.1 Préparation du fichier AAB (Android App Bundle)

```bash
eas build -p android --profile production    # buildType: "app-bundle" → .aab signé
```

### 5.2 Checklist Play Console

- [ ] **AAB** généré par le profil `production` (`eas build -p android --profile production`)
- [ ] **Icône haute résolution** : `assets/icon.png` (1024×1024, générée) + icône adaptative (`assets/adaptive-icon.png` + fond `#1e40af`)
- [ ] **Splash Screen** : `assets/splash-icon.png` sur fond `#1e40af` (configuré dans `app.json`)
- [ ] **Application ID** : `com.imopriceai.app` (unique — à garder définitivement)
- [ ] **Version** : `1.0.0` · **Version Code** : 1 (incrémenté automatiquement par EAS avec `autoIncrement: true`)
- [ ] **Permissions déclarées** : voir `app.json → android.permissions` (caméra, galerie, localisation, notifications, internet — toutes justifiées par une fonctionnalité réelle)
- [ ] **Screenshots** : captures de l'écran Accueil, du hub d'estimation, d'un résultat vente et d'un résultat loyer
- [ ] **Description** : « Estimation immobilière et locative par IA pour la Tunisie… » (FR + AR recommandé)
- [ ] **Politique de confidentialité** : héberger une page publique décrivant : données collectées (profil, biens, photos, localisation), stockage (Convex, chiffré en transit), mots de passe jamais stockés en clair (hash côté serveur), aucun partage avec des tiers
- [ ] **Charte "App content"** : déclarer les permissions sensibles (localisation, caméra, photos) avec justification
- [ ] **Test de conformité** : tester sur tablette (l'interface est responsive — `supportsTablet: true`)

### 5.3 Données du formulaire Play Store

| Champ | Valeur |
|---|---|
| Nom | baticost AI |
| Package | `com.imopriceai.app` |
| Type | Application |
| Catégorie | Immobilier / Productivité |
| Contact | email support de la plateforme |
| Tarification | Gratuite + achats intégrés (abonnements sur le Web) |

---

## 6. Connexion Backend & API (documentation)

L'application consomme **les fonctions Convex existantes** de la plateforme (aucune API
supplémentaire à déployer). Voici la table de correspondance :

| Fonction mobile (`src/api/`) | Fonction Convex (Web) | Type | Rôle |
|---|---|---|---|
| `useCurrentUser` | `users.currentUser` | query | Utilisateur connecté |
| `useUpdateProfile` | `users.updateUserProfile` | mutation | Nom / téléphone |
| `useGetUserEstimations` | `estimation.getUserEstimations` | query | Historique ventes |
| `useGetEstimation` | `estimation.getEstimation` | query | Détail vente |
| `createAndEstimateProperty` | `properties.createProperty` + `estimation.estimateProperty` | mutations | **Estimation vente (moteur serveur)** |
| `useGetUserRentEstimations` | `rent.getUserRentEstimations` | query | Historique loyers |
| `useGetRentEstimation` | `rent.getRentEstimation` | query | Détail loyer |
| `runRentEstimation` | `rent.createRentEstimation` | mutation | **Estimation loyer (moteur serveur)** |
| `useRemainingEstimations` | `plans.remainingEstimations` | query | Quota mensuel |
| `useMySubscription` | `plans.mySubscription` | query | Abonnement |
| `useGetMyInbox` | `messages.getMyInbox` | query | Messagerie agences |
| `useMarkMessagesRead` | `messages.markMessagesRead` | mutation | Marquer lu |
| `useSearchAddress` / `useReverseGeocode` | `geocode.searchAddress` / `reverseGeocode` | actions | Géocodage |

### Authentification

- Même backend **Convex Auth** que le Web (comptes partagés : se connecter sur mobile
  = se connecter sur le Web).
- `ConvexAuthProvider` avec un **`TokenStorage` SecureStore** (`src/auth/secure-storage.ts`)
  → jetons JWT stockés dans le **Keystore Android** (chiffrés), avec repli AsyncStorage.
- Flux identiques au Web : connexion, inscription, **réinitialisation par code** à 6
  chiffres (`flow: "reset"` → `"reset-verification"`).
- Les mots de passe ne sont **jamais** stockés sur l'appareil ni envoyés en clair.

### Gestion d'erreurs & connexion

- **Bannière "Hors ligne"** (`ConnectivityBanner` + NetInfo) : les données consultées
  restent accessibles via le cache AsyncStorage (`src/lib/offline.ts`) et se
  re-synchronisent automatiquement.
- Chaque appel API est enveloppé de messages d'erreur français explicites
  (`src/lib/errors.ts`), avec écrans de chargement/erreur/repli.

---

## 7. Fonctionnalités natives Android implémentées

| Fonctionnalité | Module | Emplacement |
|---|---|---|
| 📷 Caméra | `expo-image-picker` | Formulaire vente (photos du bien) |
| 🖼️ Galerie (multi-sélection) | `expo-image-picker` | Formulaire vente |
| 📍 Géolocalisation + géocodage inverse | `expo-location` | Cascades de localisation (« Ma position ») |
| 🔐 Stockage sécurisé | `expo-secure-store` | Jetons de session (Keystore) |
| 📄 PDF natif | `expo-print` | Rapports vente & loyer |
| 📤 Partage | `expo-sharing` + `Share` | PDF et résumés |
| 🔔 Notifications push | `expo-notifications` | Écran Notifications (permission + jeton) |
| 📡 État réseau | `@react-native-community/netinfo` | Bannière hors-ligne + cache |
| 💾 Cache hors-ligne | `@react-native-async-storage/async-storage` | Derniers résultats |
| 📳 Haptique | `expo-haptics` | Micro-interactions |

### Roadmap (prochaines étapes recommandées)

1. **Notifications push serveur** : ajouter une table `pushTokens` + une action Convex
   qui appelle l'API Expo Push lors de la réception d'un message d'agence
   (`messages.getMyInbox`), puis déclencher localement l'affichage.
2. **Analyse photo IA dans l'app** : portage du module d'analyse d'images
   (transformers.js) en on-device, ou upload des photos vers le backend.
3. **Abonnement in-app** : écran de tarifs + paiement (Stripe via lien externe ou
   Google Play Billing).
4. **Mode hors-ligne complet** : file d'attente de mutations hors-ligne avec
   rejeu automatique à la reconnexion.
5. **iOS** : `eas build -p ios` (bundle id `com.imopriceai.app` déjà configuré).

---

## 8. Scripts utiles

```bash
npm run start            # Expo dev server
npm run android          # Lance sur émulateur Android
npm run gen:icons        # Régénère les icônes
npm run typecheck        # TypeScript (tsc --noEmit)
npx expo prebuild        # Génère les dossiers android/ et ios/ natifs
eas build -p android --profile preview     # APK de production signé
eas build -p android --profile production  # AAB pour Google Play
```

## 9. Dépannage

| Problème | Solution |
|---|---|
| `EXPO_PUBLIC_CONVEX_URL is missing` | Créez `mobile/.env` avec l'URL du déploiement (valeur de `VITE_CONVEX_URL`) |
| Écran bloqué sur le splash | Vérifiez la connexion : la session est restaurée depuis le SecureStore puis validée auprès de Convex |
| Connexion refusée mais compte valide | Vérifiez que le déploiement Convex est le même que celui du Web (mêmes comptes) |
| Erreur de version native | `npx expo install --fix` pour aligner les versions des modules Expo |
| Permission caméra/localisation | L'utilisateur doit accepter dans les réglages Android si refusée une première fois |

---

*Documentation technique — baticost AI mobile · React Native / Expo SDK 53 · Convex · Android-first, iOS-ready.*
