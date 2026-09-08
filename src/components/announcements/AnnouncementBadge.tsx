import type { AnnouncementType } from "../../convex/types";
import { ANNOUNCEMENT_TYPE_META } from "../../convex/types";
import { Badge } from "../ui/badge";
import { AnnouncementTypeIcon } from "./announcementIcons";

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
      <AnnouncementTypeIcon type={type} className="size-3" />
      {meta.label}
    </Badge>
  );
}

/** Icône du type (Iconstica, repli emoji — utilisé dans les grandes icônes de carte). */
export function AnnouncementTypeEmoji({ type }: { type: AnnouncementType }) {
  return <AnnouncementTypeIcon type={type} className="size-4" />;
}