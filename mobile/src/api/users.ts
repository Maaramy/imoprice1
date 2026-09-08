import { useMutation, useQuery } from "convex/react";
import { api } from "./convex";
import type { CurrentUser } from "./types";

/** Utilisateur connecté (null si non connecté). */
export function useCurrentUser(): CurrentUser | null | undefined {
  return useQuery(api.users.currentUser);
}

/** Mise à jour du profil (nom / téléphone / photo). */
export function useUpdateProfile() {
  return useMutation(api.users.updateUserProfile);
}
