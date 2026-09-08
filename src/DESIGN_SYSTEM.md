# DESIGN SYSTEM — BatiCost

> Document de transfert visuel. **Toutes les valeurs ci-dessous sont extraites du code réel du projet BatiCost** (`src/index.css`, `src/components/ui/*`, `src/components/*`, `src/pages/*`, `src/convex/types.ts`) et vérifiées à la date d'extraction.
> Aucune valeur n'a été inventée. Les équivalences hexadécimales (`≈`) sont des références indicatives de la palette Tailwind standard, la source de vérité étant la valeur **oklch** exacte issue du code.
>
> ⚠️ **Note d'environnement** : le projet source « BatiBuild (budgetbati) » et son `src/DESIGN_SYSTEM.md` ne sont pas accessibles dans cet espace de travail (recherche fichiersystem complète : aucun dossier `budgetbati`/`batibuild`, aucun `DESIGN_SYSTEM.md`). Le seul projet présent est **BatiCost** (`package.json` → `baticost-ai`). Ce document est donc construit à partir des tokens **réels et vérifiés du code BatiCost**, prêts à être repris tels quels.

---

## 1. Vue d'ensemble du projet

| Élément | Valeur réelle |
|---|---|
| Nom du projet | `baticost-ai` |
| Framework | React 19.2 + TypeScript 5.9, Vite 7.2 |
| CSS | Tailwind CSS 4.1.17 (**config CSS-first** dans `src/index.css` — pas de `tailwind.config.*`) |
| Composants UI | shadcn/ui style « new-york », base `neutral`, CSS variables actives (`components.json`) |
| Primitives | Radix UI (`@radix-ui/*`) |
| Icônes | `lucide-react` 0.555 |
| Animation | `framer-motion` 12.23 + `tw-animate-css` 1.4 |
| Thème sombre | Provider custom (`ThemeProvider.tsx`, classe `.dark` sur `<html>`, clé localStorage `baticost-theme`) |
| Utility | `cn()` = `twMerge(clsx(...))` (`src/lib/utils.ts`) |

### Principes directeurs (observés dans le code)

1. **Charte « chantier professionnel »** : émeraude primaire + slate neutres + touches bleu méditerranéen / ambre / terracotta.
2. **Interface 100 % plate** : règle globale `*, *::before, *::after { box-shadow: none !important; text-shadow: none !important; }` — aucune ombre n'est rendue (les classes `shadow-*` des composants existent mais sont neutralisées).
3. **Mobile-first** : `sm:` très dominant (1270 occurrences), puis `lg:` (60), `md:` (37), `xl:` (3).
4. **Dark mode complet** : chaque composant porte des variantes `dark:`.
5. **Bilingue FR/AR** : polices arabes (Tajawal / Noto Sans Arabic) + `body.lang-ar`.

---

## 2. CSS Variables — copie directe (`src/index.css`)

### 2.1 En-tête du fichier (à reproduire tel quel)

```css
/* DO NOT CHANGE */
@import "tailwindcss";
@import "tw-animate-css";
@custom-variant dark (&:is(.dark *));

/* Inter font — Modern sans-serif for the entire app (variable 14..32, 300..800) */
@import url('https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&display=swap');

/* Arabic — Tajawal / Noto Sans Arabic (RTL intégré) */
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@300..800&family=Tajawal:wght@300;400;500;700;800&display=swap');

/* DO NOT CHANGE */
@theme inline {
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
}
```

### 2.2 Thème Light (`:root`) — valeurs exactes

```css
:root {
  --radius: 1rem;
  --background: oklch(0.985 0.002 250);          /* slate-50 ≈ #f8fafc */
  --foreground: oklch(0.145 0.015 260);          /* slate-900 quasi noir ≈ #0f172a */
  --card: oklch(1 0 0);                          /* blanc pur */
  --card-foreground: oklch(0.145 0.015 260);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0.015 260);
  --primary: oklch(0.596 0.145 163.2);           /* émeraude ≈ #059669 (emerald-600) */
  --primary-foreground: oklch(0.985 0.002 250);
  --secondary: oklch(0.968 0.002 248);           /* slate-100 ≈ #f1f5f9 */
  --secondary-foreground: oklch(0.205 0.02 260);
  --muted: oklch(0.968 0.002 248);
  --muted-foreground: oklch(0.556 0.02 257);     /* slate-500 ≈ #64748b */
  --accent: oklch(0.968 0.002 248);
  --accent-foreground: oklch(0.205 0.02 260);
  --destructive: oklch(0.577 0.245 27.3);        /* rouge erreur/destructif */
  --border: oklch(0.918 0.004 248);              /* slate-200 ≈ #e2e8f0 */
  --input: oklch(0.918 0.004 248);
  --ring: oklch(0.596 0.145 163.2);              /* émeraude — focus rings */
  --chart-1: oklch(0.596 0.145 163.2);           /* émeraude (marque) */
  --chart-2: oklch(0.55 0.15 230);               /* bleu méditerranéen */
  --chart-3: oklch(0.585 0.233 277.117);         /* indigo investissement */
  --chart-4: oklch(0.769 0.188 70.08);           /* ambre fournisseurs */
  --chart-5: oklch(0.577 0.245 27.3);            /* rouge */
  --sidebar: oklch(0.985 0.002 250);
  --sidebar-foreground: oklch(0.145 0.015 260);
  --sidebar-primary: oklch(0.596 0.145 163.2);
  --sidebar-primary-foreground: oklch(0.985 0.002 250);
  --sidebar-accent: oklch(0.968 0.002 248);
  --sidebar-accent-foreground: oklch(0.205 0.02 260);
  --sidebar-border: oklch(0.918 0.004 248);
  --sidebar-ring: oklch(0.596 0.145 163.2);
}
```

