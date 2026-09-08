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
  sendEstimationToAgency,
  suggestPrice,
  getAgencyResponsesForEstimation,
  deleteAgencyRequest,
  sendRentEstimationToAgency,
  getAgencyResponsesForRentEstimation,
} from "@/convex/agencies";

type Handler = (ctx: any, args?: any) => Promise<unknown>;

// The mocked mutation/query return the definition object { args, handler },
// so tests invoke the real handler via `.handler`.
const sendHandler = (sendEstimationToAgency as unknown as { handler: Handler }).handler;
const suggestHandler = (suggestPrice as unknown as { handler: Handler }).handler;
const responsesHandler = (getAgencyResponsesForEstimation as unknown as { handler: Handler }).handler;
const deleteHandler = (deleteAgencyRequest as unknown as { handler: Handler }).handler;
const sendRentHandler = (sendRentEstimationToAgency as unknown as { handler: Handler }).handler;
const rentResponsesHandler = (getAgencyResponsesForRentEstimation as unknown as { handler: Handler }).handler;
type DbRecord = { _id: string; table: string } & Record<string, unknown>;

/** In-memory fake Convex ctx (same shape as admin-mutations tests). */
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

function estimationRecord(id: string): DbRecord {
  return {
    _id: id,
    table: "estimations",
    estimatedValue: 200000,
    fastSalePrice: 180000,
    maxProfitPrice: 230000,
    priceMin: 170000,
    priceMax: 240000,
    confidenceIndex: 85,
    avgPricePerSqm: 1500,
  };
}

function rentEstimationRecord(id: string): DbRecord {
  return {
    _id: id,
    table: "rentEstimations",
    estimatedRent: 1250,
    rentMin: 1100,
    rentMax: 1400,
    rentPerSqm: 12.5,
    confidenceIndex: 92,
    grossYield: 6.2,
    annualRent: 15000,
    property: {
      propertyType: "appartement",
      gouvernorat: "Tunis",
      ville: "Tunis",
      quartier: "Les Berges du Lac",
      builtSurface: 90,
      isFurnished: true,
    },
  };
}

function rentRequestRecord(
  overrides: Partial<DbRecord> = {},
): DbRecord {
  return {
    _id: "rent-req-1",
    table: "agencyRequests",
    userId: "user-1",
    rentEstimationId: "rent-est-1",
    agencyPartnerId: "agency-1",
    userName: "User 1",
    userEmail: "user-1@test.tn",
    status: "pending",
    createdAt: Date.now(),
    ...overrides,
  };
}

beforeEach(() => {
  authMock.getAuthUserId.mockReset();
});
afterEach(() => {
  vi.clearAllMocks();
});

describe("sendEstimationToAgency — scénario de prix", () => {
  it("enregistre le scénario choisi par l'utilisateur", async () => {
    authMock.getAuthUserId.mockResolvedValue("user-1");
    const { ctx, store } = makeCtx([
      userRecord("user-1"),
      agencyRecord("agency-1", "agency-user"),
    ]);

    await sendHandler(ctx, {
      estimationId: "est-1",
      propertyId: "prop-1",
      agencyPartnerId: "agency-1",
      priceScenario: "optimiste",
    });

    const inserted = [...store.values()].find((r) => r.table === "agencyRequests");
    expect(inserted).toBeDefined();
    expect(inserted!.priceScenario).toBe("optimiste");
    expect(inserted!.userId).toBe("user-1");
    expect(inserted!.status).toBe("pending");
  });

  it("refuse d'envoyer une estimation à sa propre agence", async () => {
    authMock.getAuthUserId.mockResolvedValue("user-1");
    // user-1 owns agency-1 (same userId)
    const { ctx } = makeCtx([
      userRecord("user-1"),
      agencyRecord("agency-1", "user-1"),
    ]);

    await expect(
      sendHandler(ctx, {
        estimationId: "est-1",
        propertyId: "prop-1",
        agencyPartnerId: "agency-1",
      }),
    ).rejects.toThrow("votre propre agence");
  });

  it("refuse un envoi dupliqué à la même agence", async () => {
    authMock.getAuthUserId.mockResolvedValue("user-1");
    const { ctx } = makeCtx([
      userRecord("user-1"),
      agencyRecord("agency-1", "agency-user"),
      {
        _id: "req-1",
        table: "agencyRequests",
        userId: "user-1",
        estimationId: "est-1",
        agencyPartnerId: "agency-1",
        status: "pending",
        createdAt: Date.now(),
      },
    ]);

    await expect(
      sendHandler(ctx, {
        estimationId: "est-1",
        propertyId: "prop-1",
        agencyPartnerId: "agency-1",
      }),
    ).rejects.toThrow("déjà envoyé");
  });
});

