import { useQuery } from "convex/react";
import { api } from "./convex";
import type { RemainingEstimations, SubscriptionDoc } from "./types";

/** Quota d'estimations restantes pour le mois en cours. */
export function useRemainingEstimations(): RemainingEstimations | undefined {
  return useQuery(api.plans.remainingEstimations);
}

/** Abonnement actif de l'utilisateur. */
export function useMySubscription(): SubscriptionDoc | null | undefined {
  return useQuery(api.plans.mySubscription);
}

/** Historique des paiements. */
export function useGetPaymentHistory() {
  return useQuery(api.plans.getPaymentHistory);
}

/** Consommation mensuelle détaillée. */
export function useGetMonthlyUsage() {
  return useQuery(api.plans.getMonthlyUsage);
}