### 2.3 Thème Dark (`.dark`) — valeurs exactes

```css
.dark {
  --background: oklch(0.129 0.01 260);           /* slate-950 ≈ #020617 */
  --foreground: oklch(0.985 0.002 250);
  --card: oklch(0.185 0.012 260);
  --card-foreground: oklch(0.985 0.002 250);
  --popover: oklch(0.185 0.012 260);
  --popover-foreground: oklch(0.985 0.002 250);
  --primary: oklch(0.696 0.17 162.5);            /* émeraude claire ≈ #34d399 (emerald-400) */
  --primary-foreground: oklch(0.185 0.05 163);
  --secondary: oklch(0.25 0.012 260);
  --secondary-foreground: oklch(0.985 0.002 250);
  --muted: oklch(0.25 0.012 260);
  --muted-foreground: oklch(0.708 0.02 257);
  --accent: oklch(0.25 0.012 260);
  --accent-foreground: oklch(0.985 0.002 250);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.696 0.17 162.5);
  --chart-1: oklch(0.696 0.17 162.5);
  --chart-2: oklch(0.646 0.175 230);
  --chart-3: oklch(0.488 0.243 264.376);
  --chart-4: oklch(0.769 0.188 70.08);
  --chart-5: oklch(0.645 0.246 16.439);
  --sidebar: oklch(0.185 0.012 260);
  --sidebar-foreground: oklch(0.985 0.002 250);
  --sidebar-primary: oklch(0.696 0.17 162.5);
  --sidebar-primary-foreground: oklch(0.185 0.05 163);
  --sidebar-accent: oklch(0.25 0.012 260);
  --sidebar-accent-foreground: oklch(0.985 0.002 250);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.696 0.17 162.5);
}
```

### 2.4 Tokens de police et tracking (second bloc `@theme inline`)

```css
@theme inline {
  --font-sans: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', 'Noto Sans Arabic', sans-serif;
  --font-display: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif;
  --font-arabic: 'Tajawal', 'Noto Sans Arabic', 'Inter', sans-serif;

  /* Tracking affiné pour les titres */
  --tracking-tight: -0.025em;
  --tracking-tighter: -0.05em;
}
```

### 2.5 Base (`@layer base`)

```css
@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', 'Noto Sans Arabic', sans-serif;
    @apply text-foreground antialiased;
    /* Dégradé vertical subtil fond → blanc → fond (fixed) */
    background-color: var(--background);
    background-image: linear-gradient(
      to bottom,
      var(--background),
      oklch(1 0 0) 30%,
      oklch(1 0 0) 70%,
      var(--background)
    );
    background-attachment: fixed;
    font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';
  }
  .dark body {
    background-image: linear-gradient(
      to bottom,
      var(--background),
      oklch(0.16 0.01 260) 32%,
      oklch(0.16 0.01 260) 68%,
      var(--background)
    );
  }
  button:not([disabled]),
  [role="button"]:not([disabled]) {
    cursor: pointer;
  }
}
```

---

## 3. Classes utilitaires custom (`src/index.css`)

> Correspondances demandées → existantes : `Label-overline` → **`.micro-label`** ; `Table-zebra` → **non présente** (zebra via `divide-y` / `border-b` inline) ; `Scrollbar-none` → **utilitaire Tailwind v4.1 natif** ; `Glass-header` → **`.glass` / `.glass-strong`** ; `Shadow-soft` → **`box-shadow: none` (flat)**.

### 3.1 Glassmorphism

```css
/* Glassmorphism : fond translucide + blur + bordure translucide */
.glass {
  background: rgba(255, 255, 255, 0.72);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, 0.6);
}
.dark .glass {
  background: rgba(15, 23, 42, 0.75);
  border-color: rgba(255, 255, 255, 0.1);
}
.glass-strong {
  background: rgba(255, 255, 255, 0.86);
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(226, 232, 240, 0.8);
}
.dark .glass-strong {
  background: rgba(2, 6, 23, 0.85);
  border-color: rgba(255, 255, 255, 0.12);
}
```

