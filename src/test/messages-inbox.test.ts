import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// --- Hoisted mocks (referenced by vi.mock factories) ---
const authMock = vi.hoisted(() => ({
  getAuthUserId: vi.fn<() => Promise<string | null>>(),
}));

const serverMock = vi.hoisted(() => {
  const defs: any[] = [];
  const mutation = (def: any) => {
    defs.push(def);
    return def;
  };
  const query = (def: any) => {
    defs.push(def);
    return def;
  };
  return { defs, mutation, query };
});

vi.mock("@convex-dev/auth/server", () => authMock);

vi.mock("@/convex/_generated/server", () => ({
  mutation: serverMock.mutation,
  query: serverMock.query,
}));

import {
  getMyInbox,
  markMessagesRead,
  markAllMessagesRead,
  sendUserMessage,
} from "@/convex/messages";
import { suggestPrice, sendAgencyMessage, getMyAgencyRequests } from "@/convex/agencies";

type Handler = (ctx: any, args?: any) => Promise<unknown>;

const inboxHandler = (getMyInbox as unknown as { handler: Handler }).handler;
const markReadHandler = (markMessagesRead as unknown as { handler: Handler }).handler;
const markAllHandler = (markAllMessagesRead as unknown as { handler: Handler }).handler;
const sendUserHandler = (sendUserMessage as unknown as { handler: Handler }).handler;
const suggestHandler = (suggestPrice as unknown as { handler: Handler }).handler;
const sendAgencyHandler = (sendAgencyMessage as unknown as { handler: Handler }).handler;
const agencyRequestsHandler = (getMyAgencyRequests as unknown as { handler: Handler }).handler;

type DbRecord = { _id: string; table: string } & Record<string, unknown>;

/** In-memory fake Convex ctx (same shape as other backend tests). */
function makeCtx(records: DbRecord[]) {
  const store = new Map<string, DbRecord>(records.map((r) => [r._id, r]));
  const patch = vi.fn(async (id: string, p: Record<string, unknown>) => {
    const cur = store.get(id);
    if (cur) store.set(id, { ...cur, ...p });
  });
  const del = vi.fn(async (id: string) => {
    store.delete(id);
  });

  const listByTable = (table: string) =>
    [...store.values()].filter((r) => r.table === table);

  const ctx = {
    db: {
      get: vi.fn(async (id: string) => store.get(id) ?? null),
      patch,
      delete: del,
      insert: vi.fn(async (table: string, doc: Record<string, unknown>) => {
        const id = `auto-${store.size + 1}`;
        store.set(id, { _id: id, table, ...doc });
        return id;
      }),
      query: vi.fn((table: string) => {
        const base = () => listByTable(table);
        const eqFilter = (build: any) => {
          let items = base();
          if (build) {
            build({
              eq: (field: string, value: unknown) => {
                items = items.filter((r) => r[field] === value);
              },
            });
          }
          return items;
        };
        const chain = (items: () => DbRecord[]) => ({
          collect: async () => items(),
          first: async () => items()[0] ?? null,
          order: () => ({
            collect: async () => items(),
            first: async () => items()[0] ?? null,
          }),
        });
        return {
          collect: async () => base(),
          order: () => ({ collect: async () => base() }),
          withIndex: (_name: string, build?: any) => chain(() => eqFilter(build)),
        };
      }),
    },
    // Programmation d'emails (best-effort) : enregistre les appels pour
    // vérifier qu'une notification a bien été planifiée.
    scheduler: {
      runAfter: vi.fn(async (_delay: number, _fn: any, _args: any) => {}),
    },
  };
  return { ctx, store, patch };
}

function userRecord(id: string): DbRecord {
  return { _id: id, table: "users", name: `User ${id}`, email: `${id}@test.tn`, phone: "20123456" };
}

function agencyRecord(id: string, userId: string): DbRecord {
  return {
    _id: id,
    table: "professionalPartners",
    userId,
    name: `Agence ${id}`,
    type: "agence",
    regions: ["Tunis"],
    address: "Avenue X",
    phone: "+216 71 000 000",
    email: `contact@${id}.tn`,
    description: "",
    isSubscribed: true,
    specialties: [],
  };
}

