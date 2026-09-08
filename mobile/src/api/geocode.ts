import { useAction } from "convex/react";
import { api } from "./convex";

export interface GeocodeHit {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  class: string;
  address?: Record<string, string>;
}

/** Recherche d'adresse en Tunisie (Nominatim via l'action serveur). */
export function useSearchAddress() {
  return useAction(api.geocode.searchAddress);
}

/** Géocodage inverse (lat/lng → adresse) via l'action serveur. */
export function useReverseGeocode() {
  return useAction(api.geocode.reverseGeocode);
}