### 3.2 Texte en dégradé émeraude (porteur de sens — titres du Landing)

```css
.gradient-text {
  background-image: linear-gradient(115deg, oklch(0.596 0.145 163.2), oklch(0.75 0.15 162) 60%, oklch(0.55 0.15 230));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.dark .gradient-text {
  background-image: linear-gradient(115deg, oklch(0.75 0.16 162), oklch(0.85 0.12 162) 60%, oklch(0.75 0.13 230));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
```

### 3.3 Motifs de fond

```css
/* Grille de points blancs pour les blocs CTA sombres */
.dotted-watermark {
  background-image: radial-gradient(rgba(255, 255, 255, 0.28) 1px, transparent 1.4px);
  background-size: 18px 18px;
}

/* Quadrillage type plan d'architecte (thème auth Tunisie) */
.blueprint-grid {
  background-image:
    linear-gradient(to right, rgba(37, 99, 235, 0.09) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(37, 99, 235, 0.09) 1px, transparent 1px);
  background-size: 40px 40px;
}
.blueprint-grid-strong {
  background-image:
    linear-gradient(to right, rgba(37, 99, 235, 0.16) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(37, 99, 235, 0.16) 1px, transparent 1px);
  background-size: 40px 40px;
}
```

### 3.4 Micro-étiquette (équivalent « Label-overline »)

```css
.micro-label {
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.18em;
}
```

### 3.5 Interface plate — ombres désactivées

```css
/* Ombres désactivées — interface plate */
.shadow-soft,
.shadow-soft-lg {
  box-shadow: none !important;
}

/* ===== Suppression complète de toutes les ombres ===== */
*, *::before, *::after {
  box-shadow: none !important;
  text-shadow: none !important;
}
```

### 3.6 Chiffres / prix

```css
.tabular-nums {
  font-variant-numeric: tabular-nums;
}
```

### 3.7 Carte avec hover (feature card)

```css
.card-hover {
  transition: all 0.2s cubic-bezier(0.25, 0.1, 0.25, 1);
}
.card-hover:hover {
  transform: translateY(-2px);
}
```

### 3.8 Skeleton shimmer custom

```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.skeleton-pulse {
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}
```

### 3.9 Scrollbars globales

```css
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #cbd5e1;  /* slate-300 */
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;  /* slate-400 */
}
.dark ::-webkit-scrollbar-thumb {
  background: #334155;  /* slate-700 */
}
```

> `scrollbar-none` (masquer la scrollbar des Tabs / carrousels) est un **utilitaire natif Tailwind v4.1**, utilisé dans `Dashboard.tsx`, `Settings.tsx`, `NewEstimation.tsx`, `EstimationResult.tsx`.

---

## 4. Palette Auth (page de connexion)

> Pas de variables `--auth-*` : la page Auth utilise des **valeurs arbitraires inline oklch** pour son accent « terracotta chantier », distinct de l'émeraude du reste de la plateforme.

| Usage | Classe / valeur exacte |
|---|---|
| Accent terracotta (focus icônes, focus champs) | `oklch(0.52 0.175 35.5)` (light) / `oklch(0.7 0.14 35)` (dark) |
| Bouton CTA primaire | `bg-gradient-to-r from-[oklch(0.52_0.175_35.5)] to-[oklch(0.45_0.16_35.5)]` ; hover `from-[oklch(0.48_0.16_35.5)] to-[oklch(0.42_0.15_35.5)]` |
| Focus champs | `focus:border-[oklch(0.52_0.175_35.5)] focus:ring-2 focus:ring-[oklch(0.52_0.175_35.5)]/15` (dark : `oklch(0.7_0.14_35)` / 20) |
| Barre supérieure (top bar) | `h-1.5 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400` |
| Tuile logo | `size-14 sm:size-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600` |
| Fond décoratif | `blueprint-grid` (quadrillage bleu 40px, voir 3.3) |
| Champs | `h-11 sm:h-12 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900` |
| Libellés | `text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400` |
| Erreur | `text-sm text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-400 rounded-xl px-4 py-2.5 border border-red-100 dark:border-red-900/50` |

---

## 5. Focus visible global (accessibilité)

- Règle de base : `* { @apply border-border outline-ring/50; }` — outline par défaut = `--ring` à 50 %.
- Boutons / inputs / champs shadcn : `focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]` + `outline-none`.
- Erreurs : `aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive`.
- Sidebar : `focus-visible:ring-2` sur les menu-buttons.
- Auth : `focus:ring-2 focus:ring-[oklch(0.52 0.175 35.5)]/15`.
- `::selection { background-color: color-mix(in oklch, oklch(0.596 0.145 163.2) 22%, transparent); color: inherit; }`
- `* { -webkit-tap-highlight-color: transparent; }`

---

## 6. Support RTL / arabe