function messageRecord(id: string, overrides: Record<string, unknown> = {}): DbRecord {
  return {
    _id: id,
    table: "messages",
    userId: "user-1",
    agencyPartnerId: "agency-1",
    direction: "in",
    type: "message",
    subject: "Agence agency-1",
    content: "Bonjour, nous sommes intéressés par votre bien.",
    createdAt: 1000,
    ...overrides,
  };
}

beforeEach(() => {
  authMock.getAuthUserId.mockReset();
});
afterEach(() => {
  vi.clearAllMocks();
});

describe("getMyInbox — boîte de réception", () => {
  it("retourne les messages du user avec le compteur de non-lus", async () => {
    authMock.getAuthUserId.mockResolvedValue("user-1");
    const { ctx } = makeCtx([
      userRecord("user-1"),
      agencyRecord("agency-1", "agency-user"),
      messageRecord("msg-1", { content: "Premier message", createdAt: 3000 }),
      messageRecord("msg-2", { readAt: 5000, createdAt: 2000 }),
      messageRecord("msg-3", { direction: "out", content: "Votre réponse", createdAt: 1000 }),
    ]);

    const res = (await inboxHandler(ctx)) as any;

    expect(res.messages).toHaveLength(3);
    expect(res.unread).toBe(1); // only msg-1 is unread + incoming
    const incoming = res.messages.find((m: any) => m._id === "msg-1");
    expect(incoming.agency.name).toBe("Agence agency-1");
    expect(incoming.agency.logoUrl).toBeNull();
  });

  it("retourne { messages: [], unread: 0 } sans authentification", async () => {
    authMock.getAuthUserId.mockResolvedValue(null);
    const { ctx } = makeCtx([]);
    const res = await inboxHandler(ctx);
    expect(res).toEqual({ messages: [], unread: 0 });
  });
});

describe("markMessagesRead — marquer comme lu", () => {
  it("marque uniquement les messages entrants du user", async () => {
    authMock.getAuthUserId.mockResolvedValue("user-1");
    const { ctx, store, patch } = makeCtx([
      messageRecord("msg-1"),
      messageRecord("msg-2", { direction: "out", content: "Ma réponse" }),
    ]);

    const res = await markReadHandler(ctx, { ids: ["msg-1", "msg-2"] });
    expect(res).toEqual({ success: true });
    // msg-1 patched with readAt
    expect(store.get("msg-1")!.readAt).toEqual(expect.any(Number));
    // msg-2 is outgoing — not patched
    expect(store.get("msg-2")!.readAt).toBeUndefined();
    expect(patch).toHaveBeenCalledTimes(1);
  });

  it("ne marque pas les messages d'un autre user", async () => {
    authMock.getAuthUserId.mockResolvedValue("user-2");
    const { ctx, store } = makeCtx([messageRecord("msg-1", { userId: "user-1" })]);

    await markReadHandler(ctx, { ids: ["msg-1"] });
    expect(store.get("msg-1")!.readAt).toBeUndefined();
  });
});

describe("markAllMessagesRead — tout marquer lu", () => {
  it("marque tous les messages entrants", async () => {
    authMock.getAuthUserId.mockResolvedValue("user-1");
    const { ctx, store } = makeCtx([
      messageRecord("msg-1"),
      messageRecord("msg-2", { content: "Autre", createdAt: 200 }),
      messageRecord("msg-3", { direction: "out", content: "Rép.", createdAt: 100 }),
    ]);

    const res = await markAllHandler(ctx);
    expect(res).toEqual({ success: true });
    expect(store.get("msg-1")!.readAt).toEqual(expect.any(Number));
    expect(store.get("msg-2")!.readAt).toEqual(expect.any(Number));
    expect(store.get("msg-3")!.readAt).toBeUndefined();
  });
});

