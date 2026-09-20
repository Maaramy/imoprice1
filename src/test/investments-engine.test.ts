import { describe, expect, it } from "vitest";
import {
  buildComparison,
  buildForecasts,
  buildScenarios,
  buildZoneInfo,
  computeConfidence,
  computeIndicators,
  computeScore,
  fallbackInsights,
  normalizeInput,
  resolveZoneInfo,
  runEngine,
} from "@/convex/investments";
import type { InvestmentAnalysisInput } from "@/convex/investmentTypes";

const BASE: InvestmentAnalysisInput = {
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
};

describe("investments — moteur", () => {
  it("normalise les entrées (bornes et mode imposé)", () => {
    const normalized = normalizeInput({
      ...BASE,
      type: "residence_touristique",
      rentMode: "mensuel",
      occupancyRate: 200,
      horizonYears: 2,
    });
    expect(normalized.rentMode).toBe("nuit");
    expect(normalized.occupancyRate).toBeLessThanOrEqual(100);
    expect(normalized.horizonYears).toBeGreaterThanOrEqual(5);
  });

  it("convertit le prix par nuit en loyer mensuel de référence", () => {
    const normalized = normalizeInput({
      ...BASE,
      type: "residence_touristique",
      rentMode: "nuit",
      monthlyRent: 0,
      nightlyRent: 120,
    });
    expect(normalized.monthlyRent).toBe(3600);
  });

  it("calcule le coût total et les rendements", () => {
    const input = normalizeInput(BASE);
    const ind = computeIndicators(input);
    // 420000 + 6% (25200) + 2% (8400) + 8000 + 12000 + 15000
    expect(ind.totalCost).toBeCloseTo(488600, 0);
    expect(ind.acquisitionFees).toBeCloseTo(25200, 0);
    expect(ind.grossAnnualRent).toBeGreaterThan(0);
    expect(ind.netAnnualIncome).toBeLessThan(ind.grossAnnualRent);
    expect(ind.grossYieldPct).toBeGreaterThan(ind.netYieldPct);
    expect(ind.monthlyCashflow).toBeCloseTo(ind.netAnnualIncome / 12, 0);
    expect(ind.pricePerM2).toBeCloseTo(1750, 0);
    expect(ind.paybackYears).toBeGreaterThan(0);
    expect(ind.paybackDateLabel.length).toBeGreaterThan(0);
  });

  it("produit 4 points de prévision aux horizons 1/3/5/10", () => {
    const ind = computeIndicators(normalizeInput(BASE));
    const { forecasts, forecastSummary } = buildForecasts(normalizeInput(BASE), ind);
    expect(forecasts).toHaveLength(4);
    expect(forecasts.map((f) => f.year)).toEqual([1, 3, 5, 10]);
    expect(forecastSummary[3].propertyValue).toBeGreaterThan(forecastSummary[0].propertyValue);
    expect(forecastSummary[3].roiPct).toBeGreaterThan(forecastSummary[0].roiPct);
  });

  it("génère 3 scénarios ordonnés (optimiste > réaliste > prudent)", () => {
    const ind = computeIndicators(normalizeInput(BASE));
    const scenarios = buildScenarios(normalizeInput(BASE), ind);
    expect(scenarios).toHaveLength(3);
    expect(scenarios.map((s) => s.key)).toEqual(["optimiste", "realiste", "prudent"]);
    expect(scenarios[0].roiPct).toBeGreaterThanOrEqual(scenarios[1].roiPct);
    expect(scenarios[1].roiPct).toBeGreaterThanOrEqual(scenarios[2].roiPct);
    for (const s of scenarios) expect(s.notes.length).toBeGreaterThan(0);
  });

  it("calcule un score pondéré dont les poids totalisent 100", () => {
    const input = normalizeInput(BASE);
    const ind = computeIndicators(input);
    const score = computeScore(input, ind, resolveZoneInfo(input));
    const weightSum = score.criteria.reduce((sum, c) => sum + c.weight, 0);
    expect(weightSum).toBe(100);
    expect(score.total).toBeGreaterThanOrEqual(0);
    expect(score.total).toBeLessThanOrEqual(100);
    expect(score.grade.length).toBeGreaterThan(0);
    expect(score.label.length).toBeGreaterThan(0);
  });

  it("compare 5 classes d'actifs à budget équivalent", () => {
    const input = normalizeInput(BASE);
    const comparison = buildComparison(input, resolveZoneInfo(input));
    expect(comparison).toHaveLength(5);
    expect(comparison.map((c) => c.type)).toEqual([
      "appartement",
      "villa",
      "local_commercial",
      "bureau",
      "terrain",
    ]);
    for (const item of comparison) {
      expect(item.netYieldPct).toBeGreaterThanOrEqual(0);
      expect(item.riskLevel).toBeDefined();
    }
  });

  it("décrit la zone et l'indice de confiance", () => {
    const input = normalizeInput(BASE);
    const ind = computeIndicators(input);
    const zone = buildZoneInfo(resolveZoneInfo(input));
    expect(zone.total).toBe(24);
    expect(zone.rank).toBe(zone.rank);
    const confidence = computeConfidence(input, ind, resolveZoneInfo(input));
    expect(confidence).toBeGreaterThanOrEqual(35);
    expect(confidence).toBeLessThanOrEqual(97);
  });

  it("garantit des insights déterministes sans IA", () => {
    const input = normalizeInput(BASE);
    const results = runEngine(input);
    const insights = fallbackInsights(input, results);
    expect(insights.source).toBe("moteur");
    expect(insights.summary.length).toBeGreaterThan(10);
    expect(insights.verdict.length).toBeGreaterThan(5);
    expect(insights.recommendations.length).toBeGreaterThan(0);
    expect(insights.risks.length).toBeGreaterThan(0);
    expect(insights.marketNotes).toContain("Zone");
  });

  it("produit une analyse complète, non nulle, via runEngine", () => {
    const results = runEngine(BASE);
    expect(results.indicators.totalCost).toBeGreaterThan(0);
    expect(results.indicators.monthlyCashflow).not.toBe(0);
    expect(results.score.total).toBeGreaterThan(0);
    expect(results.scenarios).toHaveLength(3);
    expect(results.forecasts).toHaveLength(4);
    expect(results.comparison).toHaveLength(5);
    expect(results.zone.rank).toBeGreaterThan(0);
  });
});