describe("suggestPrice — contre-offre de l'agence", () => {
  const requestRecord = (): DbRecord => ({
    _id: "req-1",
    table: "agencyRequests",
    userId: "user-1",
    estimationId: "est-1",
    propertyId: "prop-1",
    agencyPartnerId: "agency-1",
    userName: "User 1",
    userEmail: "user-1@test.tn",
    status: "pending",
    createdAt: Date.now(),
  });

  it("refuse un utilisateur non authentifié", async () => {
    authMock.getAuthUserId.mockResolvedValue(null);
    const { ctx } = makeCtx([]);
    await expect(
      suggestHandler(ctx, {
        requestId: "req-1",
        suggestedPrice: 190000,
      }),
    ).rejects.toThrow("Non authentifié");
  });

  it("refuse un prix non positif", async () => {
    authMock.getAuthUserId.mockResolvedValue("agency-user");
    const { ctx } = makeCtx([requestRecord()]);
    await expect(
      suggestHandler(ctx, {
        requestId: "req-1",
        suggestedPrice: 0,
      }),
    ).rejects.toThrow("supérieur à 0");
  });

  it("refuse si l'agence n'est pas propriétaire de la demande", async () => {
    authMock.getAuthUserId.mockResolvedValue("other-agency-user");
    const { ctx } = makeCtx([
      requestRecord(),
      agencyRecord("agency-1", "agency-user"),
      agencyRecord("agency-2", "other-agency-user"),
    ]);
    await expect(
      suggestHandler(ctx, {
        requestId: "req-1",
        suggestedPrice: 190000,
      }),
    ).rejects.toThrow("Non autorisé");
  });

  it("enregistre le prix suggéré et passe le statut à 'suggested'", async () => {
    authMock.getAuthUserId.mockResolvedValue("agency-user");
    const { ctx, store, patch } = makeCtx([
      requestRecord(),
      agencyRecord("agency-1", "agency-user"),
    ]);

    const res = await suggestHandler(ctx, {
      requestId: "req-1",
      suggestedPrice: 190000,
      agencyMessage: "Nous pouvons viser 190 000 TND.",
    });

    expect(res).toEqual({ success: true });
    expect(patch).toHaveBeenCalledWith("req-1", expect.objectContaining({
      suggestedPrice: 190000,
      agencyMessage: "Nous pouvons viser 190 000 TND.",
      status: "suggested",
    }));
    const stored = store.get("req-1");
    expect(stored!.suggestedPrice).toBe(190000);
    expect(stored!.status).toBe("suggested");
    expect(stored!.suggestedAt).toEqual(expect.any(Number));
  });
});