describe("sendUserMessage — réponse de l'utilisateur", () => {
  it("refuse un message vide", async () => {
    authMock.getAuthUserId.mockResolvedValue("user-1");
    const { ctx } = makeCtx([userRecord("user-1"), agencyRecord("agency-1", "agency-user")]);
    await expect(
      sendUserHandler(ctx, { agencyPartnerId: "agency-1", content: "   " }),
    ).rejects.toThrow("vide");
  });

  it("refuse si la demande n'appartient pas à l'utilisateur", async () => {
    authMock.getAuthUserId.mockResolvedValue("user-1");
    const { ctx } = makeCtx([
      userRecord("user-1"),
      agencyRecord("agency-1", "agency-user"),
      {
        _id: "req-1",
        table: "agencyRequests",
        userId: "other-user",
        estimationId: "est-1",
        propertyId: "prop-1",
        agencyPartnerId: "agency-1",
        status: "pending",
        createdAt: 100,
      },
    ]);
    await expect(
      sendUserHandler(ctx, { agencyPartnerId: "agency-1", requestId: "req-1", content: "Bonjour" }),
    ).rejects.toThrow("Non autorisé");
  });

  it("crée un message sortant pour l'agence", async () => {
    authMock.getAuthUserId.mockResolvedValue("user-1");
    const { ctx, store } = makeCtx([
      userRecord("user-1"),
      agencyRecord("agency-1", "agency-user"),
      {
        _id: "req-1",
        table: "agencyRequests",
        userId: "user-1",
        estimationId: "est-1",
        propertyId: "prop-1",
        agencyPartnerId: "agency-1",
        status: "pending",
        createdAt: 100,
      },
    ]);

    const res = await sendUserHandler(ctx, {
      agencyPartnerId: "agency-1",
      requestId: "req-1",
      content: "Bonjour, je suis disponible pour une visite.",
    });

    expect(res).toEqual({ success: true });
    const inserted = [...store.values()].find((r) => r.table === "messages");
    expect(inserted).toBeDefined();
    expect(inserted!.direction).toBe("out");
    expect(inserted!.userId).toBe("user-1");
    expect(inserted!.agencyPartnerId).toBe("agency-1");
    expect(inserted!.requestId).toBe("req-1");
    expect(inserted!.content).toBe("Bonjour, je suis disponible pour une visite.");
  });
});

describe("getMyAgencyRequests — infos complètes du bien pour l'agence", () => {
  it("enrichit la demande avec toutes les caractéristiques du bien", async () => {
    authMock.getAuthUserId.mockResolvedValue("agency-user");
    const { ctx } = makeCtx([
      agencyRecord("agency-1", "agency-user"),
      {
        _id: "req-1",
        table: "agencyRequests",
        userId: "user-1",
        estimationId: "est-1",
        propertyId: "prop-1",
        agencyPartnerId: "agency-1",
        userName: "User 1",
        userEmail: "user-1@test.tn",
        userPhone: "+216 98 765 432",
        status: "pending",
        createdAt: 100,
      },
      {
        _id: "est-1",
        table: "estimations",
        estimatedValue: 200000,
        fastSalePrice: 180000,
        maxProfitPrice: 230000,
        priceMin: 170000,
        priceMax: 240000,
        confidenceIndex: 85,
        avgPricePerSqm: 1500,
      },
      {
        _id: "prop-1",
        table: "properties",
        userId: "user-1",
        address: "Rue de Marseille, Lac 2",
        gouvernorat: "Tunis",
        ville: "Tunis",
        quartier: "Les Berges du Lac",
        propertyType: "appartement",
        terrainSurface: 200,
        builtSurface: 120,
        floors: 2,
        bedrooms: 3,
        bathrooms: 2,
        kitchens: 1,
        livingRooms: 1,
        garages: 1,
        hasGarden: false,
        hasPool: false,
        hasTerrace: true,
        hasBalcony: true,
        hasElevator: true,
        hasParking: true,
        hasAC: true,
        hasHeating: false,
        hasSolar: false,
        yearBuilt: 2019,
        generalState: "excellent_etat",
        published: false,
        createdAt: 100,
        updatedAt: 100,
      },
    ]);

    const res = (await agencyRequestsHandler(ctx)) as any[];
    expect(res).toHaveLength(1);
    const p = res[0].property;
    expect(p.address).toBe("Rue de Marseille, Lac 2");
    expect(p.propertyType).toBe("appartement");
    expect(p.builtSurface).toBe(120);
    expect(p.terrainSurface).toBe(200);
    expect(p.floors).toBe(2);
    expect(p.bedrooms).toBe(3);
    expect(p.bathrooms).toBe(2);
    expect(p.kitchens).toBe(1);
    expect(p.livingRooms).toBe(1);
    expect(p.garages).toBe(1);
    expect(p.hasElevator).toBe(true);
    expect(p.hasAC).toBe(true);
    expect(p.yearBuilt).toBe(2019);
    expect(p.generalState).toBe("excellent_etat");
    expect(res[0].estimation.estimatedValue).toBe(200000);
    expect(res[0].thread).toEqual([]);
  });
});

