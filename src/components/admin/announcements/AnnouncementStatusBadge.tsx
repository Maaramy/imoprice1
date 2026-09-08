import type { AnnouncementStatus } from "../../../convex/types";
import { ANNOUNCEMENT_STATUS_META } from "../../../convex/types";
import { Badge } from "../../ui/badge";

/** Badge de statut (Publiée / Programmée / Brouillon / Expirée / Désactivée). */
export function AnnouncementStatusBadge({
  status,
  className = "",
}: {
  status: AnnouncementStatus;
  className?: string;
}) {
  const meta = ANNOUNCEMENT_STATUS_META[status];
  return (
    <Badge
      variant="outline"
      className={`gap-1 border text-[10px] font-medium ${meta.badgeClass} ${className}`}
    >
      <span aria-hidden>{meta.emoji}</span>
      {meta.label}
    </Badge>
  );
}