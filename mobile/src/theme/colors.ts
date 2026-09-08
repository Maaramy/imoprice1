/**
 * Palette de l'application mobile — cohérente avec le thème Web baticost AI
 * (bleu primaire, vert émeraude pour le module Location).
 */
export const colors = {
  primary: "#2563eb",
  primaryDark: "#1d4ed8",
  primaryLight: "#dbeafe",
  accent: "#059669", // emerald-600 — module Location
  accentDark: "#047857",
  accentLight: "#d1fae5",
  bg: "#f1f5f9",
  bgDark: "#0f172a",
  card: "#ffffff",
  cardDark: "#1e293b",
  text: "#0f172a",
  textDark: "#f8fafc",
  muted: "#64748b",
  mutedDark: "#94a3b8",
  border: "#e2e8f0",
  borderDark: "#334155",
  success: "#16a34a",
  warning: "#d97706",
  danger: "#dc2626",
  info: "#0284c7",
  white: "#ffffff",
  black: "#000000",
  overlay: "rgba(15, 23, 42, 0.55)",
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  full: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

/** Dégradés (utilisés avec expo-linear-gradient). */
export const gradients = {
  primary: ["#3b82f6", "#2563eb", "#1d4ed8"] as const,
  rent: ["#10b981", "#059669", "#047857"] as const,
  heroSale: ["#3b82f6", "#2563eb", "#1e40af"] as const,
  heroRent: ["#10b981", "#059669", "#064e3b"] as const,
};