describe("suggestPrice → message dans la boîte de réception", () => {
  it("crée un message 'suggest_price' pour l'utilisateur", async () => {
    authMock.getAuthUserId.mockResolvedValue("agency-user");
    const { ctx, store } = makeCtx([
      userRecord("user-1"),
      agencyRecord("agency-1", "agency-user"),
      {
        _id: "req-1",
        table: "agencyRequests",
        userId: "user-1",
        estimationId: "est-1",
        propertyId: "prop-1",
        agencyPartnerId: "agency-1",
        userName: "User 1",
        userEmail: "user-1@test.tn",
        status: "pending",
        createdAt: 100,
      },
    ]);

    await suggestHandler(ctx, {
      requestId: "req-1",
      suggestedPrice: 190000,
      agencyMessage: "Nous proposons 190 000 TND.",
    });

    const inserted = [...store.values()].find((r) => r.table === "messages");
    expect(inserted).toBeDefined();
    expect(inserted!.userId).toBe("user-1");
    expect(inserted!.direction).toBe("in");
    expect(inserted!.type).toBe("suggest_price");
    expect(inserted!.suggestedPrice).toBe(190000);
    expect(inserted!.content).toBe("Nous proposons 190 000 TND.");
    expect(inserted!.senderName).toBe("Agence agency-1");
    expect(inserted!.readAt).toBeUndefined();
  });
});

describe("sendAgencyMessage — message direct de l'agence", () => {
  it("refuse si l'agence n'est pas propriétaire de la demande", async () => {
    authMock.getAuthUserId.mockResolvedValue("other-agency-user");
    const { ctx } = makeCtx([
      userRecord("user-1"),
      agencyRecord("agency-1", "agency-user"),
      agencyRecord("agency-2", "other-agency-user"),
      {
        _id: "req-1",
        table: "agencyRequests",
        userId: "user-1",
        estimationId: "est-1",
        propertyId: "prop-1",
        agencyPartnerId: "agency-1",
        status: "pending",
        createdAt: 100,
      },
    ]);
    await expect(
      sendAgencyHandler(ctx, { requestId: "req-1", content: "Bonjour" }),
    ).rejects.toThrow("Non autorisé");
  });

  it("délivre un message dans la boîte de réception de l'utilisateur", async () => {
    authMock.getAuthUserId.mockResolvedValue("agency-user");
    const { ctx, store } = makeCtx([
      userRecord("user-1"),
      agencyRecord("agency-1", "agency-user"),
      {
        _id: "req-1",
        table: "agencyRequests",
        userId: "user-1",
        estimationId: "est-1",
        propertyId: "prop-1",
        agencyPartnerId: "agency-1",
        userName: "User 1",
        userEmail: "user-1@test.tn",
        status: "pending",
        createdAt: 100,
      },
    ]);

    const res = await sendAgencyHandler(ctx, {
      requestId: "req-1",
      content: "Pouvez-vous nous rappeler au plus vite ?",
    });

    expect(res).toEqual({ success: true });
    const inserted = [...store.values()].find((r) => r.table === "messages");
    expect(inserted!.userId).toBe("user-1");
    expect(inserted!.direction).toBe("in");
    expect(inserted!.type).toBe("message");
    expect(inserted!.content).toBe("Pouvez-vous nous rappeler au plus vite ?");
    expect(inserted!.senderName).toBe("Agence agency-1");
  });
});
