import type { AnnouncementStatus } from "../../../convex/types";
import { ANNOUNCEMENT_STATUS_META } from "../../../convex/types";
import { Badge } from "../../ui/badge";
import { AnnouncementStatusIcon } from "../../announcements/announcementIcons";

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
      <AnnouncementStatusIcon status={status} className="size-3" />
      {meta.label}
    </Badge>
  );
}