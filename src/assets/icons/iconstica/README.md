# Pack Iconstica (SVG)

Déposez ici les fichiers SVG du pack Iconstica (style **Line** recommandé,
grille 24px, trait 1.5px — cohérent avec la charte BatiCost).

Le composant `src/components/icons/IconsticaIcon.tsx` charge automatiquement
tous les fichiers `*.svg` de ce dossier (et sous-dossiers) au build, et les
retrouve par nom (tolérant aux préfixes : `megaphone-line.svg` matche aussi
`megaphone`).

## Fichiers attendus — partie Annonces

| Usage | Nom attendu |
|---|---|
| Section « 📢 Annonces », création, onglet Admin | `megaphone.svg` |
| Type Information | `info.svg` |
| Type Nouveauté | `sparkles.svg` |
| Type Important | `alert.svg` |
| Type Urgent | `alert-octagon.svg` |
| Type Maintenance | `wrench.svg` |
| Statut Publiée | `check-circle.svg` |
| Statut Programmée | `clock.svg` |
| Statut Brouillon | `file.svg` |
| Statut Expirée | `timer.svg` |
| Statut Désactivée | `ban.svg` |
| Action Voir | `eye.svg` |
| Action Modifier | `pencil.svg` |
| Action Dupliquer | `copy.svg` |
| Action Activer / Désactiver | `power.svg` |
| Action Supprimer | `trash.svg` |
| Carousel précédent / suivant | `chevron-left.svg` / `chevron-right.svg` |
| Bouton « + Créer une annonce » | `plus.svg` |
| Recherche (filtres) | `search.svg` |
| Image / icône optionnelle | `image.svg` |

Si les noms réels du pack diffèrent, renommez simplement vos fichiers selon ce
tableau (ou adaptez `src/components/announcements/announcementIcons.tsx`).