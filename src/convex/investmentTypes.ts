// ════════════════════════════════════════════════════════════════════════
// MODULE INVESTISSEMENT IMMOBILIER (ROI) — CONTRAT / SOURCE DE VÉRITÉ UNIQUE
// Marché tunisien · devise TND
//
// Ce fichier ne contient que des données pures et des validateurs Convex.
// Il est importable aussi bien par le backend (moteur) que par le schéma.
// ════════════════════════════════════════════════════════════════════════

import { v, type Infer } from "convex/values";

/* ─────────────────────────── Types d'investissement ─────────────────────────── */

export const INVESTMENT_TYPES = [
  "maison",
  "villa",
  "appartement",
  "studio",
  "duplex",
  "immeuble",
  "local_commercial",
  "bureau",
  "entrepot",
  "terrain",
  "residence_touristique",
  "projet_neuf",
] as const;

export type InvestmentType = (typeof INVESTMENT_TYPES)[number];

export const investmentTypeValidator = v.union(
  ...INVESTMENT_TYPES.map((t) => v.literal(t)),
);

export type RentMode = "nuit" | "mensuel";

export interface InvestmentTypeMeta {
  label: string;
  icon: string;
  /** Rendement net de référence (%) */
  yieldBenchmark: number;
  /** Appréciation annuelle de référence (%/an) */
  appreciationBenchmark: number;
  riskLevel: "faible" | "moyen" | "eleve";
  /** Mode de location imposé, si applicable */
  rentMode?: RentMode;
  description: string;
}

export const INVESTMENT_TYPE_META: Record<InvestmentType, InvestmentTypeMeta> = {
  maison: {
    label: "Maison",
    icon: "Home",
    yieldBenchmark: 5.5,
    appreciationBenchmark: 4.2,
    riskLevel: "moyen",
    description: "Maison individuelle, location longue durée familiale.",
  },
  villa: {
    label: "Villa",
    icon: "Castle",
    yieldBenchmark: 4.6,
    appreciationBenchmark: 5.1,
    riskLevel: "moyen",
    description: "Villa haut de gamme, forte valorisation, loyer élevé.",
  },
  appartement: {
    label: "Appartement",
    icon: "Building2",
    yieldBenchmark: 6.2,
    appreciationBenchmark: 4.8,
    riskLevel: "faible",
    description: "Actif locatif le plus liquide et le plus demandé.",
  },
  studio: {
    label: "Studio",
    icon: "DoorOpen",
    yieldBenchmark: 7.1,
    appreciationBenchmark: 4.0,
    riskLevel: "faible",
    description: "Petite surface, rotation locative rapide.",
  },
  duplex: {
    label: "Duplex",
    icon: "Layers",
    yieldBenchmark: 5.4,
    appreciationBenchmark: 4.6,
    riskLevel: "moyen",
    description: "Deux niveaux, cible familiale aisée.",
  },
  immeuble: {
    label: "Immeuble",
    icon: "Building",
    yieldBenchmark: 7.4,
    appreciationBenchmark: 5.3,
    riskLevel: "moyen",
    description: "Plusieurs lots, mutualisation du risque locatif.",
  },
  local_commercial: {
    label: "Local commercial",
    icon: "Store",
    yieldBenchmark: 8.2,
    appreciationBenchmark: 4.9,
    riskLevel: "moyen",
    description: "Rendement élevé, baux longs, vacance plus coûteuse.",
  },
  bureau: {
    label: "Bureau",
    icon: "Briefcase",
    yieldBenchmark: 7.6,
    appreciationBenchmark: 4.4,
    riskLevel: "moyen",
    description: "Locataires professionnels, baux fermes.",
  },
  entrepot: {
    label: "Entrepôt",
    icon: "Warehouse",
    yieldBenchmark: 8.8,
    appreciationBenchmark: 3.6,
    riskLevel: "eleve",
    description: "Zone industrielle, loyers stables, revente spécialisée.",
  },
  terrain: {
    label: "Terrain constructible",
    icon: "LandPlot",
    yieldBenchmark: 1.2,
    appreciationBenchmark: 7.4,
    riskLevel: "eleve",
    description: "Aucun revenu locatif, plus-value à la revente.",
  },
  residence_touristique: {
    label: "Résidence touristique",
    icon: "Palmtree",
    yieldBenchmark: 9.4,
    appreciationBenchmark: 5.6,
    riskLevel: "eleve",
    rentMode: "nuit",
    description: "Location courte durée, saisonnalité marquée.",
  },
  projet_neuf: {
    label: "Projet immobilier neuf",
    icon: "HardHat",
    yieldBenchmark: 6.8,
    appreciationBenchmark: 5.8,
    riskLevel: "moyen",
    description: "Promotion neuve, décote sur plan puis valorisation.",
  },
};

