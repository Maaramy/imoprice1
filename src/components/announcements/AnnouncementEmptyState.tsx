import { IconsticaIcon } from "../icons/IconsticaIcon";

/** État vide : aucune annonce active. */
export function AnnouncementEmptyState({
  title = "Aucune annonce pour le moment",
  description = "Les communications importantes de la plateforme apparaîtront ici.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex w-full items-center gap-3 rounded-xl border border-dashed bg-muted/30 px-4 py-3 text-left">
      <IconsticaIcon
        name="megaphone"
        className="size-5 shrink-0 text-muted-foreground"
        fallback={
          <span aria-hidden className="text-xl">
            📢
          </span>
        }
      />
      <div>
        <p className="text-xs font-medium text-foreground">{title}</p>
        <p className="text-[11px] text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}