describe("deleteAgencyRequest — suppression d'une demande reçue", () => {
  const deleteRequestRecord = (): DbRecord => ({
    _id: "req-1",
    table: "agencyRequests",
    userId: "user-1",
    estimationId: "est-1",
    propertyId: "prop-1",
    agencyPartnerId: "agency-1",
    userName: "User 1",
    userEmail: "user-1@test.tn",
    status: "pending",
    createdAt: Date.now(),
  });

  it("refuse un utilisateur non authentifié", async () => {
    authMock.getAuthUserId.mockResolvedValue(null);
    const { ctx } = makeCtx([]);
    await expect(
      deleteHandler(ctx, { requestId: "req-1" }),
    ).rejects.toThrow("Non authentifié");
  });

  it("refuse si l'agence n'est pas propriétaire de la demande", async () => {
    authMock.getAuthUserId.mockResolvedValue("other-agency-user");
    const { ctx } = makeCtx([
      deleteRequestRecord(),
      agencyRecord("agency-1", "agency-user"),
      agencyRecord("agency-2", "other-agency-user"),
    ]);
    await expect(
      deleteHandler(ctx, { requestId: "req-1" }),
    ).rejects.toThrow("Non autorisé");
  });

  it("supprime la demande appartenant à l'agence", async () => {
    authMock.getAuthUserId.mockResolvedValue("agency-user");
    const { ctx, store } = makeCtx([
      deleteRequestRecord(),
      agencyRecord("agency-1", "agency-user"),
    ]);

    const res = await deleteHandler(ctx, { requestId: "req-1" });
    expect(res).toEqual({ success: true });
    expect(store.get("req-1")).toBeUndefined();
  });
});

describe("sendRentEstimationToAgency — scénario de loyer (mensuel / nuitée)", () => {
  it("enregistre le scénario de loyer choisi par l'utilisateur", async () => {
    authMock.getAuthUserId.mockResolvedValue("user-1");
    const { ctx, store } = makeCtx([
      userRecord("user-1"),
      agencyRecord("agency-1", "agency-user"),
    ]);

    await sendRentHandler(ctx, {
      rentEstimationId: "rent-est-1",
      agencyPartnerId: "agency-1",
      message: "Bonjour, je cherche une agence pour gérer mon bien",
      rentPriceScenario: "prudent",
    });

    const inserted = [...store.values()].find((r) => r.table === "agencyRequests");
    expect(inserted).toBeDefined();
    expect(inserted!.rentPriceScenario).toBe("prudent");
    expect(inserted!.rentEstimationId).toBe("rent-est-1");
    expect(inserted!.userId).toBe("user-1");
    expect(inserted!.status).toBe("pending");
    expect(inserted!.message).toContain("gérer mon bien");
  });

  it("refuse un utilisateur non authentifié", async () => {
    authMock.getAuthUserId.mockResolvedValue(null);
    const { ctx } = makeCtx([]);
    await expect(
      sendRentHandler(ctx, {
        rentEstimationId: "rent-est-1",
        agencyPartnerId: "agency-1",
      }),
    ).rejects.toThrow("Non authentifié");
  });

  it("refuse d'envoyer une estimation de loyer à sa propre agence", async () => {
    authMock.getAuthUserId.mockResolvedValue("user-1");
    // user-1 owns agency-1 (same userId)
    const { ctx } = makeCtx([
      userRecord("user-1"),
      agencyRecord("agency-1", "user-1"),
    ]);

    await expect(
      sendRentHandler(ctx, {
        rentEstimationId: "rent-est-1",
        agencyPartnerId: "agency-1",
      }),
    ).rejects.toThrow("votre propre agence");
  });

  it("refuse un envoi dupliqué à la même agence (même estimation de loyer)", async () => {
    authMock.getAuthUserId.mockResolvedValue("user-1");
    const { ctx } = makeCtx([
      userRecord("user-1"),
      agencyRecord("agency-1", "agency-user"),
      rentRequestRecord(),
    ]);

    await expect(
      sendRentHandler(ctx, {
        rentEstimationId: "rent-est-1",
        agencyPartnerId: "agency-1",
        rentPriceScenario: "optimiste",
      }),
    ).rejects.toThrow("déjà envoyé");
  });

  it("autorise l'envoi de la même estimation à deux agences différentes", async () => {
    authMock.getAuthUserId.mockResolvedValue("user-1");
    const { ctx, store } = makeCtx([
      userRecord("user-1"),
      agencyRecord("agency-1", "agency-user-1"),
      agencyRecord("agency-2", "agency-user-2"),
      rentRequestRecord({ _id: "rent-req-1", agencyPartnerId: "agency-1" }),
    ]);

    await sendRentHandler(ctx, {
      rentEstimationId: "rent-est-1",
      agencyPartnerId: "agency-2",
      rentPriceScenario: "realiste",
    });

    const requests = [...store.values()].filter((r) => r.table === "agencyRequests");
    expect(requests).toHaveLength(2);
    expect(requests.some((r) => r.agencyPartnerId === "agency-2")).toBe(true);
  });
});

