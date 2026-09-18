import { useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { ThemeToggle } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Bot,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Compass,
  Download,
  Gauge,
  LineChart,
  Loader2,
  MapPinned,
  Maximize2,
  Percent,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
  XCircle,
} from "lucide-react";
import {
  INVESTMENT_TYPE_LABELS,
  rankInvestmentZones,
  type InvestmentAnalysis,
  type InvestmentInput,
  type InvestmentType,
} from "@/lib/investment-analysis";
import {
  formatDateFR,
  formatPct,
  formatTND,
  formatTNDCompact,
  RISK_TONE_CLASS,
  SCORE_TONE_CLASS,
} from "@/lib/invest-format";
import { usePdfExport } from "@/hooks/use-pdf-export";

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.4 },
};

function ScoreRing({ score, tone }: { score: number; tone: InvestmentAnalysis["score"]["tone"] }) {
  const cls = SCORE_TONE_CLASS[tone];
  const circumference = 2 * Math.PI * 42;
  const dash = (score / 100) * circumference;
  return (
    <div className="relative size-28 shrink-0">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          strokeWidth="8"
          className="stroke-slate-200 dark:stroke-slate-800"
        />
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          className={cls.ring}
          stroke="currentColor"
          strokeDasharray={`${dash} ${circumference}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-black leading-none ${cls.text}`}>{score}</span>
        <span className="text-[10px] font-semibold text-slate-400">/ 100</span>
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = "text-indigo-600 dark:text-indigo-400",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{label}</span>
        <Icon className={`size-3.5 ${tone}`} />
      </div>
      <p className="mt-1.5 text-base font-black tabular-nums text-slate-900 dark:text-slate-100">
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[10px] text-slate-400">{sub}</p>}
    </div>
  );
}

