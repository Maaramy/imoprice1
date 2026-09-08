/**
 * BIM Engine — Module Location (Estimation des loyers par IA)
 * Moteur d'estimation des loyers mensuels du marché tunisien.
 *
 * Basé sur les loyers réels constatés août 2026
 * (Source : Modele_Immobilier_Tunisie_24_Gouvernorats_2026.xlsx)
 *  - loyer de base au m²/mois par gouvernorat (appartement)
 *  - ratios par type de bien (studio > appartement > maison > villa…)
 *  - multiplicateurs de localisation (ville × quartier) réutilisés du moteur vente
 *  - équipements en % de plus-value locative
 *  - prévisions 6/12/24 mois, rendement brut, comparables déterministes,
 *    moyennes de marché colorées et conseiller IA.
 */

import type {
  EstimationResult,
  PropertyInput,
  RentComparable,
  RentEstimationResult,
  RentFinishLevel,
  RentForecastPoint,
  RentForecastSummary,
  RentLevel,
  RentMarketAverage,
  RentNightlyEstimate,
  RentPropertyInput,
  RentZoneProfile,
  RentZoneType,
} from "../convex/types";
import { RENT_ZONE_LABELS } from "../convex/types";
import { RENT_PROPERTY_TYPES } from "../convex/types";
import {
  computeEnhancedEstimation,
  getCityMultiplier,
  getQuartierMultiplier,
  type MarketConfig,
} from "./enhanced-estimation";
import { findZone } from "./zones";
import { findDelegation, getGovAvgRentNm, getGovAvgRentMeuble } from "./delegations";
import { findQuartier } from "./quartiers";

// ─── LOYER DE BASE AU M²/MOIS PAR GOUVERNORAT (appartement, TND) ───
// Source : Modele_Immobilier_Tunisie_24_Gouvernorats_2026.xlsx
// Loyers moyens constatés en location longue durée août 2026.
export const RENT_REGION_BASE_PRICES: Record<string, number> = {
  Tunis: 17.21, Ariana: 14.25, "Ben Arous": 11.73, Manouba: 9.75,
  Nabeul: 13.00, Zaghouan: 6.68, Bizerte: 9.59, Béja: 6.52,
  Jendouba: 7.22, Kef: 5.82, Siliana: 5.45, Sousse: 13.16,
  Monastir: 11.87, Mahdia: 10.12, Sfax: 11.37, Kairouan: 6.46,
  Kasserine: 5.10, "Sidi Bouzid": 4.87, Gabès: 7.54, Médenine: 10.98,
  Tataouine: 5.35, Gafsa: 7.11, Tozeur: 7.02, Kébili: 5.83,
};

/** Repli national (moyenne Tunisie) pour un appartement — avg 144 zones 2026 */
export const RENT_DEFAULT_APARTMENT = 8.92;

/** Ratio du loyer au m² par type de bien (par rapport à l'appartement) */
export const RENT_TYPE_RATIOS: Record<string, number> = {
  maison: 0.92,
  villa: 0.85,
  appartement: 1.0,
  studio: 1.3,          // petites surfaces → loyer au m² plus élevé
  duplex: 1.05,
  local_commercial: 2.4, // locaux commerciaux : loyer au m² nettement supérieur
  bureau: 1.5,
};

/**
 * Garde-fou du comparatif « Location vs Vente » (pages de résultats).
 * Le comparatif n'est affiché que si :
 *  1. le type de bien est pris en charge par le moteur de location
 *     (RENT_PROPERTY_TYPES — sinon le moteur retomberait sur un ratio
 *     « appartement » trompeur pour terrains, immeubles, garages…), et
 *  2. une surface construite valide (> 0) est renseignée.
 */
export function canShowRentComparison(property: {
  propertyType?: string | null;
  builtSurface?: number | null;
} | null | undefined): boolean {
  if (!property) return false;
  const type = property.propertyType;
  if (!type || !(RENT_PROPERTY_TYPES as readonly string[]).includes(type)) return false;
  if (!property.builtSurface || property.builtSurface <= 0) return false;
  return true;
}

// ─── ÉQUIPEMENTS LOCATIFS (% de plus-value sur le loyer) ───
export const RENT_FEATURE_KEYS = [
  "isFurnished", "hasEquippedKitchen", "hasFiber", "hasInternet", "hasCameras",
  "hasSmartHome", "hasSolar", "hasAC", "hasHeating", "hasElevator", "hasParking",
  "hasGarden", "hasPool", "hasTerrace", "hasBalcony",
] as const;
export type RentFeatureKey = (typeof RENT_FEATURE_KEYS)[number];

export const RENT_FEATURE_VALUES: Record<RentFeatureKey, number> = {
  isFurnished: 0.16,        // Meublé — +16% (premium majeur en location)
  hasEquippedKitchen: 0.06, // Cuisine équipée — +6%
  hasFiber: 0.04,           // Fibre optique — +4%
  hasInternet: 0.03,        // Internet — +3%
  hasCameras: 0.04,         // Caméras — +4%
  hasSmartHome: 0.05,       // Domotique — +5%
  hasSolar: 0.05,           // Panneaux solaires — +5%
  hasAC: 0.05,              // Climatisation — +5%
  hasHeating: 0.03,         // Chauffage — +3%
  hasElevator: 0.05,        // Ascenseur — +5%
  hasParking: 0.06,         // Parking — +6%
  hasGarden: 0.05,          // Jardin — +5%
  hasPool: 0.14,            // Piscine — +14% (très recherchée en location)
  hasTerrace: 0.04,         // Terrasse — +4%
  hasBalcony: 0.03,         // Balcon — +3%
};

