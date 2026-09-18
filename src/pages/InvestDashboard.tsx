import { useMemo } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { ThemeToggle } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  BarChart3,
  CalendarClock,
  Compass,
  Gauge,
  LineChart,
  MapPinned,
  Percent,
  Plus,
  Sparkles,
  TrendingUp,
  Trash2,
  Wallet,
} from "lucide-react";
import {
  governorateOpportunities,
  INVESTMENT_TYPE_LABELS,
  rankInvestmentZones,
  type InvestmentType,
} from "@/lib/investment-analysis";
import { formatPct, formatTND, formatTNDCompact, SCORE_TONE_CLASS } from "@/lib/invest-format";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

/** Ligne d'analyse telle que renvoyée par la liste Convex. */
interface InvestmentListItem {
  _id: string;
  designation: string;
  investmentType: string;
  gouvernorat: string;
  ville?: string;
  quartier?: string;
  totalInvestment: number;
  annualCashFlow: number;
  netYield: number;
  roi10: number;
  paybackYears: number;
  score: number;
  grade: string;
}

export default function InvestDashboard() {
  const navigate = useNavigate();
  const investments = useQuery(api.investments.getUserInvestments) as
    | InvestmentListItem[]
    | undefined;
  const deleteInvestment = useMutation(api.investments.deleteInvestment);

  const stats = useMemo(() => {
    if (!investments || investments.length === 0) {
      return { count: 0, capital: 0, cashFlow: 0, netYield: 0, score: 0 };
    }
    const count = investments.length;
    const capital = investments.reduce((s, i) => s + i.totalInvestment, 0);
    const cashFlow = investments.reduce((s, i) => s + i.annualCashFlow, 0);
    const netYield = investments.reduce((s, i) => s + i.netYield, 0) / count;
    const score = investments.reduce((s, i) => s + i.score, 0) / count;
    return { count, capital, cashFlow, netYield, score };
  }, [investments]);

  const topZones = useMemo(() => rankInvestmentZones(6, "appartement"), []);
  const bestZones = useMemo(
    () =>
      governorateOpportunities()
        .map((g) => ({ g: g.gouvernorat, yield: g.grossYield }))
        .slice(0, 5),
    [],
  );

  async function handleDelete(id: string, name: string) {
    try {
      await deleteInvestment({ investmentId: id as never });
      toast.success(`Analyse « ${name} » supprimée`);
    } catch {
      toast.error("Suppression impossible");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* ═══ HEADER ═══ */}
      <header className="sticky top-0 z-40 border-b border-slate-200/60 dark:border-gray-800/60 bg-white/75 dark:bg-gray-950/75 backdrop-blur-2xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            >
              <ArrowLeft className="size-3.5" />
              <span className="hidden sm:inline">Tableau de bord</span>
            </button>
            <span className="hidden h-4 w-px bg-slate-200 dark:bg-slate-800 sm:block" />
            <span className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-slate-100">
              <TrendingUp className="size-4 text-indigo-600 dark:text-indigo-400" />
              Investissement IA
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              size="sm"
              onClick={() => navigate("/invest/new")}
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-200/50 hover:from-indigo-700 hover:to-violet-700"
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">Nouvelle analyse</span>
              <span className="sm:hidden">Analyser</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {/* ═══ TITRE ═══ */}
        <motion.div {...fadeUp} className="mb-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200/70 dark:border-indigo-900/60 bg-indigo-50/80 dark:bg-indigo-950/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
            <Sparkles className="size-3" /> Tableau de bord décisionnel
          </span>
          <h1 className="mt-3 text-xl font-black tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl">
            Rentabilité de vos investissements
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
            ROI, cash-flow, rentabilité nette, durée de récupération du capital et score IA de
            chacun de vos projets.
          </p>
        </motion.div>

        {/* ═══ KPI ═══ */}
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Analyses", value: String(stats.count), icon: BarChart3, tone: "text-indigo-600 dark:text-indigo-400" },
            { label: "Capital investi", value: formatTNDCompact(stats.capital), icon: Wallet, tone: "text-violet-600 dark:text-violet-400" },
            { label: "Cash-flow annuel", value: formatTNDCompact(stats.cashFlow), icon: LineChart, tone: "text-emerald-600 dark:text-emerald-400" },
            { label: "Score IA moyen", value: `${Math.round(stats.score)}/100`, icon: Gauge, tone: "text-blue-600 dark:text-blue-400" },
          ].map((k, i) => (
            <motion.div
              key={k.label}
              {...fadeUp}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {k.label}
                </span>
                <k.icon className={`size-4 ${k.tone}`} />
              </div>
              <p className="mt-1.5 text-lg font-black tabular-nums text-slate-900 dark:text-slate-100 sm:text-xl">
                {investments === undefined ? "…" : k.value}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* ═══ LISTE ═══ */}
          <div className="lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Mes analyses
              </h2>
              {investments && investments.length > 0 && (
                <span className="text-[11px] text-slate-400">
                  Rentabilité nette moyenne : {formatPct(stats.netYield)}
                </span>
              )}
            </div>

            {investments === undefined ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-28 w-full rounded-2xl" />
                ))}
              </div>
            ) : investments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-900/40 px-6 py-12 text-center">
                <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/40">
                  <TrendingUp className="size-6 text-indigo-600 dark:text-indigo-400" />
                </span>
                <p className="mt-4 text-sm font-bold text-slate-900 dark:text-slate-100">
                  Aucune analyse pour le moment
                </p>
                <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
                  Lancez votre première analyse de rentabilité : ROI, cash-flow, durée de
                  récupération et score IA.
                </p>
                <Button
                  onClick={() => navigate("/invest/new")}
                  className="mt-5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white"
                >
                  <Plus className="size-4" /> Nouvelle analyse
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {investments.map((inv, i) => {
                  const tone = SCORE_TONE_CLASS[
                    inv.score >= 80 ? "excellent" : inv.score >= 65 ? "good" : inv.score >= 50 ? "average" : "poor"
                  ];
                  return (
                    <motion.div
                      key={inv._id}
                      {...fadeUp}
                      transition={{ duration: 0.3, delay: i * 0.04 }}
                      className="group relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300 dark:hover:border-indigo-800 hover:shadow-lg"
                    >
                      <button
                        type="button"
                        onClick={() => navigate(`/invest/${inv._id}`)}
                        className="flex w-full items-start gap-4 text-left"
                      >
                        <span
                          className={`flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl border ${tone.bg} ${tone.border}`}
                        >
                          <span className={`text-lg font-black leading-none ${tone.text}`}>
                            {inv.score}
                          </span>
                          <span className="text-[9px] font-semibold text-slate-400">/ 100</span>
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                              {inv.designation}
                            </h3>
                            <Badge
                              variant="outline"
                              className="rounded-full text-[9px] font-semibold text-slate-500 dark:text-slate-400"
                            >
                              {INVESTMENT_TYPE_LABELS[inv.investmentType as InvestmentType] ??
                                inv.investmentType}
                            </Badge>
                            <span className={`text-[10px] font-bold ${tone.text}`}>
                              {inv.grade}
                            </span>
                          </div>
                          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                            <MapPinned className="size-3" />
                            {[inv.quartier, inv.ville, inv.gouvernorat].filter(Boolean).join(" · ")}
                          </p>

                          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {[
                              { label: "Investi", value: formatTNDCompact(inv.totalInvestment) },
                              { label: "Renta. nette", value: formatPct(inv.netYield, 2) },
                              { label: "Cash-flow/an", value: formatTNDCompact(inv.annualCashFlow) },
                              {
                                label: "Récupération",
                                value: inv.paybackYears > 0 ? `${inv.paybackYears} ans` : "—",
                              },
                            ].map((m) => (
                              <div key={m.label}>
                                <p className="text-[9px] uppercase tracking-wide text-slate-400">
                                  {m.label}
                                </p>
                                <p className="text-[11px] font-bold tabular-nums text-slate-700 dark:text-slate-200">
                                  {m.value}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(inv._id, inv.designation)}
                        aria-label={`Supprimer l'analyse ${inv.designation}`}
                        className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-300 opacity-0 transition-all hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100 dark:hover:bg-rose-950/40"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ═══ PANNEAU DROIT ═══ */}
          <div className="space-y-4">
            {/* Meilleures zones */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40">
                  <MapPinned className="size-4 text-emerald-600 dark:text-emerald-400" />
                </span>
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Meilleures zones d'investissement
                </h3>
              </div>
              <ul className="space-y-2">
                {topZones.map((z, i) => (
                  <li key={`${z.city}-${z.quarter}`} className="flex items-center gap-2.5">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                        {z.quarter}
                      </p>
                      <p className="truncate text-[10px] text-slate-400">
                        {z.city} · {z.standing}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatPct(z.grossYield, 1)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Rendement par gouvernorat */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/40">
                  <Compass className="size-4 text-indigo-600 dark:text-indigo-400" />
                </span>
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Rendement brut par gouvernorat
                </h3>
              </div>
              <ul className="space-y-2.5">
                {bestZones.map((b) => (
                  <li key={b.g}>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-medium text-slate-600 dark:text-slate-300">{b.g}</span>
                      <span className="font-bold tabular-nums text-slate-700 dark:text-slate-200">
                        {formatPct(b.yield, 2)}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                        style={{ width: `${Math.min(100, (b.yield / 8) * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Raccourcis */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-indigo-600 to-violet-700 p-4 text-white">
              <p className="flex items-center gap-1.5 text-xs font-bold">
                <Percent className="size-4" /> Conseiller IA investisseur
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-white/85">
                Chaque analyse inclut un assistant IA qui répond à vos questions : rentabilité,
                meilleur rendement, gains à 10 ans, meilleur quartier.
              </p>
              <Button
                size="sm"
                onClick={() => navigate("/invest/new")}
                className="mt-3 rounded-xl bg-white text-indigo-700 hover:bg-white/90"
              >
                <Plus className="size-3.5" /> Analyser un bien
              </Button>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4">
              <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200">
                <CalendarClock className="size-3.5 text-slate-400" /> Raccourcis
              </p>
              <div className="mt-2.5 flex flex-col gap-1.5">
                <button
                  onClick={() => navigate("/estimate/new")}
                  className="rounded-lg px-2 py-1.5 text-left text-[11px] font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800/50"
                >
                  → Estimer la valeur de vente d'un bien
                </button>
                <button
                  onClick={() => navigate("/estimate/loyer/new")}
                  className="rounded-lg px-2 py-1.5 text-left text-[11px] font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800/50"
                >
                  → Estimer un loyer mensuel
                </button>
                <button
                  onClick={() => navigate("/agencies")}
                  className="rounded-lg px-2 py-1.5 text-left text-[11px] font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800/50"
                >
                  → Contacter une agence immobilière
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
