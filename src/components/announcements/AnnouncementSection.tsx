import { useState } from "react";
import { useQuery } from "convex/react";
import { Megaphone } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { AnnouncementCarousel } from "./AnnouncementCarousel";
import { Skeleton } from "../ui/skeleton";

/** Section « 📢 Annonces » du Dashboard — temps réel via Convex. */
export function AnnouncementSection() {
  const announcements = useQuery(api.announcements.getAnnouncementsForUser);
  const [index, setIndex] = useState(0);

  const total = announcements?.length ?? 0;
  const position = total === 0 ? 0 : Math.min(index + 1, total);

  return (
    <section aria-label="Annonces" className="w-full">
      <div className="mb-2.5 flex items-center gap-2.5">
        <span
          aria-hidden
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
        >
          <Megaphone className="size-4" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-bold tracking-tight text-foreground sm:text-base">
            Annonces
          </h3>
          <p className="text-[10px] text-muted-foreground/70">
            Communications de la plateforme
          </p>
        </div>
        <span className="ml-auto shrink-0 rounded-full bg-muted/30 px-2 py-0.5 text-[10px] tabular-nums text-muted-foreground">
          {announcements === undefined ? "…" : `${position} / ${total}`}
        </span>
      </div>

      {announcements === undefined ? (
        <Skeleton className="h-32 w-full rounded-2xl" />
      ) : (
        <AnnouncementCarousel
          announcements={announcements}
          index={index}
          onIndexChange={setIndex}
        />
      )}
    </section>
  );
}
