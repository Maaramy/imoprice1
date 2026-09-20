// ════════════════════════════════════════════════════════════════════════
// MODULE INVESTISSEMENT — CONTRÔLE D'ACCÈS (service « Client Pro »)
//
// Le projet cible ne dispose plus d'un système d'abonnement : l'accès est
// accordé à tout utilisateur authentifié, avec un marqueur d'erreur
// `CLIENT_PRO_ACCESS:` conservé pour que le frontend puisse afficher le
// paywall si une restriction est réintroduite.
// ════════════════════════════════════════════════════════════════════════

import { getAuthUserId } from "@convex-dev/auth/server";
import { query, type ActionCtx, type MutationCtx, type QueryCtx } from "./_generated/server";

export const CLIENT_PRO_MARKER = "CLIENT_PRO_ACCESS:";

export interface ClientProAccess {
  allowed: boolean;
  plan: "free" | "pro" | "expert";
  /** -1 = illimité */
  limit: number;
  used: number;
  remaining: number;
  message?: string;
}

const FREE_INVESTMENT_LIMIT = 0;
const PRO_INVESTMENT_LIMIT = -1;
const EXPERT_INVESTMENT_LIMIT = -1;

export const paymentConfig = {
  freeInvestmentLimit: FREE_INVESTMENT_LIMIT,
  proInvestmentLimit: PRO_INVESTMENT_LIMIT,
  expertInvestmentLimit: EXPERT_INVESTMENT_LIMIT,
  subscriptionsKind: ["construction", "investment"] as const,
};

export async function getClientProAccess(
  ctx: QueryCtx | MutationCtx | ActionCtx,
): Promise<ClientProAccess> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    return {
      allowed: false,
      plan: "free",
      limit: FREE_INVESTMENT_LIMIT,
      used: 0,
      remaining: 0,
      message: `${CLIENT_PRO_MARKER} Connexion requise pour lancer une analyse d'investissement.`,
    };
  }
  return {
    allowed: true,
    plan: "pro",
    limit: PRO_INVESTMENT_LIMIT,
    used: 0,
    remaining: -1,
  };
}

export async function checkClientProAccess(
  ctx: QueryCtx | MutationCtx | ActionCtx,
): Promise<ClientProAccess> {
  return getClientProAccess(ctx);
}

export async function requireClientProAccess(
  ctx: QueryCtx | MutationCtx | ActionCtx,
): Promise<void> {
  const access = await getClientProAccess(ctx);
  if (!access.allowed) {
    throw new Error(access.message ?? `${CLIENT_PRO_MARKER} Accès Client Pro requis.`);
  }
}

export const getFreePlanStatus = query({
  args: {},
  handler: async (ctx) => {
    const access = await getClientProAccess(ctx);
    return {
      plan: access.plan,
      freeInvestmentLimit: paymentConfig.freeInvestmentLimit,
      proInvestmentLimit: paymentConfig.proInvestmentLimit,
      expertInvestmentLimit: paymentConfig.expertInvestmentLimit,
      allowed: access.allowed,
    };
  },
});

export const myInvestmentAccess = query({
  args: {},
  handler: async (ctx) => getClientProAccess(ctx),
});

export const investmentPlans = query({
  args: {},
  handler: async () => ({
    free: { investmentLimit: paymentConfig.freeInvestmentLimit, label: "Découverte" },
    pro: { investmentLimit: paymentConfig.proInvestmentLimit, label: "Client Pro" },
    expert: { investmentLimit: paymentConfig.expertInvestmentLimit, label: "Expert" },
  }),
});

