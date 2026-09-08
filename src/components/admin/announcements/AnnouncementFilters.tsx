import { ANNOUNCEMENT_STATUS_META, ANNOUNCEMENT_TYPE_META } from "../../../convex/types";
import { Input } from "../../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";

export interface AnnouncementFiltersState {
  search: string;
  type: string;
  status: string;
}

export function AnnouncementFilters({
  value,
  onChange,
}: {
  value: AnnouncementFiltersState;
  onChange: (v: AnnouncementFiltersState) => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Input
        value={value.search}
        onChange={(e) => onChange({ ...value, search: e.target.value })}
        placeholder="Rechercher une annonce…"
        className="sm:max-w-xs"
        aria-label="Rechercher une annonce"
      />
      <Select
        value={value.type}
        onValueChange={(type) => onChange({ ...value, type })}
      >
        <SelectTrigger className="w-full sm:w-44" aria-label="Filtrer par type">
          <SelectValue placeholder="Tous les types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les types</SelectItem>
          {Object.entries(ANNOUNCEMENT_TYPE_META).map(([k, m]) => (
            <SelectItem key={k} value={k}>
              {m.emoji} {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={value.status}
        onValueChange={(status) => onChange({ ...value, status })}
      >
        <SelectTrigger className="w-full sm:w-44" aria-label="Filtrer par statut">
          <SelectValue placeholder="Tous les statuts" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les statuts</SelectItem>
          {Object.entries(ANNOUNCEMENT_STATUS_META).map(([k, m]) => (
            <SelectItem key={k} value={k}>
              {m.emoji} {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}