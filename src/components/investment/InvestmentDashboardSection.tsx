import { Link } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Heart,
  LineChart,
  Plus,
  Trash2,
  TrendingUp,
  Wallet,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { fmtPct, fmtTND } from "@/components/investment/shared";
import {
  buildInvestmentHistoryEntry,
  summarizeInvestmentHistory,
  type InvestmentAnalysisLike,
} from "@/lib/investmentHistory";

/** Carte d'action rapide + section « Mes projets d'investissement ». */
export function InvestmentDashboardSection() {
  const analyses = useQuery(api.investments.listAnalyses);
  const toggleFavorite = useMutation(api.investments.toggleFavorite);
  const deleteAnalysis = useMutation(api.investments.deleteAnalysis);

  if (analyses === undefined) return null;

  const entries = (analyses as InvestmentAnalysisLike[]).map(buildInvestmentHistoryEntry);
  const stats = summarizeInvestmentHistory(entries);

  return (
    <section className="mb-4 sm:mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <LineChart className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-bold tracking-tight">Mes projets d'investissement</h2>
            <p className="text-[11px] text-muted-foreground">
              Analyses de rentabilité locative (ROI, cashflow, score IA)
            </p>
          </div>
        </div>
        <Button asChild size="sm" className="gap-2 bg-gradient-to-r from-indigo-600 to-blue-600">
          <Link to="/dashboard/investments">
            <Plus className="size-4" />
            Nouveau investissement
          </Link>
        </Button>
      </div>

      {entries.length > 0 ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MiniStat icon={Wallet} label="Budget investi" value={fmtTND(stats.totalBudget)} />
            <MiniStat icon={TrendingUp} label="Rendement net moyen" value={fmtPct(stats.avgNetYield)} />
            <MiniStat icon={Award} label="Meilleur score" value={`${stats.bestScore}/100`} />
            <MiniStat icon={Heart} label="Favoris" value={String(stats.favorites)} />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {entries.slice(0, 6).map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                className={cn(
                  "group rounded-2xl border border-border/40 border-l-4 bg-card/80 p-4 shadow-soft transition-shadow hover:shadow-md",
                  "border-l-indigo-500 dark:border-l-indigo-400",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <Link to={entry.href} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold tracking-tight">{entry.title}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {entry.rentMode === "nuit" ? "Courte durée" : "Longue durée"} ·{" "}
                      {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(entry.createdAt))}
                    </p>
                  </Link>
                  <Badge
                    variant="outline"
                    className={cn(
                      "shrink-0 text-[10px]",
                      entry.score >= 70
                        ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                        : entry.score >= 55
                          ? "border-indigo-500/40 text-indigo-600 dark:text-indigo-400"
                          : "border-amber-500/40 text-amber-600 dark:text-amber-400",
                    )}
                  >
                    {entry.score}
                  </Badge>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <p className="text-muted-foreground">Coût</p>
                    <p className="font-semibold tabular-nums">{fmtTND(entry.totalCost)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Cashflow</p>
                    <p className={cn("font-semibold tabular-nums", entry.monthlyCashflow >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                      {fmtTND(entry.monthlyCashflow)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Rend. net</p>
                    <p className="font-semibold tabular-nums">{fmtPct(entry.netYieldPct)}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <Button asChild variant="ghost" size="sm" className="gap-1 text-indigo-600 dark:text-indigo-400">
                    <Link to={entry.href}>
                      Ouvrir le résultat
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Basculer favori"
                      onClick={() => void toggleFavorite({ analysisId: entry.id as Id<"investmentAnalyses"> })}
                    >
                      <Heart className={entry.isFavorite ? "size-4 fill-rose-500 text-rose-500" : "size-4"} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-rose-600"
                      aria-label="Supprimer l'analyse"
                      onClick={async () => {
                        try {
                          await deleteAnalysis({ analysisId: entry.id as Id<"investmentAnalyses"> });
                          toast.success("Analyse supprimée.");
                        } catch {
                          toast.error("Suppression impossible.");
                        }
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          {entries.length > 6 ? (
            <div className="mt-3 text-center">
              <Button variant="outline" size="sm" asChild>
                <Link to="/dashboard/investments">Voir plus</Link>
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-border/60 p-6 text-center">
          <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted/50">
            <LineChart className="size-5 text-muted-foreground" />
          </span>
          <p className="mt-2 text-xs text-muted-foreground">
            Aucune analyse d'investissement pour le moment. Lancez votre première analyse de rentabilité.
          </p>
        </div>
      )}
    </section>
  );
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
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
          <Icon className="size-3.5" />
        </span>
        <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
      </div>
      <p className="mt-1.5 text-sm font-bold tabular-nums">{value}</p>
    </div>
  );
}
