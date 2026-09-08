import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import type { ConvexReactClient } from "convex/react";
import { api } from "../api/convex";

export interface PickedPhoto {
  uri: string;
  storageId?: string;
}

/**
 * Prend une photo (caméra) ou sélectionne depuis la galerie.
 * `quality: 0.6` compresse les images avant tout envoi (économie de données).
 */
export async function pickPhotos(
  from: "camera" | "gallery",
  multiple = true,
): Promise<PickedPhoto[]> {
  if (from === "camera") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== "granted") throw new Error("Permission caméra refusée");
    const res = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    return res.canceled ? [] : res.assets.map((a) => ({ uri: a.uri }));
  }
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (perm.status !== "granted") throw new Error("Permission galerie refusée");
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.6,
    allowsMultipleSelection: multiple,
  });
  return res.canceled ? [] : res.assets.map((a) => ({ uri: a.uri }));
}

/**
 * Upload d'une image locale vers le stockage Convex.
 *
 * Le client Convex ne fait pas d'upload direct : on demande une URL d'upload
 * courte durée à la mutation serveur `properties.getUploadUrl`, puis on POSTe
 * le fichier sur cette URL. Retourne le storageId.
 */
export async function uploadPhoto(
  convex: ConvexReactClient,
  uri: string,
): Promise<string> {
  const uploadUrl = await convex.mutation(api.properties.getUploadUrl, {});
  const response = await fetch(uri);
  const blob = await response.blob();
  const uploadRes = await fetch(uploadUrl as string, {
    method: "POST",
    body: blob,
    headers: { "Content-Type": "application/octet-stream" },
  });
  if (!uploadRes.ok) {
    throw new Error(`Upload échoué (HTTP ${uploadRes.status})`);
  }
  const storageId = await uploadRes.text();
  return storageId.trim();
}

/** Petit retour haptique Android (micro-interaction). */
export function lightHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}
