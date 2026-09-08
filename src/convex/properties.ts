import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc } from "./_generated/dataModel";

// Génère une URL d'upload courte durée pour le stockage Convex
// (utilisée par l'application mobile pour l'envoi de photos).
export const getUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

// Create a property
export const createProperty = mutation({
  args: {
    address: v.optional(v.string()),
    gouvernorat: v.string(),
    ville: v.string(),
    quartier: v.string(),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    propertyType: v.string(),
    terrainSurface: v.optional(v.number()),
    builtSurface: v.number(),
    floors: v.optional(v.number()),
    bedrooms: v.optional(v.number()),
    bathrooms: v.optional(v.number()),
    kitchens: v.optional(v.number()),
    livingRooms: v.optional(v.number()),
    garages: v.optional(v.number()),
    hasGarden: v.boolean(),
    hasPool: v.boolean(),
    hasTerrace: v.boolean(),
    hasBalcony: v.boolean(),
    hasElevator: v.boolean(),
    hasParking: v.boolean(),
    hasAC: v.boolean(),
    hasHeating: v.boolean(),
    hasSolar: v.boolean(),
    yearBuilt: v.optional(v.number()),
    generalState: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const now = Date.now();

    const propertyId = await ctx.db.insert("properties", {
      userId,
      ...args,
      propertyType: args.propertyType as any,
      generalState: args.generalState as any,
      photoIds: undefined,
      videoUrl: undefined,
      architecturalPlanId: undefined,
      deedId: undefined,
      cadastralPlanId: undefined,
      certificateId: undefined,
      estimatedValue: undefined,
      priceMin: undefined,
      priceMax: undefined,
      fastSalePrice: undefined,
      maxProfitPrice: undefined,
      confidenceIndex: undefined,
      avgPricePerSqm: undefined,
      published: false,
      createdAt: now,
      updatedAt: now,
    });

    return propertyId;
  },
});

// Update a property
export const updateProperty = mutation({
  args: {
    propertyId: v.id("properties"),
    address: v.optional(v.string()),
    gouvernorat: v.optional(v.string()),
    ville: v.optional(v.string()),
    quartier: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    propertyType: v.optional(v.string()),
    terrainSurface: v.optional(v.number()),
    builtSurface: v.optional(v.number()),
    floors: v.optional(v.number()),
    bedrooms: v.optional(v.number()),
    bathrooms: v.optional(v.number()),
    kitchens: v.optional(v.number()),
    livingRooms: v.optional(v.number()),
    garages: v.optional(v.number()),
    hasGarden: v.optional(v.boolean()),
    hasPool: v.optional(v.boolean()),
    hasTerrace: v.optional(v.boolean()),
    hasBalcony: v.optional(v.boolean()),
    hasElevator: v.optional(v.boolean()),
    hasParking: v.optional(v.boolean()),
    hasAC: v.optional(v.boolean()),
    hasHeating: v.optional(v.boolean()),
    hasSolar: v.optional(v.boolean()),
    yearBuilt: v.optional(v.number()),
    generalState: v.optional(v.string()),
    photoIds: v.optional(v.array(v.string())),
    videoUrl: v.optional(v.string()),
    architecturalPlanId: v.optional(v.string()),
    deedId: v.optional(v.string()),
    cadastralPlanId: v.optional(v.string()),
    certificateId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const { propertyId, ...fields } = args;
    const property = await ctx.db.get(propertyId);
    if (!property) throw new Error("Property not found");
    if (property.userId !== userId) throw new Error("Not authorized");

    const updateFields: Record<string, unknown> = { ...fields, updatedAt: Date.now() };
    // Remove undefined values
    Object.keys(updateFields).forEach((key) => {
      if (updateFields[key] === undefined) delete updateFields[key];
    });

    await ctx.db.patch(propertyId, updateFields as any);
    return propertyId;
  },
});

// Delete a property
export const deleteProperty = mutation({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const property = await ctx.db.get(args.propertyId);
    if (!property) throw new Error("Property not found");
    if (property.userId !== userId) throw new Error("Not authorized");

    await ctx.db.delete(args.propertyId);
  },
});

// Get a single property
export const getProperty = query({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const property = await ctx.db.get(args.propertyId);
    if (!property) return null;
    if (property.userId !== userId) return null;

    return property;
  },
});

// Get all properties for the current user
export const getUserProperties = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const properties = await ctx.db
      .query("properties")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    return properties;
  },
});

// Get published properties (for browsing)
export const getPublishedProperties = query({
  args: {
    gouvernorat: v.optional(v.string()),
    propertyType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const properties = await ctx.db
      .query("properties")
      .withIndex("by_published", (q) => q.eq("published", true))
      .order("desc")
      .take(args.limit || 20);

    const enriched = await Promise.all(
      properties.map(async (p) => {
        const user = await ctx.db.get(p.userId);
        const listing = await ctx.db
          .query("listings")
          .withIndex("by_user", (q) => q.eq("userId", p.userId))
          .first();
        return { ...p, owner: user, listing };
      }),
    );

    let filtered = enriched;
    if (args.gouvernorat) {
      filtered = filtered.filter((p) => p.gouvernorat === args.gouvernorat);
    }
    if (args.propertyType) {
      filtered = filtered.filter((p) => p.propertyType === args.propertyType);
    }

    return filtered;
  },
});