// ─── NIVEAU DE FINITION ───
export const RENT_FINISH_MULTIPLIERS: Record<string, number> = {
  economique: 0.82, // -18% (finition simple)
  standard: 1.0,    // Référence
  premium: 1.12,    // +12%
  luxe: 1.30,       // +30% (standing)
};

// ─── PROFIL DE ZONE & LOCATION PAR NUITÉE (courte durée) ───
// Multiplicateur nuitée (vs loyer mensuel / 30 jours) par profil de zone.
// Référence marché : une nuitée courte durée se loue 2 à 4× la nuitée
// « longue durée » (loyer mensuel / 30), selon l'attractivité de la zone.
export const RENT_ZONE_NIGHT_MULTIPLIERS: Record<RentZoneType, number> = {
  touristique: 3.2,   // Hammamet, Djerba, Sousse, Tabarka…
  urbain: 2.6,        // Grand Tunis, Sfax ville, centres d'affaires
  universitaire: 2.2, // El Manar, Cité El Ghazala, campus…
  commercial: 2.4,    // zones d'activité, marchés
  residentiel: 2.0,   // quartiers résidentiels classiques
};

// Taux d'occupation annuel moyen estimé par profil de zone (courte durée)
export const RENT_ZONE_OCCUPANCY: Record<RentZoneType, number> = {
  touristique: 0.62,
  urbain: 0.55,
  universitaire: 0.58,
  commercial: 0.52,
  residentiel: 0.5,
};

// ─── Saisonnalité « hôte saisons » (location par nuitée) ───
// Multiplicateurs de tarif (haute / moyenne / basse saison) et taux
// d'occupation de base par période, ajustés selon le profil de zone.
export const RENT_ZONE_SEASONS: Record<
  RentZoneType,
  { h: number; m: number; l: number; occH: number; occM: number; occL: number }
> = {
  // Zones balnéaires : forte saisonnalité estivale
  touristique: { h: 1.35, m: 1.0, l: 0.72, occH: 0.82, occM: 0.55, occL: 0.3 },
  // Grandes villes : demande d'affaires plus stable
  urbain: { h: 1.08, m: 1.0, l: 0.85, occH: 0.6, occM: 0.55, occL: 0.45 },
  // Zones étudiantes : pic à la rentrée (moyenne saison)
  universitaire: { h: 1.12, m: 1.0, l: 0.8, occH: 0.55, occM: 0.62, occL: 0.5 },
  // Zones d'activité : demande régulière
  commercial: { h: 1.1, m: 1.0, l: 0.82, occH: 0.58, occM: 0.55, occL: 0.42 },
  // Quartiers résidentiels classiques
  residentiel: { h: 1.1, m: 1.0, l: 0.85, occH: 0.55, occM: 0.5, occL: 0.4 },
};

// Mots-clés de détection automatique du profil de zone (priorité décroissante)
const TOURIST_ZONE_TERMS = [
  "hammamet", "yasmine", "nabeul", "sousse", "monastir", "mahdia",
  "djerba", "houmt souk", "midoun", "zarzis", "bizerte", "tabarka",
  "tozeur", "la marsa", "gammarth", "sidi bou said", "carthage",
  "kélibia", "korba", "nefza", "ain draham", "port el kantaoui",
];
const UNIVERSITY_ZONE_TERMS = [
  "el manar", "cité el ghazala", "ettadhamen", "manouba", "campus",
  "université", "universitaire", "el kram", "technopole", "ghazela",
];
const URBAN_ZONE_TERMS = [
  "tunis", "ariana", "ben arous", "sfax", "el menzah", "la soukra",
  "les berges du lac", "centre urbain nord", "l'aouina", "charguia",
  "mutuelleville", "le belvédère", "les jardins", "sfax ville",
  "sousse ville", "monastir ville", "el omrane", "lac 1", "lac 2",
];

/**
 * Détecte automatiquement le profil de zone depuis la localisation
 * (gouvernorat / ville / quartier). Retourne null si aucune correspondance.
 */
export function detectRentZoneType(
  gouvernorat?: string | null,
  ville?: string | null,
  quartier?: string | null,
): RentZoneType | null {
  const hay = [gouvernorat, ville, quartier]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (!hay) return null;
  if (TOURIST_ZONE_TERMS.some((t) => hay.includes(t))) return "touristique";
  if (UNIVERSITY_ZONE_TERMS.some((t) => hay.includes(t))) return "universitaire";
  if (URBAN_ZONE_TERMS.some((t) => hay.includes(t))) return "urbain";
  return null;
}

// ─── CROISSANCE LOCATIVE ANNUELLE PAR GOUVERNORAT (%/an) ───
// Source : Modele Immobilier Tunisie 2026 — scénario central
// Loyer national moyen croissance: 4.5% (juste), achat: 4.0%
export const RENT_GROWTH_RATES: Record<string, number> = {
  Tunis: 0.055, Ariana: 0.048, "Ben Arous": 0.045, Manouba: 0.035,
  Sousse: 0.048, Monastir: 0.045, Nabeul: 0.045, Bizerte: 0.035,
  Sfax: 0.04, Médenine: 0.035, Mahdia: 0.035, Gabès: 0.03,
  Kairouan: 0.028, Jendouba: 0.025, Béja: 0.024, Kef: 0.02,
  Zaghouan: 0.024, Siliana: 0.02, Kasserine: 0.02,
  "Sidi Bouzid": 0.022, Tataouine: 0.018, Gafsa: 0.022,
  Tozeur: 0.025, Kébili: 0.022,
};

