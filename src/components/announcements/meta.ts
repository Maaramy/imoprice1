import {
  AlertTriangle,
  Info,
  ShieldAlert,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { AnnouncementType } from "../../convex/types";

/**
 * Icône (style outline Lucide) associée à chaque type d'annonce.
 * Les couleurs restent déclarées dans `ANNOUNCEMENT_TYPE_META` (convex/types) —
 * jamais codées en dur dans le JSX.
 */
export const ANNOUNCEMENT_TYPE_ICONS: Record<AnnouncementType, LucideIcon> = {
  information: Info,
  news: Sparkles,
  important: AlertTriangle,
  urgent: ShieldAlert,
  maintenance: Wrench,
};

/** Pastille « priorité haute » (priorité ≥ 5) — classe unique, jamais codée dans le JSX. */
export const ANNOUNCEMENT_PRIORITY_CLASS =
  "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300";
