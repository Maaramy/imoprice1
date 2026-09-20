// ════════════════════════════════════════════════════════════════════════
// MODULE INVESTISSEMENT IMMOBILIER (ROI) — MOTEUR DE CALCUL + API CONVEX
//
// Le moteur est purement déterministe : aucune dépendance externe, aucun
// appel réseau. Les fonctions pures exportées ci-dessous sont testées.
// ════════════════════════════════════════════════════════════════════════

import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import {
  analysisInputValidator,
  aiInsightsValidator,
  DEFAULT_ZONE,
  FORECAST_HORIZONS,
  INVESTMENT_TYPE_META,
  INVESTMENT_ZONE_MAP,
  INVESTMENT_ZONES,
  SCENARIO_DEFAULTS,
  estimateOccupancyRate,
  forcedRentModeFor,
  type InvestmentAiInsights,
  type InvestmentAnalysisInput,
  type InvestmentAnalysisResults,
  type InvestmentComparisonItem,
  type InvestmentForecastPoint,
  type InvestmentForecastSummaryItem,
  type InvestmentIndicators,
  type InvestmentScenario,
  type InvestmentScore,
  type InvestmentZone,
  type InvestmentZoneInfo,
  type InvestmentType,
} from "./investmentTypes";

const MS_PER_YEAR = 365 * 24 * 60 * 60 * 1000;

