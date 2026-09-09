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
  const internalMutation = (def: any) => {
    defs.push(def);
    return def;
  };
  return { defs, mutation, query, internalMutation };
});

vi.mock("@convex-dev/auth/server", () => authMock);

// `mutation`/`query` simply capture and return the definition so the
// handler can be invoked directly with a fake ctx.
vi.mock("@/convex/_generated/server", () => ({
  mutation: serverMock.mutation,
  query: serverMock.query,
  internalMutation: serverMock.internalMutation,
}));

import { requireAdmin, bootstrapAdmin, claimAdminByEmail, resetAdminByEmail, deleteUser } from "@/convex/admin";

type Handler = (ctx: any, args?: any) => Promise<unknown>;

type DbRecord = { _id: string; table: string } & Record<string, unknown>;

/**
 * Build a fake Convex ctx backed by an in-memory store.
 * Items are stored with an extra `table` field; `withIndex`/`filter`
 * apply eq predicates so queries behave like the real database.
 */
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
        // Chain helpers: support .collect(), .first() and .order().first()
        const chain = (items: () => DbRecord[]) => ({
          collect: async () => items(),
          first: async () => items()[0] ?? null,
          order: () => ({ collect: async () => items(), first: async () => items()[0] ?? null }),
        });
        return {
          collect: async () => base(),
          order: () => ({ collect: async () => base() }),
          withIndex: (_name: string, build?: any) => chain(() => eqFilter(build)),
          filter: (build: any) => {
            const q = {
              field: (f: string) => f,
              eq: (field: string, value: unknown) => {
                // handled below
              },
            };
            let items = base();
            build({
              ...q,
              eq: (field: string, value: unknown) => {
                items = items.filter((r) => r[field] === value);
              },
            });
            return { collect: async () => items };
          },
        };
      }),
    },
  };
  return { ctx, store, patch, del };
}

function userRecord(id: string, role: string): DbRecord {
  return { _id: id, table: "users", name: `User ${id}`, email: `${id}@test.tn`, role };
}

describe("requireAdmin", () => {
  it("refuse un utilisateur non authentifié", async () => {
    authMock.getAuthUserId.mockResolvedValue(null);
    const { ctx } = makeCtx([]);
    await expect(requireAdmin(ctx as any)).rejects.toThrow("Non authentifié");
  });

  it("refuse un utilisateur inexistant", async () => {
    authMock.getAuthUserId.mockResolvedValue("ghost");
    const { ctx } = makeCtx([]);
    await expect(requireAdmin(ctx as any)).rejects.toThrow(
      "Accès réservé aux administrateurs",
    );
  });

  it("refuse un utilisateur sans rôle admin", async () => {
    authMock.getAuthUserId.mockResolvedValue("user-1");
    const { ctx } = makeCtx([userRecord("user-1", "user")]);
    await expect(requireAdmin(ctx as any)).rejects.toThrow(
      "Accès réservé aux administrateurs",
    );
  });

  it("autorise un admin et renvoie son id", async () => {
    authMock.getAuthUserId.mockResolvedValue("admin-1");
    const { ctx } = makeCtx([userRecord("admin-1", "admin")]);
    await expect(requireAdmin(ctx as any)).resolves.toBe("admin-1");
  });
});

describe("bootstrapAdmin", () => {
  const handler = (bootstrapAdmin as unknown as { handler: Handler }).handler;

  it("refuse un utilisateur non authentifié", async () => {
    authMock.getAuthUserId.mockResolvedValue(null);
    const { ctx } = makeCtx([]);
    await expect(handler(ctx, {})).rejects.toThrow("Non authentifié");
  });

  it("promeut le premier utilisateur en admin quand aucun admin n'existe", async () => {
    authMock.getAuthUserId.mockResolvedValue("user-1");
    const { ctx, patch } = makeCtx([userRecord("user-1", "user")]);

    const res = await handler(ctx, {});
    expect(res).toEqual({ success: true, alreadyAdmin: false });
    expect(patch).toHaveBeenCalledWith("user-1", { role: "admin" });
  });

  it("refuse la promotion quand un admin existe déjà", async () => {
    authMock.getAuthUserId.mockResolvedValue("user-2");
    const { ctx, patch } = makeCtx([
      userRecord("admin-1", "admin"),
      userRecord("user-2", "user"),
    ]);

    await expect(handler(ctx, {})).rejects.toThrow(
      "Un administrateur existe déjà",
    );
    expect(patch).not.toHaveBeenCalled();
  });

  it("ne fait rien (alreadyAdmin) quand l'appelant est déjà admin", async () => {
    authMock.getAuthUserId.mockResolvedValue("admin-1");
    const { ctx, patch } = makeCtx([userRecord("admin-1", "admin")]);

    const res = await handler(ctx, {});
    expect(res).toEqual({ success: true, alreadyAdmin: true });
    expect(patch).not.toHaveBeenCalled();
  });
});

