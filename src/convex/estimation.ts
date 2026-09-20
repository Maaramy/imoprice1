import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { computeEnhancedEstimation } from "../lib/enhanced-estimation";
import { getSettingsDoc } from "./settings";

/** Ajoute un point au suivi de valeur du bien (historique borné à 24 points). */
/* eslint-disable @typescript-eslint/no-explicit-any -- helpers génériques sur le schéma dynamique, convention existante du fichier */
async function appendValuationHistory(
  ctx: { db: any },
  propertyId: any,
  value: number,
) {
  const property = await ctx.db.get(propertyId);
  if (!property) return;
  const history = Array.isArray(property.valuationHistory) ? property.valuationHistory : [];
  const next = [...history, { value, createdAt: Date.now() }].slice(-24);
  await ctx.db.patch(propertyId, { valuationHistory: next });
}

/** Load the admin market overrides (if any) for the estimation engine. */
export async function getMarketConfig(ctx: { db: any }) {
  const doc = await getSettingsDoc(ctx);
  return (doc?.marketConfig as Record<string, unknown> | undefined) ?? undefined;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// Mutation: Run estimation on a property using the BIM Engine
export const estimateProperty = mutation({
  args: {
    propertyId: v.id("properties"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const property = await ctx.db.get(args.propertyId);
    if (!property) throw new Error("Property not found");
    if (property.userId !== userId) throw new Error("Not authorized");

    const marketConfig = await getMarketConfig(ctx);
    const result = computeEnhancedEstimation(property, marketConfig);

    // Update property with estimation results
    await ctx.db.patch(args.propertyId, {
      estimatedValue: result.estimatedValue,
      priceMin: result.priceMin,
      priceMax: result.priceMax,
      fastSalePrice: result.fastSalePrice,
      maxProfitPrice: result.maxProfitPrice,
      confidenceIndex: result.confidenceIndex,
      avgPricePerSqm: result.avgPricePerSqm,
      updatedAt: Date.now(),
    });
    // Suivi de la valeur au fil du temps
    await appendValuationHistory(ctx, args.propertyId, result.estimatedValue);

    // Save estimation history
    const estimationId = await ctx.db.insert("estimations", {
      propertyId: args.propertyId,
      userId,
      estimatedValue: result.estimatedValue,
      priceMin: result.priceMin,
      priceMax: result.priceMax,
      fastSalePrice: result.fastSalePrice,
      maxProfitPrice: result.maxProfitPrice,
      avgPricePerSqm: result.avgPricePerSqm,
      confidenceIndex: result.confidenceIndex,
      valueYear1: result.valueYear1,
      valueYear3: result.valueYear3,
      valueYear5: result.valueYear5,
      positiveFactors: result.positiveFactors,
      negativeFactors: result.negativeFactors,
      improvementSuggestions: result.improvementSuggestions,
      comparableProperties: result.comparableProperties,
      createdAt: Date.now(),
    });

    return { estimationId, result };
  },
});

// Re-estimate (update existing estimation with new market data)
export const reEstimateProperty = mutation({
  args: {
    propertyId: v.id("properties"),
    estimationId: v.id("estimations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const property = await ctx.db.get(args.propertyId);
    if (!property) throw new Error("Property not found");
    if (property.userId !== userId) throw new Error("Not authorized");

    const marketConfig = await getMarketConfig(ctx);
    const result = computeEnhancedEstimation(property, marketConfig);

    // Update property
    await ctx.db.patch(args.propertyId, {
      estimatedValue: result.estimatedValue,
      priceMin: result.priceMin,
      priceMax: result.priceMax,
      fastSalePrice: result.fastSalePrice,
      maxProfitPrice: result.maxProfitPrice,
      confidenceIndex: result.confidenceIndex,
      avgPricePerSqm: result.avgPricePerSqm,
      updatedAt: Date.now(),
    });
    // Suivi de la valeur : chaque re-estimation ajoute un point d'historique
    await appendValuationHistory(ctx, args.propertyId, result.estimatedValue);

    // Update estimation record
    await ctx.db.replace(args.estimationId, {
      propertyId: args.propertyId,
      userId,
      estimatedValue: result.estimatedValue,
      priceMin: result.priceMin,
      priceMax: result.priceMax,
      fastSalePrice: result.fastSalePrice,
      maxProfitPrice: result.maxProfitPrice,
      avgPricePerSqm: result.avgPricePerSqm,
      confidenceIndex: result.confidenceIndex,
      valueYear1: result.valueYear1,
      valueYear3: result.valueYear3,
      valueYear5: result.valueYear5,
      positiveFactors: result.positiveFactors,
      negativeFactors: result.negativeFactors,
      improvementSuggestions: result.improvementSuggestions,
      comparableProperties: result.comparableProperties,
      createdAt: Date.now(),
    });

    return { result };
  },
});

// Get estimation result for a property (includes enriched property data)
export const getEstimation = query({
  args: {
    estimationId: v.id("estimations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const estimation = await ctx.db.get(args.estimationId);
    if (!estimation) return null;
    if (estimation.userId !== userId) return null;

    // Enrich with property data (same as getUserEstimations)
    const property = await ctx.db.get(estimation.propertyId);

    return { ...estimation, property };
  },
});

// Get latest estimation for a property
export const getLatestEstimation = query({
  args: {
    propertyId: v.id("properties"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const property = await ctx.db.get(args.propertyId);
    if (!property) return null;
    if (property.userId !== userId) return null;

    const estimations = await ctx.db
      .query("estimations")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .order("desc")
      .take(1);

    return estimations[0] || null;
  },
});

// Get all estimations for the current user
export const getUserEstimations = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const estimations = await ctx.db
      .query("estimations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    // Enrich with property data
    const enriched = await Promise.all(
      estimations.map(async (est) => {
        const property = await ctx.db.get(est.propertyId);
        return { ...est, property };
      }),
    );

    return enriched;
  },
});

// Supprimer une estimation (propriétaire uniquement).
export const deleteEstimation = mutation({
  args: { estimationId: v.id("estimations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const estimation = await ctx.db.get(args.estimationId);
    if (!estimation || estimation.userId !== userId) {
      throw new Error("Estimation introuvable");
    }
    await ctx.db.delete(args.estimationId);
    return { success: true };
  },
});

// Historique de valeur d'un bien : les points enregistrés par le BIM Engine
// à chaque estimation/re-estimation (fallback : les estimations existantes).
export const getPropertyHistory = query({
  args: {
    propertyId: v.id("properties"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { history: [] };

    const property = await ctx.db.get(args.propertyId);
    if (!property || property.userId !== userId) return { history: [] };

    if (Array.isArray(property.valuationHistory) && property.valuationHistory.length > 0) {
      return { history: property.valuationHistory };
    }

    // Fallback pour les biens créés avant cette fonctionnalité
    const estimations = await ctx.db
      .query("estimations")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .order("asc")
      .collect();
    return {
      history: estimations.map((e) => ({ value: e.estimatedValue, createdAt: e.createdAt })),
    };
  },
});
