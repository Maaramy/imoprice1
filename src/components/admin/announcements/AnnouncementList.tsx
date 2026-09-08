import { useState } from "react";
import type { Doc } from "../../../convex/_generated/dataModel";
import { AnnouncementBadge } from "../../announcements/AnnouncementBadge";
import { formatAnnouncementDate } from "../../announcements/AnnouncementCard";
import { AnnouncementModal } from "../../announcements/AnnouncementModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../ui/alert-dialog";
import { Button } from "../../ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
import { AnnouncementStatusBadge } from "./AnnouncementStatusBadge";

export interface AnnouncementActions {
  onEdit: (a: Doc<"announcements">) => void;
  onDuplicate: (a: Doc<"announcements">) => void;
  onToggleActive: (a: Doc<"announcements">) => void;
  onDelete: (id: string) => void;
}

export function AnnouncementList({
  announcements,
  actions,
  onReorder,
}: {
  announcements: Doc<"announcements">[];
  actions: AnnouncementActions;
  /** Si fourni, active le tri manuel par glisser-déposer. */
  onReorder?: (orderedIds: string[]) => void;
}) {
  const [viewing, setViewing] = useState<Doc<"announcements"> | null>(null);
  const [deleting, setDeleting] = useState<Doc<"announcements"> | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const handleDrop = (targetId: string) => {
    if (!onReorder || !dragId || dragId === targetId) return;
    const ids = announcements.map((a) => a._id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from === -1 || to === -1) return;
    ids.splice(from, 1);
    ids.splice(to, 0, dragId);
    onReorder(ids);
    setDragId(null);
    setOverId(null);
  };

  return (
    <>
      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="min-w-[180px]">Titre</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-center">Priorité</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Publication</TableHead>
              <TableHead>Expiration</TableHead>
              <TableHead>Auteur</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {announcements.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                  Aucune annonce ne correspond à ces filtres.
                </TableCell>
              </TableRow>
            )}
            {announcements.map((a) => (
              <TableRow
                key={a._id}
                draggable={!!onReorder}
                onDragStart={onReorder ? () => setDragId(a._id) : undefined}
                onDragOver={(e) => {
                  if (!onReorder || !dragId) return;
                  e.preventDefault();
                  setOverId(a._id);
                }}
                onDragLeave={() => setOverId((o) => (o === a._id ? null : o))}
                onDrop={onReorder ? () => handleDrop(a._id) : undefined}
                className={`${onReorder ? "cursor-grab active:cursor-grabbing" : ""} ${
                  dragId === a._id ? "opacity-40" : ""
                } ${overId === a._id && dragId !== a._id ? "bg-primary/5" : ""}`}
              >
                <TableCell className="max-w-[220px]">
                  <span className="line-clamp-1 font-medium">{a.title}</span>
                </TableCell>
                <TableCell>
                  <AnnouncementBadge type={a.type} />
                </TableCell>
                <TableCell className="text-center text-xs">
                  {a.priority >= 5
                    ? "🔴 Urgent"
                    : a.priority >= 4
                      ? "🟠 Important"
                      : a.priority >= 3
                        ? "🆕 Nouveauté"
                        : a.priority >= 2
                          ? "🛠️ Maintenance"
                          : "ℹ️ Information"}
                </TableCell>
                <TableCell>
                  <AnnouncementStatusBadge status={a.status} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs">
                  {formatAnnouncementDate(a.startDate ?? a.createdAt)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs">
                  {a.endDate ? formatAnnouncementDate(a.endDate) : "—"}
                </TableCell>
                <TableCell className="max-w-[120px]">
                  <span className="line-clamp-1 text-xs">
                    {a.createdByName ?? "Administrateur"}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setViewing(a)}
                      title="Voir"
                    >
                      👁
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => actions.onEdit(a)}
                      title="Modifier"
                    >
                      ✏️
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => actions.onDuplicate(a)}
                      title="Dupliquer"
                    >
                      📋
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => actions.onToggleActive(a)}
                      title={a.isActive ? "Désactiver" : "Activer"}
                    >
                      {a.isActive ? "🔄" : "▶️"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-red-500 hover:text-red-600"
                      onClick={() => setDeleting(a)}
                      title="Supprimer"
                    >
                      🗑
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AnnouncementModal
        announcement={viewing}
        open={viewing !== null}
        onOpenChange={(open) => !open && setViewing(null)}
      />

      <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette annonce ?</AlertDialogTitle>
            <AlertDialogDescription>
              « {deleting?.title} » sera définitivement supprimée. Cette action est
              irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleting) actions.onDelete(deleting._id);
                setDeleting(null);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}