describe("claimAdminByEmail", () => {
  const handler = (claimAdminByEmail as unknown as { handler: Handler }).handler;
  const originalEnv = process.env.ADMIN_EMAIL;

  beforeEach(() => {
    process.env.ADMIN_EMAIL = "root@baticost.tn";
  });
  afterEach(() => {
    if (originalEnv === undefined) delete process.env.ADMIN_EMAIL;
    else process.env.ADMIN_EMAIL = originalEnv;
  });

  it("refuse un utilisateur non authentifié", async () => {
    authMock.getAuthUserId.mockResolvedValue(null);
    const { ctx, patch } = makeCtx([]);
    await expect(handler(ctx, {})).rejects.toThrow("Non authentifié");
    expect(patch).not.toHaveBeenCalled();
  });

  it("refuse quand ADMIN_EMAIL n'est pas configuré", async () => {
    delete process.env.ADMIN_EMAIL;
    authMock.getAuthUserId.mockResolvedValue("user-1");
    const { ctx, patch } = makeCtx([
      userRecord("user-1", "user"),
      userRecord("admin-1", "admin"),
    ]);
    await expect(handler(ctx, {})).rejects.toThrow(
      "ADMIN_EMAIL est absente",
    );
    expect(patch).not.toHaveBeenCalled();
  });

  it("refuse quand l'e-mail du compte ne correspond pas à ADMIN_EMAIL", async () => {
    authMock.getAuthUserId.mockResolvedValue("user-1");
    const { ctx, patch } = makeCtx([
      { _id: "user-1", table: "users", name: "Jean", email: "jean@autre.tn", role: "user" },
      userRecord("admin-1", "admin"),
    ]);
    await expect(handler(ctx, {})).rejects.toThrow(
      "Votre e-mail ne correspond pas",
    );
    expect(patch).not.toHaveBeenCalled();
  });

  it("promeut en admin le compte dont l'e-mail = ADMIN_EMAIL (même si un admin existe)", async () => {
    authMock.getAuthUserId.mockResolvedValue("user-1");
    const { ctx, patch } = makeCtx([
      { _id: "user-1", table: "users", name: "Root", email: "root@baticost.tn", role: "user" },
      userRecord("admin-1", "admin"),
    ]);

    const res = await handler(ctx, {});
    expect(res).toEqual({ success: true });
    expect(patch).toHaveBeenCalledWith("user-1", { role: "admin" });
  });

  it("est insensible à la casse pour la comparaison des e-mails", async () => {
    authMock.getAuthUserId.mockResolvedValue("user-1");
    const { ctx, patch } = makeCtx([
      { _id: "user-1", table: "users", name: "Root", email: "Root@Baticost.TN", role: "user" },
      userRecord("admin-1", "admin"),
    ]);

    await handler(ctx, {});
    expect(patch).toHaveBeenCalledWith("user-1", { role: "admin" });
  });
});