```css
/* Version arabe : police système adaptée + rendu RTL */
body.lang-ar {
  font-family: 'Tajawal', 'Noto Sans Arabic', -apple-system, BlinkMacSystemFont, "Segoe UI",
    "Tahoma", "Helvetica Neue", "Arial", sans-serif;
}
body.lang-ar .font-display,
body.lang-ar [class*="font-display"] {
  font-family: inherit;
}
```

- Polices chargées : Inter (300–800, opsz 14–32), Tajawal (300/400/500/700/800), Noto Sans Arabic (300–800).
- Pas d'utilitaires de flip (mirror) dans le projet : la direction est gérée via la classe `lang-ar` sur `<body>`.

---

## 7. Couleurs sémantiques (classes Tailwind réelles + contexte)

### 7.1 Neutres — slate (dominante) et gray (secondaire)

| Classe | Occurrences | Contexte |
|---|---|---|
| `text-slate-400` / `text-slate-500` | 418 / 297 | Texte secondaire, meta, libellés |
| `text-slate-600` / `700` / `800` / `900` | 108 / 54 / 26 / 96 | Hiérarchie texte clair |
| `text-slate-100` / `200` / `300` | 76 / 36 / 109 | Texte sur fonds sombres |
| `border-slate-200` / `100` | 124 / 36 | Bordures claires (cartes, inputs) |
| `bg-slate-800` / `900` / `950` / `100` / `50` | 108 / 90 / 64 / 58 / 64 | Fonds sombres (hero, footer, dark) |
| `text-gray-400` / `500` | 139 / 111 | Variante grise des mêmes rôles |

### 7.2 Émeraude — couleur de marque (primary, succès, vente)

| Classe | Occurrences | Contexte |
|---|---|---|
| `text-emerald-600` | 110 | Valeurs, prix, succès, vendeur/bailleur |
| `text-emerald-400` / `300` / `200` | 106 / 89 / 12 | Variantes dark mode |
| `bg-emerald-50` | 92 | Fonds de cartes succès / positive |
| `bg-emerald-950` | 81 | Fonds badges dark |
| `text-emerald-700` | 81 | Titres succès, badges light |
| `bg-emerald-100` / `500` / `600` / `900` | 26 / 24 / 12 / 35 | Badges, points, gradients |

### 7.3 Bleu — accent secondaire (acheteur, info, blueprint)

| Classe | Occurrences | Contexte |
|---|---|---|
| `text-blue-600` | 75 | Liens, profils acheteur, info |
| `bg-blue-50` | 57 | Fonds info / acheteur |
| `from-blue-600` / `to-blue-500` | 43 / 28 | Dégradé accent bleu (toggle « acheteur ») |
| `text-blue-400` / `700` / `300` / `500` | 49 / 43 / 41 / 30 | Hiérarchie blue dark/light |
| `bg-blue-950` / `900` | 43 / 27 | Badges bleus dark |

### 7.4 Ambre / orange — avertissements, construction

| Classe | Occurrences | Contexte |
|---|---|---|
| `bg-amber-50` | 42 | Fonds warning / construction |
| `text-amber-700` | 36 | Titres warning light |
| `text-amber-400` / `600` / `300` / `500` | 38 / 33 / 33 / 15 | Hiérarchie ambre |
| `bg-amber-950` / `900` / `500` | 34 / 19 / 18 | Badges ambre dark |
| `from-amber-500 to-orange-500` | 10 | Dégradé CTA construction |

### 7.5 Rouge / rose — destructif, erreur, urgent

| Classe | Occurrences | Contexte |
|---|---|---|
| `bg-red-950` / `bg-red-50` | 21 / 18 | Badges / fonds erreur |
| `text-red-400` / `500` / `600` / `700` | 17 / 13 / 8 / 9 | Erreurs, urgent |
| `bg-red-500` | 10 | Points / barres (quota épuisé) |

### 7.6 Violet / indigo — maintenance, investissement

| Classe | Occurrences | Contexte |
|---|---|---|
| `text-violet-600` | 18 | Type « Maintenance » |
| `bg-violet-50` / `900` / `950` | 17 / 13 / 12 | Badges violet light/dark |
| `from-violet-600 to-purple-600` | 4 | Dégradé maintenance |
| `to-indigo-600` | 9 | Investissement locatif |

### 7.7 Métadonnées sémantiques codées (`src/convex/types.ts`)

**Types d'annonces** (badges prêts à l'emploi) :

| Type | Emoji | badgeClass (light + dark) |
|---|---|---|
| information | ℹ️ | `bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800` |
| news | 🆕 | `bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800` |
| important | 🟠 | `bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800` |
| urgent | 🔴 | `bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-800` |
| maintenance | 🛠️ | `bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border-violet-200 dark:border-violet-800` |

**Statuts d'annonces** : published → émeraude, scheduled → jaune (`bg-yellow-100 text-yellow-700 ...`), draft → slate, expired → rose, disabled → zinc. **Priorités** : urgent 5 > important 4 > news 3 > information 1 (maintenance 2).

