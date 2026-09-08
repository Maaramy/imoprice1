/**
 * Client Convex du projet mobile.
 *
 * Le client se connecte au MÊME déploiement Convex que la plateforme Web
 * (mêmes comptes, même base de données, mêmes moteurs d'estimation).
 *
 * ⚠️ L'URL est publique (elle est déjà embarquée dans le client Web). Ne
 *    jamais mettre de clé secrète (admin key) ici.
 */
import "react-native-get-random-values";
import "react-native-url-polyfill/auto";
import { ConvexReactClient } from "convex/react";
import { anyApi } from "convex/server";

const CONVEX_URL = process.env.EXPO_PUBLIC_CONVEX_URL;

if (!CONVEX_URL) {
  throw new Error(
    "EXPO_PUBLIC_CONVEX_URL est manquant. Créez un fichier .env à la racine du dossier mobile/ " +
      "avec EXPO_PUBLIC_CONVEX_URL=https://<votre-deploiement>.convex.cloud (la même valeur que " +
      "VITE_CONVEX_URL utilisée par la plateforme Web).",
  );
}

/** Client Convex partagé par toute l'application. */
export const convex = new ConvexReactClient(CONVEX_URL);

/**
 * Références typées des fonctions backend.
 * `anyApi` est le Proxy généré par Convex : les appels se résolvent à
 * l'exécution exactement comme sur le Web (api.users.currentUser, …).
 */
export const api = anyApi;

/** URL de base du déploiement (utile pour ouvrir des liens externes). */
export const CONVEX_SITE_URL = CONVEX_URL;
