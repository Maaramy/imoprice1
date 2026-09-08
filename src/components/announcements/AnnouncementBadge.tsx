import type { AnnouncementType } from "../../convex/types";
import { ANNOUNCEMENT_TYPE_META } from "../../convex/types";
import { Badge } from "../ui/badge";

/** Badge coloré du type d'annonce (ℹ️ Information, 🆕 Nouveauté, …). */
export function AnnouncementBadge({
  type,
  className = "",
}: {
  type: AnnouncementType;
  className?: string;
}) {
  const meta = ANNOUNCEMENT_TYPE_META[type];
  return (
    <Badge
      variant="outline"
      className={`gap-1 border text-[10px] font-medium uppercase tracking-wide ${meta.badgeClass} ${className}`}
    >
      <span aria-hidden>{meta.emoji}</span>
      {meta.label}
    </Badge>
  );
}

/** Emoji du type (utilisé dans les grandes icônes de carte). */
export function AnnouncementTypeEmoji({ type }: { type: AnnouncementType }) {
  return <span aria-hidden>{ANNOUNCEMENT_TYPE_META[type].emoji}</span>;
}