import { useState } from "react";
import { useQuery } from "convex/react";
import type { Doc } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import {
  ANNOUNCEMENT_TYPE_META,
  type AnnouncementTargetType,
  type AnnouncementType,
} from "../../../convex/types";
import { Button } from "../../ui/button";
import { Checkbox } from "../../ui/checkbox";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { Switch } from "../../ui/switch";
import { Textarea } from "../../ui/textarea";
import { AnnouncementPreview } from "./AnnouncementPreview";
import { AnnouncementTypeIcon } from "../../announcements/announcementIcons";

export interface AnnouncementFormValue {
  title: string;
  content: string;
  type: AnnouncementType;
  priority: number;
  imageUrl?: string;
  publishMode: "now" | "scheduled";
  startDate?: number;
  endDate?: number;
  targetType: AnnouncementTargetType;
  targetRoles: string[];
  targetUserIds: string[];
  targetCompanyIds: string[];
}

export const emptyAnnouncementValue: AnnouncementFormValue = {
  title: "",
  content: "",
  type: "information",
  priority: 1,
  imageUrl: undefined,
  publishMode: "now",
  startDate: undefined,
  endDate: undefined,
  targetType: "all",
  targetRoles: [],
  targetUserIds: [],
  targetCompanyIds: [],
};

export function announcementToFormValue(
  a: Doc<"announcements">,
): AnnouncementFormValue {
  return {
    title: a.title,
    content: a.content,
    type: a.type,
    priority: a.priority,
    imageUrl: a.imageUrl,
    publishMode: a.startDate !== undefined && a.startDate > Date.now() ? "scheduled" : "now",
    startDate: a.startDate,
    endDate: a.endDate,
    targetType: a.targetType,
    targetRoles: a.targetRoles ?? [],
    targetUserIds: (a.targetUserIds ?? []).map((id) => id.toString()),
    targetCompanyIds: a.targetCompanyIds ?? [],
  };
}

const PRIORITY_OPTIONS: {
  value: number;
  type: AnnouncementType;
  label: string;
}[] = [
  { value: 5, type: "urgent", label: "Urgent" },
  { value: 4, type: "important", label: "Important" },
  { value: 3, type: "news", label: "Nouveauté" },
  { value: 2, type: "maintenance", label: "Maintenance" },
  { value: 1, type: "information", label: "Information" },
];

const ALL_ROLES = ["admin", "user", "member"];

function toLocalInput(ts?: number): string {
  if (!ts) return "";
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): number | undefined {
  if (!value) return undefined;
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? undefined : ts;
}

