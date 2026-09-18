import type { Doc } from "../../convex/_generated/dataModel";
import { ANNOUNCEMENT_TYPE_META } from "../../convex/types";
import { cn } from "@/lib/utils";
import { AnnouncementBadge } from "./AnnouncementBadge";
import { ANNOUNCEMENT_PRIORITY_CLASS, ANNOUNCEMENT_TYPE_ICONS } from "./meta";

export function formatAnnouncementDate(ts?: number): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Carte d'annonce (aperçu dans le carousel du Dashboard). */
export function AnnouncementCard({
  announcement,
  onOpen,
}: {
  announcement: Doc<"announcements">;
  onOpen: (a: Doc<"announcements">) => void;
}) {
  const meta = ANNOUNCEMENT_TYPE_META[announcement.type];
  const TypeIcon = ANNOUNCEMENT_TYPE_ICONS[announcement.type];

  return (
    <button
      type="button"
      onClick={() => onOpen(announcement)}
      className={cn(
        "group flex h-full w-full flex-col gap-3 rounded-2xl border border-border/40 border-l-4 bg-card/80 p-4 text-left shadow-soft transition-all duration-200 hover:shadow-md active:scale-[0.99] sm:p-5",
        meta.accentClass,
      )}
      aria-label={`Lire l'annonce : ${announcement.title}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
              meta.chipClass,
            )}
          >
            <TypeIcon className="size-4" />
          </span>
          <AnnouncementBadge type={announcement.type} withIcon={false} />
        </div>
        {announcement.priority >= 5 && (
          <span
            className={cn(
              "rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
              ANNOUNCEMENT_PRIORITY_CLASS,
            )}
          >
            Priorité haute
          </span>
        )}
      </div>

      <h4 className="line-clamp-2 text-sm font-bold tracking-tight text-foreground sm:text-base">
        {announcement.title}
      </h4>
      <p className="line-clamp-2 flex-1 text-xs leading-relaxed text-muted-foreground">
        {announcement.content}
      </p>

      <div className="flex items-center justify-between gap-2 border-t pt-2 text-[10px] text-muted-foreground">
        <span className="truncate">
          {announcement.createdByName ?? "Administrateur"}
        </span>
        <span className="shrink-0">{formatAnnouncementDate(announcement.createdAt)}</span>
      </div>
    </button>
  );
}
