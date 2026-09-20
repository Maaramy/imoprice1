"use node";

// ════════════════════════════════════════════════════════════════════════
// MODULE INVESTISSEMENT — ACTIONS IA (Node runtime)
//
// runAnalysis         : contrôle d'accès → moteur déterministe → rédaction IA
//                       → persistance → retour de l'analyse.
// askInvestorAssistant : questions/réponses sur une analyse existante.
//
// Le client IA est `@vly-ai/integrations` (identique au projet cible).
// Si l'appel échoue, un fallback déterministe garantit une réponse utile.
// ════════════════════════════════════════════════════════════════════════

import { createVlyIntegrations } from "@vly-ai/integrations";
import { getAuthUserId } from "@convex-dev/auth/server";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import {
  analysisInputValidator,
  type InvestmentAiInsights,
  type InvestmentAnalysisInput,
  type InvestmentAnalysisResults,
} from "./investmentTypes";
import { fallbackInsights, normalizeInput, runEngine } from "./investments";
import { requireClientProAccess } from "./investmentAccess";

const vly = createVlyIntegrations({
  deploymentToken: process.env.VLY_INTEGRATION_KEY ?? "",
  debug: false,
});

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function callAi(messages: ChatMessage[], maxTokens = 1400): Promise<string | null> {
  try {
    const res = await vly.ai.completion({
      messages,
      temperature: 0.4,
      maxTokens,
    });
    if (!res.success || !res.data) return null;
    const content = res.data.choices?.[0]?.message?.content;
    return typeof content === "string" && content.trim() ? content.trim() : null;
  } catch (error) {
    console.warn("[investmentAi] appel IA échoué, fallback déterministe:", error);
    return null;
  }
}

function extractJson<T>(raw: string): T | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : raw;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

function toStringArray(value: unknown, fallback: string[]): string[] {
  if (Array.isArray(value)) {
    const arr = value.map((v) => String(v).trim()).filter(Boolean);
    if (arr.length) return arr;
  }
  return fallback;
}

export const runAnalysis = action({
  args: {
    input: analysisInputValidator,
    projectId: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    analysisId: Id<"investmentAnalyses">;
    input: InvestmentAnalysisInput;
    results: InvestmentAnalysisResults;
    aiInsights: InvestmentAiInsights;
  }> => {
    await requireClientProAccess(ctx);

    const normalized = normalizeInput(args.input);
    const results: InvestmentAnalysisResults = runEngine(normalized);
    const base = fallbackInsights(normalized, results);

    const prompt = buildAnalysisPrompt(normalized, results);
    const raw = await callAi([
      {
        role: "system",
        content:
          "Tu es un expert en investissement immobilier en Tunisie. Tu réponds UNIQUEMENT en JSON valide, en français, avec des montants en TND. " +
          'Schéma attendu : {"summary":"...","verdict":"...","recommendations":["..."],"risks":["..."],"marketNotes":"..."}',
      },
      { role: "user", content: prompt },
    ]);

    let insights: InvestmentAiInsights = { ...base, source: "moteur" };
    if (raw) {
      const parsed = extractJson<Partial<InvestmentAiInsights>>(raw);
      if (parsed) {
        insights = {
          summary: typeof parsed.summary === "string" ? parsed.summary : base.summary,
          verdict: typeof parsed.verdict === "string" ? parsed.verdict : base.verdict,
          recommendations: toStringArray(parsed.recommendations, base.recommendations),
          risks: toStringArray(parsed.risks, base.risks),
          marketNotes: typeof parsed.marketNotes === "string" ? parsed.marketNotes : base.marketNotes,
          source: "ia",
        };
      }
    }

    const analysisId = await ctx.runMutation(api.investments.saveAnalysis, {
      input: normalized,
      projectId: args.projectId,
      aiInsights: insights,
    });

    return { analysisId, input: normalized, results, aiInsights: insights };
  },
});

export const askInvestorAssistant = action({
  args: {
    analysisId: v.id("investmentAnalyses"),
    question: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const doc = await ctx.runQuery(api.investments.getAnalysis, {
      analysisId: args.analysisId,
    });
    if (!doc) throw new Error("Analyse introuvable");

    const input = doc.input as InvestmentAnalysisInput;
    const results = doc.results as InvestmentAnalysisResults;

    const raw = await callAi(
      [
        {
          role: "system",
          content:
            "Tu es un conseiller en investissement immobilier tunisien. Réponds en français, de façon concise et chiffrée (TND), " +
            "en t'appuyant exclusivement sur les données fournies.",
        },
        {
          role: "user",
          content: `Données de l'analyse:\n${buildAnalysisPrompt(input, results)}\n\nQuestion de l'investisseur: ${args.question}`,
        },
      ],
      900,
    );

    const answer = raw ?? deterministicAnswer(args.question, input, results);
    return { answer };
  },
});