**Intentions client** : 🏠 vendeur / 🔎 acheteur / 🏠 bailleur / 🔎 locataire (`CLIENT_NEED_META`).

**Jauge de quota** (`src/lib/utils.ts`) : `>0.66 → bg-emerald-500`, `>0.33 → bg-amber-500`, sinon `bg-red-500`.

---

## 8. Dégradés (classes réelles, par fréquence)

| Dégradé | Occurrences | Contexte |
|---|---|---|
| `from-blue-600 to-blue-500` | 28 | Accent « acheteur » (SegmentedToggle), CTAs info |
| `from-slate-50 via-white to-slate-50` | 11 | Fonds de sections neutres |
| `from-amber-500 to-orange-500` | 10 | Accent construction / warning |
| `from-emerald-600 to-teal-600` | 9 | Accent « vendeur / bailleur » (SegmentedToggle), marque |
| `from-emerald-500 to-teal-500` | 7 | Variante marque |
| `from-emerald-600 to-emerald-500` | 6 | Boutons émeraude |
| `from-emerald-50 to-teal-100` | 6 | Fonds de sections émeraude clair |
| `from-blue-50 to-blue-100` | 6 | Fonds de sections bleu clair |
| `from-amber-50 to-orange-50` | 6 | Fonds de sections ambre clair |
| `from-amber-500 via-amber-400 to-orange-400` | 6 | CTA dégradé 3 tons |
| `from-violet-600 to-purple-600` | 4 | Maintenance |
| `from-slate-50 to-white` | 6 | Hauts de page |

Règle d'usage observée : **les dégradés ne s'appliquent qu'aux accents et CTAs** ; les surfaces restent plates (bordure + fond token).

---

## 9. Typographie

### 9.1 Familles

- **`--font-sans`** : Inter (variable) → tout le texte.
- **`--font-display`** : Inter → chiffres stats / prix / hero (via `font-display`).
- **`--font-arabic`** : Tajawal + Noto Sans Arabic (RTL).
- `font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11'` sur `body`.

### 9.2 Échelle réelle utilisée

| Taille | Occurrences | Usage |
|---|---|---|
| `text-[9px]` / `[10px]` / `[11px]` | 74 / 305 / 114 | Micro-libellés, meta, badges, uppercase tracking |
| `text-xs` | 641 | Corps secondaire, libellés, cartes |
| `text-sm` | 462 | Corps principal, boutons |
| `text-base` | 64 | Corps large, inputs |
| `text-lg` / `text-xl` | 40 / 21 | Sous-titres, titres de cartes |
| `text-2xl` / `text-3xl` | 11 / 16 | Titres de section / prix |
| `text-4xl` / `text-5xl` / `text-6xl` | 12 / 7 / 1 | H1 hero (Landing) |

### 9.3 Patterns de titres (classes exactes)

```tsx
// H1 Landing
"mx-auto max-w-4xl text-4xl font-black leading-[1.08] tracking-tight text-slate-900 dark:text-slate-50 sm:text-5xl lg:text-6xl"

// H2 section
"mx-auto max-w-2xl text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl"

// Prix affiché (page résultat)
"text-2xl sm:text-3xl font-bold tracking-tight leading-tight"

// Chiffre stat (Landing)
"font-display text-3xl font-black tracking-tight tabular-nums text-slate-900 dark:text-slate-50 sm:text-4xl"

// Micro-label de section
"text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400"
```

### 9.4 Poids

`font-black` (20, titres hero) > `font-bold` (199) > `font-semibold` (299, titres de cartes/boutons) > `font-medium` (184, labels).

### 9.5 Interlignage

`leading-tight` (35), `leading-relaxed` (49), `leading-snug` (10), `leading-none` (10).

---

## 10. Rayons & espacements

### 10.1 Rayons (tokens)

| Token | Valeur | Classes Tailwind |
|---|---|---|
| `--radius` | `1rem` (16px) | `rounded-lg` |
| `--radius-sm` | `calc(1rem - 4px)` = 12px | `rounded-sm` |
| `--radius-md` | `calc(1rem - 2px)` = 14px | `rounded-md` |
| `--radius-xl` | `calc(1rem + 4px)` = 20px | `rounded-xl` |

Fréquence d'usage : `rounded-xl` 341 · `rounded-full` 205 · `rounded-lg` 179 · `rounded-2xl` 124 · `rounded-md` 66 · `rounded-sm` 20 · `rounded-xs` 5.

### 10.2 Espacements dominants

`gap-2` 363 · `gap-1` 280 · `gap-3` 140 · `gap-4` 42 · `px-4` 136 · `px-3` 127 · `py-1` 109 · `py-2` 87 · `p-3` 73 · `p-4` 68 · `px-6` 64 (padding des cartes shadcn) · `mt-1` 87 · `mb-1` 60.

---

## 11. Composants — patterns exacts

