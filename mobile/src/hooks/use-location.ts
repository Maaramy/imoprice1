import { useState } from "react";
import * as Location from "expo-location";
import { villesOf, quartiersOf } from "../lib/locations";

export interface GpsPosition {
  latitude: number;
  longitude: number;
}

interface ResolvedLocation {
  address?: string;
  gouvernorat?: string;
  ville?: string;
  quartier?: string;
}

/** Correspondance approximative ville tunisienne (normalisée). */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ");
}

function findVille(haystack: string, list: string[]): string | null {
  const n = normalize(haystack);
  if (!n) return null;
  for (const candidate of list) {
    const parts = normalize(candidate).split(" ").filter((p) => p.length > 2);
    if (parts.some((p) => n.includes(p))) return candidate;
  }
  // Repli : correspondance par mot significatif de la ville.
  for (const candidate of list) {
    if (n.includes(normalize(candidate).split(" ")[0])) return candidate;
  }
  return null;
}

/**
 * Localisation GPS :
 * 1. demande la permission ;
 * 2. lit la position actuelle ;
 * 3. géocode en inverse LOCALEMENT (expo-location) puis rapproche la ville
 *    et le quartier des listes officielles (même en hors-ligne).
 */
export function useGpsLocation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentPosition = async (): Promise<GpsPosition | null> => {
    setLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Permission de localisation refusée");
        return null;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    } catch (e) {
      setError(e instanceof Error ? e.message : "Localisation indisponible");
      return null;
    } finally {
      setLoading(false);
    }
  };

  /** Résout ville/quartier à partir de coordonnées (local, hors-ligne OK). */
  const resolveLocation = async (
    position: GpsPosition,
    gouvernorat?: string,
  ): Promise<ResolvedLocation> => {
    try {
      const results = await Location.reverseGeocodeAsync(position);
      const hit = results[0];
      if (!hit) return {};

      const villeList = gouvernorat ? villesOf(gouvernorat) : [];
      const ville = hit.city ? findVille(hit.city, villeList) : null;
      const quartier = ville
        ? findVille(`${hit.subregion ?? ""} ${hit.district ?? ""} ${hit.street ?? ""}`, quartiersOf(ville))
        : null;

      return {
        address: [hit.street, hit.district, hit.city].filter(Boolean).join(", ") || undefined,
        ville: ville ?? hit.city ?? undefined,
        quartier: quartier ?? undefined,
      };
    } catch {
      return {};
    }
  };

  return { getCurrentPosition, resolveLocation, loading, error };
}
