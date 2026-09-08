import { useMutation, useQuery } from "convex/react";
import { api } from "./convex";
import type { EstimationDoc, EstimationResultData, PropertyInput } from "./types";

/** Mes estimations vente (récentes → anciennes), enrichies du bien. */
export function useGetUserEstimations(): EstimationDoc[] | undefined {
  return useQuery(api.estimation.getUserEstimations);
}

/** Une estimation précise (avec le bien). */
export function useGetEstimation(estimationId: string | null | undefined) {
  return useQuery(
    api.estimation.getEstimation,
    estimationId ? { estimationId } : "skip",
  );
}

export function useCreateProperty() {
  return useMutation(api.properties.createProperty);
}

export function useUpdateProperty() {
  return useMutation(api.properties.updateProperty);
}

export function useEstimateProperty() {
  return useMutation(api.estimation.estimateProperty);
}

/**
 * Enchaîne création du bien puis estimation serveur (BIM Engine).
 * Retourne les identifiants + le résultat complet.
 */
export async function createAndEstimateProperty(
  createProperty: (args: PropertyInput) => Promise<string>,
  estimateProperty: (args: { propertyId: string }) => Promise<{
    estimationId: string;
    result: EstimationResultData;
  }>,
  input: PropertyInput,
): Promise<{ propertyId: string; estimationId: string; result: EstimationResultData }> {
  const propertyId = await createProperty(input);
  const { estimationId, result } = await estimateProperty({ propertyId });
  return { propertyId, estimationId, result };
}
