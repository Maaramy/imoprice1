/**
 * Announcements module — communications de la plateforme publiées par les
 * administrateurs et affichées dans le Dashboard (carousel).
 *
 * Logique :
 *  - Le statut est recalculé à la lecture (computeAnnouncementStatus) :
 *    une annonce programmée devient publiée quand startDate est atteinte,
 *    une annonce publiée expire quand endDate est dépassée.
 *  - Le cron `syncAnnouncementStatuses` (horaire) fige ces transitions en base.
 *  - Le Dashboard n'affiche que : status = published ET isActive ET dans la
 *    fenêtre de dates ET correspondant au ciblage de l'utilisateur.
 */
import { getAuthUserId } from "@convex-dev/auth/server";
import { internalMutation, mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { v } from "convex/values";
import { requireAdmin } from "./admin";
import {
  computeAnnouncementStatus,
  isAnnouncementVisible,
  priorityRank,
  sortAnnouncements,
  announcementTargetsUser,
} from "./announcementLogic";

export {
  computeAnnouncementStatus,
  isAnnouncementVisible,
  priorityRank,
  sortAnnouncements,
  announcementTargetsUser,
};

type Announcement = Doc<"announcements">;

/* ============================================================
 * Queries publiques / Dashboard
 * ============================================================ */

/** Annonces actives (toutes cibles confondues) — pour aperçu/administrateurs. */
export const getActiveAnnouncements = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const all = await ctx.db.query("announcements").collect();
    return sortAnnouncements(all.filter((a) => isAnnouncementVisible(a, now)));
  },
});

/** Annonces actives ciblées pour l'utilisateur connecté (Dashboard). */
export const getAnnouncementsForUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    let user: { _id: string; role?: string; name?: string; email?: string } | null = null;
    if (userId) {
      const doc = await ctx.db.get(userId);
      user = doc
        ? {
            _id: doc._id,
            role: doc.role,
            name: doc.name ?? undefined,
            email: doc.email ?? undefined,
          }
        : null;
    }
    const now = Date.now();
    const all = await ctx.db.query("announcements").collect();
    return sortAnnouncements(
      all.filter(
        (a) =>
          isAnnouncementVisible(a, now) && announcementTargetsUser(a, user),
      ),
    );
  },
});

/* ============================================================
 * Queries Admin
 * ============================================================ */

export const getAnnouncements = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const all = await ctx.db.query("announcements").collect();
    return sortAnnouncements(all);
  },
});

export const getAnnouncementById = query({
  args: { id: v.id("announcements") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const doc = await ctx.db.get(id);
    if (!doc) throw new Error("Annonce introuvable");
    return doc;
  },
});

/* ============================================================
 * Mutations Admin
 * ============================================================ */

const announcementInput = {
  title: v.string(),
  content: v.string(),
  type: v.union(
    v.literal("information"),
    v.literal("news"),
    v.literal("important"),
    v.literal("urgent"),
    v.literal("maintenance"),
  ),
  priority: v.optional(v.number()),
  imageUrl: v.optional(v.string()),
  startDate: v.optional(v.number()),
  endDate: v.optional(v.number()),
  targetType: v.union(
    v.literal("all"),
    v.literal("company"),
    v.literal("role"),
    v.literal("user"),
  ),
  targetCompanyIds: v.optional(v.array(v.string())),
  targetRoles: v.optional(
    v.array(v.union(v.literal("admin"), v.literal("user"), v.literal("member"))),
  ),
  targetUserIds: v.optional(v.array(v.id("users"))),
};

export const createAnnouncement = mutation({
  args: { input: v.object(announcementInput) },
  handler: async (ctx, { input }) => {
    const adminId = await requireAdmin(ctx);
    const admin = await ctx.db.get(adminId);
    const now = Date.now();
    const status: Announcement["status"] =
      input.startDate !== undefined && input.startDate > now ? "scheduled" : "published";
    const id = await ctx.db.insert("announcements", {
      title: input.title.trim(),
      content: input.content.trim(),
      type: input.type,
      priority: input.priority ?? priorityRank(input.type) + 1,
      imageUrl: input.imageUrl || undefined,
      status,
      isActive: true,
      startDate: input.startDate,
      endDate: input.endDate,
      targetType: input.targetType,
      targetCompanyIds: input.targetCompanyIds,
      targetRoles: input.targetRoles,
      targetUserIds: input.targetUserIds,
      createdBy: adminId,
      createdByName: admin?.name ?? "Administrateur",
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

export const updateAnnouncement = mutation({
  args: {
    id: v.id("announcements"),
    input: v.object(announcementInput),
  },
  handler: async (ctx, { id, input }) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Annonce introuvable");
    const now = Date.now();
    const status =
      input.startDate !== undefined && input.startDate > now ? "scheduled" : "published";
    await ctx.db.patch(id, {
      title: input.title.trim(),
      content: input.content.trim(),
      type: input.type,
      priority: input.priority ?? priorityRank(input.type) + 1,
      imageUrl: input.imageUrl || undefined,
      status,
      startDate: input.startDate,
      endDate: input.endDate,
      targetType: input.targetType,
      targetCompanyIds: input.targetCompanyIds,
      targetRoles: input.targetRoles,
      targetUserIds: input.targetUserIds,
      updatedAt: now,
    });
  },
});

export const deleteAnnouncement = mutation({
  args: { id: v.id("announcements") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.delete(id);
  },
});

export const activateAnnouncement = mutation({
  args: { id: v.id("announcements") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Annonce introuvable");
    const now = Date.now();
    await ctx.db.patch(id, {
      status: "published",
      isActive: true,
      startDate: existing.startDate ?? now,
      updatedAt: now,
    });
  },
});

export const deactivateAnnouncement = mutation({
  args: { id: v.id("announcements") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Annonce introuvable");
    await ctx.db.patch(id, {
      status: "disabled",
      isActive: false,
      updatedAt: Date.now(),
    });
  },
});

export const duplicateAnnouncement = mutation({
  args: { id: v.id("announcements") },
  handler: async (ctx, { id }) => {
    const adminId = await requireAdmin(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Annonce introuvable");
    const now = Date.now();
    const copyId = await ctx.db.insert("announcements", {
      ...existing,
      title: `${existing.title} (copie)`,
      status: "draft",
      isActive: false,
      startDate: undefined,
      endDate: existing.endDate,
      displayOrder: (existing.displayOrder ?? 0) + 1,
      createdBy: adminId,
      createdAt: now,
      updatedAt: now,
    });
    return copyId;
  },
});

export const updateAnnouncementOrder = mutation({
  args: { orderedIds: v.array(v.id("announcements")) },
  handler: async (ctx, { orderedIds }) => {
    await requireAdmin(ctx);
    await Promise.all(
      orderedIds.map((id, index) => ctx.db.patch(id, { displayOrder: index })),
    );
  },
});

/* ============================================================
 * Cron — fige les transitions de statut (horaire)
 * ============================================================ */

export const syncAnnouncementStatuses = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const all = await ctx.db.query("announcements").collect();
    for (const a of all) {
      const effective = computeAnnouncementStatus(a, now);
      if (effective !== a.status && effective !== "scheduled") {
        await ctx.db.patch(a._id, { status: effective, updatedAt: now });
      } else if (
        effective === "scheduled" &&
        a.status === "published" &&
        a.startDate !== undefined &&
        now < a.startDate
      ) {
        await ctx.db.patch(a._id, { status: "scheduled", updatedAt: now });
      }
    }
  },
});