/* ─────────────────────────── Zones (24 gouvernorats) ─────────────────────────── */

export interface InvestmentZone {
  region: string;
  name: string;
  /** Prix de vente moyen (TND / m²) */
  pricePerM2: number;
  /** Loyer moyen (TND / m² / mois) */
  rentPerM2: number;
  /** Indice de demande locative (0–100) */
  demandIndex: number;
  /** Appréciation annuelle moyenne (%/an) */
  appreciationPct: number;
  /** Score de risque (0–100, plus élevé = plus risqué) */
  riskScore: number;
  /** Rang d'attractivité investisseur (1 = meilleur) */
  rank: number;
  highlights: string[];
}

export const INVESTMENT_ZONES: InvestmentZone[] = [
  {
    region: "Tunis",
    name: "Tunis",
    pricePerM2: 3200,
    rentPerM2: 18,
    demandIndex: 96,
    appreciationPct: 5.4,
    riskScore: 26,
    rank: 1,
    highlights: ["Capitale économique", "Demande locative maximale", "Très liquide"],
  },
  {
    region: "Ariana",
    name: "Ariana",
    pricePerM2: 2600,
    rentPerM2: 15,
    demandIndex: 92,
    appreciationPct: 5.8,
    riskScore: 24,
    rank: 2,
    highlights: ["Zone résidentielle privilégiée", "Proche Tunis", "Forte appréciation"],
  },
  {
    region: "Ben Arous",
    name: "Ben Arous",
    pricePerM2: 2200,
    rentPerM2: 13,
    demandIndex: 86,
    appreciationPct: 5.1,
    riskScore: 28,
    rank: 4,
    highlights: ["Pôle industriel", "Banlieue sud dynamique"],
  },
  {
    region: "Manouba",
    name: "Manouba",
    pricePerM2: 1800,
    rentPerM2: 11,
    demandIndex: 78,
    appreciationPct: 4.6,
    riskScore: 34,
    rank: 10,
    highlights: ["Rentrée abordable", "Université"],
  },
  {
    region: "Nabeul",
    name: "Nabeul",
    pricePerM2: 2100,
    rentPerM2: 14,
    demandIndex: 88,
    appreciationPct: 5.6,
    riskScore: 32,
    rank: 5,
    highlights: ["Littoral touristique", "Forte demande courte durée"],
  },
  {
    region: "Zaghouan",
    name: "Zaghouan",
    pricePerM2: 1400,
    rentPerM2: 8,
    demandIndex: 62,
    appreciationPct: 3.8,
    riskScore: 46,
    rank: 19,
    highlights: ["Marché secondaire", "Prix d'entrée bas"],
  },
  {
    region: "Bizerte",
    name: "Bizerte",
    pricePerM2: 1900,
    rentPerM2: 12,
    demandIndex: 80,
    appreciationPct: 4.9,
    riskScore: 36,
    rank: 9,
    highlights: ["Port et littoral nord", "Industrie"],
  },
  {
    region: "Béja",
    name: "Béja",
    pricePerM2: 1350,
    rentPerM2: 8,
    demandIndex: 60,
    appreciationPct: 3.5,
    riskScore: 48,
    rank: 21,
    highlights: ["Économie agricole", "Marché de niche"],
  },
  {
    region: "Jendouba",
    name: "Jendouba",
    pricePerM2: 1250,
    rentPerM2: 7,
    demandIndex: 55,
    appreciationPct: 3.2,
    riskScore: 54,
    rank: 23,
    highlights: ["Zone rurale", "Liquidité limitée"],
  },
  {
    region: "Kef",
    name: "Kef",
    pricePerM2: 1200,
    rentPerM2: 7,
    demandIndex: 52,
    appreciationPct: 3.0,
    riskScore: 56,
    rank: 24,
    highlights: ["Marché étroit", "Revente lente"],
  },
  {
    region: "Siliana",
    name: "Siliana",
    pricePerM2: 1150,
    rentPerM2: 6,
    demandIndex: 50,
    appreciationPct: 3.1,
    riskScore: 55,
    rank: 22,
    highlights: ["Marché secondaire", "Faible demande"],
  },
  {
    region: "Sousse",
    name: "Sousse",
    pricePerM2: 2500,
    rentPerM2: 16,
    demandIndex: 93,
    appreciationPct: 5.7,
    riskScore: 27,
    rank: 3,
    highlights: ["Pôle touristique majeur", "Haut rendement courte durée"],
  },
  {
    region: "Monastir",
    name: "Monastir",
    pricePerM2: 2300,
    rentPerM2: 15,
    demandIndex: 89,
    appreciationPct: 5.3,
    riskScore: 30,
    rank: 6,
    highlights: ["Aéroport international", "Tourisme balnéaire"],
  },
  {
    region: "Mahdia",
    name: "Mahdia",
    pricePerM2: 1900,
    rentPerM2: 12,
    demandIndex: 79,
    appreciationPct: 5.0,
    riskScore: 35,
    rank: 11,
    highlights: ["Littoral", "Rendement saisonnier"],
  },
  {
    region: "Sfax",
    name: "Sfax",
    pricePerM2: 2100,
    rentPerM2: 14,
    demandIndex: 87,
    appreciationPct: 4.7,
    riskScore: 29,
    rank: 7,
    highlights: ["Deuxième pôle économique", "Forte demande commerciale"],
  },
  {
    region: "Kairouan",
    name: "Kairouan",
    pricePerM2: 1350,
    rentPerM2: 8,
    demandIndex: 61,
    appreciationPct: 3.6,
    riskScore: 47,
    rank: 20,
    highlights: ["Patrimoine", "Demande modérée"],
  },
  {
    region: "Kasserine",
    name: "Kasserine",
    pricePerM2: 1100,
    rentPerM2: 6,
    demandIndex: 48,
    appreciationPct: 2.8,
    riskScore: 60,
    rank: 25,
    highlights: ["Zone défavorisée", "Risque élevé"],
  },
  {
    region: "Sidi Bouzid",
    name: "Sidi Bouzid",
    pricePerM2: 1150,
    rentPerM2: 6,
    demandIndex: 50,
    appreciationPct: 3.0,
    riskScore: 57,
    rank: 26,
    highlights: ["Économie agricole", "Marché étroit"],
  },
  {
    region: "Gabès",
    name: "Gabès",
    pricePerM2: 1500,
    rentPerM2: 9,
    demandIndex: 66,
    appreciationPct: 3.9,
    riskScore: 44,
    rank: 16,
    highlights: ["Pôle industriel", "Port de commerce"],
  },
  {
    region: "Médenine",
    name: "Médenine",
    pricePerM2: 2000,
    rentPerM2: 13,
    demandIndex: 84,
    appreciationPct: 5.5,
    riskScore: 33,
    rank: 8,
    highlights: ["Djerba", "Tourisme haut de gamme"],
  },
  {
    region: "Tataouine",
    name: "Tataouine",
    pricePerM2: 1000,
    rentPerM2: 5,
    demandIndex: 42,
    appreciationPct: 2.6,
    riskScore: 63,
    rank: 27,
    highlights: ["Zone désertique", "Liquidité très faible"],
  },
  {
    region: "Gafsa",
    name: "Gafsa",
    pricePerM2: 1250,
    rentPerM2: 7,
    demandIndex: 57,
    appreciationPct: 3.3,
    riskScore: 52,
    rank: 18,
    highlights: ["Mines et industrie", "Demande modérée"],
  },
  {
    region: "Tozeur",
    name: "Tozeur",
    pricePerM2: 1600,
    rentPerM2: 10,
    demandIndex: 68,
    appreciationPct: 4.4,
    riskScore: 42,
    rank: 14,
    highlights: ["Oasis touristique", "Potentiel courte durée"],
  },
  {
    region: "Kébili",
    name: "Kébili",
    pricePerM2: 1200,
    rentPerM2: 7,
    demandIndex: 54,
    appreciationPct: 3.4,
    riskScore: 51,
    rank: 17,
    highlights: ["Marché secondaire", "Tourisme de niche"],
  },
];

