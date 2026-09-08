import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { PLANS } from "./plans";

/* ── Register or update agency profile (multi-region + multi-specialty) ── */
export const registerAgencyProfile = mutation({
  args: {
    name: v.string(),
    regions: v.array(v.string()),
    address: v.string(),
    phone: v.string(),
    email: v.string(),
    description: v.string(),
    specialties: v.optional(v.array(v.string())),
    website: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non authentifié");

    // Check if user already has an agency profile
    const existing = await ctx.db
      .query("professionalPartners")
      .withIndex("by_type", (q) => q.eq("type", "agence"))
      .collect();

    const myProfile = existing.find((p) => p.userId === userId);

    if (myProfile) {
      // Update existing
      const updateData: Record<string, any> = {
        name: args.name,
        regions: args.regions,
        address: args.address,
        phone: args.phone,
        email: args.email,
        description: args.description,
        specialties: args.specialties,
        website: args.website,
      };
      if (args.logoUrl !== undefined) {
        updateData.logoUrl = args.logoUrl;
      }
      await ctx.db.patch(myProfile._id, updateData);
      return { id: myProfile._id, created: false };
    } else {
      // Create new
      // Check if the user has an active agency subscription
      const sub = await ctx.db
        .query("subscriptions")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .order("desc")
        .first();

      // Expert users automatically get agency features
      const isSubscribed = !!(
        sub && sub.status === "active" &&
        (!sub.endDate || Date.now() < sub.endDate) &&
        (sub.planType === "agence" || sub.planType === "expert")
      );

      const id = await ctx.db.insert("professionalPartners", {
        userId,
        name: args.name,
        type: "agence",
        specialties: args.specialties,
        regions: args.regions,
        address: args.address,
        phone: args.phone,
        email: args.email,
        website: args.website,
        description: args.description,
        logoUrl: args.logoUrl,
        isSubscribed,
      });
      return { id, created: true };
    }
  },
});

/* ── Get user's agency profile ── */
export const getMyAgencyProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const partners = await ctx.db
      .query("professionalPartners")
      .withIndex("by_type", (q) => q.eq("type", "agence"))
      .collect();

    return partners.find((p) => p.userId === userId) || null;
  },
});

/* ── Get active agencies for a region (filtered to subscribed only) ── */
export const getActiveAgencies = query({
  args: {
    region: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    // Query by type (scalar index) then filter in memory so that agencies with
    // MULTIPLE regions match too (array-index equality would require an exact
    // array match, hiding every multi-region agency).
    const partners = await ctx.db
      .query("professionalPartners")
      .withIndex("by_type", (q) => q.eq("type", "agence"))
      .collect();

    // Only return agencies that were registered by real users (have userId),
    // serve the requested region, and are NOT the caller's own agency
    return partners
      .filter(
        (p) =>
          p.isSubscribed &&
          p.userId &&
          p.userId !== userId &&
          (p.regions || []).includes(args.region),
      )
      .sort((a, b) => (b.rating || 0) - (a.rating || 0));
  },
});

