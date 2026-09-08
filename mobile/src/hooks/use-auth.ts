import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useCurrentUser } from "../api/users";

/**
 * Authentification — même contrat que le Web (useAuth).
 * `isAuthenticated` reflète la session Convex Auth (email + mot de passe,
 * même backend que la plateforme Web : comptes partagés).
 */
export function useAuth() {
  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth();
  const user = useCurrentUser();
  const { signIn, signOut } = useAuthActions();

  const isLoading = isAuthLoading || (isAuthenticated && user === undefined);

  return { isLoading, isAuthenticated, user, signIn, signOut };
}

export type Auth = ReturnType<typeof useAuth>;
