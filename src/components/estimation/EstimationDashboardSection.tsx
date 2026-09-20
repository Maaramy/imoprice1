import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Building,
  Coins,
  Eye,
  Home,
  KeyRound,
  LandPlot,
  LineChart,
  Percent,
  Plus,
  Ruler,
  Store,
  Tag,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { fmtTND } from "@/components/investment/shared";
import {
  buildRentEstimationEntry,
  buildSaleEstimationEntry,
  iconKindFor,
  summarizeRentEstimations,
  summarizeSaleEstimations,
  type EstimationEntry,
  type EstimationSegment,
  type EstimationIconKind,
  type RentEstimationLike,
  type SaleEstimationLike,
} from "@/lib/estimationHistory";

const SEGMENTS: Array<{ key: EstimationSegment; label: string }> = [
  { key: "vente", label: "Vente / Achat" },
  { key: "loyers", label: "Loyers" },
];

const ICONS: Record<EstimationIconKind, React.ComponentType<{ className?: string }>> = {
  home: Home,
  building: Building,
  commerce: Store,
  land: LandPlot,
  key: KeyRound,
};

const MAX_VISIBLE = 6;

/**
 * Section « Mes projets d'estimation » — réplique exacte de la mise en page de
 * « Mes projets d'investissement » (InvestmentDashboardSection) : en-tête
 * icône + titre + CTA, 4 mini-stats, grille de cartes `border-l-4` avec
 * badge de score, 3 métriques, actions (favori/suppression) et état vide.
 * Adaptation : segmentation Vente/Achat · Loyers + métriques d'estimation.
 */
