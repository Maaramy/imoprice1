import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/* ── User inbox: messages received (in) + replies sent (out), newest first ── */
export const getMyInbox = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { messages: [], unread: 0 };

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    let unread = 0;
    const enriched = await Promise.all(
      messages.map(async (m) => {
        if (m.direction === "in" && !m.readAt) unread += 1;

        let agency = null;
        if (m.agencyPartnerId) {
          const p = await ctx.db.get(m.agencyPartnerId);
          if (p) {
            agency = {
              name: p.name,
              logoUrl: p.logoUrl || null,
              phone: p.phone,
              email: p.email,
              address: p.address,
            };
          }
        }

        // Linked estimation info (price + property type)
        let estimation = null;
        let rentEstimation = null;
        if (m.requestId) {
          const req = await ctx.db.get(m.requestId);
          if (req) {
            // Estimation vente/achat
            if (req.estimationId && req.propertyId) {
              const est = await ctx.db.get(req.estimationId);
              const prop = await ctx.db.get(req.propertyId);
              estimation = {
                estimatedValue: est?.estimatedValue ?? null,
                fastSalePrice: est?.fastSalePrice ?? null,
                maxProfitPrice: est?.maxProfitPrice ?? null,
                confidenceIndex: est?.confidenceIndex ?? null,
                propertyType: prop?.propertyType ?? null,
                gouvernorat: prop?.gouvernorat ?? null,
                ville: prop?.ville ?? null,
              };
            }
            // Estimation de loyer (mensuel / nuitée)
            if (req.rentEstimationId) {
              const rent = await ctx.db.get(req.rentEstimationId);
              rentEstimation = {
                estimatedRent: rent?.estimatedRent ?? null,
                rentMin: rent?.rentMin ?? null,
                rentMax: rent?.rentMax ?? null,
                confidenceIndex: rent?.confidenceIndex ?? null,
                propertyType: rent?.property?.propertyType ?? null,
                gouvernorat: rent?.property?.gouvernorat ?? null,
                ville: rent?.property?.ville ?? null,
                quartier: rent?.property?.quartier ?? null,
              };
            }
          }
        }

        return {
          ...m,
          agency,
          estimation,
          rentEstimation,
        };
      }),
    );

    return { messages: enriched, unread };
  },
});

/* ── Mark a list of messages as read (user only) ── */
export const markMessagesRead = mutation({
  args: {
    ids: v.array(v.id("messages")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non authentifié");

    const now = Date.now();
    for (const id of args.ids) {
      const m = await ctx.db.get(id);
      if (m && m.userId === userId && m.direction === "in" && !m.readAt) {
        await ctx.db.patch(id, { readAt: now });
      }
    }
    return { success: true };
  },
});

/* ── Mark all incoming messages as read ── */
export const markAllMessagesRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non authentifié");

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const now = Date.now();
    for (const m of messages) {
      if (m.direction === "in" && !m.readAt) {
        await ctx.db.patch(m._id, { readAt: now });
      }
    }
    return { success: true };
  },
});

/* ── User replies to an agency (creates an "out" message the agency sees) ── */
export const sendUserMessage = mutation({
  args: {
    agencyPartnerId: v.id("professionalPartners"),
    requestId: v.optional(v.id("agencyRequests")),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non authentifié");

    const content = args.content.trim();
    if (!content) throw new Error("Le message est vide");

    const agency = await ctx.db.get(args.agencyPartnerId);
    if (!agency || agency.type !== "agence") {
      throw new Error("Agence introuvable");
    }

    const user = await ctx.db.get(userId);

    // Verify the request belongs to this user if provided
    if (args.requestId) {
      const req = await ctx.db.get(args.requestId);
      if (!req || req.userId !== userId || req.agencyPartnerId !== args.agencyPartnerId) {
        throw new Error("Non autorisé");
      }
    }

    await ctx.db.insert("messages", {
      userId,
      agencyPartnerId: args.agencyPartnerId,
      requestId: args.requestId,
      direction: "out",
      type: "message",
      subject: "Votre réponse",
      content,
      senderName: user?.name || "Vous",
      createdAt: Date.now(),
    });

    // Email automatique à l'agence (best-effort)
    if (agency.email) {
      await ctx.scheduler.runAfter(0, internal.notifications.sendEmail, {
        to: agency.email,
        subject: `Nouveau message de ${user?.name || "l'utilisateur"} — imoprice AI`,
        text: `Un utilisateur vient de vous répondre au sujet de votre demande : « ${content} ». Connectez-vous à votre espace agence pour répondre.`,
      });
    }

    return { success: true };
  },
});