export const DEFAULT_ZONE = "Tunis";

export const INVESTMENT_ZONE_MAP: Record<string, InvestmentZone> = Object.fromEntries(
  INVESTMENT_ZONES.map((z) => [z.region, z]),
);

export const REGION_LABELS: Record<string, string> = Object.fromEntries(
  INVESTMENT_ZONES.map((z) => [z.region, z.name]),
);

/* ─────────────────────────── Utilités de zone ─────────────────────────── */

export interface ZoneUtilities {
  /** Indice mer / plage */
  mer: number;
  /** Indice lac / plan d'eau */
  lac: number;
  /** Indice centre-ville / hyper-centre */
  centreVille: number;
  /** Indice universitaire */
  universite: number;
  /** Indice aéroport */
  aeroport: number;
  /** Indice zone industrielle / logistique */
  zoneIndustrielle: number;
}

/** Indices d'utilité (0–100) par mot-clé de zone. */
export const ZONE_UTILITIES: Record<string, ZoneUtilities> = {
  plage: { mer: 95, lac: 40, centreVille: 55, universite: 30, aeroport: 50, zoneIndustrielle: 10 },
  corniche: { mer: 90, lac: 45, centreVille: 70, universite: 40, aeroport: 55, zoneIndustrielle: 15 },
  marina: { mer: 92, lac: 60, centreVille: 78, universite: 45, aeroport: 60, zoneIndustrielle: 20 },
  lac: { mer: 55, lac: 95, centreVille: 80, universite: 55, aeroport: 65, zoneIndustrielle: 25 },
  centre: { mer: 40, lac: 35, centreVille: 95, universite: 70, aeroport: 55, zoneIndustrielle: 20 },
  medina: { mer: 45, lac: 30, centreVille: 88, universite: 50, aeroport: 45, zoneIndustrielle: 15 },
  universite: { mer: 30, lac: 30, centreVille: 60, universite: 95, aeroport: 40, zoneIndustrielle: 25 },
  aeroport: { mer: 45, lac: 40, centreVille: 55, universite: 45, aeroport: 95, zoneIndustrielle: 45 },
  zone_industrielle: { mer: 20, lac: 20, centreVille: 35, universite: 25, aeroport: 55, zoneIndustrielle: 95 },
  port: { mer: 70, lac: 45, centreVille: 60, universite: 30, aeroport: 50, zoneIndustrielle: 88 },
  touristique: { mer: 88, lac: 55, centreVille: 65, universite: 25, aeroport: 60, zoneIndustrielle: 10 },
  residentiel: { mer: 45, lac: 35, centreVille: 50, universite: 55, aeroport: 40, zoneIndustrielle: 20 },
};

