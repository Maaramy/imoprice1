import type { AnnouncementType } from "../../convex/types";
import { ANNOUNCEMENT_TYPE_META } from "../../convex/types";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";

/** Badge coloré du type d'annonce (ℹ️ Information, 🆕 Nouveauté, …). */
export function AnnouncementBadge({
  type,
  className = "",
  withIcon = true,
}: {
  type: AnnouncementType;
  className?: string;
  /** Masquer l'emoji quand une pastille d'icône distincte est déjà affichée à côté. */
  withIcon?: boolean;
}) {
  const meta = ANNOUNCEMENT_TYPE_META[type];
  const chip = cn(
    "gap-1 border text-[10px] font-medium uppercase tracking-wide",
    meta.badgeClass,
    className,
  );
  return (
    <Badge variant="outline" className={chip}>
      {withIcon && <span aria-hidden>{meta.emoji}</span>}
      {meta.label}
    </Badge>
  );
}

/** Emoji du type (utilisé dans les grandes icônes de carte). */
export function AnnouncementTypeEmoji({ type }: { type: AnnouncementType }) {
  return <span aria-hidden>{ANNOUNCEMENT_TYPE_META[type].emoji}</span>;
}