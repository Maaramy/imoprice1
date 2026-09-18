/**
 * Module IA — Analyse de la rentabilité des investissements immobiliers (Tunisie).
 *
 * Moteur pur (aucune dépendance React / Convex) : il est importable aussi bien
 * depuis le navigateur que depuis les fonctions Convex.
 *
 * Sources marché : `ZONE_DATABASE` (144 zones, marché tunisien 2026) et
 * `GOVERNORATE_AVERAGES` définis dans `./zones`.
 */

import { findZone, GOVERNORATE_AVERAGES, ZONE_DATABASE, type ZoneData } from "./zones";

/* ══════════════════════════════════════════════════════════════════════════
 * 1. Types d'investissement
 * ══════════════════════════════════════════════════════════════════════════ */

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
  "terrain_constructible",
  "residence_touristique",
  "projet_neuf",
] as const;

export type InvestmentType = (typeof INVESTMENT_TYPES)[number];

export const INVESTMENT_TYPE_LABELS: Record<InvestmentType, string> = {
  maison: "Maison",
  villa: "Villa",
  appartement: "Appartement",
  studio: "Studio",
  duplex: "Duplex",
  immeuble: "Immeuble",
  local_commercial: "Local commercial",
  bureau: "Bureau",
  entrepot: "Entrepôt",
  terrain_constructible: "Terrain constructible",
  residence_touristique: "Résidence touristique",
  projet_neuf: "Projet immobilier neuf",
};

/**
 * Profil par type de bien — référence = appartement résidentiel (facteur 1).
 * `price` : multiplicateur du prix / m² · `rent` : multiplicateur du loyer / m²
 * `appreciation` : potentiel d'appréciation · `liquidity` : facilité de revente
 * `risk` : niveau de risque intrinsèque (0 = faible, 1 = élevé)
 */
const TYPE_PROFILE: Record<
  InvestmentType,
  { price: number; rent: number; appreciation: number; liquidity: number; risk: number }
> = {
  appartement: { price: 1.0, rent: 1.0, appreciation: 1.0, liquidity: 1.0, risk: 0.3 },
  studio: { price: 1.12, rent: 1.28, appreciation: 0.9, liquidity: 0.9, risk: 0.4 },
  duplex: { price: 1.08, rent: 0.98, appreciation: 1.05, liquidity: 0.85, risk: 0.35 },
  maison: { price: 0.92, rent: 0.86, appreciation: 1.05, liquidity: 0.75, risk: 0.4 },
  villa: { price: 1.35, rent: 0.92, appreciation: 1.15, liquidity: 0.6, risk: 0.45 },
  immeuble: { price: 0.95, rent: 1.05, appreciation: 1.1, liquidity: 0.55, risk: 0.5 },
  local_commercial: { price: 1.25, rent: 1.55, appreciation: 1.0, liquidity: 0.65, risk: 0.55 },
  bureau: { price: 1.18, rent: 1.35, appreciation: 0.95, liquidity: 0.6, risk: 0.6 },
  entrepot: { price: 0.55, rent: 0.95, appreciation: 0.85, liquidity: 0.5, risk: 0.6 },
  terrain_constructible: { price: 0.45, rent: 0.05, appreciation: 1.35, liquidity: 0.5, risk: 0.55 },
  residence_touristique: { price: 1.3, rent: 1.9, appreciation: 1.05, liquidity: 0.6, risk: 0.7 },
  projet_neuf: { price: 1.15, rent: 1.05, appreciation: 1.2, liquidity: 0.7, risk: 0.5 },
};

/* ══════════════════════════════════════════════════════════════════════════
 * 2. Valeurs par défaut (marché tunisien 2026)
 * ══════════════════════════════════════════════════════════════════════════ */

export const INVESTMENT_DEFAULTS = {
  /** Taux d'occupation locatif moyen (%) */
  occupancyRate: 92,
  /** Honoraires de gestion locative (% des loyers) */
  managementFeeRate: 6,
  /** Charge d'entretien annuelle (% de la valeur du bien) */
  maintenanceRate: 0.6,
  /** Assurance annuelle (% de la valeur du bien) */
  insuranceRate: 0.35,
  /** Fiscalité + TCL annuelles (% des loyers bruts) */
  taxRate: 10,
  /** Indexation annuelle des loyers (%) */
  rentIndexationRate: 5,
  /** Inflation annuelle (%) */
  inflationRate: 4.5,
  /** Appréciation annuelle de la valeur du bien (%) */
  marketGrowthRate: 6.5,
  /** Frais d'acquisition par défaut (% du prix, notaire + enregistrement + agence) */
  acquisitionFeeRate: 8,
} as const;

