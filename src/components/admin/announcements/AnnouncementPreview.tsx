import { ANNOUNCEMENT_TYPE_META } from "../../../convex/types";
import { AnnouncementBadge } from "../../announcements/AnnouncementBadge";
import { formatAnnouncementDate } from "../../announcements/AnnouncementCard";

/** Aperçu en direct de l'annonce (rendu comme dans le Dashboard). */
export function AnnouncementPreview({
  title,
  content,
  type,
  createdAt,
  author,
}: {
  title: string;
  content: string;
  type: keyof typeof ANNOUNCEMENT_TYPE_META;
  createdAt?: number;
  author?: string;
}) {
  const meta = ANNOUNCEMENT_TYPE_META[type];
  return (
    <div className="flex h-full flex-col gap-2.5 rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className="flex h-9 w-9 items-center justify-center rounded-lg border text-lg"
        >
          {meta.emoji}
        </span>
        <AnnouncementBadge type={type} />
      </div>
      <h4 className="line-clamp-1 text-sm font-semibold">
        {title || "Titre de l'annonce"}
      </h4>
      <p className="line-clamp-3 flex-1 text-xs leading-relaxed text-muted-foreground">
        {content || "Contenu de l'annonce…"}
      </p>
      <div className="flex items-center justify-between border-t pt-2 text-[10px] text-muted-foreground">
        <span className="truncate">{author ?? "Administrateur"}</span>
        <span>{createdAt ? formatAnnouncementDate(createdAt) : "Aujourd'hui"}</span>
      </div>
    </div>
  );
}