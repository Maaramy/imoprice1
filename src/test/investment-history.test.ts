import { describe, expect, it } from "vitest";
import { buildInvestmentHistoryEntry, summarizeInvestmentHistory } from "@/lib/investmentHistory";
import { runEngine } from "@/convex/investments";
import type { InvestmentAnalysisInput } from "@/convex/investmentTypes";

const input: InvestmentAnalysisInput = {
  type: "appartement",
  purchasePrice: 300000,
  surface: 110,
  region: "Sousse",
  city: "Sousse Ville",
  quartier: "Khezama",
  rentMode: "mensuel",
  monthlyRent: 1400,
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
  appreciationPct: 5.7,
  rentGrowthPct: 4,
  inflationPct: 5,
  horizonYears: 10,
};

const analysis = {
  _id: "abc123",
  input,
  results: runEngine(input),
  isFavorite: true,
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000,
};

describe("investmentHistory", () => {
  it("construit une entrée d'historique en lecture seule", () => {
    const entry = buildInvestmentHistoryEntry(analysis);
    expect(entry.id).toBe("abc123");
    expect(entry.type).toBe("appartement");
    expect(entry.typeLabel).toBe("Appartement");
    expect(entry.href).toBe("/dashboard/investments/result/abc123");
    expect(entry.totalCost).toBe(analysis.results.indicators.totalCost);
    expect(entry.netYieldPct).toBe(analysis.results.indicators.netYieldPct);
    expect(entry.isFavorite).toBe(true);
  });

  it("agrège les statistiques de la section Dashboard", () => {
    const entries = [buildInvestmentHistoryEntry(analysis)];
    const stats = summarizeInvestmentHistory(entries);
    expect(stats.count).toBe(1);
    expect(stats.totalBudget).toBeGreaterThan(0);
    expect(stats.bestScore).toBe(analysis.results.score.total);
    expect(stats.favorites).toBe(1);
  });

  it("renvoie des statistiques nulles pour une liste vide", () => {
    const stats = summarizeInvestmentHistory([]);
    expect(stats).toEqual({ count: 0, totalBudget: 0, avgNetYield: 0, bestScore: 0, favorites: 0 });
  });
});
