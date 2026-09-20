// Entrées d'historique « Mes projets d'estimation » pour le Dashboard
// (lecture seule, aucun recalcul — données telles que stockées).

/** Segments d'estimation affichés dans la section. */
export type EstimationSegment = "vente" | "loyers";

export interface SaleEstimationEntry {
  kind: "vente";
  id: string;
  title: string;
  location: string;
  /** Clé brute du type de bien (ex. "villa", "appartement"). */
  propertyType: string;
  typeLabel: string;
  estimatedValue: number;
  priceMin: number;
  priceMax: number;
  avgPricePerSqm: number;
  surface: number | null;
  confidenceIndex: number;
  createdAt: number;
  href: string;
}

export interface RentEstimationEntry {
  kind: "loyers";
  id: string;
  title: string;
  location: string;
  propertyType: string;
  typeLabel: string;
  /** mensuel | nuit */
  rentMode: "mensuel" | "nuit";
  estimatedRent: number;
  rentMin: number;
  rentMax: number;
  rentPerSqm: number;
  grossYield: number;
  surface: number | null;
  confidenceIndex: number;
  createdAt: number;
  href: string;
}

export type EstimationEntry = SaleEstimationEntry | RentEstimationEntry;

/**
 * Mode d'affichage du loyer. Le moteur stocke `nightly` (estimation courte durée)
 * pour **toutes** les estimations — y compris mensuelles — donc l'indicateur fiable
 * est le mode choisi dans le formulaire, sauvegardé dans le snapshot property.
 */
function resolveRentMode(est: RentEstimationLike): "mensuel" | "nuit" {
  const mode = (est.property as { estimationMode?: string } | null | undefined)?.estimationMode;
  if (mode === "nuitée" || mode === "nuit") return "nuit";
  if (mode === "mensuel") return "mensuel";
  // Anciens documents sans estimationMode : fallback sur la présence de nightly
  return est.nightly?.nightlyRent ? "nuit" : "mensuel";
}

export const SALE_TYPE_LABELS: Record<string, string> = {
  appartement: "Appartement",
  maison: "Maison",
  villa: "Villa",
  studio: "Studio",
  duplex: "Duplex",
  immeuble: "Immeuble",
  local_commercial: "Local commercial",
  bureau: "Bureau",
  magasin: "Magasin",
  restaurant: "Restaurant",
  cafe: "Café",
  entrepot: "Entrepôt",
  atelier: "Atelier",
  terrain_constructible: "Terrain constructible",
  terrain_agricole: "Terrain agricole",
  ferme: "Ferme",
  garage: "Garage",
  parking: "Parking",
  depot: "Dépôt",
  mixte: "Bien mixte",
};

export const RENT_TYPE_LABELS: Record<string, string> = {
  maison: "Maison",
  villa: "Villa",
  appartement: "Appartement",
  studio: "Studio",
  duplex: "Duplex",
  local_commercial: "Local commercial",
  bureau: "Bureau",
};

/** Type bien → icône (icônes cohérentes vente/loyer). */
export type EstimationIconKind = "home" | "building" | "commerce" | "land" | "key";

export function iconKindFor(propertyType: string | null | undefined): EstimationIconKind {
  switch (propertyType) {
    case "maison":
    case "villa":
      return "home";
    case "local_commercial":
    case "bureau":
    case "magasin":
    case "restaurant":
    case "cafe":
    case "entrepot":
    case "atelier":
      return "commerce";
    case "terrain_constructible":
    case "terrain_agricole":
    case "ferme":
      return "land";
    default:
      return "building";
  }
}

/* ─────────────────────────── Vente ─────────────────────────── */

export interface SaleEstimationLike {
  _id: string;
  _creationTime: number;
  estimatedValue: number;
  priceMin: number;
  priceMax: number;
  avgPricePerSqm: number;
  confidenceIndex: number;
  property?: {
    propertyType?: string;
    ville?: string;
    gouvernorat?: string;
    quartier?: string;
    builtSurface?: number;
  } | null;
}

