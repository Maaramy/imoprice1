import type { Doc } from "../../convex/_generated/dataModel";
import { ANNOUNCEMENT_TYPE_META } from "../../convex/types";
import { AnnouncementBadge } from "./AnnouncementBadge";
import { AnnouncementTypeIcon } from "./announcementIcons";

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
  return (
    <button
      type="button"
      onClick={() => onOpen(announcement)}
      className="group flex h-full w-full flex-col gap-2.5 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/40"
      aria-label={`Lire l'annonce : ${announcement.title}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border"
            style={{ background: "var(--announcement-tint, transparent)" }}
          >
            <AnnouncementTypeIcon type={announcement.type} className="size-4" />
          </span>
          <AnnouncementBadge type={announcement.type} />
        </div>
        {announcement.priority >= 5 && (
          <span className="rounded-md bg-red-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-red-700 dark:bg-red-950/60 dark:text-red-300">
            Priorité haute
          </span>
        )}
      </div>

      <h4 className="line-clamp-1 text-sm font-semibold text-foreground">
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