function round(value: number, decimals = 0): number {
  if (!Number.isFinite(value)) return 0;
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

function safe(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/* ─────────────────────────── Moteur — normalisation ─────────────────────────── */

export function normalizeInput(input: InvestmentAnalysisInput): InvestmentAnalysisInput {
  const type = input.type;
  const forced = forcedRentModeFor(type);
  const rentMode = forced ?? input.rentMode;

  const purchasePrice = Math.max(0, safe(input.purchasePrice));
  const surface = Math.max(0, safe(input.surface));
  const nightlyRent = input.nightlyRent != null ? Math.max(0, safe(input.nightlyRent)) : undefined;

  // Loyer mensuel de référence : en mode nuitée, le montant saisi est un prix
  // par nuit converti en équivalent mensuel (×30) ; l'occupation est appliquée
  // séparément au revenu brut annuel.
  const monthlyRent =
    rentMode === "nuit" && nightlyRent != null && nightlyRent > 0
      ? nightlyRent * 30
      : Math.max(0, safe(input.monthlyRent));

  const occupancyRate =
    safe(input.occupancyRate) > 0
      ? clamp(input.occupancyRate, 0, 100)
      : estimateOccupancyRate({
          region: input.region,
          city: input.city,
          quartier: input.quartier,
          rentMode,
        });

  return {
    type,
    purchasePrice,
    surface,
    region: input.region || DEFAULT_ZONE,
    city: input.city || "",
    quartier: input.quartier || "",
    rentMode,
    monthlyRent: round(monthlyRent, 2),
    nightlyRent,
    occupancyRate: round(occupancyRate, 1),
    renovationCost: Math.max(0, safe(input.renovationCost)),
    acquisitionFeePct: clamp(safe(input.acquisitionFeePct), 0, 30),
    financingFees: Math.max(0, safe(input.financingFees)),
    agencyFeesPct: clamp(safe(input.agencyFeesPct), 0, 20),
    furnishingCost: Math.max(0, safe(input.furnishingCost)),
    annualCharges: Math.max(0, safe(input.annualCharges)),
    insurance: Math.max(0, safe(input.insurance)),
    managementFeePct: clamp(safe(input.managementFeePct), 0, 30),
    taxationPct: clamp(safe(input.taxationPct), 0, 40),
    appreciationPct: clamp(safe(input.appreciationPct), -10, 25),
    rentGrowthPct: clamp(safe(input.rentGrowthPct), -10, 25),
    inflationPct: clamp(safe(input.inflationPct), 0, 20),
    horizonYears: Math.max(5, Math.round(safe(input.horizonYears, 10))),
  };
}

export function resolveZoneInfo(input: InvestmentAnalysisInput): InvestmentZone {
  return INVESTMENT_ZONE_MAP[input.region] ?? INVESTMENT_ZONE_MAP[DEFAULT_ZONE];
}

/* ─────────────────────────── Moteur — projection annuelle ─────────────────────────── */

export interface YearRow {
  year: number;
  propertyValue: number;
  annualIncome: number;
  cumulativeIncome: number;
  cumulativeGain: number;
  roiPct: number;
}

export function projectYearSeries(
  base: InvestmentAnalysisInput,
  totalCost: number,
  opts?: {
    appreciationPct?: number;
    rentGrowthPct?: number;
    inflationPct?: number;
    occupancyRate?: number;
    horizon?: number;
  },
): YearRow[] {
  const appreciation = opts?.appreciationPct ?? base.appreciationPct;
  const rentGrowth = opts?.rentGrowthPct ?? base.rentGrowthPct;
  const inflation = opts?.inflationPct ?? base.inflationPct;
  const occupancy = opts?.occupancyRate ?? base.occupancyRate;
  const horizon = opts?.horizon ?? base.horizonYears;

  const rows: YearRow[] = [];
  let cumulativeIncome = 0;
  for (let year = 1; year <= horizon; year++) {
    const propertyValue = base.purchasePrice * (1 + appreciation / 100) ** year;
    const rent =
      base.monthlyRent * (1 + rentGrowth / 100) ** (year - 1) * 12 * (occupancy / 100);
    const expenses = base.annualCharges * (1 + inflation / 100) ** (year - 1);
    const annualIncome = rent - expenses;
    cumulativeIncome += annualIncome;
    const cumulativeGain = propertyValue - totalCost + cumulativeIncome;
    rows.push({
      year,
      propertyValue: round(propertyValue),
      annualIncome: round(annualIncome),
      cumulativeIncome: round(cumulativeIncome),
      cumulativeGain: round(cumulativeGain),
      roiPct: totalCost > 0 ? round((cumulativeGain / totalCost) * 100, 1) : 0,
    });
  }
  return rows;
}

/* ─────────────────────────── Moteur — indicateurs ─────────────────────────── */

export function computeIndicators(
  input: InvestmentAnalysisInput,
  now: number = Date.now(),
): InvestmentIndicators {
  const acquisitionFees = (input.purchasePrice * input.acquisitionFeePct) / 100;
  const agencyFees = (input.purchasePrice * input.agencyFeesPct) / 100;
  const totalCost =
    input.purchasePrice +
    acquisitionFees +
    input.financingFees +
    agencyFees +
    input.furnishingCost +
    input.renovationCost;

  const grossAnnualRent = input.monthlyRent * 12 * (input.occupancyRate / 100);
  const managementFees = (grossAnnualRent * input.managementFeePct) / 100;
  const taxation = (grossAnnualRent * input.taxationPct) / 100;
  const operatingExpenses = input.annualCharges + input.insurance + managementFees + taxation;
  const netAnnualIncome = grossAnnualRent - operatingExpenses;

  const grossYieldPct = totalCost > 0 ? (grossAnnualRent / totalCost) * 100 : 0;
  const netYieldPct = totalCost > 0 ? (netAnnualIncome / totalCost) * 100 : 0;

  const series = projectYearSeries(input, totalCost);
  const roiAnnualPct = totalCost > 0 ? round((series[0].propertyValue - totalCost + series[0].cumulativeIncome) / totalCost * 100, 1) : 0;
  const roi5yPct = series[4] ? series[4].roiPct : 0;
  const roi10yPct = series[9] ? series[9].roiPct : (series[series.length - 1]?.roiPct ?? 0);

  const paybackYears = netAnnualIncome > 0 ? totalCost / netAnnualIncome : 0;
  const paybackDate = now + paybackYears * MS_PER_YEAR;

  return {
    purchasePrice: round(input.purchasePrice),
    totalCost: round(totalCost),
    acquisitionFees: round(acquisitionFees),
    renovationCost: round(input.renovationCost),
    financingFees: round(input.financingFees),
    agencyFees: round(agencyFees),
    furnishingCost: round(input.furnishingCost),
    annualCharges: round(input.annualCharges),
    insurance: round(input.insurance),
    managementFees: round(managementFees),
    taxation: round(taxation),
    rentMode: input.rentMode,
    monthlyRent: round(input.monthlyRent),
    occupancyRate: round(input.occupancyRate, 1),
    grossAnnualRent: round(grossAnnualRent),
    operatingExpenses: round(operatingExpenses),
    netAnnualIncome: round(netAnnualIncome),
    monthlyCashflow: round(netAnnualIncome / 12),
    annualCashflow: round(netAnnualIncome),
    grossYieldPct: round(grossYieldPct, 1),
    netYieldPct: round(netYieldPct, 1),
    roiAnnualPct,
    roi5yPct,
    roi10yPct,
    paybackYears: round(paybackYears, 1),
    paybackDate: round(paybackDate),
    paybackDateLabel: formatPaybackDate(paybackDate, paybackYears),
    pricePerM2: input.surface > 0 ? round(input.purchasePrice / input.surface) : undefined,
    priceToRentRatio: input.monthlyRent > 0 ? round(input.purchasePrice / input.monthlyRent, 1) : 0,
  };
}

export function formatPaybackDate(timestamp: number, years: number): string {
  if (!Number.isFinite(timestamp) || years <= 0) return "Non atteint à ce niveau de revenu";
  try {
    return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(
      new Date(timestamp),
    );
  } catch {
    return `≈ ${Math.round(years)} ans`;
  }
}

/* ─────────────────────────── Moteur — prévisions ─────────────────────────── */

export function buildForecasts(
  input: InvestmentAnalysisInput,
  indicators: InvestmentIndicators,
): { forecasts: InvestmentForecastPoint[]; forecastSummary: InvestmentForecastSummaryItem[] } {
  const series = projectYearSeries(input, indicators.totalCost, {
    horizon: Math.max(...FORECAST_HORIZONS),
  });
  const forecasts: InvestmentForecastPoint[] = [];
  const forecastSummary: InvestmentForecastSummaryItem[] = [];

  for (const horizon of FORECAST_HORIZONS) {
    const row = series[horizon - 1];
    if (!row) continue;
    const label = `${horizon} an${horizon > 1 ? "s" : ""}`;
    forecasts.push({
      year: horizon,
      label,
      propertyValue: row.propertyValue,
      cumulativeIncome: row.cumulativeIncome,
      cumulativeGain: row.cumulativeGain,
      roiPct: row.roiPct,
    });
    forecastSummary.push({
      horizon,
      label,
      propertyValue: row.propertyValue,
      totalIncome: row.cumulativeIncome,
      totalGain: row.cumulativeGain,
      roiPct: row.roiPct,
    });
  }
  return { forecasts, forecastSummary };
}

/* ─────────────────────────── Moteur — scénarios ─────────────────────────── */

export function buildScenarios(
  input: InvestmentAnalysisInput,
  indicators: InvestmentIndicators,
): InvestmentScenario[] {
  const order: Array<"optimiste" | "realiste" | "prudent"> = ["optimiste", "realiste", "prudent"];
  return order.map((key) => {
    const def = SCENARIO_DEFAULTS[key];
    const appreciation = clamp(input.appreciationPct + def.appreciationOffset, -10, 25);
    const rentGrowth = def.rentGrowthPct;
    const occupancy = clamp(input.occupancyRate + def.occupancyOffset, 10, 100);
    const series = projectYearSeries(input, indicators.totalCost, {
      appreciationPct: appreciation,
      rentGrowthPct: rentGrowth,
      inflationPct: def.inflationPct,
      occupancyRate: occupancy,
      horizon: Math.max(...FORECAST_HORIZONS),
    });
    const last = series[series.length - 1];
    const grossRent = input.monthlyRent * 12 * (occupancy / 100);
    const netRent = grossRent - input.annualCharges * (1 + def.inflationPct / 100) ** 4;
    const netYieldPct = indicators.totalCost > 0 ? (netRent / indicators.totalCost) * 100 : 0;

    const riskLevel = key === "optimiste" ? "moyen" : key === "prudent" ? "eleve" : "faible";
    const notes: string[] = [];
    if (key === "optimiste") {
      notes.push("Croissance des loyers soutenue et forte appréciation du bien.");
      notes.push("Hypothèse d'occupation optimale sur la période.");
    } else if (key === "realiste") {
      notes.push("Hypothèses alignées sur les moyennes du marché tunisien.");
      notes.push("Occupation et croissance conformes aux tendances observées.");
    } else {
      notes.push("Inflation élevée et croissance locative limitée.");
      notes.push("Prévoir une réserve pour vacance et travaux imprévus.");
    }

    return {
      key,
      label: def.label,
      rentGrowthPct: round(rentGrowth, 1),
      appreciationPct: round(appreciation, 1),
      inflationPct: def.inflationPct,
      occupancyRate: round(occupancy, 1),
      propertyValue: last ? last.propertyValue : round(input.purchasePrice),
      totalIncome: last ? last.cumulativeIncome : 0,
      netYieldPct: round(netYieldPct, 1),
      roiPct: last ? last.roiPct : 0,
      riskLabel:
        key === "optimiste" ? "Risque modéré" : key === "prudent" ? "Risque élevé" : "Risque maîtrisé",
      riskLevel,
      notes,
    };
  });
}

/* ─────────────────────────── Moteur — score IA ─────────────────────────── */

export function computeScore(
  input: InvestmentAnalysisInput,
  indicators: InvestmentIndicators,
  zone: InvestmentZone,
): InvestmentScore {
  const meta = INVESTMENT_TYPE_META[input.type];
  const netYield = indicators.netYieldPct;

  const yieldScore = clamp((netYield / Math.max(meta.yieldBenchmark, 1)) * 26, 0, 26);
  const locationScore = clamp((zone.demandIndex / 100) * 20, 0, 20);
  const demandScore = clamp((zone.demandIndex / 100) * 16, 0, 16);
  const riskScore = clamp(((100 - zone.riskScore) / 100) * 14, 0, 14);
  const appreciationScore = clamp((zone.appreciationPct / 8) * 12, 0, 12);
  const liquidityScore = clamp(((100 - (zone.rank / 27) * 100) / 100) * 12, 0, 12);

  const criteria = [
    { key: "rentabilite", label: "Rentabilité", score: round(yieldScore, 1), max: 26, weight: 26 },
    { key: "emplacement", label: "Emplacement", score: round(locationScore, 1), max: 20, weight: 20 },
    { key: "demande", label: "Demande locative", score: round(demandScore, 1), max: 16, weight: 16 },
    { key: "risque", label: "Risque", score: round(riskScore, 1), max: 14, weight: 14 },
    { key: "appreciation", label: "Potentiel d'appréciation", score: round(appreciationScore, 1), max: 12, weight: 12 },
    { key: "liquidite", label: "Liquidité", score: round(liquidityScore, 1), max: 12, weight: 12 },
  ];

  const total = round(criteria.reduce((sum, c) => sum + c.score, 0));
  const { grade, label } =
    total >= 85
      ? { grade: "A+", label: "Excellent investissement" }
      : total >= 70
        ? { grade: "A", label: "Très bon investissement" }
        : total >= 55
          ? { grade: "B", label: "Investissement correct" }
          : total >= 40
            ? { grade: "C", label: "Investissement à surveiller" }
            : { grade: "D", label: "Investissement risqué" };

  return { total, grade, label, criteria };
}

/* ─────────────────────────── Moteur — comparaison ─────────────────────────── */

const COMPARISON_CLASSES: Array<{ type: InvestmentType; priceMult: number; rentMult: number; opexRatio: number }> = [
  { type: "appartement", priceMult: 1.0, rentMult: 1.0, opexRatio: 0.18 },
  { type: "villa", priceMult: 1.35, rentMult: 1.15, opexRatio: 0.22 },
  { type: "local_commercial", priceMult: 1.25, rentMult: 1.65, opexRatio: 0.2 },
  { type: "bureau", priceMult: 1.18, rentMult: 1.5, opexRatio: 0.21 },
  { type: "terrain", priceMult: 0.72, rentMult: 0.12, opexRatio: 0.05 },
];

export function buildComparison(
  input: InvestmentAnalysisInput,
  zone: InvestmentZone,
): InvestmentComparisonItem[] {
  return COMPARISON_CLASSES.map((cls) => {
    const meta = INVESTMENT_TYPE_META[cls.type];
    const pricePerM2 = zone.pricePerM2 * cls.priceMult;
    const rentPerM2 = zone.rentPerM2 * cls.rentMult;
    const grossYieldPct = pricePerM2 > 0 ? ((rentPerM2 * 12) / pricePerM2) * 100 : 0;
    const netYieldPct = grossYieldPct * (1 - cls.opexRatio);
    const appreciationPct = zone.appreciationPct * (cls.type === "terrain" ? 1.35 : 1);
    const roiPct = netYieldPct + appreciationPct;
    const riskOrder = { faible: 3, moyen: 2, eleve: 1 }[meta.riskLevel];
    const potentialScore = clamp(
      round(netYieldPct * 6 + appreciationPct * 5 + riskOrder * 6),
      0,
      100,
    );
    return {
      type: cls.type,
      label: meta.label,
      pricePerM2: round(pricePerM2),
      rentPerM2: round(rentPerM2, 1),
      grossYieldPct: round(grossYieldPct, 1),
      netYieldPct: round(netYieldPct, 1),
      roiPct: round(roiPct, 1),
      riskLevel: meta.riskLevel,
      appreciationPct: round(appreciationPct, 1),
      potentialScore,
    };
  });
}

/* ─────────────────────────── Moteur — zone & confiance ─────────────────────────── */

export function buildZoneInfo(zone: InvestmentZone): InvestmentZoneInfo {
  return {
    region: zone.region,
    name: zone.name,
    rank: zone.rank,
    total: INVESTMENT_ZONES.length,
    pricePerM2: zone.pricePerM2,
    rentPerM2: zone.rentPerM2,
    demandIndex: zone.demandIndex,
    appreciationPct: zone.appreciationPct,
    riskScore: zone.riskScore,
    highlights: zone.highlights,
  };
}

export function computeConfidence(
  input: InvestmentAnalysisInput,
  indicators: InvestmentIndicators,
  zone: InvestmentZone,
): number {
  let score = 60;
  if (input.surface > 0) score += 8;
  if (input.purchasePrice > 0) score += 8;
  if (input.monthlyRent > 0 || input.nightlyRent) score += 8;
  if (input.city && input.quartier) score += 5;
  score += (zone.demandIndex - 60) * 0.12;
  if (indicators.netYieldPct > 0) score += 3;
  return clamp(round(score), 35, 97);
}

/* ─────────────────────────── Moteur — orchestration ─────────────────────────── */

export function runEngine(input: InvestmentAnalysisInput): InvestmentAnalysisResults {
  const normalized = normalizeInput(input);
  const zone = resolveZoneInfo(normalized);
  const indicators = computeIndicators(normalized);
  const { forecasts, forecastSummary } = buildForecasts(normalized, indicators);
  const scenarios = buildScenarios(normalized, indicators);
  const score = computeScore(normalized, indicators, zone);
  const comparison = buildComparison(normalized, zone);
  const zoneInfo = buildZoneInfo(zone);
  const confidencePct = computeConfidence(normalized, indicators, zone);
  return { indicators, forecasts, forecastSummary, scenarios, score, comparison, zone: zoneInfo, confidencePct };
}

/* ─────────────────────────── Insights déterministes (fallback IA) ─────────── */

export function fallbackInsights(
  input: InvestmentAnalysisInput,
  results: InvestmentAnalysisResults,
): InvestmentAiInsights {
  const { indicators, score, zone } = results;
  const meta = INVESTMENT_TYPE_META[input.type];
  const location = [input.quartier, input.city, input.region].filter(Boolean).join(", ");

  const summary =
    `Analyse de rentabilité d'un(e) ${meta.label.toLowerCase()} situé(e) à ${location || zone.name}, ` +
    `acquise pour ${Math.round(indicators.totalCost).toLocaleString("fr-FR")} TND tout compris ` +
    `(prix ${Math.round(indicators.purchasePrice).toLocaleString("fr-FR")} TND + frais). ` +
    `Le rendement net ressort à ${indicators.netYieldPct} % pour un cashflow mensuel de ` +
    `${Math.round(indicators.monthlyCashflow).toLocaleString("fr-FR")} TND. ` +
    `Le capital est récupéré en environ ${indicators.paybackYears} ans.`;

  const verdict =
    score.total >= 70
      ? `Investissement ${score.grade} — ${score.label}. Le couple rendement/emplacement est favorable au marché de ${zone.name}.`
      : score.total >= 55
        ? `Investissement ${score.grade} — ${score.label}. Rentabilité correcte mais à optimiser avant engagement.`
        : `Investissement ${score.grade} — ${score.label}. Les fondamentaux ne compensent pas le risque actuel.`;

  const recommendations: string[] = [];
  if (indicators.netYieldPct < meta.yieldBenchmark) {
    recommendations.push(
      `Négocier le prix d'achat ou réduire les frais pour viser un rendement net proche de ${meta.yieldBenchmark} %.`,
    );
  }
  if (input.rentMode === "nuit") {
    recommendations.push("Optimiser le taux d'occupation (tarification dynamique, canaux de réservation).");
  } else {
    recommendations.push("Verrouiller un bail de longue durée avec indexation annuelle des loyers.");
  }
  if (input.renovationCost > 0) {
    recommendations.push("Prioriser les travaux à plus forte valeur perçue (cuisine, salle de bain, façade).");
  }
  recommendations.push("Constituer une réserve équivalente à 2–3 mois de loyer pour les vacances locatives.");

  const risks: string[] = [];
  if (zone.riskScore > 40) risks.push(`Zone à risque élevé (score ${zone.riskScore}/100) : liquidité de revente limitée.`);
  if (indicators.monthlyCashflow < 0) risks.push("Cashflow négatif : l'opération nécessite un apport mensuel.");
  if (indicators.priceToRentRatio > 260) risks.push(`Ratio prix/loyer élevé (${indicators.priceToRentRatio}) : rentabilité sous tension.`);
  risks.push("Évolution des taux d'intérêt et de la fiscalité locative.");

  const marketNotes =
    `Zone ${zone.name} — rang ${zone.rank}/${results.zone.total}. ` +
    `Prix moyen ${zone.pricePerM2} TND/m², loyer moyen ${zone.rentPerM2} TND/m²/mois, ` +
    `indice de demande ${zone.demandIndex}/100, appréciation moyenne ${zone.appreciationPct} %/an.`;

  return { summary, verdict, recommendations, risks, marketNotes, source: "moteur" };
}

/* ─────────────────────────── API — lecture ─────────────────────────── */

export const getInvestmentZones = query({
  args: {},
  handler: async () => INVESTMENT_ZONES,
});

export const getComparisonBenchmarks = query({
  args: {},
  handler: async () =>
    INVESTMENT_ZONES.map((z) => ({
      region: z.region,
      pricePerM2: z.pricePerM2,
      rentPerM2: z.rentPerM2,
      appreciationPct: z.appreciationPct,
      riskScore: z.riskScore,
    })),
});

export const getComparison = query({
  args: {
    type: v.optional(v.string()),
    budget: v.optional(v.number()),
    region: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const region = args.region && INVESTMENT_ZONE_MAP[args.region] ? args.region : DEFAULT_ZONE;
    const zone = INVESTMENT_ZONE_MAP[region];
    const type = (args.type && INVESTMENT_TYPE_META[args.type as InvestmentType]
      ? args.type
      : "appartement") as InvestmentType;
    const budget = args.budget ?? 300000;
    const base = normalizeInput({
      type,
      purchasePrice: budget,
      surface: 100,
      region,
      city: zone.name,
      quartier: "",
      rentMode: "mensuel",
      monthlyRent: zone.rentPerM2 * 100,
      occupancyRate: 92,
      renovationCost: 0,
      acquisitionFeePct: 6,
      financingFees: 0,
      agencyFeesPct: 2,
      furnishingCost: 0,
      annualCharges: 1200,
      insurance: 400,
      managementFeePct: 5,
      taxationPct: 10,
      appreciationPct: zone.appreciationPct,
      rentGrowthPct: 4,
      inflationPct: 5,
      horizonYears: 10,
    });
    return buildComparison(base, zone);
  },
});

export const listAnalyses = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("investmentAnalyses")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getAnalysis = query({
  args: { analysisId: v.id("investmentAnalyses") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.analysisId);
    if (!doc) return null;
    const userId = await getAuthUserId(ctx);
    if (!userId || doc.userId !== userId) return null;
    return doc;
  },
});

export const getAllAnalyses = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAdmin(ctx))) return [];
    const rows = await ctx.db.query("investmentAnalyses").withIndex("by_created").collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getSharedAnalysis = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query("investmentAnalyses")
      .withIndex("by_share_token", (q) => q.eq("shareToken", args.token))
      .unique();
    if (!doc) return null;
    if (doc.shareExpiresAt && doc.shareExpiresAt < Date.now()) return null;
    return doc;
  },
});

