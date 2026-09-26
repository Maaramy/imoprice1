# Plan de clonage — BatiCost ➜ BatiGrow

> Document de méthode. Aucune modification fonctionnelle n'est décrite ici : ce plan
> décrit **comment produire un clone intégral** de BatiCost sous le nom **BatiGrow**,
> dans un projet et une base de données **totalement indépendants**.

---

## 0. Contrainte d'environnement (à lire en premier)

L'espace de travail Freebuff courant **EST le code source de BatiCost** :

| Élément | Valeur constatée |
|---|---|
| Racine | `package.json` → `"name": "baticost-ai"` |
| Titre / méta | `index.html` → `Baticost` / `baticost AI — Estimation immobilière intelligente en Tunisie` |
| Manifeste PWA | `public/manifest.webmanifest` → `baticost AI` |
| Backend | Convex, fonctions dans `src/convex/` |
| Déploiement | `imoprice.freebuff.app` (déploiement *publié* de ce même code) |
| Mobile | app Expo autonome dans `mobile/` (même produit) |

Un espace Freebuff contient **un seul projet**, relié à **un seul déploiement Convex** via
`.env.local` (`CONVEX_DEPLOYMENT`, `VITE_CONVEX_URL`). Cet espace ne peut donc pas
**créer** un second projet ni un second déploiement : cette étape se fait hors de l'espace.

**Conséquence :** le clonage s'exécute comme un **pipeline reproductible**
(scripts fournis) sur une machine disposant de Bun + Convex CLI. Dans cet espace, on
livre le **plan** et les **scripts**, pas l'exécution.

Deux façons d'obtenir l'environnement BatiGrow :

- **Option A — nouveau projet plateforme (recommandé)** : créer un nouveau projet
  Freebuff (workspace vide) nommé `batigrow-ai`, y copier le résultat du clone, puis
  laisser la plateforme provisionner un **nouveau déploiement Convex**.
- **Option B — clonage hors plateforme** : exécuter `scripts/clone-to-batigrow.sh`
  pour produire un dossier `batigrow-ai/` propre, puis dans ce dossier :
  `bun install && bunx convex dev --once` → Convex propose de **créer un nouveau
  projet** et génère un `.env.local` neuf (DB indépendante).

Dans les deux cas, **aucune** variable d'environnement, clé ou déploiement de BatiCost
n'est réutilisé.

---

## 1. Inventaire de la source (§1 de la mission)

Inventaire réel, relevé sur le code — sert de **référence d'audit** (§20).

### 1.1 Routes (`src/main.tsx`)

| Route | Page | Protection |
|---|---|---|
| `/` | `Landing` | publique |
| `/auth` | `Auth` (`redirectAfterAuth="/dashboard"`) | publique |
| `/dashboard` | `Dashboard` | `RequireAuth` |
| `/estimate` | `EstimationHub` | `RequireAuth` |
| `/estimate/new` | `NewEstimation` | `RequireAuth` |
| `/estimate/loyer/new` | `NewRentEstimation` | `RequireAuth` |
| `/estimate/loyer/:id` | `RentEstimationResult` | `RequireAuth` |
| `/estimate/:id` | `EstimationResult` (sert aussi `/estimate/demo`) | `RequireAuth` |
| `/compare` | `Compare` | `RequireAuth` |
| `/settings` | `Settings` | `RequireAuth` |
| `/agencies` | `Agencies` | `RequireAuth` |
| `/admin` | `Admin` | `RequireAuth` (+ contrôle rôle backend) |
| `/dashboard/investments` | `InvestmentAnalysis` | `RequireAuth` |
| `/dashboard/investments/result/:analysisId` | `InvestmentResults` | `RequireAuth` |
| `/investments/demo` | `DemoInvestment` | publique |
| `/share/investment/:token` | `ShareInvestment` | publique |
| `/agency/:id` | `AgencyPublic` | publique |
| `/providers` | `Providers` | publique |
| `/report/:token` | `ReportView` | publique |
| `*` | `NotFound` | publique |

### 1.2 Modules backend (`src/convex/`, 29 fichiers)

`admin`, `agencies`, `alerts`, `announcementLogic`, `announcements`, `auth.config`,
`auth`, `auth/emailOtp`, `crons`, `defaults`, `estimation`, `geocode`, `github`, `http`,
`investmentAccess`, `investmentAi`, `investmentTypes`, `investments`, `messages`,
`notifications`, `partners`, `plans`, `properties`, `rent`, `reports`, `schema`,
`settings`, `types`, `users`.

**106 fonctions backend** exportées (query / mutation / action / internal*).

### 1.3 Rôles (`src/convex/schema.ts`)

`ROLES = { ADMIN: "admin", USER: "user", MEMBER: "member" }` — permissions vérifiées
côté backend (`admin.ts`, `agencies.ts`, `investmentAccess.ts`, `RequireAuth` côté client).

### 1.4 Frontend