const UTILITY_NONE: ZoneUtilities = {
  mer: 35,
  lac: 30,
  centreVille: 45,
  universite: 40,
  aeroport: 40,
  zoneIndustrielle: 30,
};

export function resolveZoneUtility(city: string, quartier: string): ZoneUtilities {
  const key = normalizeZoneKey(`${city} ${quartier}`);
  let best: ZoneUtilities = UTILITY_NONE;
  let bestScore = -1;
  for (const [kw, util] of Object.entries(ZONE_UTILITIES)) {
    if (key.includes(normalizeZoneKey(kw))) {
      const score =
        util.mer + util.lac + util.centreVille + util.universite + util.aeroport + util.zoneIndustrielle;
      if (score > bestScore) {
        best = util;
        bestScore = score;
      }
    }
  }
  return best;
}

/* ─────────────────────────── Cascade régions / villes / quartiers ─────────── */

export interface CityEntry {
  city: string;
  quartier?: string[];
}

export const REGION_CASCADE: Record<string, CityEntry[]> = {
  Tunis: [
    { city: "Tunis Centre", quartier: ["Médina", "Bab Bhar", "Centre-ville", "Montfleury"] },
    { city: "La Marsa", quartier: ["Corniche", "Gammarth", "Sidi Bou Saïd"] },
    { city: "Le Bardo", quartier: ["Bardo", "Khaznadar"] },
    { city: "El Menzah", quartier: ["Menzah 1", "Menzah 5", "Menzah 6", "Menzah 9"] },
    { city: "El Manar", quartier: ["El Manar 1", "El Manar 2", "El Manar 3"] },
    { city: "Lac 1", quartier: ["Lac 1"] },
    { city: "Lac 2", quartier: ["Lac 2"] },
    { city: "Bab Souika", quartier: ["Bab Souika", "Halfaouine"] },
    { city: "Séjoumi", quartier: ["Séjoumi"] },
    { city: "El Ouardia", quartier: ["El Ouardia"] },
  ],
  Ariana: [
    { city: "Ariana Ville", quartier: ["Centre", "Riadh", "Borj Louzir"] },
    { city: "Raoued", quartier: ["Raoued", "Chotrana", "Borj Touil"] },
    { city: "La Soukra", quartier: ["La Soukra", "Cité Ennasr", "Chotrana 2"] },
    { city: "Sidi Thabet", quartier: ["Sidi Thabet"] },
    { city: "Ettadhamen", quartier: ["Ettadhamen", "Mnihla"] },
  ],
  "Ben Arous": [
    { city: "Ben Arous Ville", quartier: ["Centre", "Nouvelle Médina"] },
    { city: "Radès", quartier: ["Radès", "Radès Plage"] },
    { city: "Ezzahra", quartier: ["Ezzahra", "Corniche"] },
    { city: "Hammam Lif", quartier: ["Hammam Lif", "Borj Cedria"] },
    { city: "Mégrine", quartier: ["Mégrine", "Mégrine Riadh"] },
    { city: "Mornag", quartier: ["Mornag"] },
  ],
  Manouba: [
    { city: "Manouba", quartier: ["Centre", "Denden"] },
    { city: "Douar Hicher", quartier: ["Douar Hicher"] },
    { city: "Oued Ellil", quartier: ["Oued Ellil"] },
    { city: "Tebourba", quartier: ["Tebourba"] },
    { city: "Borj El Amri", quartier: ["Borj El Amri"] },
  ],
  Nabeul: [
    { city: "Nabeul", quartier: ["Centre", "Nabeul Plage"] },
    { city: "Hammamet", quartier: ["Hammamet Nord", "Hammamet Sud", "Yasmine Hammamet"] },
    { city: "Dar Chaabane", quartier: ["Dar Chaabane"] },
    { city: "Kélibia", quartier: ["Kélibia", "Kélibia Plage"] },
    { city: "Korba", quartier: ["Korba"] },
    { city: "Menzel Temime", quartier: ["Menzel Temime"] },
  ],
  Zaghouan: [
    { city: "Zaghouan", quartier: ["Centre"] },
    { city: "El Fahs", quartier: ["El Fahs"] },
    { city: "Nadhour", quartier: ["Nadhour"] },
    { city: "Bir Mcherga", quartier: ["Bir Mcherga"] },
  ],
  Bizerte: [
    { city: "Bizerte", quartier: ["Centre", "Corniche", "Bizerte Nord"] },
    { city: "Menzel Bourguiba", quartier: ["Menzel Bourguiba"] },
    { city: "Ras Jebel", quartier: ["Ras Jebel", "Sidi Mechreg"] },
    { city: "Mateur", quartier: ["Mateur"] },
    { city: "Menzel Jemil", quartier: ["Menzel Jemil"] },
  ],
  Béja: [
    { city: "Béja", quartier: ["Centre"] },
    { city: "Testour", quartier: ["Testour"] },
    { city: "Teboursouk", quartier: ["Teboursouk"] },
    { city: "Nefza", quartier: ["Nefza"] },
  ],
  Jendouba: [
    { city: "Jendouba", quartier: ["Centre"] },
    { city: "Tabarka", quartier: ["Tabarka", "Tabarka Plage"] },
    { city: "Aïn Draham", quartier: ["Aïn Draham"] },
    { city: "Bou Salem", quartier: ["Bou Salem"] },
  ],
  Kef: [
    { city: "Le Kef", quartier: ["Centre"] },
    { city: "Dahmani", quartier: ["Dahmani"] },
    { city: "Tajerouine", quartier: ["Tajerouine"] },
  ],
  Siliana: [
    { city: "Siliana", quartier: ["Centre"] },
    { city: "Makthar", quartier: ["Makthar"] },
    { city: "Bouarada", quartier: ["Bouarada"] },
  ],
  Sousse: [
    { city: "Sousse Ville", quartier: ["Centre", "Médina", "Corniche", "Khezama"] },
    { city: "Hammam Sousse", quartier: ["Hammam Sousse", "Chott Meriem"] },
    { city: "Msaken", quartier: ["Msaken"] },
    { city: "Kalaa Kebira", quartier: ["Kalaa Kebira"] },
    { city: "Akouda", quartier: ["Akouda"] },
  ],
  Monastir: [
    { city: "Monastir", quartier: ["Centre", "Corniche", "Skanes"] },
    { city: "Ksar Hellal", quartier: ["Ksar Hellal"] },
    { city: "Jemmal", quartier: ["Jemmal"] },
    { city: "Sahline", quartier: ["Sahline", "Marina"] },
  ],
  Mahdia: [
    { city: "Mahdia", quartier: ["Centre", "Corniche"] },
    { city: "Ksour Essef", quartier: ["Ksour Essef"] },
    { city: "Chebba", quartier: ["Chebba"] },
    { city: "El Jem", quartier: ["El Jem"] },
  ],
  Sfax: [
    { city: "Sfax Ville", quartier: ["Centre", "Médina", "Sfax Nord", "Sfax Sud"] },
    { city: "Sakiet Ezzit", quartier: ["Sakiet Ezzit"] },
    { city: "Sakiet Eddaïer", quartier: ["Sakiet Eddaïer"] },
    { city: "Chihia", quartier: ["Chihia"] },
    { city: "Thyna", quartier: ["Thyna"] },
  ],
  Kairouan: [
    { city: "Kairouan", quartier: ["Centre", "Médina"] },
    { city: "Sbikha", quartier: ["Sbikha"] },
    { city: "Haffouz", quartier: ["Haffouz"] },
  ],
  Kasserine: [
    { city: "Kasserine", quartier: ["Centre"] },
    { city: "Sbeitla", quartier: ["Sbeitla"] },
    { city: "Feriana", quartier: ["Feriana"] },
  ],
  "Sidi Bouzid": [
    { city: "Sidi Bouzid", quartier: ["Centre"] },
    { city: "Regueb", quartier: ["Regueb"] },
    { city: "Meknassy", quartier: ["Meknassy"] },
  ],
  Gabès: [
    { city: "Gabès", quartier: ["Centre", "Gabès Plage", "Chenini"] },
    { city: "Mareth", quartier: ["Mareth"] },
    { city: "El Hamma", quartier: ["El Hamma"] },
  ],
  Médenine: [
    { city: "Médenine", quartier: ["Centre"] },
    { city: "Djerba — Houmt Souk", quartier: ["Houmt Souk", "Centre"] },
    { city: "Djerba — Midoun", quartier: ["Midoun", "Zone Touristique", "Sidi Mahrez"] },
    { city: "Zarzis", quartier: ["Zarzis", "Zarzis Plage"] },
  ],
  Tataouine: [
    { city: "Tataouine", quartier: ["Centre"] },
    { city: "Ghomrassen", quartier: ["Ghomrassen"] },
    { city: "Remada", quartier: ["Remada"] },
  ],
  Gafsa: [
    { city: "Gafsa", quartier: ["Centre"] },
    { city: "Métlaoui", quartier: ["Métlaoui"] },
    { city: "Redeyef", quartier: ["Redeyef"] },
  ],
  Tozeur: [
    { city: "Tozeur", quartier: ["Centre", "Zone Touristique", "Palmeraie"] },
    { city: "Nefta", quartier: ["Nefta"] },
    { city: "Degache", quartier: ["Degache"] },
  ],
  Kébili: [
    { city: "Kébili", quartier: ["Centre"] },
    { city: "Douz", quartier: ["Douz", "Zone Touristique"] },
    { city: "Souk Lahad", quartier: ["Souk Lahad"] },
  ],
};

