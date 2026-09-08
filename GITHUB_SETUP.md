# Configuration GitHub — Dépôt & Synchronisation automatique

Ce guide explique comment créer le dépôt GitHub du projet **baticost AI** et activer la
synchronisation automatique : à chaque push sur `main`, le code est vérifié (CI),
les fonctions Convex sont déployées en production, et l'application mobile reçoit
sa mise à jour OTA.

> ⚠️ **Environnement Freebuff** : les commandes Git/GitHub sont bloquées dans
> l'environnement de développement (la plateforme gère le versioning). Les
> commandes ci-dessous sont donc à exécuter **sur votre machine locale** (ou via
> l'intégration GitHub de votre plateforme).

---

## 1. Créer le dépôt GitHub

**Option A — depuis le site github.com (recommandé)**

1. Aller sur https://github.com/new
2. Nom du dépôt : `baticost-ai`
3. Visibilité : **Private** (l'application contient de la logique métier et des secrets)
4. Ne pas cocher « Add a README » / « .gitignore » / « license » (le projet en a déjà)
5. Cliquer **Create repository**

**Option B — depuis votre machine avec la CLI GitHub**

```bash
gh repo create baticost-ai --private --source . --remote origin --push
```

---

## 2. Connecter le dépôt local et pousser

Depuis la racine du projet, sur votre machine :

```bash
git remote add origin https://github.com/<VOTRE-COMPTE>/baticost-ai.git
git branch -M main
git push -u origin main
```

Le dossier `mobile/` fait partie du même dépôt — inutile d'en créer un séparé.

---

## 3. Ajouter les secrets GitHub (obligatoire pour la synchro)

GitHub → **Settings → Secrets and variables → Actions → New repository secret** :

| Secret | Où le créer | Utilité |
|---|---|---|
| `CONVEX_DEPLOY_KEY` | Dashboard Convex → déploiement de **production** → **Settings → Deploy keys** → « Create deploy key » | Déploie les fonctions Convex en production et génère les types pour la CI |
| `EXPO_TOKEN` | expo.dev → **Account → Access tokens** → « Generate access token » | Publie les mises à jour OTA de l'app mobile (EAS Update) |

---

## 4. Premier push — vérifier la CI

Une fois le premier push effectué :

1. Ouvrir l'onglet **Actions** du dépôt : le workflow **CI** doit passer au vert
   (typecheck web + 295 tests + typecheck mobile).
2. Si la CI échoue au typecheck web avec des fichiers `_generated` manquants,
   vérifier que le secret `CONVEX_DEPLOY_KEY` est bien ajouté (il sert au codegen).
3. Le workflow **Deploy Convex** doit déployer les fonctions vers la production.

---

## 5. Comment fonctionne la synchronisation automatique

Fichiers dans `.github/workflows/` :

### `ci.yml` — Vérification (push + pull request)
- **Web** : `bun install` → `convex codegen` (types générés) → `tsc -b --noEmit` → `vitest run` (~295 tests)
- **Mobile** : `bun install` → `tsc --noEmit`

### `deploy-convex.yml` — Backend (chaque push sur `main`)
- `bunx convex deploy --prod` avec le secret `CONVEX_DEPLOY_KEY` : toutes les
  fonctions `src/convex/` sont déployées sur le déploiement de production
  (base de données + fonctions = le backend web **et** mobile, qui partagent le
  même déploiement Convex).

### `eas-update.yml` — Mobile OTA (chaque push sur `main` touchant `mobile/`)
- `eas update --auto` publie un bundle JavaScript mis à jour sur le canal
  **production** : les utilisateurs de l'APK reçoivent la nouvelle version
  automatiquement, sans réinstaller l'application.
- ⚠️ Prérequis une seule fois, depuis `mobile/` : `npx eas init` (relie le projet
  Expo à EAS). Sans cela, exécutez un premier `eas build` qui fera la liaison.

---

## 6. Dépannage

| Problème | Cause probable | Solution |
|---|---|---|
| CI rouge sur `convex codegen` | Secret `CONVEX_DEPLOY_KEY` manquant | Ajouter le secret puis relancer le workflow |
| `Deploy Convex` échoue avec erreur d'authentification | Clé non liée au déploiement de production | Recréer une clé dans le déploiement **production** |
| `EAS Update` échoue : « project not linked » | `eas init` jamais exécuté | Depuis `mobile/` : `npx eas init` |
| `EAS Update` échoue : token invalide | `EXPO_TOKEN` manquant/expiré | Régénérer un token sur expo.dev |
| Premier build APK | — | Voir `mobile/BUILD_EAS.md` |

---

## 7. Récapitulatif de la boucle de synchro

```
git push origin main
   │
   ├─► ci.yml            : typecheck + tests (web & mobile)
   ├─► deploy-convex.yml : backend Convex production (web + mobile)
   └─► eas-update.yml    : mise à jour OTA de l'app Android
```