// ─── DURÉE MOYENNE DE LOCATION (mois) ───
export const RENT_DURATION_BY_TYPE: Record<string, number> = {
  appartement: 24, maison: 24, villa: 18, studio: 12,
  duplex: 18, local_commercial: 36, bureau: 36,
};

// ─── NIVEAU DE MARCHÉ (couleurs) ───
export const RENT_LEVELS: Record<RentLevel, { label: string; color: string; dot: string; text: string }> = {
  tres_faible: { label: "Très faible", color: "bg-blue-500", dot: "bg-blue-500", text: "text-blue-600 dark:text-blue-400" },
  faible: { label: "Faible", color: "bg-emerald-500", dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
  moyen: { label: "Moyen", color: "bg-amber-500", dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
  eleve: { label: "Élevé", color: "bg-orange-500", dot: "bg-orange-500", text: "text-orange-600 dark:text-orange-400" },
  tres_eleve: { label: "Très élevé", color: "bg-red-500", dot: "bg-red-500", text: "text-red-600 dark:text-red-400" },
};

export function rentLevelInfo(level: RentLevel) {
  return RENT_LEVELS[level] ?? RENT_LEVELS.moyen;
}

// ─── CONFIG ADMINISTRABLE ───
export interface RentMarketConfig {
  rentRegionBasePrices?: Record<string, number>;
  rentTypeRatios?: Record<string, number>;
  rentFeatureValues?: Record<string, number>;
  rentFinishMultipliers?: Record<string, number>;
  rentGrowthRates?: Record<string, number>;
}

export function applyRentMarketConfig(config?: RentMarketConfig) {
  return {
    rentRegionBasePrices: { ...RENT_REGION_BASE_PRICES, ...config?.rentRegionBasePrices },
    rentTypeRatios: { ...RENT_TYPE_RATIOS, ...config?.rentTypeRatios },
    rentFeatureValues: { ...RENT_FEATURE_VALUES, ...config?.rentFeatureValues },
    rentFinishMultipliers: { ...RENT_FINISH_MULTIPLIERS, ...config?.rentFinishMultipliers },
    rentGrowthRates: { ...RENT_GROWTH_RATES, ...config?.rentGrowthRates },
  };
}

// ─── FONCTIONS UTILITAIRES ───
/** Loyer de base au m²/mois pour un gouvernorat + un type de bien */
export function getRentBasePrice(
  gouvernorat: string,
  propertyType: string,
  config?: RentMarketConfig,
): number {
  const tables = applyRentMarketConfig(config);
  const apt = tables.rentRegionBasePrices[gouvernorat] ?? RENT_DEFAULT_APARTMENT;
  const ratio = tables.rentTypeRatios[propertyType] ?? 1.0;
  return apt * ratio;
}

/** Nombre arrondi au 5 TND le plus proche (loyers réalistes) */
function roundRent(n: number): number {
  return Math.round(n / 5) * 5;
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TYPE_LABEL: Record<string, string> = {
  maison: "Maison", villa: "Villa", appartement: "Appartement", studio: "Studio",
  duplex: "Duplex", local_commercial: "Local commercial", bureau: "Bureau",
};

/** Classe le loyer au m² par rapport à la moyenne nationale du type */
export function rentLevelFor(rentPerSqm: number, propertyType: string, config?: RentMarketConfig): RentLevel {
  const national = getRentBasePrice("", propertyType, config) || 1;
  const ratio = rentPerSqm / national;
  if (ratio < 0.5) return "tres_faible";
  if (ratio < 0.75) return "faible";
  if (ratio < 1.15) return "moyen";
  if (ratio < 1.6) return "eleve";
  return "tres_eleve";
}

// ─── ESTIMATION PAR NUITÉE (courte durée) ───
export function computeRentNightlyEstimate(
  estimatedRent: number,
  p: RentPropertyLike,
  zoneType: RentZoneType,
  saleValue: number,
  detected: boolean,
): { zoneProfile: RentZoneProfile; nightly: RentNightlyEstimate } {
  let multiplier = RENT_ZONE_NIGHT_MULTIPLIERS[zoneType];
  const nearby: string[] = [];

  const addNearby = (flag: boolean | undefined, label: string, bonus: number) => {
    if (flag) {
      nearby.push(label);
      multiplier += bonus;
    }
  };
  addNearby(p.nearBeach, "Plage", 0.7);
  addNearby(p.nearClinic, "Clinique", 0.2);
  addNearby(p.nearHospital, "Hôpital", 0.15);
  addNearby(p.nearUniversity, "Université", 0.2);
  addNearby(p.nearMall, "Centre commercial", 0.15);
  addNearby(p.nearTransport, "Transport public", 0.15);

  // Équipements déterminants pour la courte durée
  if (p.isFurnished) multiplier += 0.9;      // meublé indispensable en courte durée
  if (p.hasPool) multiplier += 0.5;          // piscine très valorisée (tourisme)
  if (p.hasAC) multiplier += 0.2;            // confort estival
  if (p.hasFiber || p.hasInternet) multiplier += 0.15;
  if (p.hasSmartHome) multiplier += 0.1;
  if (p.hasEquippedKitchen) multiplier += 0.15;

  const finish = p.finishLevel ?? "standard";
  if (finish === "economique") multiplier -= 0.3;
  else if (finish === "premium") multiplier += 0.4;
  else if (finish === "luxe") multiplier += 0.8;

  multiplier = Math.min(Math.max(multiplier, 1.4), 6.5);

  const basePerNight = estimatedRent / 30;
  const nightlyRent = Math.max(roundRent(basePerNight * multiplier), 25);
  const nightlyMin = Math.max(roundRent(nightlyRent * 0.88), 25);
  const nightlyMax = Math.max(roundRent(nightlyRent * 1.12), nightlyMin);

  // Taux d'occupation annuel (zone + ajustements)
  let occupancy = RENT_ZONE_OCCUPANCY[zoneType];
  if (p.nearBeach) occupancy += 0.05;
  if (p.hasAC) occupancy += 0.03;
  if (p.isFurnished) occupancy += 0.03;
  if (p.hasPool) occupancy += 0.02;
  occupancy = Math.min(Math.max(occupancy, 0.35), 0.8);

  // ── Hôte saisons : tarifs & revenus par période ──
  const sz = RENT_ZONE_SEASONS[zoneType];
  let occH = sz.occH;
  let occM = sz.occM;
  let occL = sz.occL;
  if (p.hasPool) occH += 0.04;
  if (p.nearBeach) occH += 0.05;
  if (p.hasAC) {
    occH += 0.03;
    occL += 0.02;
  }
  // Normalise l'occupation saisonnière pour que la moyenne pondérée
  // (122/121/122 nuits) corresponde au taux d'occupation annuel estimé.
  const wAvg = (occH * 122 + occM * 121 + occL * 122) / 365;
  const occScale = occupancy / Math.max(wAvg, 0.01);
  occH = Math.min(Math.max(occH * occScale, 0.25), 0.95);
  occM = Math.min(Math.max(occM * occScale, 0.2), 0.9);
  occL = Math.min(Math.max(occL * occScale, 0.15), 0.85);

  // Moyenne pondérée des facteurs saisonniers → sert à normaliser les
  // tarifs pour que le prix moyen annuel reste égal à nightlyRent.
  const rawMean = (sz.h * 122 + sz.m * 121 + sz.l * 122) / 365;
  const seasonMeta = [
    {
      key: "haute" as const,
      label: "Haute saison",
      months: "Juin – Septembre · fêtes de fin d'année",
      nights: 122,
      factor: sz.h,
      occ: occH,
      tip: "Tarif plein : tourisme, plages & vacances — réservez tôt pour maximiser.",
    },
    {
      key: "moyenne" as const,
      label: "Moyenne saison",
      months: "Avril – Mai · Octobre – Novembre",
      nights: 121,
      factor: sz.m,
      occ: occM,
      tip: "Tarif standard : demande équilibrée, idéal pour tester le marché.",
    },
    {
      key: "basse" as const,
      label: "Basse saison",
      months: "Décembre – Mars",
      nights: 122,
      factor: sz.l,
      occ: occL,
      tip: "Tarif réduit : attire séjours longue durée, professionnels & étudiants.",
    },
  ];
  const seasons = seasonMeta.map((s) => {
    const pricePerNight = Math.max(roundRent((nightlyRent * s.factor) / Math.max(rawMean, 0.01)), 25);
    const revenue = Math.round(pricePerNight * s.nights * s.occ);
    return {
      key: s.key,
      label: s.label,
      months: s.months,
      nights: s.nights,
      pricePerNight,
      occupancyRate: Math.round(s.occ * 100),
      revenue,
      revenueShare: 0,
      isBest: false,
      tip: s.tip,
    };
  });
  const seasonRevenue = seasons.reduce((sum, s) => sum + s.revenue, 0);
  const bestSeason = seasons.reduce((a, b) => (b.revenue > a.revenue ? b : a));
  seasons.forEach((s) => {
    s.revenueShare = seasonRevenue > 0 ? Math.round((s.revenue / seasonRevenue) * 100) : 0;
    s.isBest = s.key === bestSeason.key;
  });

  const weeklyEstimate = Math.max(roundRent(nightlyRent * 7 * 0.95), 50);
  const monthlyEstimate = Math.max(roundRent(nightlyRent * 30 * 0.9), 100);
  // Revenu annuel = somme des revenus saisonniers (moyenne pondérée égale
  // au taux d'occupation annuel, donc ≈ ancienne formule à 1-2 % près).
  const annualRevenue = Math.round(seasonRevenue);
  const nightlyYield = saleValue > 0 ? (annualRevenue / saleValue) * 100 : 0;

  return {
    zoneProfile: {
      type: zoneType,
      label: RENT_ZONE_LABELS[zoneType] ?? zoneType,
      detected,
      multiplier: Math.round(multiplier * 100) / 100,
      nearby,
    },
    nightly: {
      nightlyRent,
      nightlyMin,
      nightlyMax,
      occupancyRate: Math.round(occupancy * 100),
      weeklyEstimate,
      monthlyEstimate,
      annualRevenue,
      nightlyYield,
      multiplier: Math.round((nightlyRent / Math.max(basePerNight, 1)) * 100) / 100,
      seasons,
    },
  };
}

// ─── SCORE DE CONFIANCE ───
function computeRentConfidence(
  p: RentPropertyLike,
  config?: RentMarketConfig,
): number {
  let score = 0.6;
  if (p.gouvernorat && RENT_REGION_BASE_PRICES[p.gouvernorat]) score += 0.07;
  if (p.builtSurface && p.builtSurface > 0) score += 0.06;
  if (p.propertyType) score += 0.04;
  if (p.ville) {
    const m = getCityMultiplier(p.ville, config as MarketConfig);
    score += m !== 1.0 ? 0.06 : 0.03;
  }
  if (p.quartier) {
    const m = getQuartierMultiplier(p.quartier, config as MarketConfig);
    score += m !== 1.0 ? 0.07 : 0.04;
  }
  if (p.yearBuilt) score += 0.04;
  if (p.generalState || p.finishLevel) {
    score += 0.03;
    if (p.finishLevel === "luxe" || p.finishLevel === "premium" || p.generalState === "luxe" || p.generalState === "excellent_etat") score += 0.02;
  }
  if (p.bedrooms && p.bedrooms > 0) score += 0.02;
  if (p.bathrooms && p.bathrooms > 0) score += 0.01;
  if (p.isFurnished) score += 0.02;
  if (p.hasAC || p.hasElevator || p.hasParking) score += 0.01;
  return Math.min(score, 0.98);
}

// Type local souple (compatible RentPropertyInput / PropertyInput)
type RentPropertyLike = RentPropertyInput;

// ─── PRÉVISIONS DES LOYERS ───
function buildRentForecast(
  rent: number,
  gouvernorat: string,
): { forecast: RentForecastPoint[]; summary: RentForecastSummary } {
  const growth = RENT_GROWTH_RATES[gouvernorat] ?? 0.03;
  const monthly = growth / 12;
  const project = (months: number) => roundRent(rent * Math.pow(1 + monthly, months));

  const forecast: RentForecastPoint[] = [
    { label: "Aujourd'hui", months: 0, rent: roundRent(rent) },
    { label: "+6 mois", months: 6, rent: project(6) },
    { label: "+12 mois", months: 12, rent: project(12) },
    { label: "+24 mois", months: 24, rent: project(24) },
  ];

  const change = (months: number) => ((project(months) / rent) - 1) * 100;
  const change6m = change(6);
  const change12m = change(12);
  const change24m = change(24);

  const trend: RentForecastSummary["trend"] = change24m > 1.5 ? "hausse" : change24m < -1.5 ? "baisse" : "stabilite";
  const confidence = Math.min(88, 62 + Math.abs(change24m) * 6);

  const messages: Record<RentForecastSummary["trend"], string> = {
    hausse: `La demande locative dans le gouvernorat de ${gouvernorat || "référence"} soutient une hausse des loyers estimée à ${change24m >= 0 ? "+" : ""}${change24m.toFixed(1)} % sur 24 mois.`,
    stabilite: `Le marché locatif de ${gouvernorat || "référence"} devrait rester stable sur les 24 prochains mois (±1,5 %).`,
    baisse: `Une légère baisse de ${change24m.toFixed(1)} % est anticipée sur 24 mois — la demande locative de ${gouvernorat || "référence"} est en retrait.`,
  };

  return {
    forecast,
    summary: { trend, change6m, change12m, change24m, confidence, message: messages[trend] },
  };
}

// ─── COMPARABLES LOCATIFS (déterministe) ───
const RENT_NEIGHBORHOODS = ["Centre", "Résidentiel", "Nord", "Sud", "Est", "Ouest", "Extension", "Zone Urbaine"];

function buildRentComparables(
  p: RentPropertyLike,
  rentPerSqm: number,
  baseSurface: number,
  config?: RentMarketConfig,
): RentComparable[] {
  const rand = mulberry32(hashSeed(`${p.gouvernorat}|${p.ville}|${p.quartier}|${p.propertyType}|${baseSurface}|rent`));
  const type = p.propertyType || "appartement";
  const surfaces = [
    Math.round(baseSurface * 0.75), Math.round(baseSurface * 1.0),
    Math.round(baseSurface * 1.25), Math.round(baseSurface * 0.6),
    Math.round(baseSurface * 0.9), Math.round(baseSurface * 1.15),
  ];
  const zone = p.ville || p.gouvernorat || "Secteur";
  const out: RentComparable[] = [];
  for (let i = 0; i < 5; i++) {
    const surface = surfaces[i];
    const perSqm = rentPerSqm * (0.9 + rand() * 0.22);
    const rent = roundRent(surface * perSqm);
    out.push({
      id: `rc-${i}`,
      type: TYPE_LABEL[type] || type,
      surface,
      quartier: p.quartier
        ? `${zone}, ${RENT_NEIGHBORHOODS[i % RENT_NEIGHBORHOODS.length]}`
        : `${zone} ${RENT_NEIGHBORHOODS[i % RENT_NEIGHBORHOODS.length]}`,
      rent,
      rentPerSqm: Math.round((rent / surface) * 10) / 10,
      distance: i === 0 ? "À proximité" : `${Math.round(300 + rand() * 2200)} m`,
      furnished: i % 2 === 0 ? true : undefined,
    });
  }
  return out;
}

// ─── FACTEURS & CONSEILS ───
function rentPositiveFactors(p: RentPropertyLike, quartierMult: number, age: number): string[] {
  const f: string[] = [];
  if (p.isFurnished)    f.push("Bien meublé — loyer premium (+18 % sur le marché locatif, scénario Central 2026)");
  if (p.hasPool) f.push("Piscine très recherchée en location (+14 %)");
  if (p.hasEquippedKitchen) f.push("Cuisine équipée — un critère décisif pour les locataires");
  if (p.hasFiber) f.push("Fibre optique — idéal pour télétravail et étudiants");
  if (p.hasSmartHome) f.push("Domotique — différenciant auprès des locataires premium");
  if (p.hasAC) f.push("Climatisation — indispensable en été tunisien");
  if (p.hasElevator) f.push("Ascenseur — loyer supérieur en immeuble");
  if (p.hasParking) f.push("Parking inclus — fort atout locatif");
  if (p.hasGarden) f.push("Jardin privatif apprécié des familles");
  if (quartierMult > 1.05) f.push("Quartier prisé — forte demande locative");
  if (age <= 5) f.push("Construction récente — normes et confort modernes");
  if (p.finishLevel === "luxe" || p.finishLevel === "premium") f.push("Finition premium — loyer au-dessus du marché");
  f.push("Demande locative stable sur le marché tunisien");
  return f;
}

function rentNegativeFactors(p: RentPropertyLike, age: number): string[] {
  const f: string[] = [];
  if (!p.isFurnished && p.propertyType !== "local_commercial" && p.propertyType !== "bureau")
    f.push("Non meublé — segment de locataires plus restreint");
  if (!p.hasAC) f.push("Absence de climatisation");
  if (!p.hasParking && p.propertyType !== "studio" && p.propertyType !== "local_commercial")
    f.push("Absence de parking");
  if (age > 30) f.push("Bien ancien — loyer plafonné par l'état du bâti");
  if (p.floor && p.floor > 3 && !p.hasElevator)
    f.push("Étage élevé sans ascenseur — moins attractif");
  if (p.finishLevel === "economique") f.push("Finition économique — loyer inférieur au standard");
  f.push("Concurrence locative sur les biens équivalents du quartier");
  return f;
}

function rentImprovements(p: RentPropertyLike): string[] {
  const s: string[] = [];
  if (!p.isFurnished)
    s.push("Meubler le bien peut augmenter le loyer de 8 à 12 % (expatriés, étudiants)");
  if (!p.hasEquippedKitchen)
    s.push("Installer une cuisine équipée — gain locatif de 4 à 6 %");
  if (!p.hasFiber)
    s.push("Connecter la fibre optique — un critère de choix en 2026");
  if (!p.hasAC)
    s.push("Ajouter la climatisation — loyer +4 % et vacance locative réduite");
  if (!p.hasParking && p.propertyType === "appartement")
    s.push("Proposer un emplacement de parking — loyer +5 %");
  if (!p.hasSolar)
    s.push("Panneaux solaires : charges réduites pour le locataire, loyer justifié à +3-4 %");
  if (p.propertyType === "villa" && !p.hasPool)
    s.push("Une piscine d'été peut justifier un loyer saisonnier nettement supérieur");
  s.push("Rafraîchir peintures et revêtements avant mise en location (réduction de la vacance)");
  return s;
}

// ─── CONSEILLER IA ───
function buildRentAdvisor(
  result: Omit<RentEstimationResult, "advisor">,
  p: RentPropertyLike,
): RentEstimationResult["advisor"] {
  const fmt = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} TND`;
  const { rentMin, rentMax, estimatedRent, rentPerSqm, grossYield, marketAverages, forecastSummary } = result;
  const zone = [p.quartier, p.ville, p.gouvernorat].filter(Boolean).join(" — ") || "votre zone";
  const levelLabel = rentLevelInfo(marketAverages.level).label.toLowerCase();

  const questions = [
    {
      q: "Quel est le bon prix de location ?",
      a: `Pour ${TYPE_LABEL[p.propertyType || "appartement"]?.toLowerCase() ?? "ce bien"} à ${zone}, le loyer mensuel recommandé est de ${fmt(estimatedRent)} (fourchette ${fmt(rentMin)} – ${fmt(rentMax)}), soit ${rentPerSqm.toFixed(1)} TND/m²/mois — un niveau ${levelLabel} pour le marché.`,
    },
    {
      q: "Dois-je augmenter le loyer ?",
      a: `Par rapport au loyer moyen du quartier (${fmt(marketAverages.quartier)}/m²/mois), votre loyer de ${fmt(rentPerSqm)}/m² se situe ${estimatedRent > marketAverages.quartier * (p.builtSurface || 100) ? "au-dessus" : "sous"} la moyenne. La tendance à ${forecastSummary.change12m >= 0 ? "+" : ""}${forecastSummary.change12m.toFixed(1)} % sur 12 mois ${forecastSummary.change12m >= 0 ? "autorise une révision à la hausse à la fin du bail" : "suggère de maintenir le loyer actuel"}.`,
    },
    {
      q: "Mon bien est-il sous-évalué ?",
      a: `Le loyer moyen au m² à ${p.ville || p.gouvernorat || "votre zone"} est de ${fmt(marketAverages.ville)}/m²/mois. Avec un loyer estimé à ${rentPerSqm.toFixed(1)} TND/m²/mois, votre bien est ${rentPerSqm >= marketAverages.ville ? "correctement ou légèrement sur-évalué" : "sous-évalué — une hausse de 5 à 10 % est justifiée"}.`,
    },
    {
      q: "Quel quartier offre la meilleure rentabilité ?",
      a: `La rentabilité brute de ce bien est estimée à ${grossYield.toFixed(1)} %/an. Les meilleurs rendements locatifs en Tunisie se trouvent dans les zones étudiantes et périphériques à forte demande (Ettadhamen, El Mourouj, Cité El Ghazala, zones universitaires de Sfax et Sousse), où les loyers au m² sont modestes mais le taux d'occupation élevé — souvent 6 à 9 % brut, contre 3 à 4,5 % dans les quartiers premium du Grand Tunis.`,
    },
    {
      q: "Quel est le meilleur investissement locatif en Tunisie ?",
      a: `En 2026, les studios et petits appartements (30-60 m²) en zone universitaire ou d'entreprise offrent le meilleur compromis (Sousse, Tunis, Sfax) avec des rendements bruts de 6 à 8 %. Les locaux commerciaux et bureaux dans les centres d'affaires (Berges du Lac, Centre Urbain Nord) donnent les loyers au m² les plus élevés. Votre bien affiche un rendement brut estimé à ${grossYield.toFixed(1)} %/an, ${grossYield >= 5 ? "au-dessus" : "dans la moyenne"} du marché.`,
    },
  ];
  return { questions };
}