/** Toutes les villes du référentiel (dédoublonnées). */
export const ALL_CITIES: string[] = Array.from(
  new Set(Object.values(REGION_CASCADE).flatMap((entries) => entries.map((e) => e.city))),
).sort((a, b) => a.localeCompare(b, "fr"));

/** Normalise une clé de zone (minuscules, sans accents, sans espaces superflus). */
export function normalizeZoneKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Mode de location imposé par le type d'investissement (ou null si libre). */
export function forcedRentModeFor(type: InvestmentType): RentMode | null {
  const meta = INVESTMENT_TYPE_META[type];
  return meta?.rentMode ?? null;
}

/** Estime le taux d'occupation (%) selon la zone et le mode de location. */
export function estimateOccupancyRate(input: {
  region: string;
  city: string;
  quartier: string;
  rentMode: RentMode;
}): number {
  const zone = INVESTMENT_ZONE_MAP[input.region] ?? INVESTMENT_ZONE_MAP[DEFAULT_ZONE];
  const key = normalizeZoneKey(`${input.city} ${input.quartier}`);
  const touristic = /plage|marina|corniche|touristique|djerba|hammamet|sousse|monastir|yasmine/.test(key);
  if (input.rentMode === "nuit") {
    const base = touristic ? 72 : 55;
    return Math.round(base + zone.demandIndex * 0.12);
  }
  return Math.round(90 + zone.demandIndex * 0.06);
}

