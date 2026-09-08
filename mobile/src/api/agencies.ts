import { useMutation, useQuery } from "convex/react";
import { api } from "./convex";

/** Agence partenaire (liste publique des agences d'une région). */
export type AgencyPartner = {
  _id: string;
  name: string;
  phone?: string;
  address?: string;
  email?: string;
  website?: string;
  rating?: number;
  logoUrl?: string;
  regions?: string[];
  specialties?: string[];
};

/** Réponse (contre-offre de loyer) reçue d'une agence. */
export type AgencyRentResponse = {
  _id: string;
  agencyName: string;
  agencyLogo?: string | null;
  suggestedPrice: number;
  agencyMessage?: string | null;
  suggestedAt?: number;
  estimatedRent?: number | null;
  rentMin?: number | null;
  rentMax?: number | null;
  rentPriceScenario?: string | null;
};

/** Agences actives (abonnées) desservant une région. */
export function useGetActiveAgencies(region: string | undefined) {
  return useQuery(api.agencies.getActiveAgencies, region ? { region } : "skip");
}

/** Envoie une estimation de loyer (mensuel/nuitée) à une agence. */
export function useSendRentEstimationToAgency() {
  return useMutation(api.agencies.sendRentEstimationToAgency);
}

/** Contre-offres de loyer reçues pour une estimation de location. */
export function useGetAgencyResponsesForRentEstimation(rentEstimationId: string | undefined) {
  return useQuery(
    api.agencies.getAgencyResponsesForRentEstimation,
    rentEstimationId ? { rentEstimationId } : "skip",
  );
}
