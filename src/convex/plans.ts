import { getAuthUserId } from "@convex-dev/auth/server";
import { internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import {
  PLANS,
  PAYMENT_METHODS,
  DEFAULT_BANK_DETAILS as BANK_DETAILS,
  DEFAULT_D17_DETAILS as D17_DETAILS,
  monthKey,
  type PlanId,
  type PaymentMethod,
} from "./defaults";
import { getPlansWithOverrides } from "./settings";

// Re-export the default constants so existing imports keep working
export { PLANS, PAYMENT_METHODS, BANK_DETAILS, D17_DETAILS, monthKey };
export type { PlanId, PaymentMethod };

/** ── Get current subscription for the signed-in user ── */
export const mySubscription = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .first();

    if (!sub) return null;

    // If expired, auto-update status
    const now = Date.now();
    if (sub.status === "active" && sub.endDate && now > sub.endDate) {
      return { ...sub, status: "expired" as const };
    }

    return sub;
  },
});

/** ── Assign the default free plan (Start) to any user without a subscription ── */
export const ensureDefaultPlan = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { created: false };

    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .first();

    if (existing) return { created: false };

    const plans = await getPlansWithOverrides(ctx);
    const now = Date.now();
    await ctx.db.insert("subscriptions", {
      userId,
      planType: "start",
      status: "active",
      startDate: now,
      estimationsUsed: 0,
      estimationsLimit: plans.start.estimations,
      quotaMonth: monthKey(now),
      paymentStatus: "free",
      createdAt: now,
    });

    return { created: true };
  },
});

/** ── Check remaining estimations for the current user ── */
export const remainingEstimations = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { canEstimate: false, remaining: 0, planType: null, reason: "non_connecte", estimationsLimit: 0 };
    }

    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .first();

    // No subscription → redirect to pricing
    if (!sub) {
      return { canEstimate: false, remaining: 0, planType: null, reason: "pas_de_forfait", estimationsLimit: 0 };
    }

    // The free Start plan never expires — skip expiry/trial checks for it
    if (!(sub.planType === "start" && sub.paymentStatus === "free")) {
      // Check if expired
      const now = Date.now();
      if (sub.endDate && now > sub.endDate) {
        return {
          canEstimate: false, remaining: 0, planType: sub.planType,
          reason: "abonnement_expire", estimationsLimit: sub.estimationsLimit,
        };
      }

      // Legacy Start trials: once the trial is over the plan must be paid
      if (sub.planType === "start" && sub.trialEndDate && now > sub.trialEndDate && sub.paymentStatus !== "paid") {
        return {
          canEstimate: false, remaining: 0, planType: sub.planType,
          reason: "essai_termine", estimationsLimit: sub.estimationsLimit,
        };
      }

      // Manual payment (virement/D17) still pending → estimations blocked until confirmed
      if (sub.paymentStatus === "pending" && sub.paymentMethod !== "simulation") {
        return {
          canEstimate: false, remaining: 0, planType: sub.planType,
          reason: "paiement_en_attente", estimationsLimit: sub.estimationsLimit,
        };
      }
    }

    // Monthly quota: the counter automatically resets each month
    const usedThisMonth = sub.quotaMonth === monthKey() ? sub.estimationsUsed : 0;
    const remaining = sub.estimationsLimit - usedThisMonth;
    if (remaining <= 0) {
      return {
        canEstimate: false, remaining: 0, planType: sub.planType,
        reason: "limite_atteinte", estimationsLimit: sub.estimationsLimit,
      };
    }

    return {
      canEstimate: true, remaining, planType: sub.planType, reason: null,
      estimationsLimit: sub.estimationsLimit,
    };
  },
});