// ─── MOTEUR PRINCIPAL ───
export function computeRentEstimation(
  property: RentPropertyInput,
  config?: RentMarketConfig,
): RentEstimationResult {
  const tables = applyRentMarketConfig(config);
  const gouvernorat = property.gouvernorat || "";
  const ville = property.ville || "";
  const quartier = property.quartier || "";
  const propertyType = property.propertyType || "appartement";
  const builtSurface = property.builtSurface || 60;
  const generalState = property.generalState || "bon_etat";
  const finishLevel = property.finishLevel || (generalState === "luxe" ? "luxe" : generalState === "a_renover" ? "economique" : "standard");

  // ── 0a. Lookup quartier (2 073 quartiers marché tunisien 2026) ──
  const matchedQ = quartier
    ? findQuartier(gouvernorat, ville || '', quartier)
    : findQuartier(gouvernorat, ville || '');

  // ── 0b. Lookup délégation (264 délégations marché tunisien 2026) ──
  const delegation = quartier
    ? findDelegation(gouvernorat, quartier) ?? findDelegation(gouvernorat, ville)
    : findDelegation(gouvernorat, ville);

  // ── 0c. Lookup zone (144 zones calibrées marché tunisien 2026) ──
  const rentZone = findZone(gouvernorat, ville, quartier);

  // ── 1. Loyer de base au m² ──
  // Priorité : quartier (2073) > zone (144) > délégation (264) > gouvernorat (24)
  let rentPerSqm: number;
  let cityMult = 1.0;
  let quartierMult = 1.0;
  let locationMult = 1.0;
  if (matchedQ && matchedQ.loyerNm > 0) {
    // Loyer non meublé du quartier (prix au m²/mois)
    rentPerSqm = matchedQ.loyerNm;
    const typeRatio = tables.rentTypeRatios[propertyType] ?? 1.0;
    rentPerSqm *= typeRatio;
  } else if (rentZone) {
    rentPerSqm = rentZone.loyerM2;
    const typeRatio = tables.rentTypeRatios[propertyType] ?? 1.0;
    rentPerSqm *= typeRatio;
  } else if (delegation) {
    rentPerSqm = delegation.loyerNm;
    const typeRatio = tables.rentTypeRatios[propertyType] ?? 1.0;
    rentPerSqm *= typeRatio;
  } else {
    rentPerSqm = getRentBasePrice(gouvernorat, propertyType, config);
    // ── 2. Localisation (ville × quartier, bornée) ──
    // Les loyers varient moins que les prix de vente : plafond à 1.6
    cityMult = getCityMultiplier(ville, config as MarketConfig);
    quartierMult = getQuartierMultiplier(quartier, config as MarketConfig);
    locationMult = Math.min(Math.max(cityMult * quartierMult, 0.45), 1.6);
    rentPerSqm *= locationMult;
  }

  // ── 3. Finition & état ──
  const finishMult = tables.rentFinishMultipliers[finishLevel] ?? 1.0;
  rentPerSqm *= finishMult;

  // ── 4. Équipements (% de plus-value, plafonnés à +50 %) ──
  // Meublé (+16 %) et piscine (+14 %) sont les deux prestations qui
  // valorisent le plus un bien en location mensuelle.
  const fv = tables.rentFeatureValues;
  let bonus = 0;
  RENT_FEATURE_KEYS.forEach((k) => {
    if (property[k]) bonus += fv[k] ?? 0;
  });
  rentPerSqm *= 1 + Math.min(bonus, 0.5);

  // ── 5. Âge (décote plus douce qu'en vente) ──
  const currentYear = new Date().getFullYear();
  const yearBuilt = property.yearBuilt || currentYear - 15;
  const age = Math.max(0, currentYear - yearBuilt);
  let ageMult = 1.0;
  if (age > 50) ageMult = 0.80;
  else if (age > 40) ageMult = 0.86;
  else if (age > 30) ageMult = 0.92;
  else if (age > 20) ageMult = 0.96;
  else if (age > 10) ageMult = 0.98;
  else if (age > 5) ageMult = 0.99;
  else if (age <= 2) ageMult = 1.03;
  rentPerSqm *= ageMult;

  // ── 6. Surface (petites surfaces → loyer/m² supérieur) ──
  let surfaceMult = 1.0;
  if (builtSurface > 300) surfaceMult = 0.85;
  else if (builtSurface > 200) surfaceMult = 0.90;
  else if (builtSurface > 150) surfaceMult = 0.95;
  else if (builtSurface < 35) surfaceMult = 1.22;
  else if (builtSurface < 50) surfaceMult = 1.14;
  else if (builtSurface < 65) surfaceMult = 1.08;
  rentPerSqm *= surfaceMult;

  // ── 7. Étage (appartements) ──
  // Défaut : étage 2 (neutre). RDC ou étages élevés sans ascenseur pénalisés,
  // étages élevés avec ascenseur légèrement valorisés (vue).
  const floor = property.floor ?? property.floors ?? 2;
  if (propertyType === "appartement" || propertyType === "duplex" || propertyType === "studio") {
    if (floor > 3 && !property.hasElevator) rentPerSqm *= 0.92;
    else if (floor >= 4 && property.hasElevator) rentPerSqm *= 1.04;
    else if (floor === 1) rentPerSqm *= 0.97;
  }

  // ── 8. Loyer mensuel ──
  const rawRent = rentPerSqm * builtSurface;
  const estimatedRent = Math.max(roundRent(rawRent), 100);
  const rentPerSqmFinal = Math.round((estimatedRent / builtSurface) * 10) / 10;

  // ── 9. Confiance + fourchette ──
  const confidenceScore = computeRentConfidence(property, config);
  const confidenceIndex = Math.round(confidenceScore * 100);
  const rangeWidth = 0.05 + (1 - confidenceScore) * 0.10;
  const rentMin = Math.max(roundRent(estimatedRent * (1 - rangeWidth)), 50);
  const rentMax = Math.max(roundRent(estimatedRent * (1 + rangeWidth)), rentMin);

  // ── 10. Durée moyenne de location ──
  const avgRentalDurationMonths = RENT_DURATION_BY_TYPE[propertyType] ?? 24;
  const annualRent = estimatedRent * 12;

  // ── 11. Rendement (loyer × 12 / valeur vente estimée) ──
  const saleInput: PropertyInput = {
    address: property.address || "",
    gouvernorat: property.gouvernorat || "",
    ville: property.ville || "",
    quartier: property.quartier || "",
    latitude: property.latitude,
    longitude: property.longitude,
    propertyType,
    terrainSurface: property.terrainSurface,
    builtSurface,
    floors: property.floors,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    kitchens: property.kitchens,
    livingRooms: property.livingRooms,
    garages: property.garages,
    hasGarden: property.hasGarden ?? false,
    hasPool: property.hasPool ?? false,
    hasTerrace: property.hasTerrace ?? false,
    hasBalcony: property.hasBalcony ?? false,
    hasElevator: property.hasElevator ?? false,
    hasParking: property.hasParking ?? false,
    hasAC: property.hasAC ?? false,
    hasHeating: property.hasHeating ?? false,
    hasSolar: property.hasSolar ?? false,
    yearBuilt: property.yearBuilt,
    generalState,
  };
  const saleResult: EstimationResult = computeEnhancedEstimation(saleInput, config as MarketConfig);
  const saleValue = saleResult.estimatedValue;
  const grossYield = saleValue > 0 ? (annualRent / saleValue) * 100 : 0;

  // ── 11bis. Profil de zone + estimation par nuitée (courte durée) ──
  const autoZone = detectRentZoneType(gouvernorat, ville, quartier);
  const zoneType: RentZoneType = property.zoneType ?? autoZone ?? "residentiel";
  const { zoneProfile, nightly } = computeRentNightlyEstimate(
    estimatedRent,
    property,
    zoneType,
    saleValue,
    !property.zoneType && autoZone !== null,
  );

  // ── 12. Prévisions 6/12/24 mois ──
  const { forecast, summary: forecastSummary } = buildRentForecast(estimatedRent, gouvernorat);

  // ── 13. Moyennes de marché (gouvernorat / ville / quartier) ──
  const baseM2 = getRentBasePrice(gouvernorat, propertyType, config);
  const marketAverages: RentMarketAverage = {
    gouvernorat: Math.round(baseM2 * 10) / 10,
    ville: Math.round(baseM2 * Math.min(Math.max(cityMult, 0.45), 1.6) * 10) / 10,
    quartier: Math.round(baseM2 * locationMult * 10) / 10,
    typeRatio: tables.rentTypeRatios[propertyType] ?? 1.0,
    level: rentLevelFor(rentPerSqmFinal, propertyType, config),
  };

  // ── 14. Facteurs, comparables, conseiller ──
  const positiveFactors = rentPositiveFactors(property, quartierMult, age);
  const negativeFactors = rentNegativeFactors(property, age);
  const improvementSuggestions = rentImprovements(property);
  const comparableRentals = buildRentComparables(property, rentPerSqmFinal, builtSurface, config);

  const partial = {
    estimatedRent, rentMin, rentMax, rentPerSqm: rentPerSqmFinal,
    confidenceIndex, avgRentalDurationMonths, annualRent, grossYield, saleValue,
    forecast, forecastSummary, marketAverages, comparableRentals,
    positiveFactors, negativeFactors, improvementSuggestions,
    zoneProfile, nightly,
  };

  return {
    ...partial,
    advisor: buildRentAdvisor(partial, property),
  };
}