export default function InvestmentResult() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const reportRef = useRef<HTMLDivElement>(null);
  const { generatePdf, isExporting, exportProgress } = usePdfExport({
    filename: `analyse-rentabilite-${id ?? "investissement"}.pdf`,
  });
  const [openQa, setOpenQa] = useState<number | null>(0);
  const [reestimating, setReestimating] = useState(false);

  const doc = useQuery(api.investments.getInvestment, {
    investmentId: (id ?? "") as never,
  });
  const reEstimate = useMutation(api.investments.reEstimateInvestment);

  const analysis = (doc?.analysis ?? null) as InvestmentAnalysis | null;
  const input = (doc?.input ?? null) as InvestmentInput | null;

  const zones = useMemo(() => rankInvestmentZones(8, input?.investmentType ?? "appartement"), [
    input?.investmentType,
  ]);

  const chartData = useMemo(
    () =>
      (analysis?.projections ?? []).map((p) => ({
        year: `A${p.year}`,
        cashFlow: p.cumulatedCashFlow,
        valeur: p.propertyValue,
        patrimoine: p.totalWealth,
      })),
    [analysis],
  );

  const scenarioChart = useMemo(
    () =>
      (analysis?.scenarios ?? []).map((s) => ({
        name: s.label,
        ROI: s.roi10,
        Rentabilité: s.netYield,
      })),
    [analysis],
  );

  async function handleReEstimate() {
    if (!id) return;
    setReestimating(true);
    try {
      await reEstimate({ investmentId: id as never });
      toast.success("Analyse recalculée avec les données de marché actuelles");
    } catch {
      toast.error("Recalcul impossible");
    } finally {
      setReestimating(false);
    }
  }

  if (doc === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="mx-auto max-w-5xl space-y-4 px-4 py-10 sm:px-6">
          <Skeleton className="h-40 w-full rounded-3xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!doc || !analysis || !input) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-b from-slate-50 via-white to-slate-50 px-4 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <span className="flex size-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <AlertTriangle className="size-6 text-amber-500" />
        </span>
        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
          Analyse introuvable
        </p>
        <Button onClick={() => navigate("/invest/dashboard")} variant="outline" className="rounded-xl">
          Retour au tableau de bord
        </Button>
      </div>
    );
  }

  const tone = SCORE_TONE_CLASS[analysis.score.tone];
  const typeLabel =
    INVESTMENT_TYPE_LABELS[input.investmentType as InvestmentType] ?? input.investmentType;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* ═══ HEADER ═══ */}
      <header className="sticky top-0 z-40 border-b border-slate-200/60 dark:border-gray-800/60 bg-white/75 dark:bg-gray-950/75 backdrop-blur-2xl print:hidden">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/invest/dashboard")}
              className="flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            >
              <ArrowLeft className="size-3.5" />
              <span className="hidden sm:inline">Investissement IA</span>
            </button>
            <span className="hidden h-4 w-px bg-slate-200 dark:bg-slate-800 sm:block" />
            <span className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-slate-100">
              <TrendingUp className="size-4 text-indigo-600 dark:text-indigo-400" />
              Analyse de rentabilité
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              onClick={handleReEstimate}
              disabled={reestimating}
              className="rounded-xl"
            >
              {reestimating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              <span className="hidden sm:inline">Recalculer</span>
            </Button>
            <Button
              size="sm"
              onClick={() => reportRef.current && generatePdf(reportRef)}
              disabled={isExporting}
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-200/50"
            >
              {isExporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              <span className="hidden sm:inline">Rapport PDF</span>
            </Button>
          </div>
        </div>
        {isExporting && exportProgress && (
          <div className="border-t border-slate-200/60 dark:border-gray-800/60 bg-indigo-50/80 dark:bg-indigo-950/30 px-4 py-1.5 text-center text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
            {exportProgress}
          </div>
        )}
      </header>

      <main ref={reportRef} className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="report-content space-y-6">
          {/* ═══ SCORE HERO ═══ */}
          <motion.section
            {...fadeUp}
            className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60"
          >
            <div className="flex flex-col gap-6 p-5 sm:flex-row sm:items-center sm:p-6">
              <ScoreRing score={analysis.score.total} tone={analysis.score.tone} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="rounded-full text-[10px] font-semibold">
                    {typeLabel}
                  </Badge>
                  <span className={`text-xs font-black ${tone.text}`}>
                    Note {analysis.score.grade}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Confiance {analysis.market.confidence.toLowerCase()}
                  </span>
                </div>
                <h1 className="mt-2 text-xl font-black tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl">
                  {doc.designation}
                </h1>
                <p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <MapPinned className="size-3" />
                  {analysis.market.zoneLabel} · {analysis.market.standing}
                </p>
                <p className={`mt-3 text-sm font-bold ${tone.text}`}>
                  {analysis.score.verdict}
                </p>
              </div>
              <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-1">
                <div className={`rounded-2xl border px-4 py-2.5 text-center ${tone.bg} ${tone.border}`}>
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Rentabilité nette
                  </p>
                  <p className={`text-lg font-black ${tone.text}`}>
                    {formatPct(analysis.netYield)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 px-4 py-2.5 text-center">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Cible marché
                  </p>
                  <p className="text-lg font-black text-slate-700 dark:text-slate-200">
                    {formatPct(analysis.market.targetYield)}
                  </p>
                </div>
              </div>
            </div>
          </motion.section>

          {/* ═══ INDICATEURS FINANCIERS ═══ */}
          <motion.section {...fadeUp}>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
              <Gauge className="size-4 text-indigo-600 dark:text-indigo-400" />
              Indicateurs financiers
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <KpiCard
                icon={Wallet}
                label="Coût total"
                value={formatTNDCompact(analysis.totalInvestment)}
                sub={formatTND(analysis.totalInvestment)}
              />
              <KpiCard
                icon={TrendingUp}
                label="Revenus bruts / an"
                value={formatTNDCompact(analysis.annualGrossIncome)}
                sub="loyers encaissés"
                tone="text-emerald-600 dark:text-emerald-400"
              />
              <KpiCard
                icon={LineChart}
                label="Revenu net / an"
                value={formatTNDCompact(analysis.netOperatingIncome)}
                sub="après charges"
                tone="text-violet-600 dark:text-violet-400"
              />
              <KpiCard
                icon={Percent}
                label="Cash-flow / mois"
                value={formatTND(analysis.monthlyCashFlow)}
                sub={`${formatTNDCompact(analysis.annualCashFlow)} / an`}
                tone={analysis.monthlyCashFlow >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}
              />
              <KpiCard icon={Percent} label="Rentabilité brute" value={formatPct(analysis.grossYield)} />
              <KpiCard icon={Percent} label="Rentabilité nette" value={formatPct(analysis.netYield)} />
              <KpiCard
                icon={Percent}
                label="Rendement locatif"
                value={formatPct(analysis.rentalYield)}
                sub="sur fonds propres"
              />
              <KpiCard
                icon={LineChart}
                label="ROI annuel"
                value={formatPct(analysis.roiAnnual, 1)}
                tone="text-blue-600 dark:text-blue-400"
              />
              <KpiCard icon={LineChart} label="ROI à 5 ans" value={formatPct(analysis.roi5, 1)} />
              <KpiCard icon={LineChart} label="ROI à 10 ans" value={formatPct(analysis.roi10, 1)} />
              <KpiCard
                icon={CalendarClock}
                label="Récupération"
                value={analysis.paybackLabel}
                sub={analysis.paybackDate ? formatDateFR(analysis.paybackDate) : "—"}
                tone="text-amber-600 dark:text-amber-400"
              />
              <KpiCard
                icon={Wallet}
                label="Apport personnel"
                value={formatTNDCompact(analysis.downPayment)}
                sub={analysis.loanAmount > 0 ? `Crédit ${formatTNDCompact(analysis.loanAmount)}` : "Sans crédit"}
              />
            </div>
          </motion.section>

          {/* ═══ RÉCUPÉRATION DU CAPITAL ═══ */}
          <motion.section
            {...fadeUp}
            className="rounded-2xl border border-amber-200/70 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 p-5"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/50">
                  <CalendarClock className="size-5 text-amber-600 dark:text-amber-400" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Durée de récupération du capital
                  </h3>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                    Sur la base d'un revenu net annuel de{" "}
                    {formatTND(analysis.annualCashFlow || analysis.netOperatingIncome)}.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                    {analysis.paybackLabel}
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Amortissement
                  </p>
                </div>
                {analysis.paybackDate > 0 && (
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      {formatDateFR(analysis.paybackDate)}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Date estimée
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.section>

          {/* ═══ PROJECTIONS ═══ */}
          <motion.section {...fadeUp} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40">
                <LineChart className="size-4 text-indigo-600 dark:text-indigo-400" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Projection financière sur 10 ans
                </h2>
                <p className="text-[10px] text-slate-400">
                  Indexation {formatPct(analysis.assumptions.rentIndexationRate, 1)} · inflation{" "}
                  {formatPct(analysis.assumptions.inflationRate, 1)} · appréciation{" "}
                  {formatPct(analysis.assumptions.marketGrowthRate, 1)}
                </p>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 8, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="invValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="invCash" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    stroke="#94a3b8"
                    tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                  />
                  <Tooltip
                    formatter={(v: number) => formatTND(v)}
                    contentStyle={{ fontSize: 11, borderRadius: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area
                    type="monotone"
                    dataKey="valeur"
                    name="Valeur du bien"
                    stroke="#6366f1"
                    fill="url(#invValue)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="cashFlow"
                    name="Cash-flow cumulé"
                    stroke="#10b981"
                    fill="url(#invCash)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Tableau des projections */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-[11px]">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 dark:border-slate-800">
                    <th className="py-2 font-semibold">Année</th>
                    <th className="py-2 text-right font-semibold">Revenus</th>
                    <th className="py-2 text-right font-semibold">Charges</th>
                    <th className="py-2 text-right font-semibold">Cash-flow</th>
                    <th className="py-2 text-right font-semibold">Cumulé</th>
                    <th className="py-2 text-right font-semibold">Valeur du bien</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.projections.map((p) => (
                    <tr
                      key={p.year}
                      className="border-b border-slate-100 last:border-0 dark:border-slate-800/60"
                    >
                      <td className="py-1.5 font-semibold text-slate-600 dark:text-slate-300">
                        An {p.year}
                      </td>
                      <td className="py-1.5 text-right tabular-nums text-slate-600 dark:text-slate-300">
                        {formatTNDCompact(p.annualGrossIncome)}
                      </td>
                      <td className="py-1.5 text-right tabular-nums text-slate-500">
                        {formatTNDCompact(p.annualExpenses)}
                      </td>
                      <td
                        className={`py-1.5 text-right font-semibold tabular-nums ${
                          p.cashFlow >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {formatTNDCompact(p.cashFlow)}
                      </td>
                      <td className="py-1.5 text-right font-semibold tabular-nums text-indigo-600 dark:text-indigo-400">
                        {formatTNDCompact(p.cumulatedCashFlow)}
                      </td>
                      <td className="py-1.5 text-right tabular-nums text-slate-600 dark:text-slate-300">
                        {formatTNDCompact(p.propertyValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.section>

          {/* ═══ BÉNÉFICES FUTURS ═══ */}
          <motion.section {...fadeUp}>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
              <Sparkles className="size-4 text-indigo-600 dark:text-indigo-400" />
              Prévision des bénéfices par IA
            </h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {analysis.benefits.map((b) => (
                <div
                  key={b.year}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Dans {b.year} an{b.year > 1 ? "s" : ""}
                  </p>
                  <p className="mt-2 text-[10px] text-slate-400">Bénéfice cumulé</p>
                  <p className="text-base font-black tabular-nums text-indigo-600 dark:text-indigo-400">
                    {formatTNDCompact(b.cumulatedProfit)}
                  </p>
                  <div className="mt-3 space-y-1 border-t border-slate-100 dark:border-slate-800 pt-2">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Gain annuel</span>
                      <span className="font-semibold tabular-nums text-slate-600 dark:text-slate-300">
                        {formatTNDCompact(b.gain)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Valeur du bien</span>
                      <span className="font-semibold tabular-nums text-slate-600 dark:text-slate-300">
                        {formatTNDCompact(b.futurePropertyValue)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>

          {/* ═══ SCÉNARIOS ═══ */}
          <motion.section {...fadeUp}>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
              <Maximize2 className="size-4 text-indigo-600 dark:text-indigo-400" />
              Simulation de scénarios
            </h2>

            <div className="mb-4 h-52 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scenarioChart} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" tickFormatter={(v: number) => `${v}%`} />
                  <Tooltip formatter={(v: number) => formatPct(v, 1)} contentStyle={{ fontSize: 11, borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="ROI" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Rentabilité" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              {analysis.scenarios.map((s) => (
                <div
                  key={s.key}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {s.label}
                    </h3>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${RISK_TONE_CLASS[s.riskLevel]}`}
                    >
                      Risque {s.riskLevel}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">{s.description}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {[
                      { label: "Valeur future", value: formatTNDCompact(s.futureValue) },
                      { label: "Revenus 10 ans", value: formatTNDCompact(s.totalRevenue) },
                      { label: "ROI 10 ans", value: formatPct(s.roi10, 1) },
                      { label: "Rentabilité nette", value: formatPct(s.netYield) },
                    ].map((m) => (
                      <div key={m.label} className="rounded-xl bg-slate-50/80 dark:bg-slate-950/40 px-2.5 py-2">
                        <p className="text-[9px] uppercase tracking-wide text-slate-400">{m.label}</p>
                        <p className="text-[11px] font-bold tabular-nums text-slate-700 dark:text-slate-200">
                          {m.value}
                        </p>
                      </div>
                    ))}
                  </div>
                  <ul className="mt-3 space-y-1">
                    {s.risks.map((r) => (
                      <li key={r} className="flex items-start gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                        <AlertTriangle className="mt-0.5 size-3 shrink-0 text-amber-500" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.section>

          {/* ═══ COMPARAISON ═══ */}
          <motion.section {...fadeUp} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
              <Compass className="size-4 text-indigo-600 dark:text-indigo-400" />
              Comparaison avec d'autres investissements
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[11px]">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 dark:border-slate-800">
                    <th className="py-2 font-semibold">Type</th>
                    <th className="py-2 text-right font-semibold">Prix / m²</th>
                    <th className="py-2 text-right font-semibold">Loyer / m²</th>
                    <th className="py-2 text-right font-semibold">Rentab. brute</th>
                    <th className="py-2 text-right font-semibold">Rentab. nette</th>
                    <th className="py-2 text-right font-semibold">ROI 10 ans</th>
                    <th className="py-2 text-center font-semibold">Risque</th>
                    <th className="py-2 text-center font-semibold">Valorisation</th>
                    <th className="py-2 text-center font-semibold">Liquidité</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.comparison.map((c) => (
                    <tr
                      key={c.type}
                      className={`border-b border-slate-100 last:border-0 dark:border-slate-800/60 ${
                        c.type === input.investmentType ? "bg-indigo-50/60 dark:bg-indigo-950/20" : ""
                      }`}
                    >
                      <td className="py-2 font-semibold text-slate-700 dark:text-slate-200">
                        {c.label}
                      </td>
                      <td className="py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                        {formatTND(c.pricePerSqm)}
                      </td>
                      <td className="py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                        {c.rentPerSqm.toFixed(2).replace(".", ",")}
                      </td>
                      <td className="py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                        {formatPct(c.grossYield)}
                      </td>
                      <td className="py-2 text-right font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                        {formatPct(c.netYield)}
                      </td>
                      <td className="py-2 text-right font-semibold tabular-nums text-indigo-600 dark:text-indigo-400">
                        {formatPct(c.roi10, 1)}
                      </td>
                      <td className="py-2 text-center">
                        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${RISK_TONE_CLASS[c.riskLevel]}`}>
                          {c.riskLevel}
                        </span>
                      </td>
                      <td className="py-2 text-center text-slate-500">{c.appreciation}</td>
                      <td className="py-2 text-center text-slate-500">{c.liquidity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.section>

          {/* ═══ SCORE DÉTAILLÉ ═══ */}
          <motion.section {...fadeUp} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
              <Gauge className="size-4 text-indigo-600 dark:text-indigo-400" />
              Score IA d'investissement — {analysis.score.total}/100 ({analysis.score.grade})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {analysis.score.criteria.map((c) => (
                <div key={c.key}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{c.label}</span>
                    <span className="font-bold tabular-nums text-slate-500">
                      {c.score}/100 <span className="text-slate-300">· {Math.round(c.weight * 100)}%</span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full ${
                        c.score >= 75
                          ? "bg-emerald-500"
                          : c.score >= 55
                            ? "bg-blue-500"
                            : c.score >= 40
                              ? "bg-amber-500"
                              : "bg-rose-500"
                      }`}
                      style={{ width: `${Math.min(100, c.score)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">{c.comment}</p>
                </div>
              ))}
            </div>
          </motion.section>

          {/* ═══ FACTEURS & RECOMMANDATIONS ═══ */}
          <motion.section {...fadeUp} className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-emerald-200/70 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/15 p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="size-4" /> Points forts
              </h3>
              <ul className="mt-3 space-y-2">
                {analysis.positiveFactors.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                    <BadgeCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                    {f}
                  </li>
                ))}
                {analysis.positiveFactors.length === 0 && (
                  <li className="text-[11px] text-slate-400">Aucun point fort majeur identifié.</li>
                )}
              </ul>
            </div>

            <div className="rounded-2xl border border-rose-200/70 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/15 p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-rose-700 dark:text-rose-300">
                <XCircle className="size-4" /> Points à améliorer
              </h3>
              <ul className="mt-3 space-y-2">
                {analysis.negativeFactors.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                    <TrendingDown className="mt-0.5 size-3.5 shrink-0 text-rose-500" />
                    {f}
                  </li>
                ))}
                {analysis.negativeFactors.length === 0 && (
                  <li className="text-[11px] text-slate-400">Aucun point faible majeur identifié.</li>
                )}
              </ul>
            </div>

            <div className="rounded-2xl border border-indigo-200/70 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/15 p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-indigo-700 dark:text-indigo-300">
                <Sparkles className="size-4" /> Recommandations de l'IA
              </h3>
              <ul className="mt-3 space-y-2">
                {analysis.recommendations.map((r) => (
                  <li key={r} className="flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-indigo-500" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-amber-200/70 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/15 p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-amber-700 dark:text-amber-300">
                <ShieldCheck className="size-4" /> Analyse des risques
              </h3>
              <ul className="mt-3 space-y-2">
                {analysis.risks.map((r) => (
                  <li key={r} className="flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </motion.section>

          {/* ═══ ASSISTANT IA ═══ */}
          <motion.section {...fadeUp} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5">
            <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
              <Bot className="size-4 text-indigo-600 dark:text-indigo-400" />
              Assistant IA Investisseur
            </h2>
            <p className="mb-4 text-[11px] text-slate-400">
              Réponses générées à partir de votre analyse et des données de marché.
            </p>
            <div className="space-y-2">
              {analysis.assistant.map((qa, i) => {
                const open = openQa === i;
                return (
                  <div
                    key={qa.q}
                    className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenQa(open ? null : i)}
                      aria-expanded={open}
                      className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                        {qa.q}
                      </span>
                      <ChevronDown
                        className={`size-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
                      />
                    </button>
                    {open && (
                      <p className="border-t border-slate-100 px-3.5 py-3 text-[11px] leading-relaxed text-slate-600 dark:border-slate-800 dark:text-slate-300">
                        {qa.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.section>

          {/* ═══ ZONES ═══ */}
          <motion.section {...fadeUp} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5">
            <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
              <MapPinned className="size-4 text-indigo-600 dark:text-indigo-400" />
              Meilleures zones d'investissement en Tunisie
            </h2>
            <p className="mb-4 text-[11px] text-slate-400">
              Classement des zones les plus rentables pour un {typeLabel.toLowerCase()} — base
              marché 2026.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {zones.map((z, i) => (
                <div
                  key={`${z.city}-${z.quarter}`}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 dark:border-slate-800/70 bg-slate-50/60 dark:bg-slate-950/30 px-3 py-2.5"
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-white text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                      {z.quarter}, {z.city}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {formatTND(z.pricePerSqm)}/m² · {z.region}
                    </p>
                  </div>
                  <span className="shrink-0 text-right">
                    <span className="block text-[11px] font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatPct(z.grossYield, 1)}
                    </span>
                    <span className="block text-[9px] text-slate-400">score {z.score}</span>
                  </span>
                </div>
              ))}
            </div>
          </motion.section>

          {/* ═══ PIED DE RAPPORT ═══ */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 text-center">
            <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              Rapport généré par baticost AI — Module Investissement
            </p>
            <p className="mt-1 text-[10px] text-slate-400">
              Analyse indicative fondée sur le marché tunisien 2026 et vos hypothèses. Ne constitue
              pas un conseil en investissement.
            </p>
          </div>
        </div>
      </main>

      {/* ═══ ACTIONS BAS DE PAGE ═══ */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 py-5 print:hidden">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/invest/dashboard")}
            className="text-xs text-slate-500"
          >
            <ArrowLeft className="size-3.5" /> Retour aux analyses
          </Button>
        </div>
      </footer>
    </div>
  );
}