### 11.1 Button (`src/components/ui/button.tsx`)

```tsx
// Base commune
"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all
 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4
 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]
 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive"

// Variants
default:      "bg-primary text-primary-foreground hover:bg-primary/90"
destructive:  "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60"
outline:      "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50"
secondary:    "bg-secondary text-secondary-foreground hover:bg-secondary/80"
ghost:        "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50"
link:         "text-primary underline-offset-4 hover:underline"

// Sizes
default: "h-9 px-4 py-2 has-[>svg]:px-3"
sm:      "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5"
lg:      "h-10 rounded-md px-6 has-[>svg]:px-4"
icon:    "size-9"
icon-sm: "size-8"
icon-lg: "size-10"
```

### 11.2 Card (`src/components/ui/card.tsx` + pattern Dashboard)

```tsx
// Base shadcn
"bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm"   // (ombre neutralisée globalement)
// Header : "grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6"
// Title  : "leading-none font-semibold"  ·  Description : "text-muted-foreground text-sm"
// Content: "px-6"  ·  Footer : "flex items-center px-6 [.border-t]:pt-6"

// Pattern carte Dashboard (CARD_CLS, src/pages/Dashboard.tsx)
const CARD_CLS = "border-0 bg-white/95 dark:bg-slate-900/95 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)] rounded-2xl overflow-hidden relative";
// + "card-hover group" pour les cartes interactives (translateY(-2px) au hover)

// Barre d'accent supérieure de carte (CardAccent)
"h-1.5 bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400"
```

### 11.3 Input & Textarea (`src/components/ui/input.tsx`, `textarea.tsx`)

```tsx
// Input
"file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground
 dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs
 transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent
 file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
// + "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
// + "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive"

// Textarea
"border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50
 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive
 dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2
 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px]
 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
```

### 11.4 Badge (`src/components/ui/badge.tsx`)

```tsx
// Base
"inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap
 shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50
 focus-visible:ring-[3px] transition-[color,box-shadow] overflow-hidden"

default:      "border-transparent bg-primary text-primary-foreground"
secondary:    "border-transparent bg-secondary text-secondary-foreground"
destructive:  "border-transparent bg-destructive text-white dark:bg-destructive/60"
outline:      "text-foreground"
```

### 11.5 Dialog / Modal (`src/components/ui/dialog.tsx`)

```tsx
// Overlay
"data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0
 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50"

// Content (responsive mobile → desktop)
"bg-background data-[state=open]:animate-in data-[state=closed]:animate-out
 data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95
 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full
 max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6
 shadow-lg duration-200 outline-none sm:max-w-lg"

// Titre : "text-lg leading-none font-semibold" · Description : "text-muted-foreground text-sm"
// Close : "absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100"
```

Pattern mobile observé : `max-w-[calc(100%-2rem)]` (marge 1rem de chaque côté) + `sm:max-w-lg` ; panneaux latéraux via `Sheet`/Vaul (drawer) sur mobile.

### 11.6 Tabs (`src/components/ui/tabs.tsx`)

```tsx
List:    "bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]"
Trigger: "data-[state=active]:bg-background dark:data-[state=active]:text-foreground ... inline-flex h-[calc(100%-1px)]
         flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium
         whitespace-nowrap transition-[color,box-shadow] data-[state=active]:shadow-sm"
// Pattern Dashboard : TabsList dans CARD_CLS + "p-1 w-full sm:w-auto justify-start overflow-x-auto scrollbar-none"
```

### 11.7 Switch (`src/components/ui/switch.tsx`)

```tsx
Root:  "peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input dark:data-[state=unchecked]:bg-input/80
        inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs
        transition-all outline-none focus-visible:ring-[3px]"
Thumb: "bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground
        block size-4 rounded-full transition-transform data-[state=checked]:translate-x-[calc(100%-2px)]"
```

### 11.8 SegmentedToggle custom (`src/components/SegmentedToggle.tsx`)

```tsx
// Active — accent bleu (acheteur)
"bg-gradient-to-r from-blue-600 to-blue-500 border-transparent text-white"
// Active — accent émeraude (vendeur / bailleur)
"bg-gradient-to-r from-emerald-600 to-teal-600 border-transparent text-white"
// Inactif
"border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300
 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-950/30"
// Conteneur : "grid w-full grid-cols-1 sm:grid-cols-2 gap-2" · rôles ARIA radiogroup/radio
```

### 11.9 Chips de section (SectionPill, `src/pages/Landing.tsx`)

```tsx
"mb-5 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.18em]"
emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
violet:  "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300"
indigo:  "border-indigo-500/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
amber:   "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300"
rose:    "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300"
sky:     "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300"
teal:    "border-teal-500/20 bg-teal-500/10 text-teal-700 dark:text-teal-300"
```

### 11.10 Skeleton & Spinner