describe("resetAdminByEmail", () => {
  const handler = (resetAdminByEmail as unknown as { handler: Handler }).handler;

  it("refuse un e-mail vide", async () => {
    const { ctx, patch } = makeCtx([]);
    await expect(handler(ctx, { email: "   " })).rejects.toThrow("E-mail vide");
    expect(patch).not.toHaveBeenCalled();
  });

  it("refuse quand aucun utilisateur ne correspond à l'e-mail", async () => {
    const { ctx, patch } = makeCtx([
      userRecord("user-1", "user"),
      userRecord("admin-1", "admin"),
    ]);
    await expect(handler(ctx, { email: "ghost@test.tn" })).rejects.toThrow(
      "Aucun utilisateur trouvé",
    );
    expect(patch).not.toHaveBeenCalled();
  });

  it("promeut l'utilisateur dont l'e-mail correspond (insensible à la casse)", async () => {
    const { ctx, patch } = makeCtx([
      { _id: "user-1", table: "users", name: "Jean", email: "Jean@Baticost.TN", role: "user" },
      userRecord("admin-1", "admin"),
    ]);

    const res = await handler(ctx, { email: "jean@baticost.tn" });
    expect(res).toEqual({
      success: true,
      userId: "user-1",
      email: "Jean@Baticost.TN",
      wasAlreadyAdmin: false,
    });
    expect(patch).toHaveBeenCalledWith("user-1", { role: "admin" });
  });

  it("signale wasAlreadyAdmin quand l'utilisateur est déjà admin", async () => {
    authMock.getAuthUserId.mockResolvedValue("admin-1");
    const { ctx, patch } = makeCtx([
      userRecord("admin-1", "admin"),
    ]);

    const res = (await handler(ctx, { email: "admin-1@test.tn" })) as {
      wasAlreadyAdmin: boolean;
    };
    expect(res.wasAlreadyAdmin).toBe(true);
    // Le patch est appliqué quand même (idempotent)
    expect(patch).toHaveBeenCalledWith("admin-1", { role: "admin" });
  });
});

describe("deleteUser", () => {
  const handler = (deleteUser as unknown as { handler: Handler }).handler;

  it("refuse la suppression de son propre compte", async () => {
    authMock.getAuthUserId.mockResolvedValue("admin-1");
    const { ctx, del } = makeCtx([
      userRecord("admin-1", "admin"),
      userRecord("user-2", "user"),
    ]);

    await expect(handler(ctx, { userId: "admin-1" })).rejects.toThrow(
      "Vous ne pouvez pas supprimer votre propre compte",
    );
    expect(del).not.toHaveBeenCalled();
  });

  it("refuse aux non-admins de supprimer un utilisateur", async () => {
    authMock.getAuthUserId.mockResolvedValue("user-1");
    const { ctx, del } = makeCtx([
      userRecord("user-1", "user"),
      userRecord("user-2", "user"),
    ]);

    await expect(handler(ctx, { userId: "user-2" })).rejects.toThrow(
      "Accès réservé aux administrateurs",
    );
    expect(del).not.toHaveBeenCalled();
  });

  it("supprime l'utilisateur et toutes ses données (cascade)", async () => {
    authMock.getAuthUserId.mockResolvedValue("admin-1");
    const { ctx, del } = makeCtx([
      userRecord("admin-1", "admin"),
      userRecord("victim", "user"),
      userRecord("other", "user"),
      { _id: "p1", table: "properties", userId: "victim" },
      { _id: "e1", table: "estimations", userId: "victim" },
      { _id: "s1", table: "subscriptions", userId: "victim" },
      { _id: "l1", table: "listings", userId: "victim" },
      { _id: "r1", table: "agencyRequests", userId: "victim" },
      { _id: "rp1", table: "sharedReports", userId: "victim" },
      { _id: "pr1", table: "professionalPartners", userId: "victim" },
      // Données d'un autre utilisateur — ne doivent PAS être supprimées
      { _id: "p2", table: "properties", userId: "other" },
    ]);

    const res = await handler(ctx, { userId: "victim" });

    // 7 données liées + 1 utilisateur
    expect(res).toEqual({ success: true, deleted: 8 });
    for (const id of ["p1", "e1", "s1", "l1", "r1", "rp1", "pr1", "victim"]) {
      expect(del).toHaveBeenCalledWith(id);
    }
    expect(del).not.toHaveBeenCalledWith("p2");
    expect(del).not.toHaveBeenCalledWith("other");
    expect(del).not.toHaveBeenCalledWith("admin-1");
  });
});