/* ─────────────────────────── Validateurs Convex ─────────────────────────── */

export const analysisInputValidator = v.object({
  type: investmentTypeValidator,
  purchasePrice: v.number(),
  surface: v.number(),
  region: v.string(),
  city: v.string(),
  quartier: v.string(),
  rentMode: v.union(v.literal("nuit"), v.literal("mensuel")),
  monthlyRent: v.number(),
  nightlyRent: v.optional(v.number()),
  occupancyRate: v.number(),
  renovationCost: v.number(),
  acquisitionFeePct: v.number(),
  financingFees: v.number(),
  agencyFeesPct: v.number(),
  furnishingCost: v.number(),
  annualCharges: v.number(),
  insurance: v.number(),
  managementFeePct: v.number(),
  taxationPct: v.number(),
  appreciationPct: v.number(),
  rentGrowthPct: v.number(),
  inflationPct: v.number(),
  horizonYears: v.number(),
});
export type InvestmentAnalysisInput = Infer<typeof analysisInputValidator>;

export const forecastPointValidator = v.object({
  year: v.number(),
  label: v.string(),
  propertyValue: v.number(),
  cumulativeIncome: v.number(),
  cumulativeGain: v.number(),
  roiPct: v.number(),
});
export type InvestmentForecastPoint = Infer<typeof forecastPointValidator>;

