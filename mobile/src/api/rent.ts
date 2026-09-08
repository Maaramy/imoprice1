import { useMutation, useQuery } from "convex/react";
import { api } from "./convex";
import type { RentEstimationDoc, RentEstimationResult, RentPropertyInput } from "./types";

/** Mes estimations de loyer (récentes → anciennes). */
export function useGetUserRentEstimations(): RentEstimationDoc[] | undefined {
  return useQuery(api.rent.getUserRentEstimations);
}

/** Une estimation de loyer précise. */
export function useGetRentEstimation(estimationId: string | null | undefined) {
  return useQuery(api.rent.getRentEstimation, estimationId ? { estimationId } : "skip");
}

export function useCreateRentEstimation() {
  return useMutation(api.rent.createRentEstimation);
}

export function useDeleteRentEstimation() {
  return useMutation(api.rent.deleteRentEstimation);
}

/**
 * Lance une estimation de loyer côté serveur (BIM Engine — même calcul que
 * le Web) à partir du snapshot du bien.
 */
export async function runRentEstimation(
  createRentEstimation: (args: { property: RentPropertyInput }) => Promise<{
    estimationId: string;
    result: RentEstimationResult;
  }>,
  property: RentPropertyInput,
): Promise<{ estimationId: string; result: RentEstimationResult }> {
  return createRentEstimation({ property });
}
