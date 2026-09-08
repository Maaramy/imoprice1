import { describe, it, expect, vi, beforeEach } from "vitest";

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

import { setUserRole } from "@/convex/admin";

type Handler = (ctx: any, args: any) => Promise<unknown>;

/** Build a fake Convex ctx backed by an in-memory users map. */
function makeCtx(
  users: Record<string, { id: string; role?: string } | undefined>,
) {
  const patch = vi.fn(async () => undefined);
  const ctx = {
    db: {
      get: vi.fn(async (id: string) => users[id] ?? null),
      patch,
      query: vi.fn(),
      insert: vi.fn(),
      delete: vi.fn(),
    },
  };
  return { ctx, patch };
}

describe("setUserRole", () => {
  const handler = (setUserRole as unknown as { handler: Handler }).handler;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refuse de modifier son propre rôle", async () => {
    const adminId = "admin-1";
    authMock.getAuthUserId.mockResolvedValue(adminId);
    const { ctx, patch } = makeCtx({
      [adminId]: { id: adminId, role: "admin" },
      "user-2": { id: "user-2", role: "user" },
    });

    await expect(
      handler(ctx, { userId: adminId, role: "user" }),
    ).rejects.toThrow("Vous ne pouvez pas modifier votre propre rôle");
    expect(patch).not.toHaveBeenCalled();
  });

  it("refuse de se rétrograder soi-même même avec le même rôle", async () => {
    const adminId = "admin-1";
    authMock.getAuthUserId.mockResolvedValue(adminId);
    const { ctx, patch } = makeCtx({
      [adminId]: { id: adminId, role: "admin" },
    });

    await expect(
      handler(ctx, { userId: adminId, role: "member" }),
    ).rejects.toThrow("Vous ne pouvez pas modifier votre propre rôle");
    expect(patch).not.toHaveBeenCalled();
  });

  it("autorise un admin à modifier le rôle d'un autre utilisateur", async () => {
    const adminId = "admin-1";
    authMock.getAuthUserId.mockResolvedValue(adminId);
    const { ctx, patch } = makeCtx({
      [adminId]: { id: adminId, role: "admin" },
      "user-2": { id: "user-2", role: "user" },
    });

    const res = await handler(ctx, { userId: "user-2", role: "member" });
    expect(res).toEqual({ success: true });
    expect(patch).toHaveBeenCalledWith("user-2", { role: "member" });
  });

  it("refuse aux non-admins de modifier un rôle", async () => {
    authMock.getAuthUserId.mockResolvedValue("user-2");
    const { ctx, patch } = makeCtx({
      "user-2": { id: "user-2", role: "user" },
      "user-3": { id: "user-3", role: "user" },
    });

    await expect(
      handler(ctx, { userId: "user-3", role: "admin" }),
    ).rejects.toThrow("Accès réservé aux administrateurs");
    expect(patch).not.toHaveBeenCalled();
  });
});
