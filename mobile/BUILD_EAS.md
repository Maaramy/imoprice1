# 🚀 Générer l'APK Android avec EAS Cloud — Guide pas à pas

Ce guide explique comment compiler **baticost AI Mobile** en **APK Android** via **EAS Build** (build cloud Expo). Aucun SDK Android ni Android Studio n'est requis : Expo compile tout dans le cloud.

> Toutes les commandes s'exécutent **depuis le dossier `mobile/`** :
>
> ```bash
> cd mobile
> ```

---

## 📋 Option A — EAS Cloud (recommandée)

### Étape 0 — Prérequis (5 min)

| Prérequis | Détail |
|---|---|
| Node.js ≥ 20 | Vérifier : `node --version` |
| Compte gratuit **expo.dev** | Créez-le sur https://expo.dev (aucune carte bancaire requise) |
| Le dossier `mobile/` | Déjà validé : typecheck 0 erreur, expo-doctor 18/18, bundle Android OK |
| `eas.json` | Déjà configuré : profil `preview` = APK, URL Convex **préremplie** (`https://acrobatic-warthog-930.convex.cloud`) |

---

### Étape 1 — Installer EAS CLI

```bash
npm install -g eas-cli
eas --version        # doit afficher une version ≥ 12
```

---

### Étape 2 — Se connecter à votre compte Expo

```bash
eas login
```

Un code s'affiche dans le terminal et le navigateur s'ouvre (ou un lien vous est donné) pour autoriser la connexion. Vérifiez ensuite :

```bash
eas whoami          # affiche votre nom d'utilisateur → connexion OK
```

---

### Étape 3 — Lier le projet à EAS (une seule fois)

Le premier build le fera automatiquement, mais c'est plus propre de le faire explicitement :

```bash
eas init
```

Cela crée le projet sur expo.dev et ajoute `extra.eas.projectId` dans votre `app.json`. Rien d'autre ne change.

---

### Étape 4 — Lancer le premier build APK

```bash
eas build -p android --profile preview
```

**Questions posées lors du tout premier build** :

| Question | Réponse à donner |
|---|---|
| *« Would you like to automatically create an EAS project? »* | **Yes** (si vous n'avez pas fait `eas init`) |
| *« Android package name »* | `com.imopriceai.app` (déjà renseigné — généralement pas de question) |
| *« Generate a new Android Keystore? »* | **Yes** — EAS génère votre clé de signature automatiquement |
| *« Download the Keystore? »* | **Oui, téléchargez-la et conservez-la précieusement** (fichier `.jks` + mot de passe). Elle servira pour **toutes** les mises à jour de l'app |

Le build est alors **envoyé dans le cloud Expo** (10-30 min la première fois : installation des dépendances natives + compilation Gradle + signature). Vous n'avez rien à garder d'ouvert : il tourne côté Expo.

---

### Étape 5 — Suivre la progression

```bash
eas build:list --platform android --limit 3
```

Le CLI affiche aussi, pendant le lancement, une URL directe du build :
`https://expo.dev/accounts/<votre-compte>/projects/imoprice-ai-mobile/builds/<id>`

États possibles : `queued` (en file) → `in progress` (en cours) → `finished` ✅ ou `errored` ❌.

---

### Étape 6 — Récupérer l'APK

Trois façons équivalentes :

```bash
# 1. Téléchargement en ligne de commande
eas build:download <build_id>     # → fichier imoprice-ai-mobile.apk dans le dossier

# 2. Depuis la page du build (bouton « Install » / « Download »)
# 3. Depuis votre téléphone : scanner le QR code affiché sur la page du build
```

---

### Étape 7 — Installer l'APK sur votre téléphone

**Sur Android 8+ (autoriser les sources inconnues)** :

1. Transférez le fichier `.apk` vers le téléphone (USB, Google Drive, WhatsApp, etc.)
2. Ouvrez le fichier → Android vous demande d'**autoriser les sources inconnues** → acceptez
3. Installez, puis ouvrez **baticost AI**

> 💡 Astuce : envoyez le lien de téléchargement EAS à votre téléphone et ouvrez-le directement dans le navigateur — l'installation est immédiate.

---

### Étape 8 — Publier sur Google Play (quand l'APK est validé)

Google Play n'accepte **que les AAB** (pas les APK). Le profil `production` d'EAS génère le `.aab` signé :

```bash
eas build -p android --profile production
```

Puis suivez la checklist Play Console complète dans `README.md` (section « Publication Google Play »).

---

## 🛠️ Option B — Build local (alternative, sans EAS)

Nécessite **JDK 17** + **Android SDK** installés sur la machine :

```bash
cd mobile
npx expo prebuild --platform android
cd android && ./gradlew assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk
```

---

## ❓ FAQ & Dépannage

| Problème | Solution |
|---|---|
| `eas` n'est pas reconnu | Réinstallez : `npm install -g eas-cli`, puis rouvrez le terminal |
| Build `errored` | Ouvrez le lien du build, cliquez sur les **logs** → l'erreur exacte y figure. Les causes courantes : version de dépendance incompatible, variable d'environnement manquante |
| L'app ne se connecte pas au backend | Vérifiez `EXPO_PUBLIC_CONVEX_URL` dans `eas.json` (profil `preview`) : doit être `https://acrobatic-warthog-930.convex.cloud` |
| Keystore perdu | `eas credentials --platform android` pour le gérer (essentiel avant toute publication Play) |
| Compte gratuit ? | Oui — le plan gratuit d'Expo inclut des builds cloud avec mise en file d'attente (aucun paiement requis pour commencer) |
| Rebuild avec version supérieure | `preview` garde `versionCode: 1` ; le profil `production` (AAB Play) incrémente automatiquement |

---

## 🎯 Et ensuite

- **Test sur appareil** → puis **publication Play Store** : `eas build -p android --profile production` (génère le **.aab** requis par Google), puis la checklist Play Console dans `mobile/README.md`.
- **iOS** : l'architecture est prête — `bundleIdentifier` configuré dans `app.json`. Le build iOS exige un compte Apple Developer.
