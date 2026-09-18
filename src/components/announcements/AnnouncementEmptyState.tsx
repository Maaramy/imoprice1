import { Megaphone } from "lucide-react";

/** État vide : aucune annonce active. */
export function AnnouncementEmptyState({
  title = "Aucune annonce pour le moment",
  description = "Les communications importantes de la plateforme apparaîtront ici.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-border/60 px-4 py-3 text-left">
      <span
        aria-hidden
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted/50 text-muted-foreground"
      >
        <Megaphone className="size-5" />
      </span>
      <div>
        <p className="text-xs font-medium text-foreground">{title}</p>
        <p className="text-[11px] text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