/** ── Subscribe to a plan with a payment method ── */
export const subscribeToPlan = mutation({
  args: {
    planType: v.union(v.literal("start"), v.literal("pro"), v.literal("expert"), v.literal("agence")),
    paymentMethod: v.optional(
      v.union(v.literal("simulation"), v.literal("virement"), v.literal("d17")),
    ),
    paymentRef: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non authentifié");

    const plans = await getPlansWithOverrides(ctx);
    const plan = plans[args.planType];
    if (!plan) throw new Error("Forfait invalide");

    const paymentMethod: PaymentMethod = args.paymentMethod ?? "simulation";

    // Check existing active subscription
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .first();

    if (existing && existing.status === "active") {
      const isFreeUpgrade = existing.planType === "start" && existing.paymentStatus === "free";
      const isExpired = existing.endDate !== undefined && Date.now() >= existing.endDate;
      const isPendingManual = existing.paymentStatus === "pending" && existing.paymentMethod !== "simulation";
      if (!isFreeUpgrade && !isExpired && !isPendingManual) {
        throw new Error("Vous avez déjà un abonnement actif");
      }
      // Cancel the previous subscription before switching plans
      await ctx.db.patch(existing._id, { status: "cancelled" });
    }

    const now = Date.now();
    const trialEndDate = plan.trialDays > 0
      ? now + plan.trialDays * 24 * 60 * 60 * 1000
      : undefined;

    // Calculate end date
    let endDate: number | undefined;
    if (plan.price === 0) {
      // Free plan: never expires
      endDate = undefined;
    } else if (plan.period === "monthly") {
      endDate = now + 30 * 24 * 60 * 60 * 1000; // 30 days
    } else if (plan.period === "one_time" && !trialEndDate) {
      // One-time with no trial = 1 year validity
      endDate = now + 365 * 24 * 60 * 60 * 1000;
    } else if (trialEndDate) {
      // Trial period, then need to pay
      endDate = trialEndDate;
    }

    // Payment status: free plans are "free"; trial plans are "pending" until paid;
    // manual methods (virement/D17) are "pending" until the transfer is confirmed;
    // simulated payment activates immediately.
    const paymentStatus =
      plan.price === 0
        ? "free"
        : plan.trialDays > 0
          ? "pending"
          : paymentMethod === "simulation"
            ? "paid"
            : "pending";

    const subId = await ctx.db.insert("subscriptions", {
      userId,
      planType: args.planType,
      status: "active",
      startDate: now,
      endDate,
      estimationsUsed: 0,
      estimationsLimit: plan.estimations,
      trialEndDate,
      quotaMonth: monthKey(now),
      paymentStatus,
      paymentMethod,
      paymentRef: args.paymentRef?.trim() || undefined,
      createdAt: now,
    });

    return {
      subscriptionId: subId,
      planType: args.planType,
      trialEndDate,
      paymentStatus,
      paymentMethod,
      message: plan.price === 0
        ? `Forfait ${plan.name} activé ! ${plan.estimations} estimations par mois offertes.`
        : plan.trialDays > 0
          ? `Forfait ${plan.name} activé ! Vous avez ${plan.trialDays} jours d'essai gratuit.`
          : paymentMethod === "simulation"
            ? `Forfait ${plan.name} activé ! Bienvenue.`
            : `Forfait ${plan.name} en attente de confirmation de paiement (${PAYMENT_METHODS[paymentMethod].shortLabel}).`,
    };
  },
});

/** ── Confirm a manual payment (virement/D17) — marks the subscription as paid ── */
export const confirmManualPayment = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non authentifié");

    const sub = await ctx.db.get(args.subscriptionId);
    if (!sub) throw new Error("Abonnement introuvable");
    if (sub.userId !== userId) throw new Error("Non autorisé");
    if (sub.paymentStatus !== "pending" || sub.paymentMethod === "simulation") {
      throw new Error("Aucun paiement manuel en attente");
    }

    const now = Date.now();
    // Monthly plans: extend from today (30 days). Agence after trial: 1 year.
    const isAgenceAfterTrial = sub.planType === "agence" && !!sub.trialEndDate;
    const newEndDate = isAgenceAfterTrial
      ? now + 365 * 24 * 60 * 60 * 1000
      : now + 30 * 24 * 60 * 60 * 1000;

    await ctx.db.patch(args.subscriptionId, {
      paymentStatus: "paid",
      endDate: newEndDate,
      trialEndDate: undefined,
    });

    // Email automatique de confirmation (best-effort)
    const user = await ctx.db.get(userId);
    if (user?.email) {
      await ctx.scheduler.runAfter(0, internal.notifications.sendEmail, {
        to: user.email,
        subject: "Paiement confirmé — votre forfait est actif ✅",
        text: `Bonjour${user.name ? " " + user.name : ""}, votre paiement a été confirmé. Votre forfait est maintenant actif jusqu'au ${new Date(newEndDate).toLocaleDateString("fr-FR")}. Bonne estimation !`,
      });
    }

    return { success: true, message: "Paiement confirmé — abonnement activé !" };
  },
});

