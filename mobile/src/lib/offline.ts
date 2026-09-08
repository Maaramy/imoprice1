/**
 * Cache hors-ligne : les derniers résultats consultés restent accessibles
 * sans connexion (AsyncStorage) et sont re-synchronisés automatiquement.
 */
import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFIX = "baticost-cache:";
const DEFAULT_TTL = 1000 * 60 * 60 * 24 * 30; // 30 jours

export async function cacheSet(key: string, value: unknown, ttlMs = DEFAULT_TTL): Promise<void> {
  try {
    await AsyncStorage.setItem(
      PREFIX + key,
      JSON.stringify({ data: value, cachedAt: Date.now(), ttlMs }),
    );
  } catch {
    // cache plein / erreur → silencieux
  }
}

export async function cacheGet<T>(key: string): Promise<{ data: T; cachedAt: number } | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data: T; cachedAt: number; ttlMs: number };
    if (Date.now() - parsed.cachedAt > (parsed.ttlMs ?? DEFAULT_TTL)) {
      await AsyncStorage.removeItem(PREFIX + key);
      return null;
    }
    return { data: parsed.data, cachedAt: parsed.cachedAt };
  } catch {
    return null;
  }
}

export async function cacheRemove(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}

/** Efface tout le cache (utilisé à la déconnexion). */
export async function clearAllCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter((k) => k.startsWith(PREFIX));
    if (ours.length) await AsyncStorage.multiRemove(ours);
  } catch {
    // ignore
  }
}

/**
 * Hook : combine une requête Convex réactive avec un cache local.
 * - Tant que la donnée live n'est pas arrivée, on affiche la copie en cache.
 * - Dès que la donnée live arrive, elle remplace le cache.
 */
export function useOfflineCache<T>(
  cacheKey: string,
  live: T | undefined,
  isOnline: boolean,
): { data: T | undefined; isStale: boolean } {
  const [cached, setCached] = useState<{ data: T; cachedAt: number } | null>(null);
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      cacheGet<T>(cacheKey).then((c) => {
        if (c) setCached(c);
      });
    }
  }, [cacheKey]);

  useEffect(() => {
    if (live !== undefined) {
      setCached({ data: live, cachedAt: Date.now() });
      cacheSet(cacheKey, live);
    }
  }, [live, cacheKey]);

  const effective = live !== undefined ? live : cached?.data;
  return { data: effective, isStale: live === undefined && cached !== null && !isOnline };
}
