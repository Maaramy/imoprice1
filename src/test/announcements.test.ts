import { describe, expect, it } from "vitest";
import {
  computeAnnouncementStatus,
  isAnnouncementVisible,
  sortAnnouncements,
  announcementTargetsUser,
} from "../convex/announcementLogic";

const NOW = 1_700_000_000_000;

function makeAnnouncement(overrides: Record<string, unknown> = {}) {
  return {
    type: "information",
    status: "published",
    isActive: true,
    startDate: undefined,
    endDate: undefined,
    displayOrder: 0,
    createdAt: NOW,
    targetType: "all",
    targetUserIds: [] as string[],
    targetRoles: [] as string[],
    targetCompanyIds: [] as string[],
    ...overrides,
  } as import("../convex/announcementLogic").AnnouncementLike;
}

describe("computeAnnouncementStatus", () => {
  it("publie une annonce programmée quand la date de début est atteinte", () => {
    const a = makeAnnouncement({ status: "scheduled", startDate: NOW - 1 });
    expect(computeAnnouncementStatus(a, NOW)).toBe("published");
  });

  it("maintient programmée tant que la date de début n'est pas atteinte", () => {
    const a = makeAnnouncement({ status: "scheduled", startDate: NOW + 60_000 });
    expect(computeAnnouncementStatus(a, NOW)).toBe("scheduled");
  });

  it("expire une annonce dont la date de fin est dépassée", () => {
    const a = makeAnnouncement({ endDate: NOW - 1 });
    expect(computeAnnouncementStatus(a, NOW)).toBe("expired");
  });

  it("reste publiée tant que la date de fin n'est pas dépassée", () => {
    const a = makeAnnouncement({ endDate: NOW + 60_000 });
    expect(computeAnnouncementStatus(a, NOW)).toBe("published");
  });

  it("gèle brouillon et désactivée", () => {
    expect(computeAnnouncementStatus(makeAnnouncement({ status: "draft" }), NOW)).toBe("draft");
    expect(computeAnnouncementStatus(makeAnnouncement({ status: "disabled" }), NOW)).toBe("disabled");
    expect(
      computeAnnouncementStatus(makeAnnouncement({ status: "disabled", endDate: NOW - 10 }), NOW),
    ).toBe("disabled");
  });

  it("sans date d'expiration, une annonce publiée reste visible", () => {
    const a = makeAnnouncement({});
    expect(computeAnnouncementStatus(a, NOW)).toBe("published");
  });
});

describe("isAnnouncementVisible", () => {
  it("visible : publiée + active + dans la fenêtre de dates", () => {
    const a = makeAnnouncement({ startDate: NOW - 1000, endDate: NOW + 1000 });
    expect(isAnnouncementVisible(a, NOW)).toBe(true);
  });

  it("invisible si désactivée", () => {
    expect(isAnnouncementVisible(makeAnnouncement({ isActive: false }), NOW)).toBe(false);
  });

  it("invisible si expirée", () => {
    expect(isAnnouncementVisible(makeAnnouncement({ endDate: NOW - 1 }), NOW)).toBe(false);
  });

  it("invisible si programmée (pas encore commencée)", () => {
    expect(
      isAnnouncementVisible(makeAnnouncement({ status: "scheduled", startDate: NOW + 10 }), NOW),
    ).toBe(false);
  });

  it("invisible si brouillon", () => {
    expect(isAnnouncementVisible(makeAnnouncement({ status: "draft" }), NOW)).toBe(false);
  });

  it("sans date d'expiration, reste visible jusqu'à désactivation", () => {
    expect(isAnnouncementVisible(makeAnnouncement({}), NOW)).toBe(true);
  });
});

describe("sortAnnouncements", () => {
  it("trie par priorité : urgent avant important avant nouveauté avant information", () => {
    const urgent = makeAnnouncement({ type: "urgent", createdAt: NOW });
    const important = makeAnnouncement({ type: "important", createdAt: NOW });
    const news = makeAnnouncement({ type: "news", createdAt: NOW });
    const info = makeAnnouncement({ type: "information", createdAt: NOW });
    const sorted = sortAnnouncements([info, news, urgent, important]);
    expect(sorted.map((a) => a.type)).toEqual(["urgent", "important", "news", "information"]);
  });

  it("à priorité égale, respecte displayOrder puis la date", () => {
    const a = makeAnnouncement({ displayOrder: 2, createdAt: NOW });
    const b = makeAnnouncement({ displayOrder: 0, createdAt: NOW });
    const c = makeAnnouncement({ displayOrder: 1, createdAt: NOW });
    expect(sortAnnouncements([a, b, c]).map((x) => x.displayOrder)).toEqual([0, 1, 2]);
  });

  it("à priorité et ordre égaux, la plus récente d'abord", () => {
    const old = makeAnnouncement({ createdAt: NOW - 1000 });
    const recent = makeAnnouncement({ createdAt: NOW });
    expect(sortAnnouncements([old, recent])[0]).toBe(recent);
  });

  it("ne mute pas le tableau d'entrée", () => {
    const list = [makeAnnouncement({ type: "urgent" }), makeAnnouncement({})];
    const copy = [...list];
    sortAnnouncements(list);
    expect(list).toEqual(copy);
  });
});

describe("announcementTargetsUser", () => {
  const user = { _id: "u1", role: "user", name: "Ahmed", email: "ahmed@baticost.tn" };

  it("cible all : tout le monde", () => {
    expect(announcementTargetsUser(makeAnnouncement({ targetType: "all" }), user)).toBe(true);
    expect(announcementTargetsUser(makeAnnouncement({ targetType: "all" }), null)).toBe(true);
  });

  it("cible user : uniquement l'utilisateur désigné", () => {
    const a = makeAnnouncement({ targetType: "user", targetUserIds: ["u2", "u1"] });
    expect(announcementTargetsUser(a, user)).toBe(true);
    const other = makeAnnouncement({ targetType: "user", targetUserIds: ["u2"] });
    expect(announcementTargetsUser(other, user)).toBe(false);
  });

  it("cible role : vérifie le rôle", () => {
    const admin = makeAnnouncement({ targetType: "role", targetRoles: ["admin"] });
    expect(announcementTargetsUser(admin, user)).toBe(false);
    const anyRole = makeAnnouncement({ targetType: "role", targetRoles: ["user"] });
    expect(announcementTargetsUser(anyRole, user)).toBe(true);
  });

  it("cible company : par domaine e-mail", () => {
    const byDomain = makeAnnouncement({ targetType: "company", targetCompanyIds: ["baticost.tn"] });
    expect(announcementTargetsUser(byDomain, user)).toBe(true);
    const other = makeAnnouncement({ targetType: "company", targetCompanyIds: ["autrecie.tn"] });
    expect(announcementTargetsUser(other, user)).toBe(false);
    expect(announcementTargetsUser(other, null)).toBe(false);
  });

  it("cible company : par nom d'utilisateur", () => {
    const namedUser = { _id: "u2", role: "user", name: "Équipe Baticost Immobilier", email: "team@other.com" };
    const match = makeAnnouncement({ targetType: "company", targetCompanyIds: ["baticost immobilier"] });
    expect(announcementTargetsUser(match, namedUser)).toBe(true);
    const noMatch = makeAnnouncement({ targetType: "company", targetCompanyIds: ["autrecie"] });
    expect(announcementTargetsUser(noMatch, namedUser)).toBe(false);
  });
});