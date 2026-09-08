import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { Doc } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { Button } from "../../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import {
  AnnouncementForm,
  announcementToFormValue,
  emptyAnnouncementValue,
  type AnnouncementFormValue,
} from "./AnnouncementForm";
import { AnnouncementFilters, type AnnouncementFiltersState } from "./AnnouncementFilters";
import { AnnouncementList } from "./AnnouncementList";

/** Panneau complet « Gestion des annonces » (espace Administration). */
export function AnnouncementEditor() {
  const announcements = useQuery(api.announcements.getAnnouncements);
  const create = useMutation(api.announcements.createAnnouncement);
  const update = useMutation(api.announcements.updateAnnouncement);
  const remove = useMutation(api.announcements.deleteAnnouncement);
  const activate = useMutation(api.announcements.activateAnnouncement);
  const deactivate = useMutation(api.announcements.deactivateAnnouncement);
  const duplicate = useMutation(api.announcements.duplicateAnnouncement);
  const reorder = useMutation(api.announcements.updateAnnouncementOrder);

  const [filters, setFilters] = useState<AnnouncementFiltersState>({
    search: "",
    type: "all",
    status: "all",
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Doc<"announcements"> | null>(null);
  const [form, setForm] = useState<AnnouncementFormValue>(emptyAnnouncementValue);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!announcements) return [];
    const q = filters.search.trim().toLowerCase();
    return announcements.filter((a) => {
      if (filters.type !== "all" && a.type !== filters.type) return false;
      if (filters.status !== "all" && a.status !== filters.status) return false;
      if (q && !a.title.toLowerCase().includes(q) && !a.content.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [announcements, filters]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyAnnouncementValue);
    setError(null);
    setDialogOpen(true);
  };

  const openEdit = (a: Doc<"announcements">) => {
    setEditing(a);
    setForm(announcementToFormValue(a));
    setError(null);
    setDialogOpen(true);
  };

  const submit = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const input = {
        title: form.title,
        content: form.content,
        type: form.type,
        priority: form.priority,
        imageUrl: form.imageUrl,
        startDate:
          form.publishMode === "scheduled" ? form.startDate : undefined,
        endDate:
          form.publishMode === "scheduled" ? form.endDate : undefined,
        targetType: form.targetType,
        targetCompanyIds:
          form.targetType === "company" ? form.targetCompanyIds : undefined,
        targetRoles:
          form.targetType === "role" ? form.targetRoles : undefined,
        targetUserIds:
          form.targetType === "user"
            ? form.targetUserIds.map((id) => id as never)
            : undefined,
      };
      if (editing) {
        await update({ id: editing._id, input });
      } else {
        await create({ input });
      }
      setDialogOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleReorder = (orderedIds: string[]) => {
    void reorder({ orderedIds: orderedIds.map((id) => id as never) });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <AnnouncementFilters value={filters} onChange={setFilters} />
        <Button onClick={openCreate} className="shrink-0">
          + Créer une annonce
        </Button>
      </div>

      <AnnouncementList
        announcements={filtered}
        onReorder={handleReorder}
        actions={{
          onEdit: openEdit,
          onDuplicate: (a) => void duplicate({ id: a._id }),
          onToggleActive: (a) =>
            void (a.isActive
              ? deactivate({ id: a._id })
              : activate({ id: a._id })),
          onDelete: (id) => void remove({ id: id as never }),
        }}
      />

      {onReorder && (
        <p className="text-[11px] text-muted-foreground">
          💡 Glissez-déposez les lignes du tableau pour modifier l'ordre
          d'affichage manuel (au sein d'une même priorité).
        </p>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "✏️ Modifier l'annonce" : "📢 Créer une annonce"}
            </DialogTitle>
          </DialogHeader>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          )}
          <AnnouncementForm
            value={form}
            onChange={setForm}
            onSubmit={() => void submit()}
            onCancel={() => setDialogOpen(false)}
            saving={saving}
            submitLabel={editing ? "Mettre à jour" : "Publier l'annonce"}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}