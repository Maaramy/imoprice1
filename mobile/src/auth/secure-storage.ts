/**
 * Stockage sécurisé des jetons de session (Convex Auth).
 *
 * `ConvexAuthProvider` exige une implémentation `TokenStorage` en React
 * Native (il n'y a pas de `localStorage`). On enveloppe expo-secure-store
 * (Keystore Android / Keychain iOS) avec repli automatique sur AsyncStorage
 * si la valeur dépasse la limite de SecureStore (2048 octets).
 */
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const FALLBACK_PREFIX = "baticost-fallback:";

/** Les clés SecureStore Android n'acceptent que [A-Za-z0-9._-]. */
function sanitizeKey(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, "_");
}

export const secureTokenStorage = {
  async getItem(key: string): Promise<string | null> {
    const safeKey = sanitizeKey(key);
    try {
      return await SecureStore.getItemAsync(safeKey);
    } catch {
      return AsyncStorage.getItem(FALLBACK_PREFIX + safeKey);
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    const safeKey = sanitizeKey(key);
    try {
      await SecureStore.setItemAsync(safeKey, value);
    } catch {
      // Valeur trop longue ou SecureStore indisponible → repli AsyncStorage.
      await AsyncStorage.setItem(FALLBACK_PREFIX + safeKey, value);
    }
  },

  async removeItem(key: string): Promise<void> {
    const safeKey = sanitizeKey(key);
    try {
      await SecureStore.deleteItemAsync(safeKey);
    } catch {
      // ignore
    }
    await AsyncStorage.removeItem(FALLBACK_PREFIX + safeKey);
  },
};
