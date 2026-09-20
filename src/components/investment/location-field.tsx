import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { REGION_CASCADE, REGION_LABELS } from "@/convex/investmentTypes";
import { cn } from "@/lib/utils";

export interface LocationValue {
  region: string;
  city: string;
  quartier: string;
}

type Step = "region" | "city" | "quartier";

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Sélecteur de localisation en 3 niveaux : Région → Ville → Quartier.
 * Basé sur REGION_CASCADE, avec recherche et possibilité d'ajouter une
 * valeur libre, mobile-first (Sheet plein écran sur petit écran).
 */
export function LocationField({
  value,
  onChange,
  label = "Localisation",
}: {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("region");
  const [query, setQuery] = useState("");

  const regions = useMemo(() => Object.keys(REGION_CASCADE), []);

  const cities = useMemo(() => {
    const entries = REGION_CASCADE[value.region] ?? [];
    return entries.map((e) => e.city);
  }, [value.region]);

  const quartiers = useMemo(() => {
    const entry = (REGION_CASCADE[value.region] ?? []).find((e) => e.city === value.city);
    return entry?.quartier ?? [];
  }, [value.region, value.city]);

  const filtered = useMemo(() => {
    const source = step === "region" ? regions : step === "city" ? cities : quartiers;
    if (!query.trim()) return source;
    const q = normalize(query.trim());
    return source.filter((s) => normalize(s).includes(q));
  }, [step, regions, cities, quartiers, query]);

  const select = (item: string) => {
    if (step === "region") {
      const firstCity = REGION_CASCADE[item]?.[0];
      onChange({ region: item, city: firstCity?.city ?? "", quartier: firstCity?.quartier?.[0] ?? "" });
      setStep("city");
    } else if (step === "city") {
      const entry = (REGION_CASCADE[value.region] ?? []).find((e) => e.city === item);
      onChange({ ...value, city: item, quartier: entry?.quartier?.[0] ?? "" });
      setStep("quartier");
    } else {
      onChange({ ...value, quartier: item });
      setOpen(false);
    }
    setQuery("");
  };

  const stepTitle = step === "region" ? "Région" : step === "city" ? "Ville" : "Quartier";

  return (
    <div>
      <span className="text-xs font-medium text-foreground">{label}</span>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) {
            setStep("region");
            setQuery("");
          }
        }}
      >
        <SheetTrigger asChild>
          <button
            type="button"
            className="mt-1 flex w-full items-center justify-between gap-2 rounded-xl border border-border/50 bg-background px-3 py-2.5 text-left text-sm transition-colors hover:border-indigo-500/50"
          >
            <span className="flex min-w-0 items-center gap-2">
              <MapPin className="size-4 shrink-0 text-indigo-500" />
              <span className="truncate">
                {[value.quartier, value.city, REGION_LABELS[value.region] ?? value.region]
                  .filter(Boolean)
                  .join(" · ") || "Choisir une localisation"}
              </span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-2xl p-0 sm:max-w-md sm:mx-auto">
          <SheetHeader className="border-b border-border/50 px-4 pb-3 pt-5">
            <SheetTitle className="text-base">{stepTitle}</SheetTitle>
            <SheetDescription className="text-xs">
              {step === "region"
                ? "Sélectionnez la région (gouvernorat) du bien."
                : step === "city"
                  ? "Sélectionnez la ville."
                  : "Sélectionnez ou saisissez le quartier."}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-3 p-4">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Rechercher…`}
              className="h-10"
            />
            <ScrollArea className="h-[52vh] pr-2">
              <div className="space-y-1">
                {filtered.map((item) => {
                  const selected =
                    step === "region"
                      ? value.region === item
                      : step === "city"
                        ? value.city === item
                        : value.quartier === item;
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => select(item)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors",
                        selected ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" : "hover:bg-muted/50",
                      )}
                    >
                      <span className="truncate">{item}</span>
                      {selected ? <Check className="size-4 shrink-0" /> : null}
                    </button>
                  );
                })}

                {step === "quartier" && query.trim() && !filtered.includes(query.trim()) ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2"
                    onClick={() => select(query.trim())}
                  >
                    <Plus className="size-4" />
                    Ajouter « {query.trim()} »
                  </Button>
                ) : null}

                {filtered.length === 0 && !(step === "quartier" && query.trim()) ? (
                  <p className="px-3 py-6 text-center text-xs text-muted-foreground">Aucun résultat.</p>
                ) : null}
              </div>
            </ScrollArea>

            {step !== "region" ? (
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => setStep(step === "quartier" ? "city" : "region")}
              >
                ← Revenir à {step === "quartier" ? "la ville" : "la région"}
              </Button>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
