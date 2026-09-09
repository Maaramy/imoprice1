/**
 * Admin module — platform management (stats, users, subscriptions, agencies,
 * estimations). Every function is guarded by an admin role check.
 */
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, internalMutation, query, QueryCtx } from "./_generated/server";
import { v } from "convex/values";

/** Guard: throw unless the current user is an admin. */
export const requireAdmin = async (ctx: Pick<QueryCtx, "db">) => {
  const userId = await getAuthUserId(ctx as QueryCtx);
  if (!userId) throw new Error("Non authentifié");
  const user = await ctx.db.get(userId);
  if (!user || user.role !== "admin") {
    throw new Error("Accès réservé aux administrateurs");
  }
  return userId;
};

/** Current user is an admin? (public-safe) */
export const isAdmin = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;
    const user = await ctx.db.get(userId);
    return user?.role === "admin";
  },
});

/** Public-safe: does at least one admin exist? (drives the admin signup form) */
export const adminExists = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.some((u) => u.role === "admin");
  },
});

/**
 * Bootstrap: promote the current user to admin when no admin exists yet.
 * Allows the very first user to set up the platform.
 */
export const bootstrapAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non authentifié");

    const users = await ctx.db.query("users").collect();
    const existingAdmin = users.some((u) => u.role === "admin");
    if (existingAdmin) {
      const me = await ctx.db.get(userId);
      if (me?.role !== "admin") throw new Error("Un administrateur existe déjà");
      return { success: true, alreadyAdmin: true };
    }

    await ctx.db.patch(userId, { role: "admin" });
    return { success: true, alreadyAdmin: false };
  },
});

/**
 * Recovery: if every admin account is lost, a user whose email matches the
 * ADMIN_EMAIL environment variable can reclaim the admin role — even when an
 * admin already exists. The check runs server-side (process.env), so it
 * cannot be spoofed from the client.
 */
export const claimAdminByEmail = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non authentifié");

    const authorized = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
    if (!authorized) {
      throw new Error(
        "Récupération non configurée : la variable ADMIN_EMAIL est absente",
      );
    }

    const user = await ctx.db.get(userId);
    if (!user || (user.email ?? "").trim().toLowerCase() !== authorized) {
      throw new Error(
        "Votre e-mail ne correspond pas à l'e-mail admin de secours (ADMIN_EMAIL)",
      );
    }

    await ctx.db.patch(userId, { role: "admin" });
    return { success: true };
  },
});

/**
 * INTERNAL reset: promote a user to admin by email.
 *
 * This function is *internal* — it is NOT exposed to the client API, so it
 * cannot be called from the browser. It is meant to be invoked from the CLI
 * as an admin recovery path, independent of the ADMIN_EMAIL env var:
 *
 *   npx convex run internal:admin.resetAdminByEmail --args '{"email":"..."}'
 *
 * or through scripts/reset-admin.ts (which also supports --prod and the
 * CONVEX_DEPLOY_KEY env var for CI).
 */
export const resetAdminByEmail = internalMutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (!email) throw new Error("E-mail vide");

    const users = await ctx.db.query("users").collect();
    const target = users.find(
      (u) => (u.email ?? "").trim().toLowerCase() === email,
    );
    if (!target) {
      throw new Error(
        `Aucun utilisateur trouvé avec l'e-mail ${args.email}`,
      );
    }

    await ctx.db.patch(target._id, { role: "admin" });
    return {
      success: true,
      userId: target._id,
      email: target.email ?? args.email,
      wasAlreadyAdmin: target.role === "admin",
    };
  },
});

/** Global statistics for the admin overview. */
export const getAdminStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const [users, properties, estimations, partners, requests] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("properties").collect(),
      ctx.db.query("estimations").collect(),
      ctx.db.query("professionalPartners").collect(),
      ctx.db.query("agencyRequests").collect(),
    ]);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const estimationsThisMonth = estimations.filter((e) => e.createdAt >= monthStart).length;
    const newUsersThisMonth = users.filter(
      (u) => u._creationTime >= monthStart,
    ).length;

    return {
      users: users.length,
      newUsersThisMonth,
      properties: properties.length,
      estimations: estimations.length,
      estimationsThisMonth,
      agencies: partners.filter((p) => p.type === "agence").length,
      agencyRequests: requests.length,
    };
  },
});