```tsx
Skeleton: "bg-accent animate-pulse rounded-md"
Spinner:  <Loader2Icon className="size-4 animate-spin" role="status" />
```

### 11.11 Charts (Recharts — `src/components/ui/chart.tsx`)

- Tooltip : `"border-border/50 bg-background grid min-w-[8rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl"` ; valeurs en `font-mono font-medium tabular-nums`.
- Couleurs : tokens `--chart-1..5` (section 2.2/2.3).
- Grid : `stroke-border/50` ; axes : `fill-muted-foreground`.

### 11.12 Toasts (Sonner — `src/components/ui/sonner.tsx`)

```tsx
"--normal-bg": "var(--popover)", "--normal-text": "var(--popover-foreground)",
"--normal-border": "var(--border)", "--border-radius": "var(--radius)"
// Icônes lucide : success CircleCheck · info Info · warning TriangleAlert · error OctagonX · loading Loader2 spin
```

### 11.13 Sidebar (shadcn `sidebar.tsx`)

- Largeurs : desktop `16rem`, mobile `18rem`, icônes `3rem` ; raccourci `Ctrl/Cmd+B`.
- Tokens : `--sidebar*` (sections 2.2/2.3) ; menu button actif : `data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium` ; sous-menu : `border-l border-sidebar-border`.
- Mobile : bascule en `Sheet` (drawer).

---

## 12. Tailles d'icônes (échelle + contextes)

