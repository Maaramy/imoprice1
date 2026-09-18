import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  computeInvestmentAnalysis,
  INVESTMENT_TYPES,
  type InvestmentInput,
} from "../lib/investment-analysis";

type Ctx = { db: any };

function sanitizeInput(raw: unknown): InvestmentInput {
  const input = (raw ?? {}) as Partial<InvestmentInput>;
  if (!input.gouvernorat) throw new Error("Le gouvernorat est requis");
  if (!input.investmentType || !INVESTMENT_TYPES.includes(input.investmentType)) {
    throw new Error("Le type d'investissement est requis");
  }
  if (typeof input.purchasePrice !== "number" || input.purchasePrice <= 0) {
    throw new Error("Le prix d'achat est requis");
  }
  if (typeof input.monthlyRent !== "number" || input.monthlyRent < 0) {
    throw new Error("Le loyer mensuel est requis");
  }
  return input as InvestmentInput;
}

/** Snapshot dénormalisé partagé entre création et re-estimation. */
function toRecord(userId: any, input: InvestmentInput, analysis: ReturnType<typeof computeInvestmentAnalysis>) {
  return {
    userId,
    input,
    designation:
      input.designation?.trim() ||
      `${input.investmentType} — ${input.ville || input.gouvernorat}`,
    investmentType: input.investmentType,
    gouvernorat: input.gouvernorat,
    ville: input.ville,
    quartier: input.quartier,
    totalInvestment: analysis.totalInvestment,
    annualGrossIncome: analysis.annualGrossIncome,
    netOperatingIncome: analysis.netOperatingIncome,
    annualCashFlow: analysis.annualCashFlow,
    grossYield: analysis.grossYield,
    netYield: analysis.netYield,
    roiAnnual: analysis.roiAnnual,
    roi5: analysis.roi5,
    roi10: analysis.roi10,
    paybackYears: Number.isFinite(analysis.paybackYears) ? analysis.paybackYears : 0,
    score: analysis.score.total,
    grade: analysis.score.grade,
    analysis,
  };
}

// Créer une analyse de rentabilité d'investissement
export const createInvestment = mutation({
  args: { input: v.any() },
  handler: async (ctx: Ctx, args) => {
    const userId = await getAuthUserId(ctx as any);
    if (!userId) throw new Error("Not authenticated");

    const input = sanitizeInput(args.input);
    const analysis = computeInvestmentAnalysis(input);
    const now = Date.now();

    const investmentId = await ctx.db.insert("investments", {
      ...toRecord(userId, input, analysis),
      createdAt: now,
      updatedAt: now,
    });

    return { investmentId, analysis };
  },
});

// Recalculer une analyse existante avec les hypothèses de marché actuelles
export const reEstimateInvestment = mutation({
  args: { investmentId: v.id("investments") },
  handler: async (ctx: Ctx, args) => {
    const userId = await getAuthUserId(ctx as any);
    if (!userId) throw new Error("Not authenticated");

    const doc = await ctx.db.get(args.investmentId);
    if (!doc) throw new Error("Investissement introuvable");
    if (doc.userId !== userId) throw new Error("Not authorized");

    const input = sanitizeInput(doc.input);
    const analysis = computeInvestmentAnalysis(input);

    await ctx.db.patch(args.investmentId, {
      ...toRecord(userId, input, analysis),
      updatedAt: Date.now(),
    });

    return { investmentId: args.investmentId, analysis };
  },
});

// Récupérer une analyse (propriétaire uniquement)
export const getInvestment = query({
  args: { investmentId: v.id("investments") },
  handler: async (ctx: Ctx, args) => {
    const userId = await getAuthUserId(ctx as any);
    if (!userId) return null;

    const doc = await ctx.db.get(args.investmentId);
    if (!doc || doc.userId !== userId) return null;
    return doc;
  },
});

// Lister les analyses de l'utilisateur
export const getUserInvestments = query({
  args: {},
  handler: async (ctx: Ctx) => {
    const userId = await getAuthUserId(ctx as any);
    if (!userId) return [];

    return ctx.db
      .query("investments")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

// Supprimer une analyse (propriétaire uniquement)
export const deleteInvestment = mutation({
  args: { investmentId: v.id("investments") },
  handler: async (ctx: Ctx, args) => {
    const userId = await getAuthUserId(ctx as any);
    if (!userId) throw new Error("Not authenticated");

    const doc = await ctx.db.get(args.investmentId);
    if (!doc) throw new Error("Investissement introuvable");
    if (doc.userId !== userId) throw new Error("Not authorized");

    await ctx.db.delete(args.investmentId);
    return { success: true };
  },
});
