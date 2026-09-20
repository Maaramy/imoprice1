// Entrée d'historique pour le Dashboard (lecture seule, aucun recalcul).

import { INVESTMENT_TYPE_META, type InvestmentType } from "@/convex/investmentTypes";
import type { AnalysisResults, InvestmentInput } from "@/components/investment/shared";

export interface InvestmentHistoryEntry {
  id: string;
  title: string;
  location: string;
  type: InvestmentType;
  typeLabel: string;
  rentMode: InvestmentInput["rentMode"];
  totalCost: number;
  monthlyCashflow: number;
  netYieldPct: number;
  score: number;
  grade: string;
  confidencePct: number;
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
  href: string;
}

export interface InvestmentAnalysisLike {
  _id: string;
  input: InvestmentInput;
  results: AnalysisResults;
  isFavorite?: boolean;
  createdAt: number;
  updatedAt: number;
}

/** Transforme une analyse stockée en entrée d'historique (lecture seule). */
export function buildInvestmentHistoryEntry(analysis: InvestmentAnalysisLike): InvestmentHistoryEntry {
  const { input, results } = analysis;
  const meta = INVESTMENT_TYPE_META[input.type];
  const location = [input.quartier, input.city, input.region].filter(Boolean).join(", ");
  return {
    id: analysis._id,
    title: location ? `${meta.label} — ${location}` : meta.label,
    location,
    type: input.type,
    typeLabel: meta.label,
    rentMode: input.rentMode,
    totalCost: results.indicators.totalCost,
    monthlyCashflow: results.indicators.monthlyCashflow,
    netYieldPct: results.indicators.netYieldPct,
    score: results.score.total,
    grade: results.score.grade,
    confidencePct: results.confidencePct,
    isFavorite: Boolean(analysis.isFavorite),
    createdAt: analysis.createdAt,
    updatedAt: analysis.updatedAt,
    href: `/dashboard/investments/result/${analysis._id}`,
  };
}

/** Statistiques agrégées pour la section « Mes projets d'investissement ». */
export function summarizeInvestmentHistory(entries: InvestmentHistoryEntry[]) {
  if (entries.length === 0) {
    return { count: 0, totalBudget: 0, avgNetYield: 0, bestScore: 0, favorites: 0 };
  }
  const totalBudget = entries.reduce((sum, e) => sum + e.totalCost, 0);
  const avgNetYield = entries.reduce((sum, e) => sum + e.netYieldPct, 0) / entries.length;
  const bestScore = Math.max(...entries.map((e) => e.score));
  const favorites = entries.filter((e) => e.isFavorite).length;
  return {
    count: entries.length,
    totalBudget,
    avgNetYield: Math.round(avgNetYield * 10) / 10,
    bestScore,
    favorites,
  };
}
