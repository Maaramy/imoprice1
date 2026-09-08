/**
 * Site-wide settings — configuration that the admin can edit at runtime
 * (bank coordinates, D17 details, plan overrides, market engine config).
 * Stored as a single document in the `siteSettings` table with key "main".
 */
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import {
  DEFAULT_BANK_DETAILS,
  DEFAULT_D17_DETAILS,
  PLANS,
  type PlanId,
} from "./defaults";

const SETTINGS_KEY = "main";

/** Internal: fetch the settings document (or null). */
export const getSettingsDoc = async (ctx: Pick<QueryCtx, "db">) => {
  return ctx.db
    .query("siteSettings")
    .withIndex("by_key", (q) => q.eq("key", SETTINGS_KEY))
    .first();
};

/** Internal: merge admin plan overrides on top of the default plans. */
export const getPlansWithOverrides = async (ctx: Pick<QueryCtx, "db">) => {
  const doc = await getSettingsDoc(ctx);
  const overrides = (doc?.planOverrides ?? {}) as Partial<
    Record<PlanId, { price?: number; estimations?: number; trialDays?: number; name?: string; description?: string }>
  >;

  const plans = { ...PLANS } as Record<
    PlanId,
    { [K in keyof typeof PLANS[PlanId]]: typeof PLANS[PlanId][K] }
  >;
  for (const id of Object.keys(PLANS) as PlanId[]) {
    const ov = overrides[id];
    if (!ov) continue;
    plans[id] = {
      ...plans[id],
      ...(ov.price !== undefined ? { price: ov.price } : {}),
      ...(ov.estimations !== undefined ? { estimations: ov.estimations } : {}),
      ...(ov.trialDays !== undefined ? { trialDays: ov.trialDays } : {}),
      ...(ov.name !== undefined ? { name: ov.name } : {}),
      ...(ov.description !== undefined ? { description: ov.description } : {}),
    } as typeof PLANS[PlanId];
  }
  return plans;
};

/** Internal: effective bank details (admin overrides applied). */
export const getBankDetails = async (ctx: Pick<QueryCtx, "db">) => {
  const doc = await getSettingsDoc(ctx);
  return (doc?.bankDetails ?? DEFAULT_BANK_DETAILS) as typeof DEFAULT_BANK_DETAILS;
};

/** Internal: effective D17 details (admin overrides applied). */
export const getD17Details = async (ctx: Pick<QueryCtx, "db">) => {
  const doc = await getSettingsDoc(ctx);
  return (doc?.d17Details ?? DEFAULT_D17_DETAILS) as typeof DEFAULT_D17_DETAILS;
};

/**
 * Public settings used by the Pricing page and the estimation flow:
 * bank coordinates, D17 details and the effective plan catalog.
 */
export const getPublicSettings = query({
  args: {},
  handler: async (ctx) => {
    const [bankDetails, d17Details, plans] = await Promise.all([
      getBankDetails(ctx),
      getD17Details(ctx),
      getPlansWithOverrides(ctx),
    ]);
    return { bankDetails, d17Details, plans };
  },
});

/** Admin: full settings (including market engine config). */
export const getAdminSettings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non authentifié");
    const user = await ctx.db.get(userId);
    if (user?.role !== "admin") throw new Error("Accès réservé aux administrateurs");

    const doc = await getSettingsDoc(ctx);
    return {
      bankDetails: doc?.bankDetails ?? DEFAULT_BANK_DETAILS,
      d17Details: doc?.d17Details ?? DEFAULT_D17_DETAILS,
      planOverrides: doc?.planOverrides ?? {},
      marketConfig: doc?.marketConfig ?? {},
      updatedAt: doc?.updatedAt ?? null,
    };
  },
});

/** Admin: update any part of the site configuration. */
export const updateSettings = mutation({
  args: {
    bankDetails: v.optional(
      v.object({
        beneficiary: v.string(),
        bank: v.string(),
        agency: v.string(),
        rib: v.string(),
        swift: v.string(),
        reason: v.string(),
      }),
    ),
    d17Details: v.optional(
      v.object({
        beneficiary: v.string(),
        ccp: v.string(),
        center: v.string(),
        reason: v.string(),
      }),
    ),
    planOverrides: v.optional(v.any()),
    marketConfig: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non authentifié");
    const user = await ctx.db.get(userId);
    if (user?.role !== "admin") throw new Error("Accès réservé aux administrateurs");

    const doc = await getSettingsDoc(ctx);
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.bankDetails !== undefined) patch.bankDetails = args.bankDetails;
    if (args.d17Details !== undefined) patch.d17Details = args.d17Details;
    if (args.planOverrides !== undefined) patch.planOverrides = args.planOverrides;
    if (args.marketConfig !== undefined) patch.marketConfig = args.marketConfig;

    if (doc) {
      await ctx.db.patch(doc._id, patch);
    } else {
      await ctx.db.insert("siteSettings", {
        key: SETTINGS_KEY,
        bankDetails: args.bankDetails,
        d17Details: args.d17Details,
        planOverrides: args.planOverrides,
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
