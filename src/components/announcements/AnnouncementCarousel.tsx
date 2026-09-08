import { useCallback, useEffect, useRef, useState } from "react";
import type { Doc } from "../../convex/_generated/dataModel";
import { Button } from "../ui/button";
import { AnnouncementCard } from "./AnnouncementCard";
import { AnnouncementEmptyState } from "./AnnouncementEmptyState";
import { AnnouncementModal } from "./AnnouncementModal";
import { IconsticaIcon } from "../icons/IconsticaIcon";

/**
 * Carousel d'annonces : défilement automatique, pause au survol,
 * boutons précédent/suivant, indicateurs de pagination et swipe mobile.
 * Fonctionne avec 1 annonce, plusieurs ou un grand nombre.
 */
export function AnnouncementCarousel({
  announcements,
}: {
  announcements: Doc<"announcements">[];
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [active, setActive] = useState<Doc<"announcements"> | null>(null);
  const touchStartX = useRef<number | null>(null);

  const count = announcements.length;

  const goTo = useCallback(
    (i: number) => setIndex(((i % count) + count) % count),
    [count],
  );

  // Autoplay : toutes les 5 s, en pause au survol / focus.
  useEffect(() => {
    if (count <= 1 || paused) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), 5000);
    return () => clearInterval(t);
  }, [count, paused]);

  // Si le nombre d'annonces change, resynchroniser l'index.
  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  if (count === 0) {
    return <AnnouncementEmptyState />;
  }

  const openAnnouncement = (a: Doc<"announcements">) => {
    setActive(a);
    setModalOpen(true);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
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
        className="relative overflow-hidden rounded-xl"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {announcements.map((a) => (
            <div key={a._id} className="w-full shrink-0 px-0.5 py-0.5">
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
              className="absolute left-2 top-1/2 z-10 h-7 w-7 -translate-y-1/2 rounded-full bg-background/90 shadow-none backdrop-blur"
              onClick={() => goTo(index - 1)}
              aria-label="Annonce précédente"
            >
              <IconsticaIcon
                name="chevron-left"
                className="size-3.5"
                fallback={
                  <span aria-hidden>
                    ‹
                  </span>
                }
              />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="absolute right-2 top-1/2 z-10 h-7 w-7 -translate-y-1/2 rounded-full bg-background/90 shadow-none backdrop-blur"
              onClick={() => goTo(index + 1)}
              aria-label="Annonce suivante"
            >
              <IconsticaIcon
                name="chevron-right"
                className="size-3.5"
                fallback={
                  <span aria-hidden>
                    ›
                  </span>
                }
              />
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
              className={`h-1.5 rounded-full transition-all ${
                i === index
                  ? "w-5 bg-primary"
                  : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
            />
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