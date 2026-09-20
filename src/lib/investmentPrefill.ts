// Pré-remplissage du formulaire d'investissement depuis un projet de
// construction (coût réel, scénario budget, région, surface).
// Fonction pure — aucun recalcul, aucune dépendance Convex.

import {
  DEFAULT_ZONE,
  INVESTMENT_TYPE_META,
  INVESTMENT_ZONE_MAP,
  type InvestmentType,
} from "@/convex/investmentTypes";

/** Vue minimale d'un projet de construction, découplée du schéma cible. */
export interface ProjectPrefillSource {
  name?: string | null;
  /** Catégorie ou type de projet (ex. "villa", "appartement", "immeuble"). */
  category?: string | null;
  /** Gouvernorat / région du projet. */
  region?: string | null;
  /** Surface construite (m²). */
  surface?: number | null;
  /** Coût de construction réel (scénario budget retenu), en TND. */
  constructionCost?: number | null;
  /** Scénario budgétaire retenu (ex. "realiste", "optimiste"). */
  budgetScenario?: string | null;
  city?: string | null;
  quartier?: string | null;
}

export interface InvestmentPrefill {
  type: InvestmentType;
  purchasePrice: number;
  surface: number;
  region: string;
  city: string;
  quartier: string;
  projectName?: string;
}

const CATEGORY_TO_TYPE: Record<string, InvestmentType> = {
  maison: "maison",
  villa: "villa",
  appartement: "appartement",
  studio: "studio",
  duplex: "duplex",
  immeuble: "immeuble",
  local_commercial: "local_commercial",
  bureau: "bureau",
  entrepot: "entrepot",
  terrain: "terrain",
  residence_touristique: "residence_touristique",
  projet_neuf: "projet_neuf",
};

function resolveType(category: string | null | undefined): InvestmentType {
  if (!category) return "appartement";
  const key = String(category).toLowerCase().trim();
  if (key in CATEGORY_TO_TYPE) return CATEGORY_TO_TYPE[key];
  if (key in INVESTMENT_TYPE_META) return key as InvestmentType;
  if (key.includes("villa")) return "villa";
  if (key.includes("maison")) return "maison";
  if (key.includes("bureau")) return "bureau";
  if (key.includes("commercial")) return "local_commercial";
  return "appartement";
}

function resolveRegion(region: string | null | undefined): string {
  if (region && INVESTMENT_ZONE_MAP[region]) return region;
  return DEFAULT_ZONE;
}

/**
 * Construit un pré-remplissage d'investissement à partir d'un projet.
 * Le coût de construction réel devient le prix d'achat de référence.
 */
export function investmentPrefillFromProject(project: ProjectPrefillSource): InvestmentPrefill {
  const region = resolveRegion(project.region);
  const zone = INVESTMENT_ZONE_MAP[region];
  return {
    type: resolveType(project.category),
    purchasePrice: Math.max(0, Number(project.constructionCost) || 0),
    surface: Math.max(0, Number(project.surface) || 0),
    region,
    city: project.city?.trim() || zone.name,
    quartier: project.quartier?.trim() || "",
    projectName: project.name?.trim() || undefined,
  };
}