export function buildSaleEstimationEntry(est: SaleEstimationLike): SaleEstimationEntry {
  const property = est.property ?? {};
  const typeKey = property.propertyType ?? "";
  const typeLabel = SALE_TYPE_LABELS[typeKey] ?? (typeKey || "Bien immobilier");
  const locationParts = [property.quartier, property.ville, property.gouvernorat]
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter(Boolean);
  const location = locationParts.join(", ");
  return {
    kind: "vente",
    id: est._id,
    title: typeLabel,
    location: location || "Localisation non renseignée",
    propertyType: typeKey,
    typeLabel,
    estimatedValue: est.estimatedValue,
    priceMin: est.priceMin,
    priceMax: est.priceMax,
    avgPricePerSqm: est.avgPricePerSqm,
    surface: typeof property.builtSurface === "number" ? property.builtSurface : null,
    confidenceIndex: est.confidenceIndex,
    createdAt: est._creationTime,
    href: `/estimate/${est._id}`,
  };
}

/* ─────────────────────────── Loyers ─────────────────────────── */

export interface RentEstimationLike {
  _id: string;
  _creationTime: number;
  estimatedRent: number;
  rentMin: number;
  rentMax: number;
  rentPerSqm: number;
  grossYield: number;
  confidenceIndex: number;
  zoneProfile?: { type?: string } | null;
  nightly?: { nightlyRent?: number } | null;
  property?: Record<string, unknown> | null;
}

export function buildRentEstimationEntry(est: RentEstimationLike): RentEstimationEntry {
  const property = (est.property ?? {}) as Record<string, unknown>;
  const typeKey = typeof property.propertyType === "string" ? property.propertyType : "";
  const typeLabel = RENT_TYPE_LABELS[typeKey] ?? (typeKey || "Bien");
  const parts = [property.quartier, property.ville, property.gouvernorat]
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter(Boolean);
  const location = parts.join(", ");
  const rentMode = resolveRentMode(est);
  return {
    kind: "loyers",
    id: est._id,
    title: typeLabel,
    location: location || "Localisation non renseignée",
    propertyType: typeKey,
    typeLabel,
    rentMode,
    estimatedRent: est.estimatedRent,
    rentMin: est.rentMin,
    rentMax: est.rentMax,
    rentPerSqm: est.rentPerSqm,
    grossYield: est.grossYield,
    surface: typeof property.builtSurface === "number" ? (property.builtSurface as number) : null,
    confidenceIndex: est.confidenceIndex,
    createdAt: est._creationTime,
    href: `/estimate/loyer/${est._id}`,
  };
}

/* ─────────────────────────── Statistiques ─────────────────────────── */

export interface EstimationStats {
  count: number;
  /** Vente : valeur totale estimée. Loyers : revenu mensuel potentiel cumulé. */
  totalValue: number;
  avgConfidence: number;
  bestConfidence: number;
}

export function summarizeSaleEstimations(entries: SaleEstimationEntry[]): EstimationStats {
  if (entries.length === 0) return { count: 0, totalValue: 0, avgConfidence: 0, bestConfidence: 0 };
  const totalValue = entries.reduce((sum, e) => sum + e.estimatedValue, 0);
  const avgConfidence = entries.reduce((sum, e) => sum + e.confidenceIndex, 0) / entries.length;
  const bestConfidence = Math.max(...entries.map((e) => e.confidenceIndex));
  return {
    count: entries.length,
    totalValue,
    avgConfidence: Math.round(avgConfidence),
    bestConfidence,
  };
}

export function summarizeRentEstimations(entries: RentEstimationEntry[]): EstimationStats {
  if (entries.length === 0) return { count: 0, totalValue: 0, avgConfidence: 0, bestConfidence: 0 };
  const totalValue = entries.reduce((sum, e) => sum + e.estimatedRent, 0);
  const avgConfidence = entries.reduce((sum, e) => sum + e.confidenceIndex, 0) / entries.length;
  const bestConfidence = Math.max(...entries.map((e) => e.confidenceIndex));
  return {
    count: entries.length,
    totalValue,
    avgConfidence: Math.round(avgConfidence),
    bestConfidence,
  };
}