export function EstimationDashboardSection() {
  const [segment, setSegment] = useState<EstimationSegment>("vente");
  const saleEstimations = useQuery(api.estimation.getUserEstimations);
  const rentEstimations = useQuery(api.rent.getUserRentEstimations);

  const deleteEstimation = useMutation(api.estimation.deleteEstimation);
  const deleteRentEstimation = useMutation(api.rent.deleteRentEstimation);

  const saleEntries = useMemo(
    () => ((saleEstimations ?? []) as unknown as SaleEstimationLike[]).map(buildSaleEstimationEntry),
    [saleEstimations],
  );
  const rentEntries = useMemo(
    () => ((rentEstimations ?? []) as unknown as RentEstimationLike[]).map(buildRentEstimationEntry),
    [rentEstimations],
  );

  const saleStats = useMemo(() => summarizeSaleEstimations(saleEntries), [saleEntries]);
  const rentStats = useMemo(() => summarizeRentEstimations(rentEntries), [rentEntries]);

  if (saleEstimations === undefined || rentEstimations === undefined) return null;

  // Rien à montrer sur les deux segments → la section reste discrète.
  if (saleEntries.length === 0 && rentEntries.length === 0) {
    return (
      <section className="mb-4 sm:mb-6">
        <SectionHeader />
        <div className="mt-4 rounded-2xl border border-dashed border-border/60 p-6 text-center">
          <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted/50">
            <LineChart className="size-5 text-muted-foreground" />
          </span>
          <p className="mt-2 text-xs text-muted-foreground">
            Aucune estimation pour le moment. Estimez la valeur de vente ou le loyer de votre premier bien.
          </p>
        </div>
      </section>
    );
  }

  const entries: EstimationEntry[] = segment === "vente" ? saleEntries : rentEntries;
  const stats = segment === "vente" ? saleStats : rentStats;

  return (
    <section className="mb-4 sm:mb-6">
      <SectionHeader />

      {/* Segmentation : Vente/Achat · Loyers */}
      <div className="mt-3 flex w-fit items-center gap-1 rounded-xl bg-muted/50 p-1">
        {SEGMENTS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSegment(s.key)}
            aria-pressed={segment === s.key}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
              segment === s.key
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {s.key === "vente" ? <Tag className="size-3.5" /> : <KeyRound className="size-3.5" />}
            {s.label}
            <span
              className={cn(
                "inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none",
                segment === s.key
                  ? cn(s.key === "vente" ? "bg-emerald-600" : "bg-teal-600", "text-white")
                  : "bg-muted-foreground/20 text-muted-foreground",
              )}
            >
              {s.key === "vente" ? saleStats.count : rentStats.count}
            </span>
          </button>
        ))}
      </div>

      {/* Mini-stats — mêmes tuiles que la section investissement */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat
          icon={segment === "vente" ? Coins : WalletIcon}
          label={segment === "vente" ? "Valeur totale estimée" : "Revenus mensuels cumulés"}
          value={fmtTND(stats.totalValue)}
        />
        <MiniStat icon={TrendingUp} label="Confiance moyenne" value={`${stats.avgConfidence} %`} />
        <MiniStat icon={Eye} label="Meilleure confiance" value={`${stats.bestConfidence} %`} />
        <MiniStat
          icon={segment === "vente" ? Tag : Percent}
          label={segment === "vente" ? "Biens estimés" : "Loyers estimés"}
          value={String(stats.count)}
        />
      </div>

      {/* Cartes — grille responsive identique (1 / 2 / 3 colonnes) */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence initial={false}>
          {entries.slice(0, MAX_VISIBLE).map((entry, i) => (
            <motion.div
              key={entry.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
              className={cn(
                "group rounded-2xl border border-border/40 border-l-4 bg-card/80 p-4 shadow-soft transition-shadow hover:shadow-md",
                entry.kind === "vente"
                  ? "border-l-emerald-500 dark:border-l-emerald-400"
                  : "border-l-teal-500 dark:border-l-teal-400",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <Link to={entry.href} className="flex min-w-0 flex-1 items-start gap-2.5">
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                      entry.kind === "vente"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-teal-500/10 text-teal-600 dark:text-teal-400",
                    )}
                  >
                    {(() => {
                      const Icon = ICONS[entry.kind === "vente" ? iconKindFor(entry.propertyType) : "key"];
                      return <Icon className="size-4" />;
                    })()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold tracking-tight">{cardTitle(entry)}</p>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                      {entry.location} ·{" "}
                      {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(entry.createdAt))}
                    </p>
                  </div>
                </Link>
                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0 text-[10px]",
                    entry.confidenceIndex >= 80
                      ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                      : entry.confidenceIndex >= 60
                        ? "border-amber-500/40 text-amber-600 dark:text-amber-400"
                        : "border-rose-500/40 text-rose-600 dark:text-rose-400",
                  )}
                >
                  {entry.confidenceIndex} %
                </Badge>
              </div>

              {/* Métriques d'estimation — 3 colonnes comme la section d'origine */}
              <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                {entry.kind === "vente" ? (
                  <>
                    <Metric label="Prix estimé" value={fmtTND(entry.estimatedValue)} />
                    <Metric
                      label="Prix / m²"
                      value={fmtTND(entry.avgPricePerSqm)}
                    />
                    <Metric
                      label="Fourchette"
                      value={`${compact(entry.priceMin)} – ${compact(entry.priceMax)}`}
                    />
                  </>
                ) : (
                  <>
                    <Metric
                      label={entry.rentMode === "nuit" ? "Loyer / nuit" : "Loyer / mois"}
                      value={fmtTND(entry.estimatedRent)}
                    />
                    <Metric label="Loyer / m²" value={fmtTND(entry.rentPerSqm)} />
                    <Metric
                      label="Rendement"
                      value={typeof entry.grossYield === "number" ? `${entry.grossYield.toFixed(1)} %` : "—"}
                    />
                  </>
                )}
              </div>

              {entry.surface != null ? (
                <p className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Ruler className="size-3" />
                  {entry.surface} m²
                </p>
              ) : null}

              <div className="mt-3 flex items-center justify-between">
                <Button asChild variant="ghost" size="sm" className="gap-1 text-emerald-600 dark:text-emerald-400">
                  <Link to={entry.href}>
                    Ouvrir le résultat
                    <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-rose-600"
                  aria-label={
                    entry.kind === "vente" ? "Supprimer l'estimation" : "Supprimer l'estimation de loyer"
                  }
                  onClick={async () => {
                    try {
                      if (entry.kind === "vente") {
                        await deleteEstimation({ estimationId: entry.id as Id<"estimations"> });
                      } else {
                        await deleteRentEstimation({ estimationId: entry.id as Id<"rentEstimations"> });
                      }
                      toast.success("Estimation supprimée.");
                    } catch {
                      toast.error("Suppression impossible.");
                    }
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {entries.length > MAX_VISIBLE ? (
        <div className="mt-3 text-center">
          <Button variant="outline" size="sm" asChild>
            <Link to="/estimate">Voir plus</Link>
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function SectionHeader() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <LineChart className="size-4" />
        </span>
        <div>
          <h2 className="text-sm font-bold tracking-tight">Mes projets d'estimation</h2>
          <p className="text-[11px] text-muted-foreground">
            Estimations de vente (Vente/Achat) et de loyers par IA
          </p>
        </div>
      </div>
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
        <Button asChild variant="outline" size="sm" className="w-full justify-center gap-2 sm:w-auto">
          <Link to="/estimate/loyer/new">
            <KeyRound className="size-4" />
            Estimer un loyer
          </Link>
        </Button>
        <Button asChild size="sm" className="w-full justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 sm:w-auto">
          <Link to="/estimate">
            <Plus className="size-4" />
            Nouvelle estimation
          </Link>
        </Button>
      </div>
    </div>
  );
}

function cardTitle(entry: EstimationEntry): string {
  if (entry.kind === "vente") {
    return `${entry.typeLabel} · ${fmtTND(entry.estimatedValue)}`;
  }
  return `${entry.typeLabel} · ${fmtTND(entry.estimatedRent)}${entry.rentMode === "nuit" ? "/nuit" : "/mois"}`;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-muted-foreground">{label}</p>
      <p className="truncate font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function compact(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(".", ",")} M`;
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 1000)} k`;
  return String(Math.round(value));
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border/40 bg-card/80 p-3 shadow-soft">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <Icon className="size-3.5" />
        </span>
        <span className="text-[9px] font-semibold uppercase leading-tight tracking-widest text-muted-foreground">{label}</span>
      </div>
      <p className="mt-1.5 truncate text-sm font-bold tabular-nums">{value}</p>
    </div>
  );
}

function WalletIcon({ className }: { className?: string }) {
  return <Coins className={className} />;
}
