/**
 * Logique pure des annonces (aucune dépendance Convex runtime) — testable
 * directement dans vitest. Utilisée par `announcements.ts` et par les tests.
 */
import type { Doc } from "./_generated/dataModel";
import { ANNOUNCEMENT_PRIORITY_ORDER } from "./types";

export type AnnouncementLike = Pick<
  Doc<"announcements">,
  | "type"
  | "status"
  | "isActive"
  | "startDate"
  | "endDate"
  | "displayOrder"
  | "createdAt"
  | "targetType"
  | "targetUserIds"
  | "targetRoles"
  | "targetCompanyIds"
>;

export type TargetUserLike = {
  _id: string;
  role?: string;
  name?: string;
  email?: string;
} | null;

export const priorityRank = (type: AnnouncementLike["type"]): number => {
  const idx = ANNOUNCEMENT_PRIORITY_ORDER.indexOf(type);
  return idx === -1 ? 99 : idx;
};

/** Statut effectif à un instant donné (sans écrire en base). */
export function computeAnnouncementStatus(
  a: AnnouncementLike,
  now: number,
): AnnouncementLike["status"] {
  if (a.status === "disabled" || a.status === "draft") return a.status;
  if (a.status === "expired") return "expired";
  const started = a.startDate === undefined || now >= a.startDate;
  const ended = a.endDate !== undefined && now > a.endDate;
  if (ended) return "expired";
  if (!started) return "scheduled";
  if (a.status === "scheduled" && started) return "published";
  return a.status;
}

/** Une annonce est-elle visible dans le Dashboard à l'instant `now` ? */
export function isAnnouncementVisible(a: AnnouncementLike, now: number): boolean {
  if (!a.isActive) return false;
  const status = computeAnnouncementStatus(a, now);
  if (status !== "published") return false;
  if (a.startDate !== undefined && now < a.startDate) return false;
  if (a.endDate !== undefined && now > a.endDate) return false;
  return true;
}

/** Tri : priorité (URGENT → … → INFORMATION), puis displayOrder, puis date. */
export function sortAnnouncements<T extends AnnouncementLike>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const r = priorityRank(a.type) - priorityRank(b.type);
    if (r !== 0) return r;
    const o = (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
    if (o !== 0) return o;
    return b.createdAt - a.createdAt;
  });
}

/** L'utilisateur correspond-il au ciblage de l'annonce ? */
export function announcementTargetsUser(
  a: AnnouncementLike,
  user: TargetUserLike,
): boolean {
  if (a.targetType === "all") return true;
  if (!user) return false;
  if (a.targetType === "user") {
    return (a.targetUserIds ?? []).some((id) => id === user._id);
  }
  if (a.targetType === "role") {
    return (a.targetRoles ?? []).includes(user.role as never);
  }
  if (a.targetType === "company") {
    const names = (a.targetCompanyIds ?? []).map((n) =>
      n.trim().toLowerCase().replace(/\s+/g, ""),
    );
    if (names.length === 0) return true;
    const domain = (user.email ?? "").split("@")[1] ?? "";
    const domainKey = domain.trim().toLowerCase().replace(/\s+/g, "");
    const nameKey = (user.name ?? "").trim().toLowerCase().replace(/\s+/g, "");
    return names.some((n) => domainKey.endsWith(n) || nameKey.includes(n));
  }
  return false;
}