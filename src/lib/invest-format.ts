/** Helpers de formatage du module « Investissement ». */

export function formatTND(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return "—";
  return `${new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)} TND`;
}

/** Version compacte : 1 250 000 TND → 1,25 M TND */
export function formatTNDCompact(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2).replace(".", ",")} M TND`;
  if (Math.abs(value) >= 10_000) return `${(value / 1_000).toFixed(0)} K TND`;
  return formatTND(value);
}

export function formatPct(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(decimals).replace(".", ",")}%`;
}

export function formatDateFR(ts: number): string {
  if (!ts || !Number.isFinite(ts)) return "—";
  return new Date(ts).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Classes de couleur (tokens Tailwind) selon le ton du score IA. */
export const SCORE_TONE_CLASS: Record<
  "excellent" | "good" | "average" | "poor",
  { text: string; bg: string; border: string; ring: string }
> = {
  excellent: {
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-900",
    ring: "text-emerald-500",
  },
  good: {
    text: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-200 dark:border-blue-900",
    ring: "text-blue-500",
  },
  average: {
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-900",
    ring: "text-amber-500",
  },
  poor: {
    text: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    border: "border-rose-200 dark:border-rose-900",
    ring: "text-rose-500",
  },
};

export const RISK_TONE_CLASS: Record<string, string> = {
  faible: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
  modéré: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
  élevé: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900",
};
