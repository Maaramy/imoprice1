import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { AnnouncementCarousel } from "./AnnouncementCarousel";
import { Skeleton } from "../ui/skeleton";

/** Section « 📢 Annonces » du Dashboard — temps réel via Convex. */
export function AnnouncementSection() {
  const announcements = useQuery(api.announcements.getAnnouncementsForUser);

  return (
    <section aria-label="Annonces" className="w-full">
      <div className="mb-2.5 flex items-center gap-2">
        <span aria-hidden className="text-base">
          📢
        </span>
        <h3 className="text-sm font-semibold text-foreground">Annonces</h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          {announcements === undefined ? "…" : announcements.length}
        </span>
      </div>

      {announcements === undefined ? (
        <Skeleton className="h-32 w-full rounded-xl" />
      ) : (
        <AnnouncementCarousel announcements={announcements} />
      )}
    </section>
  );
}