/* ── Send estimation to an agency ── */
export const sendEstimationToAgency = mutation({
  args: {
    estimationId: v.id("estimations"),
    propertyId: v.id("properties"),
    agencyPartnerId: v.id("professionalPartners"),
    message: v.optional(v.string()),
    priceScenario: v.optional(
      v.union(v.literal("optimiste"), v.literal("realiste"), v.literal("vente_rapide")),
    ),
    // Besoin du client : vendeur ou acheteur
    clientNeed: v.optional(v.union(v.literal("vendeur"), v.literal("acheteur"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non authentifié");

    // Block sending an estimation to your own agency
    const targetAgency = await ctx.db.get(args.agencyPartnerId);
    if (targetAgency && targetAgency.userId === userId) {
      throw new Error("Vous ne pouvez pas envoyer une estimation à votre propre agence");
    }

    // Check if already sent
    const existing = await ctx.db
      .query("agencyRequests")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const alreadySent = existing.find(
      (r) => r.agencyPartnerId === args.agencyPartnerId && r.estimationId === args.estimationId
    );

    if (alreadySent) {
      throw new Error("Vous avez déjà envoyé cette estimation à cette agence");
    }

    // Get user info for the request
    const user = await ctx.db.get(userId);

    const id = await ctx.db.insert("agencyRequests", {
      estimationId: args.estimationId,
      propertyId: args.propertyId,
      userId,
      agencyPartnerId: args.agencyPartnerId,
      userName: user?.name || "Anonyme",
      userEmail: user?.email || "",
      userPhone: user?.phone,
      message: args.message,
      priceScenario: args.priceScenario,
      clientNeed: args.clientNeed,
      status: "pending",
      createdAt: Date.now(),
    });

    // Notify the user in their inbox
    const agency = await ctx.db.get(args.agencyPartnerId);
    await ctx.db.insert("messages", {
      userId,
      agencyPartnerId: args.agencyPartnerId,
      requestId: id,
      direction: "in",
      type: "system",
      subject: "Estimation envoyée",
      content: `Votre estimation a été envoyée à ${agency?.name || "l'agence"}. Ils vous contacteront sous peu.`,
      senderName: agency?.name || "baticost AI",
      senderLogo: agency?.logoUrl,
      createdAt: Date.now(),
    });

    return { id };
  },
});

/* ── Send a rent estimation (loyer mensuel / nuitée) to an agency ── */
export const sendRentEstimationToAgency = mutation({
  args: {
    rentEstimationId: v.id("rentEstimations"),
    agencyPartnerId: v.id("professionalPartners"),
    message: v.optional(v.string()),
    rentPriceScenario: v.optional(
      v.union(v.literal("prudent"), v.literal("realiste"), v.literal("optimiste")),
    ),
    // Besoin du client : bailleur ou locataire
    clientNeed: v.optional(v.union(v.literal("bailleur"), v.literal("locataire"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non authentifié");

    // Block sending an estimation to your own agency
    const targetAgency = await ctx.db.get(args.agencyPartnerId);
    if (targetAgency && targetAgency.userId === userId) {
      throw new Error("Vous ne pouvez pas envoyer une estimation à votre propre agence");
    }

    // Check if already sent
    const existing = await ctx.db
      .query("agencyRequests")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const alreadySent = existing.find(
      (r) => r.agencyPartnerId === args.agencyPartnerId && r.rentEstimationId === args.rentEstimationId
    );

    if (alreadySent) {
      throw new Error("Vous avez déjà envoyé cette estimation à cette agence");
    }

    // Get user info for the request
    const user = await ctx.db.get(userId);

    const id = await ctx.db.insert("agencyRequests", {
      rentEstimationId: args.rentEstimationId,
      userId,
      agencyPartnerId: args.agencyPartnerId,
      userName: user?.name || "Anonyme",
      userEmail: user?.email || "",
      userPhone: user?.phone,
      message: args.message,
      rentPriceScenario: args.rentPriceScenario,
      clientNeed: args.clientNeed,
      status: "pending",
      createdAt: Date.now(),
    });

    // Notify the user in their inbox
    const agency = await ctx.db.get(args.agencyPartnerId);
    await ctx.db.insert("messages", {
      userId,
      agencyPartnerId: args.agencyPartnerId,
      requestId: id,
      direction: "in",
      type: "system",
      subject: "Estimation de loyer envoyée",
      content: `Votre estimation de loyer a été envoyée à ${agency?.name || "l'agence"}. Ils vous contacteront sous peu.`,
      senderName: agency?.name || "baticost AI",
      senderLogo: agency?.logoUrl,
      createdAt: Date.now(),
    });

    return { id };
  },
});

/* ── Get agency's received requests (for agency dashboard) ── */
export const getMyAgencyRequests = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Find the agency profile by userId
    const partners = await ctx.db
      .query("professionalPartners")
      .withIndex("by_type", (q) => q.eq("type", "agence"))
      .collect();

    const agencyProfile = partners.find((p) => p.userId === userId);
    if (!agencyProfile) return [];

    const requests = await ctx.db
      .query("agencyRequests")
      .withIndex("by_agency", (q) => q.eq("agencyPartnerId", agencyProfile._id))
      .order("desc")
      .collect();

    // Enrich with estimation/property data + message thread
    const enriched = await Promise.all(
      requests.map(async (req) => {
        const estimation = req.estimationId ? await ctx.db.get(req.estimationId) : null;
        const property = req.propertyId ? await ctx.db.get(req.propertyId) : null;
        const rentEstimation = req.rentEstimationId ? await ctx.db.get(req.rentEstimationId) : null;
        const thread = await ctx.db
          .query("messages")
          .withIndex("by_request", (q) => q.eq("requestId", req._id))
          .order("asc")
          .collect();
        return {
          ...req,
          thread: thread.map((m) => ({
            _id: m._id,
            direction: m.direction,
            type: m.type,
            content: m.content,
            senderName: m.senderName,
            createdAt: m.createdAt,
          })),
          estimation: estimation
            ? {
                estimatedValue: estimation.estimatedValue,
                fastSalePrice: estimation.fastSalePrice,
                maxProfitPrice: estimation.maxProfitPrice,
                priceMin: estimation.priceMin,
                priceMax: estimation.priceMax,
                confidenceIndex: estimation.confidenceIndex,
                avgPricePerSqm: estimation.avgPricePerSqm,
              }
            : null,
          property: property
            ? {
                propertyType: property.propertyType,
                address: property.address,
                gouvernorat: property.gouvernorat,
                ville: property.ville,
                quartier: property.quartier,
                terrainSurface: property.terrainSurface,
                builtSurface: property.builtSurface,
                floors: property.floors,
                bedrooms: property.bedrooms,
                bathrooms: property.bathrooms,
                kitchens: property.kitchens,
                livingRooms: property.livingRooms,
                garages: property.garages,
                hasGarden: property.hasGarden,
                hasPool: property.hasPool,
                hasTerrace: property.hasTerrace,
                hasBalcony: property.hasBalcony,
                hasElevator: property.hasElevator,
                hasParking: property.hasParking,
                hasAC: property.hasAC,
                hasHeating: property.hasHeating,
                hasSolar: property.hasSolar,
                yearBuilt: property.yearBuilt,
                generalState: property.generalState,
              }
            : null,
          // Estimation de loyer (mensuel / nuitée) pour les demandes de location
          rentEstimation: rentEstimation
            ? {
                estimatedRent: rentEstimation.estimatedRent,
                rentMin: rentEstimation.rentMin,
                rentMax: rentEstimation.rentMax,
                rentPerSqm: rentEstimation.rentPerSqm,
                confidenceIndex: rentEstimation.confidenceIndex,
                grossYield: rentEstimation.grossYield,
                annualRent: rentEstimation.annualRent,
                property: rentEstimation.property,
              }
            : null,
        };
      })
    );

    return enriched;
  },
});

/* ── Agency suggests a price back to the user ── */
export const suggestPrice = mutation({
  args: {
    requestId: v.id("agencyRequests"),
    suggestedPrice: v.number(),
    agencyMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non authentifié");

    if (args.suggestedPrice <= 0) {
      throw new Error("Le prix suggéré doit être supérieur à 0");
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Demande introuvable");

    // Verify the agency owns this request
    const partners = await ctx.db
      .query("professionalPartners")
      .withIndex("by_type", (q) => q.eq("type", "agence"))
      .collect();

    const agencyProfile = partners.find((p) => p.userId === userId);
    if (!agencyProfile || agencyProfile._id !== request.agencyPartnerId) {
      throw new Error("Non autorisé");
    }

    await ctx.db.patch(args.requestId, {
      suggestedPrice: args.suggestedPrice,
      agencyMessage: args.agencyMessage,
      suggestedAt: Date.now(),
      status: "suggested",
    });

    // Deliver the counter-offer as an inbox message to the user
    await ctx.db.insert("messages", {
      userId: request.userId,
      agencyPartnerId: request.agencyPartnerId,
      requestId: request._id,
      direction: "in",
      type: "suggest_price",
      subject: "Contre-offre de prix",
      content: args.agencyMessage || "L'agence vous a proposé un prix pour votre bien.",
      senderName: agencyProfile.name,
      senderLogo: agencyProfile.logoUrl,
      suggestedPrice: args.suggestedPrice,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

/* ── User's received agency responses (counter-offers) for an estimation ── */
export const getAgencyResponsesForEstimation = query({
  args: {
    estimationId: v.id("estimations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const requests = await ctx.db
      .query("agencyRequests")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const mine = requests.filter(
      (r) =>
        r.estimationId === args.estimationId &&
        r.suggestedPrice !== undefined &&
        r.suggestedPrice !== null,
    );

    // Enrich with agency name/logo
    const enriched = await Promise.all(
      mine.map(async (req) => {
        const agency = await ctx.db.get(req.agencyPartnerId);
        const estimation = req.estimationId ? await ctx.db.get(req.estimationId) : null;
        return {
          ...req,
          agencyName: agency?.name || "Agence",
          agencyLogo: agency?.logoUrl || null,
          estimatedValue: estimation?.estimatedValue || null,
          fastSalePrice: estimation?.fastSalePrice || null,
          maxProfitPrice: estimation?.maxProfitPrice || null,
        };
      }),
    );

    return enriched.sort((a, b) => (b.suggestedAt || 0) - (a.suggestedAt || 0));
  },
});

/* ── User's received agency responses (counter-offers) for a rent estimation ── */
export const getAgencyResponsesForRentEstimation = query({
  args: {
    rentEstimationId: v.id("rentEstimations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const requests = await ctx.db
      .query("agencyRequests")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const mine = requests.filter(
      (r) =>
        r.rentEstimationId === args.rentEstimationId &&
        r.suggestedPrice !== undefined &&
        r.suggestedPrice !== null,
    );

    // Enrich with agency name/logo + rent estimation data
    const enriched = await Promise.all(
      mine.map(async (req) => {
        const agency = await ctx.db.get(req.agencyPartnerId);
        const estimation = req.rentEstimationId ? await ctx.db.get(req.rentEstimationId) : null;
        return {
          ...req,
          agencyName: agency?.name || "Agence",
          agencyLogo: agency?.logoUrl || null,
          estimatedRent: estimation?.estimatedRent || null,
          rentMin: estimation?.rentMin || null,
          rentMax: estimation?.rentMax || null,
        };
      }),
    );

    return enriched.sort((a, b) => (b.suggestedAt || 0) - (a.suggestedAt || 0));
  },
});

/* ── Mark a request as read/contacted ── */
export const updateRequestStatus = mutation({
  args: {
    requestId: v.id("agencyRequests"),
    status: v.union(v.literal("read"), v.literal("contacted")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non authentifié");

    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Demande introuvable");

    // Verify the agency owns this request
    const partners = await ctx.db
      .query("professionalPartners")
      .withIndex("by_type", (q) => q.eq("type", "agence"))
      .collect();

    const agencyProfile = partners.find((p) => p.userId === userId);
    if (!agencyProfile || agencyProfile._id !== request.agencyPartnerId) {
      throw new Error("Non autorisé");
    }

    await ctx.db.patch(args.requestId, { status: args.status });

    // Notify the user when the agency marks the request as contacted
    if (args.status === "contacted") {
      await ctx.db.insert("messages", {
        userId: request.userId,
        agencyPartnerId: request.agencyPartnerId,
        requestId: request._id,
        direction: "in",
        type: "status",
        subject: "Demande en cours",
        content: `${agencyProfile.name} a bien reçu votre estimation et vous contactera très prochainement.`,
        senderName: agencyProfile.name,
        senderLogo: agencyProfile.logoUrl,
        createdAt: Date.now(),
      });

      // Email automatique (best-effort)
      const user = await ctx.db.get(request.userId);
      if (user?.email) {
        await ctx.scheduler.runAfter(0, internal.notifications.sendEmail, {
          to: user.email,
          subject: `${agencyProfile.name} a pris en charge votre demande`,
          text: `${agencyProfile.name} a bien reçu votre estimation immobilière et vous contactera très prochainement. Vous pouvez suivre l'échange dans votre messagerie baticost AI.`,
        });
      }
    }

    return { success: true };
  },
});

/* ── Agency deletes a received request ── */
export const deleteAgencyRequest = mutation({
  args: {
    requestId: v.id("agencyRequests"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non authentifié");

    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Demande introuvable");

    // Verify the agency owns this request
    const partners = await ctx.db
      .query("professionalPartners")
      .withIndex("by_type", (q) => q.eq("type", "agence"))
      .collect();

    const agencyProfile = partners.find((p) => p.userId === userId);
    if (!agencyProfile || agencyProfile._id !== request.agencyPartnerId) {
      throw new Error("Non autorisé");
    }

    await ctx.db.delete(args.requestId);
    return { success: true };
  },
});

/* ── Agency sends a message to a user (delivered in their inbox) ── */
export const sendAgencyMessage = mutation({
  args: {
    requestId: v.id("agencyRequests"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non authentifié");

    const content = args.content.trim();
    if (!content) throw new Error("Le message est vide");

    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Demande introuvable");

    // Verify the agency owns this request
    const partners = await ctx.db
      .query("professionalPartners")
      .withIndex("by_type", (q) => q.eq("type", "agence"))
      .collect();

    const agencyProfile = partners.find((p) => p.userId === userId);
    if (!agencyProfile || agencyProfile._id !== request.agencyPartnerId) {
      throw new Error("Non autorisé");
    }

    await ctx.db.insert("messages", {
      userId: request.userId,
      agencyPartnerId: request.agencyPartnerId,
      requestId: request._id,
      direction: "in",
      type: "message",
      subject: agencyProfile.name,
      content,
      senderName: agencyProfile.name,
      senderLogo: agencyProfile.logoUrl,
      createdAt: Date.now(),
    });

    // Email automatique (best-effort)
    const user = await ctx.db.get(request.userId);
    if (user?.email) {
      await ctx.scheduler.runAfter(0, internal.notifications.sendEmail, {
        to: user.email,
        subject: `Nouveau message de ${agencyProfile.name}`,
        text: `${agencyProfile.name} vient de vous écrire au sujet de votre estimation : « ${content} ». Répondez depuis votre messagerie baticost AI.`,
      });
    }

    return { success: true };
  },
});

/* ── Get public agency profile (no auth required) ── */
export const getAgencyPublicProfile = query({
  args: {
    agencyId: v.id("professionalPartners"),
  },
  handler: async (ctx, args) => {
    const agency = await ctx.db.get(args.agencyId);
    if (!agency || agency.type !== "agence" || !agency.isSubscribed) return null;

    // Return only public-facing fields
    return {
      _id: agency._id,
      name: agency.name,
      specialties: agency.specialties || [],
      regions: agency.regions,
      address: agency.address,
      phone: agency.phone,
      email: agency.email,
      website: agency.website,
      description: agency.description,
      rating: agency.rating,
      logoUrl: agency.logoUrl,
    };
  },
});

/* ── Get all subscribed agencies (for public listing) ── */
export const getAllSubscribedAgencies = query({
  args: {},
  handler: async (ctx) => {
    const partners = await ctx.db
      .query("professionalPartners")
      .withIndex("by_type", (q) => q.eq("type", "agence"))
      .collect();

    // Only return agencies registered by real platform users
    return partners
      .filter((p) => p.isSubscribed && p.userId)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .map((p) => ({
        _id: p._id,
        name: p.name,
        specialties: p.specialties || [],
        regions: p.regions,
        address: p.address,
        phone: p.phone,
        email: p.email,
        website: p.website,
        description: p.description,
        rating: p.rating,
        logoUrl: p.logoUrl,
      }));
  },
});