- 19 pages (`src/pages/`), ~85 composants (`src/components/`), 45 primitives shadcn.
- Modules métier : Estimation vente, Estimation loyers (+ mode nuitée/mensuel),
  Investissement/ROI (12 types, 24 zones, 3 scénarios, 4 horizons), Agences/partenaires,
  Messagerie, Notifications, Alertes, Annonces admin, Rapports (PDF jsPDF + CSV), Comparateur.
- Bibliothèques métier : `src/lib/enhanced-estimation.ts`, `rent-estimation.ts`,
  `listing-assessment.ts`, `listing-adapter.ts`, `zones.ts`, `quartiers.ts`,
  `investmentPrefill.ts`, `investmentHistory.ts`, `estimationHistory.ts`, `property-vision*.ts`.

### 1.5 Tests

24 fichiers Vitest (`src/test/`), inclus explicitement dans `vitest.config.ts`.

### 1.6 Assets & branding à renommer

Logo (`public/logo.svg`, `src/assets/logo.svg`), favicons PNG/ICO, icônes PWA,
`public/manifest.webmanifest`, `index.html`, PDF/rapports, e-mails, notifications,
watermark d'impression (`ReportView.tsx`), clés `localStorage`.

---

## 2. Méthode de clonage (§2–§19)

Le clonage se fait par **copie intégrale du dépôt, puis renommage chirurgical**.
C'est la seule méthode qui garantit un comportement **identique** (§19) : on ne
réécrit rien, on ne simplifie rien, on ne réorganise rien.

```
BatiCost (workspace courant)
        │
        │  1. copie intégrale (rsync/tar, hors artefact)
        ▼
   batigrow-ai/            ← même code, mêmes calculs, mêmes workflows
        │  2. purge de l'état propre à BatiCost
        │     (.env.local, _generated, dist, isolate, .git)
        │  3. renommage BatiCost/baticost/imoprice ➜ BatiGrow/batigrow
        │  4. vérification anti-fuite de marque (échec si reste > 0)
        ▼
   BatiGrow — projet indépendant
        │  5. bun install
        │  6. bunx convex dev --once   ← crée un NOUVEAU déploiement + DB
        │  7. bunx tsc -b --noEmit && bun run test
        ▼
   Livrable + audit (§20–§25)
```

### 2.1 Fichiers du pipeline

| Fichier | Rôle |
|---|---|
| `scripts/clone-to-batigrow.sh` | Produit le dossier BatiGrow complet et renommé (§2–§17). |
| `scripts/audit-batigrow-clone.sh` | Audit comparatif BatiCost ↔ BatiGrow (§20, §25). |

### 2.2 Copie — exclusions

Copiés : tout le code source, `mobile/`, `public/`, configs, tests, `.github/`, docs.

**Exclus** (artefacts / état local / secrets) :

| Chemin | Raison |
|---|---|
| `node_modules/`, `mobile/node_modules/` | réinstallés par `bun install` |
| `.git/` | nouveau dépôt indépendant (§17) |
| `dist/`, `isolate/` | artefacts de build |
| `.env.local` | **contient le lien vers la DB Convex de BatiCost** (§18) |
| `src/convex/_generated/` | régénéré par `convex dev --once` |
| `.vly-dist-upload.sh`, `*.tsbuildinfo`, `mobile/.expo/` | état plateforme/local |

> L'exclusion de `.env.local` est la garantie d'isolation : BatiGrow **ne peut pas**
> se connecter à la base de BatiCost, puisque le pointeur de déploiement est absent
> et doit être recréé.

### 2.3 Table de renommage (§16, §17)

Appliquée dans cet ordre (du plus spécifique au plus général) sur tous les fichiers
texte (`.ts`, `.tsx`, `.json`, `.md`, `.html`, `.css`, `.on`, `.lock`, `.yml`, …) :

| Avant | Après |
|---|---|
| `baticost-ai-mobile` | `batigrow-ai-mobile` |
| `imoprice-ai-mobile` | `batigrow-ai-mobile` |
| `com.imopriceai.app` | `com.batigrow.app` |
| `imopriceai` | `batigrow` |
| `imoprice` | `batigrow` |
| `baticost-ai` | `batigrow-ai` |
| `BATICOST` | `BATIGROW` |
| `Baticost` | `Batigrow` |
| `BatiCost` | `BatiGrow` |
| `baticost` | `batigrow` |

Couvre : `package.json`, `mobile/package.json`, `mobile/app.json` (name/slug/scheme),
`index.html`, `manifest.webmanifest`, `README.md`, `GITHUB_SETUP.md`,
`src/DESIGN_SYSTEM.md`, `src/convex/github.ts` (REPO_NAME), `admin.ts`/`Admin.tsx`
(texte du dépôt), e-mails (`notifications.ts`, `agencies.ts`, `alerts.ts`,
`messages.ts`), rapports PDF (`use-pdf-export.ts`, `investment/shared.tsx`),
`ReportView.tsx` (watermark), `SignatureSeal.tsx`, clés `localStorage`
(`baticost-theme`, `baticost_lang`, `baticost_draft`, `baticost-fallback:`,
`baticost-cache:`), domaine de contact (`baticost.tn` ➜ `batigrow.tn`),
`@vly-ai`/`freebuff` laissés intacts (infrastructure de plateforme).

