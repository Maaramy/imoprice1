import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Generate a share token for an estimation report
export const createShareToken = mutation({
  args: {
    estimationId: v.id("estimations"),
    propertyId: v.id("properties"),
    expiresInDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const estimation = await ctx.db.get(args.estimationId);
    if (!estimation) throw new Error("Estimation not found");
    if (estimation.userId !== userId) throw new Error("Not authorized");

    // Generate a random token (using math random since we can't use crypto easily in Convex)
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let token = "";
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const expiresAt = args.expiresInDays
      ? Date.now() + args.expiresInDays * 24 * 60 * 60 * 1000
      : undefined;

    await ctx.db.insert("sharedReports", {
      estimationId: args.estimationId,
      propertyId: args.propertyId,
      userId,
      token,
      createdAt: Date.now(),
      expiresAt,
    });

    return token;
  },
});

// Get shared report by token (public - no auth required)
export const getSharedReport = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const reports = await ctx.db
      .query("sharedReports")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .take(1);

    const report = reports[0];
    if (!report) return null;

    // Check expiry
    if (report.expiresAt && Date.now() > report.expiresAt) return null;

    const estimation = await ctx.db.get(report.estimationId);
    const property = await ctx.db.get(report.propertyId);

    if (!estimation || !property) return null;

    return { estimation, property, report };
  },
});

// Get user's shared reports
export const getUserSharedReports = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const reports = await ctx.db
      .query("sharedReports")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    const enriched = await Promise.all(
      reports.map(async (r) => {
        const estimation = await ctx.db.get(r.estimationId);
        const property = await ctx.db.get(r.propertyId);
        return { ...r, estimation, property };
      }),
    );

    return enriched;
  },
});