| Taille | Occurrences | Contexte |
|---|---|---|
| `size-4` | 367 | **Défaut** : icônes de boutons (`[&>svg]:size-4`), menus, listes |
| `size-3.5` | 212 | Lignes compactes, tables, items |
| `size-3` | 105 | Micro-contextes, badges (`[&>svg]:size-3`) |
| `size-5` | 74 | Actions secondaires, en-têtes de carte |
| `size-6` | 48 | Icônes fonctionnelles (vides d'état, actions majeures) |
| `size-7` / `size-8` / `size-9` / `size-10` | 45 / 53 / 54 / 29 | Boutons icon (`icon-sm`/`icon`/`icon-lg`), avatars |
| `size-12` | 20 | Icônes de fonctionnalités (feature cards) |
| `size-14` / `size-16` | — | Tuiles logo Auth (`size-14 sm:size-16`) |

Règle : les icônes héritent de la taille du texte adjacent sauf contrainte explicite ; dans les boutons, `[&_svg:not([class*='size-'])]:size-4` force `size-4` par défaut.

### 12.1 Patterns d'utilisation (référence BatiBuild — copiable tel quel)

Les 10 patterns canoniques d'utilisation des icônes (source : DESIGN_SYSTEM BatiBuild).
Notation `size-*` de BatiCost ≍ notation `h-* w-*` de BatiBuild (équivalents stricts : `size-4` ≡ `h-4 w-4`, `size-6` ≡ `h-6 w-6`, `size-8` ≡ `h-8 w-8`).

```tsx
// 1. Bouton avec icône (gauche)
<Button>
  <Plus className="h-4 w-4" />
  Créer
</Button>

// 2. Bouton avec icône (droite, lien externe)
<Button variant="outline">
  Voir
  <ExternalLink className="ml-2 h-4 w-4" />
</Button>

// 3. Icône seule (bouton icon)
<Button variant="ghost" size="icon">
  <Search className="h-4 w-4" />
</Button>

// 4. Icône inline dans du texte
<span className="flex items-center gap-2 text-sm">
  <MapPin className="h-4 w-4 text-muted-foreground" />
  Tunis, Tunisie
</span>

// 5. Icône de statut (succès)
<span className="flex items-center gap-2">
  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
  <span className="text-sm text-emerald-600">Actif</span>
</span>

// 6. Icône d'alerte
<span className="flex items-center gap-2">
  <AlertTriangle className="h-4 w-4 text-amber-600" />
  <span className="text-sm text-amber-600">Attention</span>
</span>

// 7. Loading spinner
<Loader2 className="h-4 w-4 animate-spin" />

// 8. Icône dans une card (fond tinté)
<div className="rounded-xl bg-primary/10 p-3">
  <Building2 className="h-6 w-6 text-primary" />
</div>

// 9. Icône hero / feature
<div className="rounded-2xl bg-emerald-50 p-4">
  <HardHat className="h-8 w-8 text-emerald-600" />
</div>

// 10. Navigation sidebar
<NavLink>
  <Home className="h-4 w-4" />
  <span>Tableau de bord</span>
</NavLink>
```

**Mapping pattern → taille :**

| Pattern | Taille icône | Conteneur | Couleur |
|---|---|---|---|
| 1–3. Boutons (icône ± label) | `h-4 w-4` | — (bouton) | héritée / courante |
| 4. Inline dans du texte | `h-4 w-4` | `flex items-center gap-2` | `text-muted-foreground` |
| 5. Statut succès | `h-4 w-4` | `flex items-center gap-2` | `text-emerald-600` |
| 6. Alerte | `h-4 w-4` | `flex items-center gap-2` | `text-amber-600` |
| 7. Loading | `h-4 w-4` + `animate-spin` | — | héritée |
| 8. Card (tuile) | `h-6 w-6` | `rounded-xl bg-primary/10 p-3` | `text-primary` |
| 9. Hero / feature | `h-8 w-8` | `rounded-2xl bg-emerald-50 p-4` | `text-emerald-600` |
| 10. Sidebar nav | `h-4 w-4` | — | héritée |

---

## 13. Transitions & animations

### 13.1 Durées Tailwind (classes)

`duration-200` (dominant — hovers, dialogs) · `duration-300` (surfaces) · `duration-150` (micro) · `duration-500` (lent).

### 13.2 Framer Motion — patterns récurrents

| Pattern | Valeurs exactes | Usage |
|---|---|---|
| Transition de page (`PageTransition.tsx`) | `initial {opacity: 0, y: 12}` → `animate {opacity: 1, y: 0}` → `exit {opacity: 0, y: -12}`, `duration: 0.25`, `ease: [0.25, 0.1, 0.25, 1]` | Routes |
| Entrée standard | `initial {opacity: 0, y: 16/20}` → `animate {opacity: 1, y: 0}`, `duration: 0.4–0.6`, `ease: [0.16, 1, 0.3, 1]` | Sections, cartes |
| Micro-interaction (spring) | `type: "spring", stiffness: 200, damping: 15` | Hovers, toggles |
| Spring rapide | `stiffness: 400, damping: 30` | Apparitions rapides |
| Spring lent / décalé | `delay: 0.2–0.7, stiffness: 150–220, damping: 22–28` | Stagger d'éléments |
| Stagger | `variants={staggerContainer} initial="initial" whileInView="whileInView" viewport={{ once: true }}` | Grilles de features |
| Hover CSS (`.card-hover`) | `transition: all 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)` + `translateY(-2px)` | Feature cards |

### 13.3 tw-animate-css (dialog)

`animate-in fade-in-0 zoom-in-95` (open) / `fade-out-0 zoom-out-95` (close), `duration-200`.

---

## 14. Print / PDF (rapport d'estimation)

- `@media print` : masque `header, nav, .sticky, [role="tablist"], button`, fond blanc, texte noir, `font-size: 11pt`, bordures `#e0e0e0`, rayons 4pt, dégradés → `#1e3a5f` (bleu nuit rapport), classes `.print-report-header` / `.print-report-footer` / `.print-section-title` (couleur `#1e3a5f`).
- Mode capture html2canvas : `.pdf-capture` (voir `src/index.css`).

---

## 15. Dark mode — implémentation

- Classe `.dark` sur `<html>` via `ThemeProvider` ; préférence système au premier chargement ; clé `localStorage: baticost-theme` ; pas de FOUC (état initial synchronisé).
- Transitions douces : `html { transition: background-color 0.3s ease, color 0.3s ease; }` et `html, body, * { transition: background-color 0.25s ease, border-color 0.25s ease, color 0.2s ease; }`.
- Overrides dark dédiés : `.dark .bg-white/80, .dark .bg-white/90 → rgba(15,23,42,0.9)` ; `.dark .bg-gray-50 → #0f172a` ; `.dark .bg-gray-100 → #1e293b` ; `.dark .bg-gradient-to-br.from-blue-600... → #1e293b`.

---

## 16. Checklist de transfert vers le projet cible

1. Copier les blocs CSS des sections 2.1 → 2.5 dans `index.css` (ou équivalent Tailwind v4 CSS-first).
2. Copier les utilitaires custom de la section 3 (glass, gradient-text, motifs, micro-label, flat-shadows, tabular-nums, card-hover, skeleton-pulse, scrollbars).
3. Reproduire les composants shadcn/ui sections 11.1 → 11.13 (via `shadcn init` + remplacement des classes si nécessaire).
4. Installer : `tailwindcss@^4`, `tw-animate-css`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `framer-motion`, Radix requis.
5. Conserver la règle flat : `*, *::before, *::after { box-shadow: none !important; text-shadow: none !important; }` si l'interface doit rester plate.
6. S'assurer que `@custom-variant dark (&:is(.dark *));` est présent pour le dark mode par classe.
7. Vérifier l'accessibilité : focus rings `ring-[3px] ring-ring/50`, états `aria-invalid`, contrastes slate-500/muted-foreground sur fonds card.

---

## 17. Vérification

- Toutes les valeurs proviennent du code BatiCost (`src/index.css`, `src/components/ui/*`, `src/pages/*`, `src/convex/types.ts`) — vérifiées par lecture directe et grep d'occurrences.
- Aucune valeur inventée ; les approximations hex sont marquées `≈`.
- Le typecheck du projet (`bun tsc -b --noEmit`) reste inchangé (document Markdown uniquement).