export function AnnouncementForm({
  value,
  onChange,
  onSubmit,
  onCancel,
  saving,
  submitLabel,
}: {
  value: AnnouncementFormValue;
  onChange: (v: AnnouncementFormValue) => void;
  onSubmit: () => void;
  onCancel: () => void;
  saving?: boolean;
  submitLabel?: string;
}) {
  const [userSearch, setUserSearch] = useState("");
  const users = useQuery(api.admin.listUsers, {
    search: userSearch || undefined,
    limit: 50,
  });

  const toggleRole = (role: string) => {
    const roles = value.targetRoles.includes(role)
      ? value.targetRoles.filter((r) => r !== role)
      : [...value.targetRoles, role];
    onChange({ ...value, targetRoles: roles });
  };

  const toggleUser = (id: string) => {
    const ids = value.targetUserIds.includes(id)
      ? value.targetUserIds.filter((x) => x !== id)
      : [...value.targetUserIds, id];
    onChange({ ...value, targetUserIds: ids });
  };

  const setCompanyNames = (raw: string) =>
    onChange({
      ...value,
      targetCompanyIds: raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    });

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* ===== Formulaire ===== */}
      <div className="flex flex-col gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="ann-title" className="text-xs font-medium">
            Titre de l'annonce *
          </Label>
          <Input
            id="ann-title"
            value={value.title}
            onChange={(e) => onChange({ ...value, title: e.target.value })}
            placeholder="Ex. : Nouvelle version de l'estimation IA"
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="ann-content" className="text-xs font-medium">
            Description / contenu *
          </Label>
          <Textarea
            id="ann-content"
            value={value.content}
            onChange={(e) => onChange({ ...value, content: e.target.value })}
            placeholder="Décrivez l'annonce…"
            className="min-h-[110px] resize-y"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="ann-type" className="text-xs font-medium">
              Type d'annonce *
            </Label>
            <Select
              value={value.type}
              onValueChange={(type) => onChange({ ...value, type: type as AnnouncementType })}
            >
              <SelectTrigger id="ann-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ANNOUNCEMENT_TYPE_META).map(([k, m]) => (
                  <SelectItem key={k} value={k}>
                    <span className="inline-flex items-center gap-1.5">
                      <AnnouncementTypeIcon type={k as AnnouncementType} className="size-3.5" />
                      {m.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ann-priority" className="text-xs font-medium">
              Niveau de priorité
            </Label>
            <Select
              value={String(value.priority)}
              onValueChange={(p) => onChange({ ...value, priority: Number(p) })}
            >
              <SelectTrigger id="ann-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={String(o.value)}>
                    <span className="inline-flex items-center gap-1.5">
                      <AnnouncementTypeIcon type={o.type} className="size-3.5" />
                      {o.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="ann-image" className="text-xs font-medium">
            Image ou icône (URL optionnelle)
          </Label>
          <Input
            id="ann-image"
            value={value.imageUrl ?? ""}
            onChange={(e) =>
              onChange({ ...value, imageUrl: e.target.value || undefined })
            }
            placeholder="https://…"
          />
        </div>

        {/* ===== Publication ===== */}
        <div className="rounded-xl border p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium">Programmer la publication</p>
              <p className="text-[10px] text-muted-foreground">
                Par défaut, l'annonce est publiée immédiatement.
              </p>
            </div>
            <Switch
              checked={value.publishMode === "scheduled"}
              onCheckedChange={(checked) =>
                onChange({ ...value, publishMode: checked ? "scheduled" : "now" })
              }
              aria-label="Programmer la publication"
            />
          </div>

          {value.publishMode === "scheduled" && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="ann-start" className="text-xs font-medium">
                  Date & heure de début
                </Label>
                <Input
                  id="ann-start"
                  type="datetime-local"
                  value={toLocalInput(value.startDate)}
                  onChange={(e) =>
                    onChange({ ...value, startDate: fromLocalInput(e.target.value) })
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ann-end" className="text-xs font-medium">
                  Date & heure d'expiration
                </Label>
                <Input
                  id="ann-end"
                  type="datetime-local"
                  value={toLocalInput(value.endDate)}
                  onChange={(e) =>
                    onChange({ ...value, endDate: fromLocalInput(e.target.value) })
                  }
                />
              </div>
            </div>
          )}
        </div>

        {/* ===== Ciblage ===== */}
        <div className="rounded-xl border p-3">
          <p className="text-xs font-medium">Destinataires</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {(
              [
                ["all", "Tous les utilisateurs"],
                ["role", "Un rôle spécifique"],
                ["company", "Des sociétés"],
                ["user", "Des utilisateurs précis"],
              ] as [AnnouncementTargetType, string][]
            ).map(([key, label]) => (
              <label
                key={key}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
                  value.targetType === key
                    ? "border-primary/50 bg-primary/5 font-medium"
                    : "hover:bg-muted/50"
                }`}
              >
                <input
                  type="radio"
                  name="ann-target"
                  checked={value.targetType === key}
                  onChange={() => onChange({ ...value, targetType: key })}
                  className="accent-primary"
                />
                {label}
              </label>
            ))}
          </div>

          {value.targetType === "role" && (
            <div className="mt-3 flex flex-wrap gap-3">
              {ALL_ROLES.map((role) => (
                <label
                  key={role}
                  className="flex cursor-pointer items-center gap-1.5 text-xs"
                >
                  <Checkbox
                    checked={value.targetRoles.includes(role)}
                    onCheckedChange={() => toggleRole(role)}
                  />
                  {role}
                </label>
              ))}
            </div>
          )}

          {value.targetType === "user" && (
            <div className="mt-3 grid gap-2">
              <Input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Rechercher un utilisateur (nom, email)…"
                className="text-xs"
              />
              <div className="max-h-40 overflow-y-auto rounded-lg border">
                {(users ?? []).map((u) => (
                  <label
                    key={u._id}
                    className="flex cursor-pointer items-center gap-2 border-b px-3 py-1.5 text-xs last:border-0 hover:bg-muted/40"
                  >
                    <Checkbox
                      checked={value.targetUserIds.includes(u._id)}
                      onCheckedChange={() => toggleUser(u._id)}
                    />
                    <span className="truncate font-medium">
                      {u.name || "Sans nom"}
                    </span>
                    <span className="truncate text-muted-foreground">
                      {u.email || ""}
                    </span>
                  </label>
                ))}
                {users?.length === 0 && (
                  <p className="px-3 py-2 text-[11px] text-muted-foreground">
                    Aucun utilisateur trouvé.
                  </p>
                )}
              </div>
            </div>
          )}

          {value.targetType === "company" && (
            <div className="mt-3 grid gap-1.5">
              <Label htmlFor="ann-companies" className="text-xs font-medium">
                Noms des sociétés (séparés par des virgules)
              </Label>
              <Input
                id="ann-companies"
                value={value.targetCompanyIds.join(", ")}
                onChange={(e) => setCompanyNames(e.target.value)}
                placeholder="Ex. : Baticost Immobilier, Agence Tunis Nord"
                className="text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                Les annonces ciblent les utilisateurs dont le nom ou l'adresse
                e-mail correspond à ces sociétés.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" onClick={onSubmit} disabled={saving || !value.title.trim() || !value.content.trim()}>
            {saving ? "Enregistrement…" : submitLabel ?? "Enregistrer l'annonce"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
        </div>
      </div>

      {/* ===== Aperçu ===== */}
      <div className="lg:sticky lg:top-4">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Aperçu (rendu Dashboard)
        </p>
        <AnnouncementPreview
          title={value.title}
          content={value.content}
          type={value.type}
          author="Administrateur"
        />
      </div>
    </div>
  );
}