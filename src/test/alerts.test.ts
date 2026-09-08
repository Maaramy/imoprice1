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
  internalMutation: serverMock.mutation,
  query: serverMock.query,
}));

import {
  createPriceAlert,
  deletePriceAlert,
  getMyPriceAlerts,
  checkPriceAlerts,
} from "@/convex/alerts";

type Handler = (ctx: any, args?: any) => Promise<unknown>;
const createHandler = (createPriceAlert as unknown as { handler: Handler }).handler;
const deleteHandler = (deletePriceAlert as unknown as { handler: Handler }).handler;
const listHandler = (getMyPriceAlerts as unknown as { handler: Handler }).handler;
const checkHandler = (checkPriceAlerts as unknown as { handler: Handler }).handler;

type DbRecord = { _id: string; table: string } & Record<string, unknown>;

/** In-memory fake Convex ctx (same shape as the other backend tests). */
function makeCtx(records: DbRecord[]) {
  const store = new Map<string, DbRecord>(records.map((r) => [r._id, r]));
  const insert = vi.fn(async (table: string, doc: Record<string, unknown>) => {
    const id = `auto-${store.size + 1}`;
    store.set(id, { _id: id, table, ...doc });
    return id;
  });
  const patch = vi.fn(async (id: string, p: Record<string, unknown>) => {
    const cur = store.get(id);
    if (cur) store.set(id, { ...cur, ...p });
  });
  const listByTable = (table: string) => [...store.values()].filter((r) => r.table === table);

  const ctx = {
    db: {
      get: vi.fn(async (id: string) => store.get(id) ?? null),
      patch,
      delete: vi.fn(async (id: string) => store.delete(id)),
      insert,
      query: vi.fn((table: string) => {
        const base = () => listByTable(table);
        const eqFilter = (build: any) => {
          let items = base();
          if (build) {
            // Le builder Convex est chaînable : q.eq(a, x).eq(b, y)
            const chain: any = {
              eq: (field: string, value: unknown) => {
                items = items.filter((r) => r[field] === value);
                return chain;
              },
            };
            build(chain);
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
    scheduler: {
      runAfter: vi.fn(async (_delay: number, _fn: any, _args: any) => {}),
    },
  };
  return { ctx, store, insert, patch };
}

function userRecord(id: string, overrides: Record<string, unknown> = {}): DbRecord {
  return { _id: id, table: "users", name: "User", email: "user@test.tn", ...overrides };
}

beforeEach(() => {
  authMock.getAuthUserId.mockReset();
});
afterEach(() => {
  vi.clearAllMocks();
});

describe("createPriceAlert — création d'alerte", () => {
  it("crée une alerte avec le prix / m² actuel du marché (Tunis, appartement = 4083 TND/m²)", async () => {
    authMock.getAuthUserId.mockResolvedValue("user-1");
    const { ctx, insert } = makeCtx([]);

    const res = (await createHandler(ctx, {
      gouvernorat: "Tunis",
      propertyType: "appartement",
      direction: "above",
      targetPrice: 3500,
    })) as any;

    expect(res.updated).toBe(false);
    expect(res.current).toBe(4083); // prix de base REGION_BASE_PRICES Tunis.appartement
    expect(insert).toHaveBeenCalledTimes(1);
    const doc = insert.mock.calls[0][1];
    expect(doc).toMatchObject({
      userId: "user-1",
      gouvernorat: "Tunis",
      propertyType: "appartement",
      direction: "above",
      targetPrice: 3500,
      basePriceAtCreation: 4083,
      triggered: false,
    });
  });

  it("met à jour la cible au lieu de créer un doublon", async () => {
    authMock.getAuthUserId.mockResolvedValue("user-1");
    const { ctx, insert, patch, store } = makeCtx([
      {
        _id: "alert-1",
        table: "priceAlerts",
        userId: "user-1",
        gouvernorat: "Tunis",
        propertyType: "appartement",
        direction: "above",
        targetPrice: 3500,
        basePriceAtCreation: 4083,
        triggered: false,
        createdAt: 100,
      },
    ]);

    const res = (await createHandler(ctx, {
      gouvernorat: "Tunis",
      propertyType: "appartement",
      direction: "above",
      targetPrice: 3800,
    })) as any;

    expect(res.updated).toBe(true);
    expect(res.alertId).toBe("alert-1");
    expect(insert).not.toHaveBeenCalled();
    expect(patch).toHaveBeenCalledTimes(1);
    expect(store.get("alert-1")!.targetPrice).toBe(3800);
  });
});

describe("checkPriceAlerts — déclenchement quotidien", () => {
  it("déclenche une alerte 'above' quand le prix du marché dépasse la cible + message + email", async () => {
    authMock.getAuthUserId.mockResolvedValue("user-1");
    const { ctx, store } = makeCtx([
      userRecord("user-1"),
      {
        _id: "alert-1",
        table: "priceAlerts",
        userId: "user-1",
        gouvernorat: "Tunis",
        propertyType: "appartement",
        direction: "above",
        targetPrice: 3000, // le marché Tunis (4083) est déjà au-dessus → déclenchement
        basePriceAtCreation: 3100,
        triggered: false,
        createdAt: 100,
      },
    ]);

    const res = (await checkHandler(ctx)) as any;
    expect(res.triggered).toBe(1);
    expect(store.get("alert-1")!.triggered).toBe(true);
    expect(store.get("alert-1")!.triggeredAt).toEqual(expect.any(Number));

    // Un message système est déposé dans la boîte de réception
    const msg = [...store.values()].find((r) => r.table === "messages");
    expect(msg).toBeDefined();
    expect(msg!.type).toBe("system");
    expect(msg!.userId).toBe("user-1");

    // Un email est programmé (best-effort)
    expect(ctx.scheduler.runAfter).toHaveBeenCalledTimes(1);
    const [delay, _fn, payload] = ctx.scheduler.runAfter.mock.calls[0];
    expect(delay).toBe(0);
    expect(payload.to).toBe("user@test.tn");
  });

  it("ne déclenche pas une alerte dont la cible n'est pas atteinte", async () => {
    authMock.getAuthUserId.mockResolvedValue("user-1");
    const { ctx, store } = makeCtx([
      userRecord("user-1"),
      {
        _id: "alert-1",
        table: "priceAlerts",
        userId: "user-1",
        gouvernorat: "Tunis",
        propertyType: "appartement",
        direction: "above",
        targetPrice: 9000, // très haut → jamais atteint avec 4083
        basePriceAtCreation: 4083,
        triggered: false,
        createdAt: 100,
      },
    ]);

    const res = (await checkHandler(ctx)) as any;
    expect(res.triggered).toBe(0);
    expect(store.get("alert-1")!.triggered).toBe(false);
    expect(store.get("alert-1")!.lastCheckedAt).toEqual(expect.any(Number));
    expect(ctx.scheduler.runAfter).not.toHaveBeenCalled();
  });
});

describe("getMyPriceAlerts — lecture enrichie", () => {
  it("retourne les alertes du user avec le prix actuel du marché", async () => {
    authMock.getAuthUserId.mockResolvedValue("user-1");
    const { ctx } = makeCtx([
      {
        _id: "alert-1",
        table: "priceAlerts",
        userId: "user-1",
        gouvernorat: "Béja",
        propertyType: "maison",
        direction: "below",
        targetPrice: 1600,
        basePriceAtCreation: 1546,
        triggered: false,
        createdAt: 100,
      },
    ]);

    const res = (await listHandler(ctx)) as any[];
    expect(res).toHaveLength(1);
    expect(res[0].currentPrice).toBe(1546); // REGION_BASE_PRICES Béja.maison
    expect(res[0].propertyType).toBe("maison");
  });
});

describe("deletePriceAlert — suppression", () => {
  it("supprime uniquement ses propres alertes", async () => {
    authMock.getAuthUserId.mockResolvedValue("user-1");
    const { ctx, store } = makeCtx([
      {
        _id: "alert-1",
        table: "priceAlerts",
        userId: "user-1",
        gouvernorat: "Tunis",
        direction: "above",
        targetPrice: 3500,
        basePriceAtCreation: 4083,
        triggered: false,
        createdAt: 100,
      },
    ]);

    await deleteHandler(ctx, { alertId: "alert-1" });
    expect(store.has("alert-1")).toBe(false);
  });
});