/** Indicateur de marché pour le tableau de bord (données déterministes) */
export function getRentMarketHighlights() {
  const hotZones = [
    { quartier: "Les Berges du Lac", gouvernorat: "Tunis", rentM2: 16.8, yield: 3.6 },
    { quartier: "La Marsa", gouvernorat: "Tunis", rentM2: 13.5, yield: 3.9 },
    { quartier: "La Soukra", gouvernorat: "Ariana", rentM2: 10.8, yield: 4.6 },
    { quartier: "Sousse Ville", gouvernorat: "Sousse", rentM2: 9.5, yield: 5.1 },
    { quartier: "El Menzah", gouvernorat: "Tunis", rentM2: 11.2, yield: 4.4 },
    { quartier: "Hammamet", gouvernorat: "Nabeul", rentM2: 9.8, yield: 4.8 },
  ];
  const bestYields = [
    { quartier: "Ettadhamen", gouvernorat: "Ariana", yield: 8.2 },
    { quartier: "El Mourouj", gouvernorat: "Ben Arous", yield: 7.6 },
    { quartier: "Cité El Ghazala", gouvernorat: "Ariana", yield: 7.1 },
    { quartier: "M'saken", gouvernorat: "Sousse", yield: 6.8 },
    { quartier: "Sfax Ville", gouvernorat: "Sfax", yield: 6.5 },
  ];
  return { hotZones, bestYields };
}


