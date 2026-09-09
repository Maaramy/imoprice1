/**
 * Site-wide settings — configuration that the admin can edit at runtime
 * (market engine config: base prices, multipliers, feature values).
 * Stored as a single document in the `siteSettings` table with key "main".
 */
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query, QueryCtx } from "./_generated/server";
import { v } from "convex/values";

const SETTINGS_KEY = "main";

/** Internal: fetch the settings document (or null). */
export const getSettingsDoc = async (ctx: Pick<QueryCtx, "db">) => {
  return ctx.db
    .query("siteSettings")
    .withIndex("by_key", (q) => q.eq("key", SETTINGS_KEY))
    .first();
};

/** Admin: full settings (market engine config). */
export const getAdminSettings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non authentifié");
    const user = await ctx.db.get(userId);
    if (user?.role !== "admin") throw new Error("Accès réservé aux administrateurs");

    const doc = await getSettingsDoc(ctx);
    return {
      marketConfig: doc?.marketConfig ?? {},
      updatedAt: doc?.updatedAt ?? null,
    };
  },
});

/** Admin: update any part of the site configuration. */
export const updateSettings = mutation({
  args: {
    marketConfig: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non authentifié");
    const user = await ctx.db.get(userId);
    if (user?.role !== "admin") throw new Error("Accès réservé aux administrateurs");

    const doc = await getSettingsDoc(ctx);
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.marketConfig !== undefined) patch.marketConfig = args.marketConfig;

    if (doc) {
      await ctx.db.patch(doc._id, patch);
    } else {
      await ctx.db.insert("siteSettings", {
        key: SETTINGS_KEY,
        marketConfig: args.marketConfig,
        updatedAt: Date.now(),
      } as any);
    }
    return { success: true };
  },
});

/** Admin: reset the site configuration back to default values. */
export const resetSettings = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non authentifié");
    const user = await ctx.db.get(userId);
    if (user?.role !== "admin") throw new Error("Accès réservé aux administrateurs");

    const doc = await getSettingsDoc(ctx);
    if (doc) await ctx.db.delete(doc._id);
    return { success: true };
  },
});