export const getDemoAnalysis = query({
  args: {},
  handler: async () => {
    const inputs: InvestmentAnalysisInput[] = [
      {
        type: "villa",
        purchasePrice: 420000,
        surface: 240,
        region: "Tunis",
        city: "La Marsa",
        quartier: "Gammarth",
        rentMode: "mensuel",
        monthlyRent: 2200,
        occupancyRate: 94,
        renovationCost: 15000,
        acquisitionFeePct: 6,
        financingFees: 8000,
        agencyFeesPct: 2,
        furnishingCost: 12000,
        annualCharges: 3600,
        insurance: 900,
        managementFeePct: 6,
        taxationPct: 10,
        appreciationPct: 5.4,
        rentGrowthPct: 4,
        inflationPct: 5,
        horizonYears: 10,
      },
    ];
    const input = inputs[0];
    const results = runEngine(input);
    return {
      _id: "demo" as unknown as Id<"investmentAnalyses">,
      userId: "demo" as unknown as Id<"users">,
      input,
      results,
      aiInsights: fallbackInsights(input, results),
      isFavorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  },
});

export const getProjectForPrefill = query({
  args: { projectId: v.string() },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("properties", args.projectId);
    if (!id) return null;
    const doc = await ctx.db.get(id);
    if (!doc) return null;
    return {
      name: doc.address ?? undefined,
      category: doc.propertyType,
      region: doc.gouvernorat,
      city: doc.ville,
      quartier: doc.quartier,
      surface: doc.builtSurface,
      constructionCost: doc.estimatedValue ?? undefined,
      budgetScenario: undefined,
    };
  },
});

