import type { Doc } from "../../convex/_generated/dataModel";
import { ANNOUNCEMENT_TYPE_META } from "../../convex/types";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { AnnouncementBadge } from "./AnnouncementBadge";
import { formatAnnouncementDate } from "./AnnouncementCard";

/** Lecture complète d'une annonce (modal accessible). */
export function AnnouncementModal({
  announcement,
  open,
  onOpenChange,
}: {
  announcement: Doc<"announcements"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {announcement && (
          <>
            <DialogHeader>
              <div className="mb-1 flex items-center gap-2">
                <span aria-hidden className="text-2xl">
                  {ANNOUNCEMENT_TYPE_META[announcement.type].emoji}
                </span>
                <AnnouncementBadge type={announcement.type} />
              </div>
              <DialogTitle className="text-lg leading-snug">
                {announcement.title}
              </DialogTitle>
              <DialogDescription className="whitespace-pre-line pt-1 text-sm leading-relaxed">
                {announcement.content}
              </DialogDescription>
            </DialogHeader>

            {announcement.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={announcement.imageUrl}
                alt=""
                className="max-h-56 w-full rounded-lg border object-cover"
              />
            )}

            <DialogFooter className="!justify-between gap-2 border-t pt-3 sm:!justify-between">
              <p className="text-[11px] text-muted-foreground">
                {announcement.createdByName ?? "Administrateur"} ·{" "}
                {formatAnnouncementDate(announcement.createdAt)}
              </p>
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Fermer
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}