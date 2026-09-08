/**
 * GitHub integration — repository creation for the project.
 *
 * Reads the GitHub token from the environment (set via the Freebuff Keys tab
 * or the Convex dashboard environment variables, name: `GITHUB_TOKEN`,
 * fallback: `GH_TOKEN`) and creates the private `baticost-ai` repository
 * through the GitHub REST API. Admin-guarded.
 */
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { action, internalQuery, query, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAdmin } from "./admin";

const REPO_NAME = "baticost-ai";
const REPO_DESCRIPTION =
  "baticost AI — estimation immobilière intelligente pour la Tunisie (vente/achat, location, nuitée, agences).";
const API_BASE = "https://api.github.com";

const readToken = (): string =>
  (process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? "").trim();

const ghHeaders = (token: string): Record<string, string> => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "baticost-ai",
  "Content-Type": "application/json",
});

/** Internal: role of a user — used by the action's admin guard (actions have no ctx.db). */
export const getUserRole = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    return user?.role ?? null;
  },
});

/** Guard: throw unless the current user is an admin (action ctx). */
const requireAdminAction = async (ctx: ActionCtx) => {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Non authentifié");
  const role = await ctx.runQuery(internal.github.getUserRole, { userId });
  if (role !== "admin") throw new Error("Accès réservé aux administrateurs");
  return userId;
};

type RepoCreated = {
  ok: true;
  created: boolean;
  fullName: string;
  url: string;
  private: boolean;
};

type RepoError = {
  ok: false;
  reason: "missing_token" | "invalid_token" | "api_error";
  message: string;
};

/** Admin-only: is a GitHub token available in the environment? */
export const repoStatus = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return { tokenAvailable: readToken().length > 0 };
  },
});

/** Best-effort parse of a GitHub error JSON body. */
const parseErrorPayload = async (
  res: Response,
): Promise<{ message?: string; errors?: { message?: string }[] } | null> => {
  try {
    const raw: unknown = await res.json();
    if (raw && typeof raw === "object") {
      return raw as { message?: string; errors?: { message?: string }[] };
    }
  } catch {
    /* non-JSON error body */
  }
  return null;
};

/**
 * Admin-only: create the `baticost-ai` GitHub repository (private).
 * Returns a structured result instead of throwing for expected failures
 * (missing token, invalid token, repo already existing).
 */
export const createGitHubRepo = action({
  args: {},
  handler: async (ctx): Promise<RepoCreated | RepoError> => {
    await requireAdminAction(ctx);

    const token = readToken();
    if (!token) {
      return {
        ok: false,
        reason: "missing_token",
        message:
          "Aucun token GitHub configuré. Ajoutez la clé « GITHUB_TOKEN » dans l'onglet Keys/API keys (ou la variable GITHUB_TOKEN dans les variables d'environnement du déploiement Convex), puis réessayez.",
      };
    }

    let res: Response;
    try {
      res = await fetch(`${API_BASE}/user/repos`, {
        method: "POST",
        headers: ghHeaders(token),
        body: JSON.stringify({
          name: REPO_NAME,
          description: REPO_DESCRIPTION,
          private: true,
          has_issues: true,
          has_wiki: false,
        }),
      });
    } catch (e) {
      return {
        ok: false,
        reason: "api_error",
        message: `Impossible de joindre l'API GitHub : ${(e as Error).message}`,
      };
    }

    if (res.status === 201) {
      const repo = (await res.json()) as {
        full_name: string;
        html_url: string;
        private: boolean;
      };
      return {
        ok: true,
        created: true,
        fullName: repo.full_name,
        url: repo.html_url,
        private: repo.private,
      };
    }

    const payload = await parseErrorPayload(res);
    const errorText = [
      payload?.message,
      ...(payload?.errors?.map((e) => e.message).filter(Boolean) ?? []),
    ]
      .filter(Boolean)
      .join("; ");

    // Repository already exists (or name taken by the account) → return its URL.
    if (res.status === 422 || res.status === 400) {
      const raw = JSON.stringify(payload ?? "");
      if (/already exists/i.test(raw) || /name already exists/i.test(raw)) {
        const me = await fetch(`${API_BASE}/user`, {
          headers: ghHeaders(token),
        })
          .then((r) => (r.ok ? (r.json() as Promise<{ login?: string }>) : null))
          .catch(() => null);
        const fullName = me?.login ? `${me.login}/${REPO_NAME}` : REPO_NAME;
        const existing = await fetch(
          `${API_BASE}/repos/${encodeURIComponent(fullName)}`,
          { headers: ghHeaders(token) },
        )
          .then((r) =>
            r.ok
              ? (r.json() as Promise<{
                  full_name: string;
                  html_url: string;
                  private: boolean;
                }>)
              : null,
          )
          .catch(() => null);
        return {
          ok: true,
          created: false,
          fullName: existing?.full_name ?? fullName,
          url: existing?.html_url ?? `https://github.com/${fullName}`,
          private: existing?.private ?? true,
        };
      }
      return {
        ok: false,
        reason: "api_error",
        message: `GitHub a refusé la création du dépôt : ${errorText || `HTTP ${res.status}`}`,
      };
    }

    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        reason: "invalid_token",
        message:
          "Token GitHub invalide ou sans permission (création de dépôt). Régénérez un token avec le scope « repo » et mettez à jour la clé GITHUB_TOKEN.",
      };
    }

    return {
      ok: false,
      reason: "api_error",
      message: `Erreur GitHub inattendue (HTTP ${res.status}) : ${errorText || "réponse vide"}`,
    };
  },
});