export const forecastSummaryItemValidator = v.object({
  horizon: v.number(),
  label: v.string(),
  propertyValue: v.number(),
  totalIncome: v.number(),
  totalGain: v.number(),
  roiPct: v.number(),
});
export type InvestmentForecastSummaryItem = Infer<typeof forecastSummaryItemValidator>;

export const scenarioValidator = v.object({
  key: v.union(v.literal("optimiste"), v.literal("realiste"), v.literal("prudent")),
  label: v.string(),
  rentGrowthPct: v.number(),
  appreciationPct: v.number(),
  inflationPct: v.number(),
  occupancyRate: v.number(),
  propertyValue: v.number(),
  totalIncome: v.number(),
  netYieldPct: v.number(),
  roiPct: v.number(),
  riskLabel: v.string(),
  riskLevel: v.union(v.literal("faible"), v.literal("moyen"), v.literal("eleve")),
  notes: v.array(v.string()),
});
export type InvestmentScenario = Infer<typeof scenarioValidator>;

export const scoreCriterionValidator = v.object({
  key: v.string(),
  label: v.string(),
  score: v.number(),
  max: v.number(),
  weight: v.number(),
});
export type InvestmentScoreCriterion = Infer<typeof scoreCriterionValidator>;

export const scoreValidator = v.object({
  total: v.number(),
  grade: v.string(),
  label: v.string(),
  criteria: v.array(scoreCriterionValidator),
});
export type InvestmentScore = Infer<typeof scoreValidator>;

