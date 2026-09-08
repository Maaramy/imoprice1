import type { AnnouncementStatus, AnnouncementType } from "../../convex/types";
import { ANNOUNCEMENT_STATUS_META, ANNOUNCEMENT_TYPE_META } from "../../convex/types";
import { IconsticaIcon } from "../icons/IconsticaIcon";

/**
 * Cartographie des icônes de la partie « Annonces » vers le pack Iconstica.
 *
 * Convention de nommage attendue dans `src/assets/icons/iconstica/` :
 *   - megaphone.svg            (icône section / création)
 *   - info.svg                 (type Information)
 *   - sparkles.svg             (type Nouveauté)
 *   - alert.svg                (type Important)
 *   - alert-octagon.svg        (type Urgent)
 *   - wrench.svg               (type Maintenance)
 *   - check-circle.svg         (statut Publiée)
 *   - clock.svg                (statut Programmée)
 *   - file.svg                 (statut Brouillon)
 *   - timer.svg                (statut Expirée)
 *   - ban.svg                  (statut Désactivée)
 *   - eye.svg / pencil.svg / copy.svg / power.svg / trash.svg
 *   - chevron-left.svg / chevron-right.svg / plus.svg / search.svg / image.svg
 *
 * La recherche est tolérante (préfixe) : megaphone-line.svg fonctionne aussi.
 */

export const ANNOUNCEMENT_TYPE_ICONS: Record<AnnouncementType, string> = {
  information: "info",
  news: "sparkles",
  important: "alert",
  urgent: "alert-octagon",
  maintenance: "wrench",
};

export const ANNOUNCEMENT_STATUS_ICONS: Record<AnnouncementStatus, string> = {
  published: "check-circle",
  scheduled: "clock",
  draft: "file",
  expired: "timer",
  disabled: "ban",
};

/** Icône du type d'annonce (Iconstica, repli emoji). */
export function AnnouncementTypeIcon({
  type,
  className = "size-4",
}: {
  type: AnnouncementType;
  className?: string;
}) {
  return (
    <IconsticaIcon
      name={ANNOUNCEMENT_TYPE_ICONS[type]}
      className={className}
      fallback={<span aria-hidden className={className}>{ANNOUNCEMENT_TYPE_META[type].emoji}</span>}
    />
  );
}

/** Icône du statut d'annonce (Iconstica, repli emoji). */
export function AnnouncementStatusIcon({
  status,
  className = "size-3.5",
}: {
  status: AnnouncementStatus;
  className?: string;
}) {
  return (
    <IconsticaIcon
      name={ANNOUNCEMENT_STATUS_ICONS[status]}
      className={className}
      fallback={<span aria-hidden className={className}>{ANNOUNCEMENT_STATUS_META[status].emoji}</span>}
    />
  );
}