### 2.4 Ce qui n'est **pas** renommé (et pourquoi)

- `@vly-ai/integrations`, `vly-toolbar-readonly.tsx`, `VLY_APP_NAME`,
  `freebuff.com`, `*.vly.sh`, `vlyPlugin()` : infrastructure Freebuff/Vly
  nécessaire au fonctionnement — référence conservée **et documentée** (§17).
- Les valeurs métier (zones, gouvernorats, types de biens, formules, coefficients)
  sont **copiées telles quelles** : aucune donnée renommée, aucun calcul modifié (§6, §7).

---

## 3. Isolation (§18)

| Interdit | Mise en œuvre |
|---|---|
| Modifier BatiCost | La source n'est **jamais** écrite : le script ne lit que la source. |
| Supprimer BatiCost | Aucune suppression dans la source. |
| Partager la DB | `.env.local` exclu puis régénéré par un **nouveau** `convex dev --once`. |
| Partager les secrets | Aucun `.env*` copié ; clés JWT/JWKS régénérées par le nouveau déploiement. |
| Variables de prod | Aucune variable BatiCost réutilisée. |
| Envoi de données | Aucun appel sortant vers BatiCost dans le code cloné. |

Côté mobile, `mobile/app.json` reçoit un `slug`, un `scheme` et un
`bundleIdentifier`/`package` neufs (`com.batigrow.app`) pour éviter toute collision
EAS/Play Store avec BatiCost.

---

## 4. Vérifications (§21, §22, §23)

Dans le dossier BatiGrow :

```bash
bun install
bunx convex dev --once          # crée/relie le NOUVEAU déploiement + codegen
bunx tsc -b --noEmit            # 0 erreur TypeScript
bun run test                    # suite Vitest
bash ../baticost/scripts/audit-batigrow-clone.sh
```

Attendu :

- `tsc -b --noEmit` : **0 erreur**, 0 import cassé, 0 composant manquant.
- Tests : même résultat que la source — les échecs préexistants de BatiCost
  (`admin-access`, `admin-mutations`, `dashboard-plan-badge`, `enhanced-estimation`,
  `rent-estimation` — système d'abonnement supprimé) sont **reproduits à l'identique**,
  pas corrigés : un clone fidèle conserve aussi les échecs connus (§19).
- Audit : **0** occurrence résiduelle de `baticost` / `imoprice` / `BatiCost`.

### Règle anti-simulation (§23)

Le clonage par copie respecte mécaniquement cette règle : aucun `TODO`, aucun
`console.log` ajouté, aucune donnée fictive, aucun écran « Coming soon », aucun bouton
décoratif. Toute fonctionnalité de BatiCost est présente **par construction**.

### Tests fonctionnels manuels (§22)

À dérouler sur BatiGrow après provisionnement : inscription, connexion, déconnexion,
récupération de compte, création/modification/consultation/suppression de projet,
calculs et résultats (vente, loyer, investissement), demandes, messages,
notifications (lu/non lu), rapports (PDF + CSV), téléchargement, profil,
administration (utilisateurs, rôles, annonces), permissions, responsive
smartphone / tablette / desktop.

---

## 5. Audit final (§20, §25)

`scripts/audit-batigrow-clone.sh` compare source et clone et échoue si une différence
**involontaire** est détectée :

| Section | Contrôle |
|---|---|
| Interface | liste des routes extraite de `src/main.tsx` (diff) |
| Interface | arborescence des pages / composants (diff d'inventaire) |
| Fonctionnel | nombre et noms des fonctions Convex exportées (par fichier) |
| Fonctionnel | rôles et modules backend présents |
| Technique | fichiers source manquants ou en trop (hors exclusions) |
| Technique | dépendances `package.json` (diff) |
| Technique | `src/index.css` (jetons de design) identique |
| Marque | 0 fuite `baticost` / `imoprice` |
| Isolation | absence de `.env.local` d'origine, absence de `_generated` copié |

Différences **attendues** et autorisées : nom du paquet, identité (nom, logo alt,
titres, e-mails), clés `localStorage`, `slug`/`scheme`/`bundleId` mobile, `REPO_NAME`.

---

## 6. Ordre d'exécution récapitulatif

1. Créer le projet cible (`batigrow-ai`) — hors espace Freebuff (option A) ou dossier local (option B).
2. `bash scripts/clone-to-batigrow.sh /chemin/vers/batigrow-ai`
3. `cd /chemin/vers/batigrow-ai && bun install`
4. `bunx convex dev --once` → **nouveau** déploiement Convex (DB indépendante).
5. `bunx tsc -b --noEmit` → corriger jusqu'à 0 erreur.
6. `bun run test` → comparer à la baseline BatiCost.
7. `git init && git add -A && git commit` (dépôt neuf, historique neuf).
8. `bash scripts/audit-batigrow-clone.sh` → 0 différence involontaire.
9. Dérouler les tests fonctionnels (§22) et le responsive (§14) sur le preview BatiGrow.