/* ─────────────────────────── Helpers de contexte ─────────────────────────── */

function buildAnalysisPrompt(
  input: InvestmentAnalysisInput,
  results: InvestmentAnalysisResults,
): string {
  const { indicators, score, zone } = results;
  return [
    `Bien: ${input.type} à ${input.quartier}, ${input.city}, ${input.region}.`,
    `Prix d'achat: ${indicators.purchasePrice} TND · coût total: ${indicators.totalCost} TND · surface: ${input.surface} m².`,
    `Mode de location: ${input.rentMode} · loyer mensuel de référence: ${indicators.monthlyRent} TND · occupation: ${indicators.occupancyRate} %.`,
    `Rendement brut: ${indicators.grossYieldPct} % · rendement net: ${indicators.netYieldPct} %.`,
    `Cashflow mensuel: ${indicators.monthlyCashflow} TND · revenu net annuel: ${indicators.netAnnualIncome} TND.`,
    `ROI 1 an: ${indicators.roiAnnualPct} % · ROI 5 ans: ${indicators.roi5yPct} % · ROI 10 ans: ${indicators.roi10yPct} %.`,
    `Récupération du capital: ${indicators.paybackYears} ans (${indicators.paybackDateLabel}).`,
    `Zone: ${zone.name} — rang ${zone.rank}/${zone.total} · demande ${zone.demandIndex}/100 · appréciation ${zone.appreciationPct} %/an · risque ${zone.riskScore}/100.`,
    `Score IA: ${score.total}/100 (${score.grade} — ${score.label}).`,
    `Scénarios: ${results.scenarios.map((s) => `${s.label} ROI ${s.roiPct}%`).join(" · ")}.`,
  ].join("\n");
}

function deterministicAnswer(
  question: string,
  input: InvestmentAnalysisInput,
  results: InvestmentAnalysisResults,
): string {
  const { indicators, score, zone } = results;
  const q = question.toLowerCase();

  if (/rentable|rentabilité/.test(q)) {
    return `Rendement net de ${indicators.netYieldPct} % pour un cashflow mensuel de ${indicators.monthlyCashflow} TND. ` +
      `Score IA ${score.total}/100 (${score.label}). ${
        indicators.netYieldPct >= 5 ? "L'opération est jugée rentable." : "La rentabilité reste à améliorer par la négociation du prix."
      }`;
  }
  if (/meilleur|rendement|quel bien/.test(q)) {
    const best = [...results.comparison].sort((a, b) => b.netYieldPct - a.netYieldPct)[0];
    return `À ce budget, la classe d'actifs offrant le meilleur rendement net est « ${best.label} » (${best.netYieldPct} % net, ROI estimé ${best.roiPct} %).`;
  }
  if (/10 ans|dix ans|gagner/.test(q)) {
    const ten =
      results.forecastSummary.find((f) => f.horizon === 10) ??
      results.forecastSummary[results.forecastSummary.length - 1];
    return ten
      ? `À ${ten.horizon} ans : valeur du bien ≈ ${ten.propertyValue} TND, revenus cumulés ≈ ${ten.totalIncome} TND, gain cumulé ≈ ${ten.totalGain} TND (ROI ${ten.roiPct} %).`
      : "Horizon non couvert par l'analyse.";
  }
  if (/quartier|zone|meilleur.*investir/.test(q)) {
    return `La zone analysée (${zone.name}) est classée ${zone.rank}/${zone.total} sur les ${zone.total} gouvernorats. Indice de demande ${zone.demandIndex}/100, appréciation ${zone.appreciationPct} %/an.`;
  }
  if (/risque/.test(q)) {
    return `Risque de zone ${zone.riskScore}/100 (${zone.riskScore > 40 ? "élevé" : "modéré"}). Principaux points: ${results.scenarios
      .find((s) => s.key === "prudent")
      ?.notes.join(" ")}`;
  }
  if (/récup|payback|amortiss/.test(q)) {
    return `Le capital est récupéré en environ ${indicators.paybackYears} ans (${indicators.paybackDateLabel}).`;
  }
  return `Coût total ${indicators.totalCost} TND · rendement net ${indicators.netYieldPct} % · ROI 10 ans ${indicators.roi10yPct} % · score IA ${score.total}/100. ${
    input.rentMode === "nuit"
      ? "Optimisez le taux d'occupation pour améliorer le rendement."
      : "Verrouillez un bail long terme indexé pour sécuriser le cashflow."
  }`;
}
