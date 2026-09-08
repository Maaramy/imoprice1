import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { computeRentEstimation, type RentMarketConfig } from "../lib/rent-estimation";
import { getMarketConfig } from "./estimation";

type Ctx = { db: any };

/** Load the admin market overrides (if any) for the rent engine. */
async function getRentMarketConfig(ctx: Ctx): Promise<RentMarketConfig | undefined> {
  const doc = await getMarketConfig(ctx);
  return (doc?.rent as RentMarketConfig | undefined) ?? (doc as RentMarketConfig | undefined);
}

// Mutation: run a rent estimation on a rental property snapshot
export const createRentEstimation = mutation({
  args: {
    property: v.any(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const property = args.property as Record<string, unknown>;
    if (!property || typeof property !== "object") throw new Error("Invalid property");
    if (!property.gouvernorat) throw new Error("Le gouvernorat est requis");
    if (!property.propertyType) throw new Error("Le type de bien est requis");

    const marketConfig = await getRentMarketConfig(ctx);
    const result = computeRentEstimation(property as Parameters<typeof computeRentEstimation>[0], marketConfig);

    const rentId = await ctx.db.insert("rentEstimations", {
      userId,
      property,
      estimatedRent: result.estimatedRent,
      rentMin: result.rentMin,
      rentMax: result.rentMax,
      rentPerSqm: result.rentPerSqm,
      confidenceIndex: result.confidenceIndex,
      avgRentalDurationMonths: result.avgRentalDurationMonths,
      annualRent: result.annualRent,
      grossYield: result.grossYield,
      saleValue: result.saleValue,
      forecast: result.forecast,
      forecastSummary: result.forecastSummary,
      marketAverages: result.marketAverages,
      comparableRentals: result.comparableRentals,
      positiveFactors: result.positiveFactors,
      negativeFactors: result.negativeFactors,
      improvementSuggestions: result.improvementSuggestions,
      advisor: result.advisor,
      zoneProfile: result.zoneProfile,
      nightly: result.nightly,
      createdAt: Date.now(),
    });

    return { estimationId: rentId, result };
  },
});

// Re-estimate an existing rent estimation with the latest market data.
// Ajoute un point d'historique dans property.history pour le suivi de valeur.
export const reEstimateRent = mutation({
  args: {
    estimationId: v.id("rentEstimations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const estimation = await ctx.db.get(args.estimationId);
    if (!estimation) throw new Error("Estimation not found");
    if (estimation.userId !== userId) throw new Error("Not authorized");

    const property = (estimation.property || {}) as Record<string, unknown>;
    if (!property.gouvernorat || !property.propertyType) {
      throw new Error("Bien incomplet — impossible de re-estimer");
    }

    const marketConfig = await getRentMarketConfig(ctx);
    const result = computeRentEstimation(property as Parameters<typeof computeRentEstimation>[0], marketConfig);

    const history = Array.isArray(property.history)
      ? (property.history as unknown[])
      : [];
    const nextProperty = {
      ...property,
      history: [...history, { estimatedRent: result.estimatedRent, createdAt: Date.now() }].slice(-24),
    };

    await ctx.db.patch(args.estimationId, {
      property: nextProperty,
      estimatedRent: result.estimatedRent,
      rentMin: result.rentMin,
      rentMax: result.rentMax,
      rentPerSqm: result.rentPerSqm,
      confidenceIndex: result.confidenceIndex,
      avgRentalDurationMonths: result.avgRentalDurationMonths,
      annualRent: result.annualRent,
      grossYield: result.grossYield,
      saleValue: result.saleValue,
      forecast: result.forecast,
      forecastSummary: result.forecastSummary,
      marketAverages: result.marketAverages,
      comparableRentals: result.comparableRentals,
      positiveFactors: result.positiveFactors,
      negativeFactors: result.negativeFactors,
      improvementSuggestions: result.improvementSuggestions,
      advisor: result.advisor,
      zoneProfile: result.zoneProfile,
      nightly: result.nightly,
      createdAt: Date.now(),
    });

    return { estimationId: args.estimationId, result };
  },
});

// Get a single rent estimation (owner only)
export const getRentEstimation = query({
  args: {
    estimationId: v.id("rentEstimations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const estimation = await ctx.db.get(args.estimationId);
    if (!estimation) return null;
    if (estimation.userId !== userId) return null;

    return { ...estimation, property: estimation.property };
  },
});

// Get all rent estimations for the current user
export const getUserRentEstimations = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return ctx.db
      .query("rentEstimations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

// Delete a rent estimation (owner only)
export const deleteRentEstimation = mutation({
  args: {
    estimationId: v.id("rentEstimations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const estimation = await ctx.db.get(args.estimationId);
    if (!estimation) throw new Error("Estimation not found");
    if (estimation.userId !== userId) throw new Error("Not authorized");

    await ctx.db.delete(args.estimationId);
    return { success: true };
  },
});