export const comparisonItemValidator = v.object({
  type: v.string(),
  label: v.string(),
  pricePerM2: v.number(),
  rentPerM2: v.number(),
  grossYieldPct: v.number(),
  netYieldPct: v.number(),
  roiPct: v.number(),
  riskLevel: v.union(v.literal("faible"), v.literal("moyen"), v.literal("eleve")),
  appreciationPct: v.number(),
  potentialScore: v.number(),
});
export type InvestmentComparisonItem = Infer<typeof comparisonItemValidator>;

export const zoneInfoValidator = v.object({
  region: v.string(),
  name: v.string(),
  rank: v.number(),
  total: v.number(),
  pricePerM2: v.number(),
  rentPerM2: v.number(),
  demandIndex: v.number(),
  appreciationPct: v.number(),
  riskScore: v.number(),
  highlights: v.array(v.string()),
});
export type InvestmentZoneInfo = Infer<typeof zoneInfoValidator>;

export const indicatorsValidator = v.object({
  purchasePrice: v.number(),
  totalCost: v.number(),
  acquisitionFees: v.number(),
  renovationCost: v.number(),
  financingFees: v.number(),
  agencyFees: v.number(),
  furnishingCost: v.number(),
  annualCharges: v.number(),
  insurance: v.number(),
  managementFees: v.number(),
  taxation: v.number(),
  rentMode: v.union(v.literal("nuit"), v.literal("mensuel")),
  monthlyRent: v.number(),
  occupancyRate: v.number(),
  grossAnnualRent: v.number(),
  operatingExpenses: v.number(),
  netAnnualIncome: v.number(),
  monthlyCashflow: v.number(),
  annualCashflow: v.number(),
  grossYieldPct: v.number(),
  netYieldPct: v.number(),
  roiAnnualPct: v.number(),
  roi5yPct: v.number(),
  roi10yPct: v.number(),
  paybackYears: v.number(),
  paybackDate: v.number(),
  paybackDateLabel: v.string(),
  pricePerM2: v.optional(v.number()),
  priceToRentRatio: v.number(),
});
export type InvestmentIndicators = Infer<typeof indicatorsValidator>;

export const analysisResultsValidator = v.object({
  indicators: indicatorsValidator,
  forecasts: v.array(forecastPointValidator),
  forecastSummary: v.array(forecastSummaryItemValidator),
  scenarios: v.array(scenarioValidator),
  score: scoreValidator,
  comparison: v.array(comparisonItemValidator),
  zone: zoneInfoValidator,
  confidencePct: v.number(),
});
export type InvestmentAnalysisResults = Infer<typeof analysisResultsValidator>;

export const aiInsightsValidator = v.object({
  summary: v.string(),
  verdict: v.string(),
  recommendations: v.array(v.string()),
  risks: v.array(v.string()),
  marketNotes: v.string(),
  source: v.string(),
});
export type InvestmentAiInsights = Infer<typeof aiInsightsValidator>;

/* ─────────────────────────── Scénarios & horizons ─────────────────────────── */

export interface ScenarioDefault {
  key: "optimiste" | "realiste" | "prudent";
  label: string;
  rentGrowthPct: number;
  appreciationOffset: number;
  inflationPct: number;
  occupancyOffset: number;
}

export const SCENARIO_DEFAULTS: Record<string, ScenarioDefault> = {
  optimiste: {
    key: "optimiste",
    label: "Optimiste",
    rentGrowthPct: 5.5,
    appreciationOffset: 1.5,
    inflationPct: 4.5,
    occupancyOffset: 5,
  },
  realiste: {
    key: "realiste",
    label: "Réaliste",
    rentGrowthPct: 4.0,
    appreciationOffset: 0,
    inflationPct: 5.0,
    occupancyOffset: 0,
  },
  prudent: {
    key: "prudent",
    label: "Prudent",
    rentGrowthPct: 2.5,
    appreciationOffset: -1.5,
    inflationPct: 5.5,
    occupancyOffset: -8,
  },
};

export const FORECAST_HORIZONS = [1, 3, 5, 10] as const;