/* ══════════════════════════════════════════════════════════════════════════
 * 3. Entrée / sortie
 * ══════════════════════════════════════════════════════════════════════════ */

export interface InvestmentInput {
  /* Bien */
  investmentType: InvestmentType;
  designation?: string;
  gouvernorat: string;
  ville?: string;
  quartier?: string;
  builtSurface?: number;

  /* Coûts */
  /** Prix d'achat (ou coût de construction pour un projet neuf) */
  purchasePrice: number;
  /** Travaux / rénovation / aménagement */
  worksCost?: number;
  /** Frais d'acquisition (notaire, enregistrement, agence…) */
  feesCost?: number;
  /** Équipement / mobilier */
  furnitureCost?: number;

  /* Financement */
  downPayment?: number;
  loanAmount?: number;
  /** Taux annuel du crédit (%) */
  loanRate?: number;
  /** Durée du crédit (années) */
  loanYears?: number;

  /* Revenus */
  monthlyRent: number;
  otherMonthlyIncome?: number;
  occupancyRate?: number;

  /* Charges */
  monthlyCharges?: number;
  annualTaxOverride?: number;
  managementFeeRate?: number;
  annualMaintenanceOverride?: number;

  /* Hypothèses de marché */
  rentIndexationRate?: number;
  inflationRate?: number;
  marketGrowthRate?: number;
}

export interface ProjectionYear {
  year: number;
  annualGrossIncome: number;
  annualExpenses: number;
  annualDebtService: number;
  netIncome: number;
  cashFlow: number;
  cumulatedCashFlow: number;
  propertyValue: number;
  totalWealth: number;
}

export interface BenefitPoint {
  year: number;
  gain: number;
  futurePropertyValue: number;
  cumulatedProfit: number;
}

export type ScenarioKey = "prudent" | "realiste" | "optimiste";

export interface ScenarioResult {
  key: ScenarioKey;
  label: string;
  description: string;
  occupancyRate: number;
  annualGrossIncome: number;
  annualNetIncome: number;
  annualCashFlow: number;
  futureValue: number;
  totalRevenue: number;
  roi10: number;
  netYield: number;
  riskLevel: RiskLevel;
  risks: string[];
}

export type RiskLevel = "faible" | "modéré" | "élevé";
export type Potential = "faible" | "moyen" | "élevé";
export type LiquidityLevel = "faible" | "moyenne" | "élevé";

export interface ComparisonRow {
  type: InvestmentType;
  label: string;
  pricePerSqm: number;
  rentPerSqm: number;
  grossYield: number;
  netYield: number;
  roi10: number;
  riskLevel: RiskLevel;
  appreciation: Potential;
  liquidity: LiquidityLevel;
}

export interface ScoreCriterion {
  key: string;
  label: string;
  score: number;
  weight: number;
  comment: string;
}

export interface InvestmentScore {
  total: number;
  grade: string;
  verdict: string;
  tone: "excellent" | "good" | "average" | "poor";
  criteria: ScoreCriterion[];
}

export interface MarketIndicators {
  zoneLabel: string;
  standing: string;
  confidence: string;
  /** Prix marché ajusté au type de bien (TND / m²) */
  pricePerSqm: number;
  /** Loyer marché ajusté au type (TND / m² / mois) */
  rentPerSqm: number;
  /** Rendement brut cible de la zone (%) */
  targetYield: number;
  /** Valeur de marché estimée (si surface renseignée) */
  marketValue: number;
  /** Écart % entre la valeur de marché et le coût total (négatif = achat en dessous du marché) */
  valueGapPct: number;
}

export interface AssistantQa {
  q: string;
  a: string;
}

export interface InvestmentAnalysis {
  /* Coûts */
  totalInvestment: number;
  acquisitionFees: number;
  loanAmount: number;
  downPayment: number;

  /* Revenus */
  annualGrossIncome: number;
  annualOperatingExpenses: number;
  annualDebtService: number;
  netOperatingIncome: number;

  /* Cash-flow */
  monthlyCashFlow: number;
  annualCashFlow: number;

  /* Rendements */
  grossYield: number;
  netYield: number;
  rentalYield: number;

  /* ROI */
  roiAnnual: number;
  roi5: number;
  roi10: number;

