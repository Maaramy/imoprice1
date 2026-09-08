import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getBasePrice } from "../lib/enhanced-estimation";
import { getMarketConfig } from "./estimation";
import { internal } from "./_generated/api";

/**
 * Alertes prix du marché.
 *
 * L'utilisateur crée une alerte sur le prix / m² d'un gouvernorat (et d'un type
 * de bien). Un cron quotidien (voir crons.ts) appelle checkPriceAlerts : quand
 * le prix du marché franchit la cible, l'alerte est marquée « déclenchée »,
 * un message est ajouté à la boîte de réception et un email est programmé.
 */

export const createPriceAlert = mutation({
  args: {
    gouvernorat: v.string(),
    propertyType: v.optional(v.string()),
    direction: v.union(v.literal("above"), v.literal("below")),
    targetPrice: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non authentifié");

    const gouvernorat = args.gouvernorat.trim();
    if (!gouvernorat) throw new Error("Le gouvernorat est requis");
    if (!args.targetPrice || args.targetPrice <= 0) throw new Error("Le prix cible doit être supérieur à zéro");

    const propertyType = args.propertyType || "appartement";
    const marketConfig = await getMarketConfig(ctx);
    const current = getBasePrice(gouvernorat, propertyType, marketConfig as any);

    // Évite les doublons : une alerte active identique existe déjà
    const existing = await ctx.db
      .query("priceAlerts")
      .withIndex("by_user_triggered", (q) => q.eq("userId", userId).eq("triggered", false))
      .collect();
    const dup = existing.find(
      (a) =>
        a.gouvernorat === gouvernorat &&
        (a.propertyType || "appartement") === propertyType &&
        a.direction === args.direction,
    );
    if (dup) {
      // Mise à jour de la cible plutôt qu'un doublon
      await ctx.db.patch(dup._id, {
        targetPrice: args.targetPrice,
        basePriceAtCreation: current,
        createdAt: Date.now(),
        triggered: false,
        triggeredAt: undefined,
      });
      return { alertId: dup._id, current, updated: true };
    }

    const alertId = await ctx.db.insert("priceAlerts", {
      userId,
      gouvernorat,
      propertyType: args.propertyType,
      direction: args.direction,
      targetPrice: args.targetPrice,
      basePriceAtCreation: current,
      triggered: false,
      createdAt: Date.now(),
    });
    return { alertId, current, updated: false };
  },
});

export const deletePriceAlert = mutation({
  args: { alertId: v.id("priceAlerts") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non authentifié");
    const alert = await ctx.db.get(args.alertId);
    if (!alert) throw new Error("Alerte introuvable");
    if (alert.userId !== userId) throw new Error("Non autorisé");
    await ctx.db.delete(args.alertId);
    return { success: true };
  },
});

/** Mes alertes, enrichies du prix / m² actuel du marché. */
export const getMyPriceAlerts = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const alerts = await ctx.db
      .query("priceAlerts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    const marketConfig = await getMarketConfig(ctx);
    return alerts.map((a) => ({
      ...a,
      propertyType: a.propertyType || "appartement",
      currentPrice: getBasePrice(a.gouvernorat, a.propertyType || "appartement", marketConfig as any),
    }));
  },
});

/**
 * Vérifie toutes les alertes actives et déclenche celles dont la cible est
 * atteinte. Appelé quotidiennement par le cron — peut aussi être appelé à la
 * main depuis l'admin.
 */
export const checkPriceAlerts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const marketConfig = await getMarketConfig(ctx);
    const alerts = await ctx.db
      .query("priceAlerts")
      .withIndex("by_triggered", (q) => q.eq("triggered", false))
      .collect();

    let triggered = 0;
    const now = Date.now();
    for (const alert of alerts) {
      const current = getBasePrice(alert.gouvernorat, alert.propertyType || "appartement", marketConfig as any);
      await ctx.db.patch(alert._id, { lastCheckedAt: now });

      const isAbove = alert.direction === "above" && current >= alert.targetPrice;
      const isBelow = alert.direction === "below" && current <= alert.targetPrice;
      if (!isAbove && !isBelow) continue;

      await ctx.db.patch(alert._id, { triggered: true, triggeredAt: now });

      // Notification dans la boîte de réception
      const label = alert.propertyType || "appartement";
      const wording =
        alert.direction === "above"
          ? `Le prix moyen des ${label}s à ${alert.gouvernorat} a atteint ${current.toLocaleString()} TND/m² (votre seuil de ${alert.targetPrice.toLocaleString()} TND/m²). Bon moment pour vendre.`
          : `Le prix moyen des ${label}s à ${alert.gouvernorat} est descendu à ${current.toLocaleString()} TND/m² (votre seuil de ${alert.targetPrice.toLocaleString()} TND/m²). Bon moment pour acheter.`;

      await ctx.db.insert("messages", {
        userId: alert.userId,
        direction: "in",
        type: "system",
        subject: "Alerte prix atteinte",
        content: wording,
        senderName: "imoprice AI",
        createdAt: now,
      });

      // Email best-effort
      const user = await ctx.db.get(alert.userId);
      if (user?.email) {
        await ctx.scheduler.runAfter(0, internal.notifications.sendEmail, {
          to: user.email,
          subject: "🔔 Alerte prix du marché — imoprice AI",
          text: wording,
        });
      }
      triggered += 1;
    }
    return { checked: alerts.length, triggered };
  },
});