describe("getAgencyResponsesForRentEstimation — réponses de loyer visibles côté utilisateur", () => {
  it("retourne uniquement les demandes de loyer avec un prix suggéré et enrichit avec le loyer estimé", async () => {
    authMock.getAuthUserId.mockResolvedValue("user-1");
    const { ctx } = makeCtx([
      userRecord("user-1"),
      agencyRecord("agency-1", "agency-user"),
      rentEstimationRecord("rent-est-1"),
      rentRequestRecord({
        _id: "rent-req-1",
        status: "suggested",
        suggestedPrice: 1350,
        agencyMessage: "Nous pouvons le louer à 1 350 TND.",
        suggestedAt: 1000,
      }),
      rentRequestRecord({
        _id: "rent-req-2",
        status: "pending",
        createdAt: 200,
      }),
      rentRequestRecord({
        _id: "rent-req-3",
        rentEstimationId: "other-rent-est",
        status: "suggested",
        suggestedPrice: 900,
        suggestedAt: 2000,
      }),
    ]);

    const res = (await rentResponsesHandler(ctx, {
      rentEstimationId: "rent-est-1",
    })) as any[];

    expect(res).toHaveLength(1);
    expect(res[0]._id).toBe("rent-req-1");
    expect(res[0].agencyName).toBe("Agence agency-1");
    expect(res[0].suggestedPrice).toBe(1350);
    expect(res[0].estimatedRent).toBe(1250);
    expect(res[0].rentMin).toBe(1100);
    expect(res[0].rentMax).toBe(1400);
  });

  it("retourne [] sans authentification", async () => {
    authMock.getAuthUserId.mockResolvedValue(null);
    const { ctx } = makeCtx([]);
    const res = await rentResponsesHandler(ctx, {
      rentEstimationId: "rent-est-1",
    });
    expect(res).toEqual([]);
  });
});

describe("getAgencyResponsesForEstimation — réponses visibles côté utilisateur", () => {
  it("retourne uniquement les demandes avec un prix suggéré pour cette estimation", async () => {
    authMock.getAuthUserId.mockResolvedValue("user-1");
    const { ctx } = makeCtx([
      userRecord("user-1"),
      agencyRecord("agency-1", "agency-user"),
      estimationRecord("est-1"),
      {
        _id: "req-1",
        table: "agencyRequests",
        userId: "user-1",
        estimationId: "est-1",
        agencyPartnerId: "agency-1",
        status: "suggested",
        suggestedPrice: 190000,
        agencyMessage: "Contre-offre",
        suggestedAt: 1000,
        createdAt: 100,
      },
      {
        _id: "req-2",
        table: "agencyRequests",
        userId: "user-1",
        estimationId: "est-1",
        agencyPartnerId: "agency-1",
        status: "pending",
        createdAt: 200,
      },
      {
        _id: "req-3",
        table: "agencyRequests",
        userId: "user-1",
        estimationId: "other-est",
        agencyPartnerId: "agency-1",
        status: "suggested",
        suggestedPrice: 100000,
        suggestedAt: 2000,
        createdAt: 300,
      },
    ]);

    const res = (await responsesHandler(ctx, {
      estimationId: "est-1",
    })) as any[];

    expect(res).toHaveLength(1);
    expect(res[0]._id).toBe("req-1");
    expect(res[0].agencyName).toBe("Agence agency-1");
    expect(res[0].suggestedPrice).toBe(190000);
    expect(res[0].estimatedValue).toBe(200000);
  });

  it("retourne [] sans authentification", async () => {
    authMock.getAuthUserId.mockResolvedValue(null);
    const { ctx } = makeCtx([]);
    const res = await responsesHandler(ctx, {
      estimationId: "est-1",
    });
    expect(res).toEqual([]);
  });
});