  /* Récupération du capital */
  paybackYears: number;
  paybackDate: number;
  paybackLabel: string;

  /* Prévisions */
  projections: ProjectionYear[];
  benefits: BenefitPoint[];

  /* Scénarios */
  scenarios: ScenarioResult[];

  /* Comparaison */
  comparison: ComparisonRow[];

  /* Score IA */
  score: InvestmentScore;

  /* Analyse qualitative */
  positiveFactors: string[];
  negativeFactors: string[];
  recommendations: string[];
  risks: string[];
  assistant: AssistantQa[];

  /* Marché */
  market: MarketIndicators;

  assumptions: {
    occupancyRate: number;
    managementFeeRate: number;
    rentIndexationRate: number;
    inflationRate: number;
    marketGrowthRate: number;
  };
}

/* ══════════════════════════════════════════════════════════════════════════
 * 4. Helpers
 * ══════════════════════════════════════════════════════════════════════════ */

const round = (n: number, d = 0): number => {
  if (!Number.isFinite(n)) return 0;
  const f = 10 ** d;
  return Math.round(n * f) / f;
};

const clamp = (n: number, min: number, max: number): number => Math.min(max, Math.max(min, n));

const num = (v: number | undefined, fallback = 0): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

/** Mensualité constante d'un crédit amortissable. */
export function loanPayment(principal: number, annualRatePct: number, years: number): number {
  if (principal <= 0 || years <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

function riskLevelFromScore(risk: number): RiskLevel {
  if (risk < 0.4) return "faible";
  if (risk < 0.58) return "modéré";
  return "élevé";
}

function potentialFromScore(v: number): Potential {
  if (v < 0.9) return "faible";
  if (v < 1.12) return "moyen";
  return "élevé";
}

function liquidityFromScore(v: number): LiquidityLevel {
  if (v < 0.65) return "faible";
  if (v < 0.85) return "moyenne";
  return "élevé";
}

/* ══════════════════════════════════════════════════════════════════════════
 * 5. Indicateurs de marché
 * ══════════════════════════════════════════════════════════════════════════ */

export function getMarketIndicators(
  input: Pick<
    InvestmentInput,
    "gouvernorat" | "ville" | "quartier" | "investmentType" | "builtSurface"
  >,
  totalInvestment = 0,
): MarketIndicators {
  const profile = TYPE_PROFILE[input.investmentType];
  const zone: ZoneData | null = findZone(
    input.gouvernorat,
    input.ville ?? null,
    input.quartier ?? null,
  );
  const avg = GOVERNORATE_AVERAGES[input.gouvernorat];

  const basePrice = zone?.transaction ?? avg?.transaction ?? 2200;
  const baseRent = zone?.loyerM2 ?? avg?.loyerM2 ?? 10;
  const targetYield = zone?.rendementCible ?? avg?.rendementCible ?? 5.2;

  const pricePerSqm = basePrice * profile.price;
  const rentPerSqm = baseRent * profile.rent;
  const surface = num(input.builtSurface);
  const marketValue = surface > 0 ? surface * pricePerSqm : 0;
  const valueGapPct =
    totalInvestment > 0 && marketValue > 0
      ? ((marketValue - totalInvestment) / totalInvestment) * 100
      : 0;

  return {
    zoneLabel: zone
      ? `${zone.quarter}, ${zone.city} (${zone.region})`
      : `${input.ville || input.gouvernorat}, ${input.gouvernorat}`,
    standing: zone?.standing ?? "Moyen",
    confidence: zone?.confiance ?? "Moyenne",
    pricePerSqm: round(pricePerSqm),
    rentPerSqm: round(rentPerSqm, 2),
    targetYield: round(targetYield, 2),
    marketValue: round(marketValue),
    valueGapPct: round(valueGapPct, 1),
  };
}

/* ══════════════════════════════════════════════════════════════════════════
 * 6. Moteur principal
 * ══════════════════════════════════════════════════════════════════════════ */

export function computeInvestmentAnalysis(
  input: InvestmentInput,
  now: number = Date.now(),
): InvestmentAnalysis {
  const D = INVESTMENT_DEFAULTS;
  const profile = TYPE_PROFILE[input.investmentType] ?? TYPE_PROFILE.appartement;

  /* ── Coûts ── */
  const purchasePrice = Math.max(0, num(input.purchasePrice));
  const worksCost = Math.max(0, num(input.worksCost));
  const furnitureCost = Math.max(0, num(input.furnitureCost));
  const acquisitionFees = Math.max(
    0,
    num(input.feesCost, (purchasePrice * D.acquisitionFeeRate) / 100),
  );
  const totalInvestment = purchasePrice + worksCost + acquisitionFees + furnitureCost;

  /* ── Financement ── */
  const loanAmount = clamp(num(input.loanAmount), 0, totalInvestment);
  const downPayment = num(input.downPayment, totalInvestment - loanAmount);
  const annualDebtService =
    loanAmount > 0
      ? loanPayment(loanAmount, num(input.loanRate, 7), num(input.loanYears, 15)) * 12
      : 0;

  /* ── Revenus ── */
  const occupancyRate = clamp(num(input.occupancyRate, D.occupancyRate), 0, 100);
  const monthlyRent = Math.max(0, num(input.monthlyRent));
  const otherMonthlyIncome = Math.max(0, num(input.otherMonthlyIncome));
  const effectiveMonthlyRent = monthlyRent * (occupancyRate / 100);
  const annualGrossIncome = (effectiveMonthlyRent + otherMonthlyIncome) * 12;

  /* ── Charges ── */
  const managementFeeRate = num(input.managementFeeRate, D.managementFeeRate);
  const managementFee = (annualGrossIncome * managementFeeRate) / 100;
  const annualTax = num(input.annualTaxOverride, (annualGrossIncome * D.taxRate) / 100);
  const annualMaintenance = num(
    input.annualMaintenanceOverride,
    (totalInvestment * D.maintenanceRate) / 100,
  );
  const annualInsurance = (totalInvestment * D.insuranceRate) / 100;
  const annualOperatingExpenses =
    managementFee +
    num(input.monthlyCharges) * 12 +
    annualTax +
    annualMaintenance +
    annualInsurance;

  const netOperatingIncome = annualGrossIncome - annualOperatingExpenses;
  const annualCashFlow = netOperatingIncome - annualDebtService;
  const monthlyCashFlow = annualCashFlow / 12;

  /* ── Rendements ── */
  const grossYield = totalInvestment > 0 ? (annualGrossIncome / totalInvestment) * 100 : 0;
  const netYield = totalInvestment > 0 ? (netOperatingIncome / totalInvestment) * 100 : 0;
  const equity = Math.max(1, totalInvestment - loanAmount);
  const rentalYield = (annualCashFlow / equity) * 100;

  /* ── Hypothèses de marché ── */
  const rentIndexationRate = num(input.rentIndexationRate, D.rentIndexationRate);
  const inflationRate = num(input.inflationRate, D.inflationRate);
  const marketGrowthRate = num(input.marketGrowthRate, D.marketGrowthRate);

  /* ── Projections 1 → 10 ans ── */
  const projections: ProjectionYear[] = [];
  let cumulated = 0;
  for (let year = 1; year <= 10; year++) {
    const income = annualGrossIncome * Math.pow(1 + rentIndexationRate / 100, year);
    const expenses = annualOperatingExpenses * Math.pow(1 + inflationRate / 100, year);
    const debt = annualDebtService;
    const netIncome = income - expenses;
    const cashFlow = netIncome - debt;
    cumulated += cashFlow;
    const propertyValue = totalInvestment * Math.pow(1 + marketGrowthRate / 100, year);
    projections.push({
      year,
      annualGrossIncome: round(income),
      annualExpenses: round(expenses),
      annualDebtService: round(debt),
      netIncome: round(netIncome),
      cashFlow: round(cashFlow),
      cumulatedCashFlow: round(cumulated),
      propertyValue: round(propertyValue),
      totalWealth: round(cumulated + propertyValue),
    });
  }

  const benefits: BenefitPoint[] = [1, 3, 5, 10].map((year) => {
    const p = projections[year - 1];
    const cumulatedProfit = p.cumulatedCashFlow + (p.propertyValue - totalInvestment);
    return {
      year,
      gain: p.cashFlow,
      futurePropertyValue: p.propertyValue,
      cumulatedProfit: round(cumulatedProfit),
    };
  });

  /* ── ROI ── */
  const roiAnnual = totalInvestment > 0 ? (annualCashFlow / totalInvestment) * 100 : 0;
  const roiFor = (year: number) => {
    const p = projections[year - 1];
    if (!p || totalInvestment <= 0) return 0;
    const profit = p.cumulatedCashFlow + (p.propertyValue - totalInvestment);
    return (profit / totalInvestment) * 100;
  };
  const roi5 = round(roiFor(5), 1);
  const roi10 = round(roiFor(10), 1);

  /* ── Récupération du capital ── */
  const annualNetRevenue = annualCashFlow > 0 ? annualCashFlow : netOperatingIncome;
  const paybackYears = annualNetRevenue > 0 ? totalInvestment / annualNetRevenue : Infinity;
  const paybackDate = Number.isFinite(paybackYears)
    ? now + paybackYears * 365.25 * 24 * 3600 * 1000
    : 0;
  const paybackLabel = Number.isFinite(paybackYears)
    ? `${round(paybackYears, 1)} an${paybackYears >= 2 ? "s" : ""}`
    : "Non récupérable";

  /* ── Marché ── */
  const market = getMarketIndicators(input, totalInvestment);

  /* ── Scénarios ── */
  const buildScenario = (
    key: ScenarioKey,
    label: string,
    description: string,
    mods: { occupancy: number; rent: number; growth: number; charges: number; inflation: number },
  ): ScenarioResult => {
    const occ = clamp(occupancyRate + mods.occupancy, 40, 100);
    const rent = monthlyRent * (1 + mods.rent / 100);
    const income = (rent * (occ / 100) + otherMonthlyIncome) * 12;
    const expenses =
      (income * managementFeeRate) / 100 +
      num(input.monthlyCharges) * 12 * (1 + mods.charges / 100) +
      (income * D.taxRate) / 100 +
      annualMaintenance * (1 + mods.charges / 100) +
      annualInsurance;
    const netIncome = income - expenses;
    const growth = (marketGrowthRate + mods.growth) / 100;
    const futureValue = totalInvestment * Math.pow(1 + growth, 10);
    let totalRevenue = 0;
    for (let y = 1; y <= 10; y++) {
      const inc = income * Math.pow(1 + rentIndexationRate / 100, y);
      const exp = expenses * Math.pow(1 + (inflationRate + mods.inflation) / 100, y);
      totalRevenue += inc - exp - annualDebtService;
    }
    const profit = totalRevenue + (futureValue - totalInvestment);
    const roi10s = totalInvestment > 0 ? (profit / totalInvestment) * 100 : 0;

    const riskScore = clamp(
      profile.risk + (key === "prudent" ? 0.12 : key === "optimiste" ? -0.08 : 0),
      0,
      1,
    );
    const risks =
      key === "optimiste"
        ? [
            "Taux d'occupation optimiste difficile à tenir sur 10 ans",
            "Dépendance à la hausse du marché et des loyers",
            "Risque de vacance locative ou de loyer impayé",
          ]
        : key === "realiste"
          ? [
              "Variation du taux d'occupation selon la demande locale",
              "Hausse possible des charges et de la fiscalité",
              "Coût de maintenance croissant avec l'ancienneté",
            ]
          : [
              "Vacance locative prolongée (taux d'occupation prudent)",
              "Inflation supérieure à l'indexation des loyers",
              "Marché porteur au ralenti — revente plus lente",
            ];

    return {
      key,
      label,
      description,
      occupancyRate: round(occ, 1),
      annualGrossIncome: round(income),
      annualNetIncome: round(netIncome),
      annualCashFlow: round(netIncome - annualDebtService),
      futureValue: round(futureValue),
      totalRevenue: round(totalRevenue),
      roi10: round(roi10s, 1),
      netYield: totalInvestment > 0 ? round((netIncome / totalInvestment) * 100, 2) : 0,
      riskLevel: riskLevelFromScore(riskScore),
      risks,
    };
  };

  const scenarios: ScenarioResult[] = [
    buildScenario("optimiste", "Optimiste", "Marché dynamique, forte demande locative.", {
      occupancy: 5,
      rent: 6,
      growth: 2,
      charges: -3,
      inflation: -0.5,
    }),
    buildScenario("realiste", "Réaliste", "Tendances actuelles du marché tunisien.", {
      occupancy: 0,
      rent: 0,
      growth: 0,
      charges: 0,
      inflation: 0,
    }),
    buildScenario("prudent", "Prudent", "Hypothèses conservatrices, marge de sécurité.", {
      occupancy: -8,
      rent: -5,
      growth: -2,
      charges: 5,
      inflation: 1,
    }),
  ];

  /* ── Comparaison inter-types ── */
  const compareTypes: InvestmentType[] = [
    "appartement",
    "villa",
    "local_commercial",
    "bureau",
    "terrain_constructible",
  ];
  const comparison: ComparisonRow[] = compareTypes.map((type) => {
    const p = TYPE_PROFILE[type];
    const pricePerSqm = round((market.pricePerSqm / profile.price) * p.price);
    const rentPerSqm = round((market.rentPerSqm / profile.rent) * p.rent, 2);
    const gross =
      pricePerSqm > 0 ? ((rentPerSqm * 12 * (occupancyRate / 100)) / pricePerSqm) * 100 : 0;
    const net = gross * 0.68;
    const growth = (marketGrowthRate / 100 + (p.appreciation - 1) * 0.04) * 100;
    const roi = gross > 0 ? net * 10 + growth * 10 : 0;
    return {
      type,
      label: INVESTMENT_TYPE_LABELS[type],
      pricePerSqm,
      rentPerSqm,
      grossYield: round(gross, 2),
      netYield: round(net, 2),
      roi10: round(roi, 1),
      riskLevel: riskLevelFromScore(p.risk),
      appreciation: potentialFromScore(p.appreciation),
      liquidity: liquidityFromScore(p.liquidity),
    };
  });

  /* ── Score IA ── */
  const yieldScore = clamp((netYield / 7) * 100, 0, 100);
  const locationScore = clamp(
    (market.targetYield >= 5.5 ? 92 : market.targetYield >= 4.8 ? 78 : 64) +
      (market.valueGapPct > 0 ? 6 : -4),
    0,
    100,
  );
  const demandScore = clamp(
    (occupancyRate >= 95 ? 90 : occupancyRate >= 90 ? 78 : 62) + (profile.rent - 1) * 30,
    0,
    100,
  );
  const riskScore = clamp(100 - profile.risk * 100 - (loanAmount > 0 ? 10 : 0), 0, 100);
  const appreciationScore = clamp(
    55 + (profile.appreciation - 1) * 120 + (market.valueGapPct < 0 ? 12 : 0),
    0,
    100,
  );
  const liquidityScore = clamp(profile.liquidity * 100, 0, 100);

  const criteria: ScoreCriterion[] = [
    {
      key: "yield",
      label: "Rentabilité",
      score: round(yieldScore),
      weight: 0.28,
      comment: `Rentabilité nette de ${round(netYield, 2)}% (cible marché ${market.targetYield}%).`,
    },
    {
      key: "location",
      label: "Emplacement",
      score: round(locationScore),
      weight: 0.2,
      comment: `${market.zoneLabel} · standing ${market.standing.toLowerCase()}.`,
    },
    {
      key: "demand",
      label: "Demande locative",
      score: round(demandScore),
      weight: 0.16,
      comment: `Taux d'occupation retenu : ${round(occupancyRate)}%.`,
    },
    {
      key: "risk",
      label: "Risque",
      score: round(riskScore),
      weight: 0.14,
      comment: `Profil de risque ${riskLevelFromScore(profile.risk)} pour ce type de bien.`,
    },
    {
      key: "appreciation",
      label: "Potentiel d'appréciation",
      score: round(appreciationScore),
      weight: 0.12,
      comment: `Appréciation annuelle estimée : ${round(marketGrowthRate, 1)}%.`,
    },
    {
      key: "liquidity",
      label: "Liquidité",
      score: round(liquidityScore),
      weight: 0.1,
      comment: `Facilité de revente ${liquidityFromScore(profile.liquidity)} sur ce segment.`,
    },
  ];

  const total = round(criteria.reduce((s, c) => s + c.score * c.weight, 0));
  const tone: InvestmentScore["tone"] =
    total >= 80 ? "excellent" : total >= 65 ? "good" : total >= 50 ? "average" : "poor";
  const grade =
    total >= 85
      ? "A+"
      : total >= 80
        ? "A"
        : total >= 70
          ? "B+"
          : total >= 65
            ? "B"
            : total >= 55
              ? "C"
              : "D";
  const verdict =
    total >= 80
      ? "Excellent investissement."
      : total >= 65
        ? "Bon investissement, à affiner selon votre stratégie."
        : total >= 50
          ? "Investissement moyen — négociez le prix ou optimisez les charges."
          : "Investissement à risque — revoir les hypothèses.";

  /* ── Analyse qualitative ── */
  const positiveFactors: string[] = [];
  const negativeFactors: string[] = [];
  const recommendations: string[] = [];

  if (grossYield >= 6) positiveFactors.push(`Rendement brut attractif de ${round(grossYield, 2)}%.`);
  else negativeFactors.push(`Rendement brut limité (${round(grossYield, 2)}%).`);

  if (netYield >= 4) positiveFactors.push(`Rentabilité nette solide de ${round(netYield, 2)}%.`);
  else negativeFactors.push(`Rentabilité nette faible (${round(netYield, 2)}%) après charges.`);

  if (annualCashFlow > 0)
    positiveFactors.push(`Cash-flow positif de ${round(monthlyCashFlow)} TND / mois.`);
  else
    negativeFactors.push(
      `Cash-flow négatif de ${round(monthlyCashFlow)} TND / mois — effort d'épargne requis.`,
    );

  if (market.valueGapPct > 5)
    positiveFactors.push(
      `Acquisition ${round(market.valueGapPct, 1)}% en dessous de la valeur de marché estimée.`,
    );
  else if (market.valueGapPct < -5)
    negativeFactors.push(
      `Coût total ${round(Math.abs(market.valueGapPct), 1)}% au-dessus de la valeur de marché estimée.`,
    );

  if (profile.appreciation >= 1.1)
    positiveFactors.push("Fort potentiel d'appréciation à moyen terme pour ce type de bien.");

  if (loanAmount > 0)
    positiveFactors.push("Effet de levier du crédit : la rentabilité sur fonds propres est amplifiée.");

  if (occupancyRate < 90)
    negativeFactors.push("Taux d'occupation prudent : anticiper des périodes de vacance.");

  if (netYield < market.targetYield)
    recommendations.push(
      "Renégocier le prix d'achat ou réduire les frais pour atteindre le rendement cible de la zone.",
    );
  if (managementFeeRate > 5)
    recommendations.push(
      "Confier la gestion locative à un mandataire moins coûteux pour gagner en net.",
    );
  recommendations.push("Revaloriser le loyer à chaque renouvellement de bail (indexation annuelle).");
  recommendations.push("Provisionner une réserve travaux de 3 à 5% du loyer annuel.");
  if (profile.rent >= 1.5)
    recommendations.push("Optimiser le taux d'occupation : la demande est forte sur ce segment.");
  if (loanAmount > 0 && num(input.loanRate, 7) > 8)
    recommendations.push(
      "Comparer les offres bancaires : un taux plus bas améliore nettement le ROI.",
    );

  const risks = [
    `Risque de vacance locative (taux d'occupation retenu : ${round(occupancyRate)}%).`,
    `Évolution des loyers incertaine (hypothèse : ${round(rentIndexationRate, 1)}%/an).`,
    `Inflation estimée à ${round(inflationRate, 1)}% — impact sur les charges.`,
    loanAmount > 0
      ? "Sensibilité aux taux d'intérêt sur la durée du crédit."
      : "Immobilisation de trésorerie sur le long terme (liquidité limitée).",
    "Évolution de la fiscalité immobilière (TCL, plus-values).",
  ];

  /* ── Assistant IA ── */
  const bestComparison = comparison.slice().sort((a, b) => b.netYield - a.netYield)[0];
  const assistant: AssistantQa[] = [
    {
      q: "Cet investissement est-il rentable ?",
      a: `Avec une rentabilité nette de ${round(netYield, 2)}% et un cash-flow de ${round(
        monthlyCashFlow,
      )} TND/mois, ${
        netYield >= market.targetYield
          ? `cet investissement dépasse la cible de marché (${market.targetYield}%) de ${round(
              netYield - market.targetYield,
              2,
            )} points.`
          : `il reste ${round(
              market.targetYield - netYield,
              2,
            )} points sous la cible de marché (${market.targetYield}%).`
      } Score IA : ${total}/100 — ${verdict}`,
    },
    {
      q: "Quel bien offre le meilleur rendement ?",
      a: `Sur les segments comparés, le ${bestComparison.label.toLowerCase()} affiche la meilleure rentabilité nette estimée dans cette zone (${bestComparison.netYield}%).`,
    },
    {
      q: "Combien vais-je gagner dans 10 ans ?",
      a: `Projection à 10 ans : bénéfice cumulé estimé de ${round(
        benefits[3].cumulatedProfit,
      )} TND, dont une valeur du bien estimée à ${round(benefits[3].futurePropertyValue)} TND.`,
    },
    {
      q: "Quel est le meilleur quartier pour investir ?",
      a: `Les zones les plus rentables de la base marché 2026 sont ${rankInvestmentZones(
        3,
        input.investmentType,
      )
        .map((z) => `${z.quarter} (${round(z.grossYield, 1)}%)`)
        .join(", ")}.`,
    },
    {
      q: "Quel est le risque de cet investissement ?",
      a: `Profil de risque ${riskLevelFromScore(profile.risk)}. Risques principaux : ${
        risks[0].toLowerCase()
      } ${loanAmount > 0 ? "et sensibilité aux taux d'intérêt." : "et faible liquidité à court terme."}`,
    },
    {
      q: "Quand vais-je récupérer mon capital ?",
      a: Number.isFinite(paybackYears)
        ? `Récupération estimée en ${paybackLabel}, soit ${new Date(paybackDate).toLocaleDateString(
            "fr-FR",
            { month: "long", year: "numeric" },
          )}.`
        : "Avec les hypothèses actuelles, le capital n'est pas récupéré : réduisez le prix ou augmentez les revenus.",
    },
  ];

  return {
    totalInvestment: round(totalInvestment),
    acquisitionFees: round(acquisitionFees),
    loanAmount: round(loanAmount),
    downPayment: round(downPayment),
    annualGrossIncome: round(annualGrossIncome),
    annualOperatingExpenses: round(annualOperatingExpenses),
    annualDebtService: round(annualDebtService),
    netOperatingIncome: round(netOperatingIncome),
    monthlyCashFlow: round(monthlyCashFlow),
    annualCashFlow: round(annualCashFlow),
    grossYield: round(grossYield, 2),
    netYield: round(netYield, 2),
    rentalYield: round(rentalYield, 2),
    roiAnnual: round(roiAnnual, 1),
    roi5,
    roi10,
    paybackYears: Number.isFinite(paybackYears) ? round(paybackYears, 1) : Infinity,
    paybackDate,
    paybackLabel,
    projections,
    benefits,
    scenarios,
    comparison,
    score: { total, grade, verdict, tone, criteria },
    positiveFactors,
    negativeFactors,
    recommendations,
    risks,
    assistant,
    market,
    assumptions: {
      occupancyRate,
      managementFeeRate,
      rentIndexationRate,
      inflationRate,
      marketGrowthRate,
    },
  };
}

/* ══════════════════════════════════════════════════════════════════════════
 * 7. Classement des meilleures zones d'investissement (carte Tunisie)
 * ══════════════════════════════════════════════════════════════════════════ */

export interface ZoneOpportunity {
  region: string;
  city: string;
  quarter: string;
  standing: string;
  pricePerSqm: number;
  rentPerSqm: number;
  grossYield: number;
  score: number;
}

/**
 * Classe les zones du marché tunisien 2026 par intérêt d'investissement.
 * Le score combine rendement brut, appréciation (standing) et liquidité.
 */
export function rankInvestmentZones(
  limit = 12,
  type: InvestmentType = "appartement",
): ZoneOpportunity[] {
  const profile = TYPE_PROFILE[type] ?? TYPE_PROFILE.appartement;
  return ZONE_DATABASE.map((z) => {
    const pricePerSqm = z.transaction * profile.price;
    const rentPerSqm = z.loyerM2 * profile.rent;
    const grossYield = pricePerSqm > 0 ? ((rentPerSqm * 12) / pricePerSqm) * 100 : 0;
    const standingBoost = z.standing.toLowerCase().includes("haut")
      ? 12
      : z.standing.toLowerCase().includes("moyen")
        ? 6
        : 0;
    const appreciation = profile.appreciation * 40;
    const score = clamp(grossYield * 9 + standingBoost + appreciation, 0, 100);
    return {
      region: z.region,
      city: z.city,
      quarter: z.quarter,
      standing: z.standing,
      pricePerSqm: round(pricePerSqm),
      rentPerSqm: round(rentPerSqm, 2),
      grossYield: round(grossYield, 2),
      score: round(score),
    };
  })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Agrégats par gouvernorat pour la carte des zones. */
export interface GovernorateOpportunity {
  gouvernorat: string;
  pricePerSqm: number;
  rentPerSqm: number;
  grossYield: number;
}

export function governorateOpportunities(): GovernorateOpportunity[] {
  return Object.entries(GOVERNORATE_AVERAGES)
    .map(([gouvernorat, v]) => ({
      gouvernorat,
      pricePerSqm: round(v.transaction),
      rentPerSqm: round(v.loyerM2, 2),
      grossYield: v.transaction > 0 ? round((v.loyerM2 * 12 * 100) / v.transaction, 2) : 0,
    }))
    .sort((a, b) => b.grossYield - a.grossYield);
}