/* ─────────────────────────── API — écriture ─────────────────────────── */

export const saveAnalysis = mutation({
  args: {
    input: analysisInputValidator,
    projectId: v.optional(v.string()),
    aiInsights: v.optional(aiInsightsValidator),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const normalized = normalizeInput(args.input);
    const results = runEngine(normalized);
    const insights = args.aiInsights ?? fallbackInsights(normalized, results);
    const now = Date.now();
    const id = await ctx.db.insert("investmentAnalyses", {
      userId,
      projectId: args.projectId,
      input: normalized,
      results,
      aiInsights: insights,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

export const deleteAnalysis = mutation({
  args: { analysisId: v.id("investmentAnalyses") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const doc = await ctx.db.get(args.analysisId);
    if (!doc || doc.userId !== userId) throw new Error("Analyse introuvable");
    await ctx.db.delete(args.analysisId);
    return { success: true };
  },
});

export const toggleFavorite = mutation({
  args: { analysisId: v.id("investmentAnalyses") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const doc = await ctx.db.get(args.analysisId);
    if (!doc || doc.userId !== userId) throw new Error("Analyse introuvable");
    const isFavorite = !doc.isFavorite;
    await ctx.db.patch(args.analysisId, { isFavorite, updatedAt: Date.now() });
    return { isFavorite };
  },
});

export const shareAnalysis = mutation({
  args: { analysisId: v.id("investmentAnalyses"), ttlDays: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const doc = await ctx.db.get(args.analysisId);
    if (!doc || doc.userId !== userId) throw new Error("Analyse introuvable");
    const token = doc.shareToken ?? randomToken();
    const ttlDays = args.ttlDays ?? 30;
    await ctx.db.patch(args.analysisId, {
      shareToken: token,
      shareExpiresAt: Date.now() + ttlDays * 24 * 60 * 60 * 1000,
      updatedAt: Date.now(),
    });
    return { token };
  },
});

export const unshareAnalysis = mutation({
  args: { analysisId: v.id("investmentAnalyses") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const doc = await ctx.db.get(args.analysisId);
    if (!doc || doc.userId !== userId) throw new Error("Analyse introuvable");
    await ctx.db.patch(args.analysisId, { shareToken: undefined, shareExpiresAt: undefined });
    return { success: true };
  },
});

export const adminDeleteAnalysis = mutation({
  args: { analysisId: v.id("investmentAnalyses") },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) throw new Error("Accès refusé");
    await ctx.db.delete(args.analysisId);
    return { success: true };
  },
});

export const adminDeleteAnalyses = mutation({
  args: { analysisIds: v.array(v.id("investmentAnalyses")) },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) throw new Error("Accès refusé");
    for (const id of args.analysisIds) {
      await ctx.db.delete(id);
    }
    return { deleted: args.analysisIds.length };
  },
});

export const cleanupLegacyFinancingFields = mutation({
  args: {},
  handler: async (ctx) => {
    if (!(await isAdmin(ctx))) throw new Error("Accès refusé");
    const rows = await ctx.db.query("investmentAnalyses").collect();
    let patched = 0;
    for (const row of rows) {
      const input = row.input as Partial<InvestmentAnalysisInput>;
      const results = row.results as InvestmentAnalysisResults | undefined;
      const missing =
        input.financingFees === undefined ||
        input.agencyFeesPct === undefined ||
        input.furnishingCost === undefined ||
        input.annualCharges === undefined ||
        input.insurance === undefined ||
        input.managementFeePct === undefined ||
        input.taxationPct === undefined ||
        !results?.indicators;
      if (!missing) continue;
      const normalized = normalizeInput(input as InvestmentAnalysisInput);
      const recomputed = runEngine(normalized);
      await ctx.db.patch(row._id, { input: normalized, results: recomputed, updatedAt: Date.now() });
      patched += 1;
    }
    return { patched };
  },
});

/* ─────────────────────────── Helpers ─────────────────────────── */

function randomToken(): string {
  const bytes = new Uint8Array(12);
  for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function isAdmin(ctx: QueryCtx | MutationCtx): Promise<boolean> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return false;
  const user = await ctx.db.get(userId);
  return user?.role === "admin";
}