/** Admin: list all users with their latest subscription. */
export const listUsers = query({
  args: {
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const users = await ctx.db.query("users").collect();
    const estimations = await ctx.db.query("estimations").collect();

    const estCount = new Map<string, number>();
    for (const e of estimations) {
      estCount.set(e.userId, (estCount.get(e.userId) ?? 0) + 1);
    }

    const search = (args.search ?? "").trim().toLowerCase();
    const result = users
      .map((u) => {
        return {
          _id: u._id,
          name: u.name ?? "",
          email: u.email ?? "",
          phone: u.phone ?? "",
          image: u.image ?? null,
          role: u.role ?? "user",
          createdAt: u._creationTime,
          estimationsCount: estCount.get(u._id) ?? 0,
        };
      })
      .filter(
        (u) =>
          !search ||
          u.name.toLowerCase().includes(search) ||
          (u.email ?? "").toLowerCase().includes(search) ||
          (u.phone ?? "").toLowerCase().includes(search),
      )
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, args.limit ?? 200);

    return result;
  },
});

/** Admin: change a user's role. */
export const setUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("user"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    const adminId = await requireAdmin(ctx);
    if (adminId === args.userId) {
      throw new Error("Vous ne pouvez pas modifier votre propre rôle");
    }
    await ctx.db.patch(args.userId, { role: args.role });
    return { success: true };
  },
});

/** Admin: delete a user and all their related data. */
export const deleteUser = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const adminId = await requireAdmin(ctx);
    if (adminId === args.userId) throw new Error("Vous ne pouvez pas supprimer votre propre compte");

    const [properties, estimations, listings, requests, reports, partners] = await Promise.all([
      ctx.db.query("properties").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect(),
      ctx.db.query("estimations").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect(),
      ctx.db.query("listings").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect(),
      ctx.db.query("agencyRequests").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect(),
      ctx.db.query("sharedReports").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect(),
      ctx.db.query("professionalPartners").filter((q) => q.eq(q.field("userId"), args.userId)).collect(),
    ]);

    for (const item of [...properties, ...estimations, ...listings, ...requests, ...reports, ...partners]) {
      await ctx.db.delete(item._id);
    }
    await ctx.db.delete(args.userId);
    return { success: true, deleted: 1 + properties.length + estimations.length + listings.length + requests.length + reports.length + partners.length };
  },
});

/** Admin: list all agency partners. */
export const listAgencies = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const partners = await ctx.db
      .query("professionalPartners")
      .withIndex("by_type", (q) => q.eq("type", "agence"))
      .collect();

    return partners.map((p) => ({
      _id: p._id,
      name: p.name,
      email: p.email,
      phone: p.phone,
      regions: p.regions ?? [],
      specialties: p.specialties ?? [],
      isSubscribed: p.isSubscribed,
      logoUrl: p.logoUrl ?? null,
      userId: p.userId ?? null,
      createdAt: p._creationTime,
    }));
  },
});

/** Admin: toggle an agency's subscription status (visibility on the platform). */
export const toggleAgencyStatus = mutation({
  args: {
    partnerId: v.id("professionalPartners"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const partner = await ctx.db.get(args.partnerId);
    if (!partner) throw new Error("Agence introuvable");
    await ctx.db.patch(args.partnerId, { isSubscribed: !partner.isSubscribed });
    return { success: true, isSubscribed: !partner.isSubscribed };
  },
});

/** Admin: delete an agency partner. */
export const deleteAgency = mutation({
  args: {
    partnerId: v.id("professionalPartners"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const requests = await ctx.db
      .query("agencyRequests")
      .withIndex("by_agency", (q) => q.eq("agencyPartnerId", args.partnerId))
      .collect();
    for (const r of requests) await ctx.db.delete(r._id);
    await ctx.db.delete(args.partnerId);
    return { success: true };
  },
});

/** Admin: list all estimations with property + user context. */
export const listEstimations = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const estimations = await ctx.db.query("estimations").order("desc").collect();
    const result = await Promise.all(
      estimations.slice(0, args.limit ?? 200).map(async (e) => {
        const [user, property] = await Promise.all([
          ctx.db.get(e.userId),
          ctx.db.get(e.propertyId),
        ]);
        return {
          _id: e._id,
          userId: e.userId,
          userEmail: user?.email ?? "—",
          userName: user?.name ?? "—",
          propertyType: property?.propertyType ?? null,
          gouvernorat: property?.gouvernorat ?? null,
          ville: property?.ville ?? null,
          builtSurface: property?.builtSurface ?? null,
          estimatedValue: e.estimatedValue,
          priceMin: e.priceMin,
          priceMax: e.priceMax,
          confidenceIndex: e.confidenceIndex,
          createdAt: e.createdAt,
        };
      }),
    );
    return result;
  },
});

/** Admin: delete an estimation record. */
export const deleteEstimation = mutation({
  args: {
    estimationId: v.id("estimations"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.estimationId);
    return { success: true };
  },
});
