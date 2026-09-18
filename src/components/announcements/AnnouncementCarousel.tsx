import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Doc } from "../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { AnnouncementCard } from "./AnnouncementCard";
import { AnnouncementEmptyState } from "./AnnouncementEmptyState";
import { AnnouncementModal } from "./AnnouncementModal";

/**
 * Carousel d'annonces : une carte visible à la fois, défilement automatique (5 s),
 * pause au survol et au toucher, flèches circulaires 32 px, indicateurs de
 * pagination et swipe mobile (seuil 40 px). Aucune librairie externe.
 */
export function AnnouncementCarousel({
  announcements,
  index,
  onIndexChange,
}: {
  announcements: Doc<"announcements">[];
  /** Index courant du carousel (contrôlé par la section pour le compteur « n / total »). */
  index: number;
  onIndexChange: (index: number) => void;
}) {
  const [paused, setPaused] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [active, setActive] = useState<Doc<"announcements"> | null>(null);
  const touchStartX = useRef<number | null>(null);

  const count = announcements.length;

  const goTo = useCallback(
    (i: number) => onIndexChange(((i % count) + count) % count),
    [count, onIndexChange],
  );

  // Autoplay : toutes les 5 s, en pause au survol, au focus et au toucher.
  useEffect(() => {
    if (count <= 1 || paused) return;
    const t = setInterval(() => onIndexChange((index + 1) % count), 5000);
    return () => clearInterval(t);
  }, [count, paused, index, onIndexChange]);

  // Si le nombre d'annonces change, resynchroniser l'index.
  useEffect(() => {
    if (index >= count) onIndexChange(0);
  }, [count, index, onIndexChange]);

  if (count === 0) {
    return <AnnouncementEmptyState />;
  }

  const openAnnouncement = (a: Doc<"announcements">) => {
    setActive(a);
    setModalOpen(true);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setPaused(true);
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    setPaused(false);
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 40) return;
    if (delta < 0) goTo(index + 1);
    else goTo(index - 1);
  };

  return (
    <div
      className="w-full"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        className="relative overflow-hidden rounded-2xl"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {announcements.map((a, i) => (
            <div
              key={a._id}
              aria-hidden={i !== index}
              inert={i !== index}
              className="w-full shrink-0 px-0.5 py-0.5"
            >
              <AnnouncementCard announcement={a} onOpen={openAnnouncement} />
            </div>
          ))}
        </div>

        {count > 1 && (
          <>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="absolute left-2 top-1/2 z-10 h-8 w-8 -translate-y-1/2 rounded-full border-border/50 bg-background/90 shadow-none backdrop-blur-sm"
              onClick={() => goTo(index - 1)}
              aria-label="Annonce précédente"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="absolute right-2 top-1/2 z-10 h-8 w-8 -translate-y-1/2 rounded-full border-border/50 bg-background/90 shadow-none backdrop-blur-sm"
              onClick={() => goTo(index + 1)}
              aria-label="Annonce suivante"
            >
              <ChevronRight className="size-4" />
            </Button>
          </>
        )}
      </div>

      {/* Indicateurs de pagination */}
      {count > 1 && (
        <div className="mt-2.5 flex items-center justify-center gap-1.5">
          {announcements.map((a, i) => (
            <button
              key={a._id}
              type="button"
              aria-label={`Aller à l'annonce ${i + 1}`}
              aria-current={i === index}
              onClick={() => goTo(i)}
              className="flex h-8 items-center px-0.5"
            >
              <span
                className={cn(
                  "block h-1.5 rounded-full transition-all",
                  i === index
                    ? "w-6 bg-primary"
                    : "w-1.5 bg-muted-foreground/25 hover:bg-muted-foreground/40",
                )}
              />
            </button>
          ))}
        </div>
      )}

      <AnnouncementModal
        announcement={active}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}