/** ── Simulate payment for a pending subscription (Agence plan after trial) ── */
export const simulatePayment = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non authentifié");

    const sub = await ctx.db.get(args.subscriptionId);
    if (!sub) throw new Error("Abonnement introuvable");
    if (sub.userId !== userId) throw new Error("Non autorisé");

    // Simulate successful payment
    const now = Date.now();
    // Extend end date by 1 year
    const newEndDate = now + 365 * 24 * 60 * 60 * 1000;

    await ctx.db.patch(args.subscriptionId, {
      paymentStatus: "paid",
      endDate: newEndDate,
      trialEndDate: undefined, // Trial is over, now fully paid
    });

    return { success: true, message: "Paiement simulé avec succès !" };
  },
});

/** ── Get payment history for the current user ── */
export const getPaymentHistory = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const plans = await getPlansWithOverrides(ctx);
    const subs = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    return subs.map((sub) => ({
      id: sub._id,
      planType: sub.planType,
      planName: sub.planType === "start" ? "Free" : sub.planType === "pro" ? "Pro" : sub.planType === "agence" ? "Agence" : "Expert",
      status: sub.status,
      paymentStatus: sub.paymentStatus,
      paymentMethod: sub.paymentMethod ?? "simulation",
      paymentRef: sub.paymentRef,
      price: plans[sub.planType]?.price || 0,
      currency: plans[sub.planType]?.currency || "TND",
      startDate: sub.startDate,
      endDate: sub.endDate,
      trialEndDate: sub.trialEndDate,
      estimationsUsed: sub.estimationsUsed,
      estimationsLimit: sub.estimationsLimit,
    }));
  },
});

/** ── Increment estimation usage counter (monthly quota) ── */
export const incrementEstimationUsage = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non authentifié");

    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .first();

    if (!sub) throw new Error("Aucun abonnement actif");

    // New month → reset the counter before incrementing (monthly quota)
    const currentMonth = monthKey();
    const used = sub.quotaMonth === currentMonth ? sub.estimationsUsed : 0;
    await ctx.db.patch(sub._id, {
      estimationsUsed: used + 1,
      quotaMonth: currentMonth,
    });

    return { success: true };
  },
});

/** ── Monthly cron: reset all estimation quotas (called on the 1st of each month) ── */
export const resetMonthlyQuotas = internalMutation({
  handler: async (ctx) => {
    const subs = await ctx.db.query("subscriptions").collect();
    const currentMonth = monthKey();
    let reset = 0;

    for (const sub of subs) {
      if (sub.quotaMonth !== currentMonth) {
        await ctx.db.patch(sub._id, {
          estimationsUsed: 0,
          quotaMonth: currentMonth,
        });
        reset += 1;
      }
    }

    return { checked: subs.length, reset };
  },
});

/** ── Monthly estimation usage history (last 12 months) ── */
export const getMonthlyUsage = query({
  args: {},
  handler: async (ctx) => {
    const MONTHS_FR = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
    const empty = { months: [], limit: 0, usedThisMonth: 0, remaining: 0, planName: null as string | null };
    const userId = await getAuthUserId(ctx);
    if (!userId) return empty;

    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .first();

    const estimations = await ctx.db
      .query("estimations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Count estimation records per month (UTC)
    const byMonth = new Map<string, number>();
    for (const e of estimations) {
      const key = monthKey(e.createdAt);
      byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
    }

    const now = new Date();
    const currentKey = monthKey(now.getTime());
    const limit = sub?.estimationsLimit ?? 0;

    const months: { key: string; label: string; count: number; limit: number; isCurrent: boolean }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      const isCurrent = key === currentKey;
      let count = byMonth.get(key) ?? 0;
      // The current month's counter comes from the subscription (authoritative)
      if (isCurrent && sub && sub.quotaMonth === currentKey) {
        count = sub.estimationsUsed;
      }
      months.push({
        key,
        label: `${MONTHS_FR[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`,
        count,
        limit,
        isCurrent,
      });
    }

    const usedThisMonth = months.find((m) => m.isCurrent)?.count ?? 0;
    const planName = sub
      ? sub.planType === "start" ? "Free" : sub.planType === "pro" ? "Pro" : sub.planType === "agence" ? "Agence" : "Expert"
      : null;

    return { months, limit, usedThisMonth, remaining: Math.max(limit - usedThisMonth, 0), planName };
  },
});
