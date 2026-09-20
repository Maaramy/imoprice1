import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Award,
  BarChart3,
  Coins,
  Compass,
  LineChart,
  MessageSquare,
  PiggyBank,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  AnimatedCard,
  CHART_COLORS,
  Kpi,
  ScoreGauge,
  SectionHeading,
  TYPE_META,
  fmtNum,
  fmtPct,
  fmtTND,
  scoreTone,
  stripEmojis,
  type AnalysisRun,
  type ChatMsg,
  type ZoneRow,
} from "./shared";

export interface AssistantConfig {
  messages: ChatMsg[];
  busy: boolean;
  onAsk: (question: string) => void;
}

const TABS = [
  { key: "apercu", label: "Aperçu" },
  { key: "indicateurs", label: "Indicateurs" },
  { key: "previsions", label: "Prévisions" },
  { key: "scenarios", label: "Scénarios" },
  { key: "comparaison", label: "Comparaison" },
  { key: "zones", label: "Zones" },
  { key: "assistant", label: "Assistant" },
] as const;

export function ResultsView({
  run,
  zones,
  assistant,
}: {
  run: AnalysisRun;
  zones: ZoneRow[];
  assistant?: AssistantConfig;
}) {
  const { input, results, aiInsights } = run;
  const { indicators, score, zone } = results;
  const tone = scoreTone(score.total);
  const meta = TYPE_META[input.type];
  const location = [input.quartier, input.city, input.region].filter(Boolean).join(", ");

  const costPie = [
    { name: "Prix d'achat", value: indicators.purchasePrice },
    { name: "Frais d'acquisition", value: indicators.acquisitionFees + indicators.agencyFees },
    { name: "Financement", value: indicators.financingFees },
    { name: "Aménagement", value: indicators.renovationCost },
    { name: "Ameublement", value: indicators.furnishingCost },
  ].filter((s) => s.value > 0);

  const expensePie = [
    { name: "Charges", value: indicators.annualCharges },
    { name: "Assurance", value: indicators.insurance },
    { name: "Gestion", value: indicators.managementFees },
    { name: "Fiscalité", value: indicators.taxation },
  ].filter((s) => s.value > 0);

  const areaData = results.forecasts.map((f) => ({
    label: f.label,
    valeurBien: f.propertyValue,
    gainCumule: Math.max(0, f.cumulativeGain),
  }));

  const roiBarData = results.comparison.map((c) => ({
    name: c.label,
    ROI: c.roiPct,
    Potentiel: c.potentialScore,
  }));

  const sortedZones = useMemo(() => [...zones].sort((a, b) => a.rank - b.rank), [zones]);

  return (
    <div className="space-y-5">
      {/* Héro */}
      <AnimatedCard className="overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-6 text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                <meta.icon className="size-6" />
              </span>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight">{meta.label}</h1>
                <p className="text-xs text-white/80">{location}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge className="border-white/25 bg-white/15 text-[10px] text-white">
                    {input.rentMode === "nuit" ? "Courte durée" : "Longue durée"}
                  </Badge>
                  <Badge className="border-white/25 bg-white/15 text-[10px] text-white">
                    {zone.name} · rang {zone.rank}/{zone.total}
                  </Badge>
                  <Badge className="border-white/25 bg-white/15 text-[10px] text-white">
                    Confiance {fmtPct(results.confidencePct, 0)}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 text-center backdrop-blur">
              <p className="text-[10px] uppercase tracking-widest text-white/70">Valeur estimée</p>
              <p className="text-2xl font-extrabold tabular-nums">{fmtTND(indicators.totalCost)}</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
          <Kpi icon={Coins} label="Coût total" value={fmtTND(indicators.totalCost)} />
          <Kpi
            icon={TrendingUp}
            label="Rendement net"
            value={fmtPct(indicators.netYieldPct)}
            tone={indicators.netYieldPct >= 5 ? "positive" : "negative"}
          />
          <Kpi
            icon={Wallet}
            label="Cashflow mensuel"
            value={fmtTND(indicators.monthlyCashflow)}
            tone={indicators.monthlyCashflow >= 0 ? "positive" : "negative"}
          />
          <Kpi icon={Target} label="ROI 10 ans" value={fmtPct(indicators.roi10yPct)} tone="indigo" />
        </div>
      </AnimatedCard>

      <Tabs defaultValue="apercu" className="w-full">
        <div className="scrollbar-none -mx-1 overflow-x-auto px-1">
          <TabsList className="flex w-max gap-1 rounded-xl bg-muted/50 p-1">
            {TABS.map((t) => (
              <TabsTrigger
                key={t.key}
                value={t.key}
                disabled={t.key === "assistant" && !assistant}
                className="rounded-lg px-3 py-1.5 text-xs data-[state=active]:bg-background"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* APERÇU */}
        <TabsContent value="apercu" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <AnimatedCard className="flex flex-col items-center justify-center p-5">
              <ScoreGauge score={score.total} label={`${score.grade} — ${score.label}`} />
            </AnimatedCard>
            <AnimatedCard className="p-5 lg:col-span-2">
              <SectionHeading icon={Sparkles} title="Résumé de l'IA" subtitle={aiInsights?.source === "ia" ? "Rédigé par l'IA" : "Analyse du moteur"} />
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                {stripEmojis(aiInsights?.summary ?? "Analyse en cours…")}
              </p>
              {aiInsights?.verdict ? (
                <p className={cn("mt-3 rounded-xl border p-3 text-xs font-medium", tone.bg, tone.border, tone.text)}>
                  {stripEmojis(aiInsights.verdict)}
                </p>
              ) : null}
            </AnimatedCard>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <AnimatedCard className="p-5">
              <SectionHeading icon={Award} title="Points forts" />
              <ul className="mt-3 space-y-1.5">
                {(aiInsights?.recommendations?.length ? zone.highlights : zone.highlights).map((h) => (
                  <li key={h} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-emerald-500" />
                    {h}
                  </li>
                ))}
              </ul>
            </AnimatedCard>
            <AnimatedCard className="p-5">
              <SectionHeading icon={TriangleAlert} title="Risques & points d'attention" />
              <ul className="mt-3 space-y-1.5">
                {(aiInsights?.risks ?? ["Analyse en cours…"]).map((r) => (
                  <li key={r} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-rose-500" />
                    {stripEmojis(r)}
                  </li>
                ))}
              </ul>
            </AnimatedCard>
          </div>

          {aiInsights?.recommendations?.length ? (
            <AnimatedCard className="p-5">
              <SectionHeading icon={Sparkles} title="Recommandations de l'IA" subtitle="Pour augmenter la valeur et le rendement" />
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {aiInsights.recommendations.map((r) => (
                  <div key={r} className="rounded-xl border border-border/40 bg-muted/30 p-3 text-xs text-muted-foreground">
                    {stripEmojis(r)}
                  </div>
                ))}
              </div>
            </AnimatedCard>
          ) : null}
        </TabsContent>

        {/* INDICATEURS */}
        <TabsContent value="indicateurs" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Kpi icon={Coins} label="Coût total" value={fmtTND(indicators.totalCost)} sub={`Prix ${fmtTND(indicators.purchasePrice)}`} />
            <Kpi icon={PiggyBank} label="Revenus annuels" value={fmtTND(indicators.grossAnnualRent)} sub={`Occupation ${fmtPct(indicators.occupancyRate, 0)}`} />
            <Kpi icon={Wallet} label="Revenu net annuel" value={fmtTND(indicators.netAnnualIncome)} />
            <Kpi icon={TrendingUp} label="Rendement brut" value={fmtPct(indicators.grossYieldPct)} />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <AnimatedCard className="p-5">
              <SectionHeading icon={BarChart3} title="Répartition du coût d'acquisition" />
              <div className="mt-2 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={costPie} dataKey="value" nameKey="name" innerRadius={48} outerRadius={90} paddingAngle={2}>
                      {costPie.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmtTND(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </AnimatedCard>
            <AnimatedCard className="p-5">
              <SectionHeading icon={Wallet} title="Charges d'exploitation annuelles" />
              <div className="mt-2 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={expensePie} dataKey="value" nameKey="name" innerRadius={48} outerRadius={90} paddingAngle={2}>
                      {expensePie.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[(i + 3) % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmtTND(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </AnimatedCard>
          </div>
          <AnimatedCard className="p-5">
            <SectionHeading icon={Target} title="Détail des indicateurs" />
            <div className="mt-3 grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
              <Row label="Frais d'acquisition" value={fmtTND(indicators.acquisitionFees)} />
              <Row label="Honoraires d'agence" value={fmtTND(indicators.agencyFees)} />
              <Row label="Frais de financement" value={fmtTND(indicators.financingFees)} />
              <Row label="Aménagement" value={fmtTND(indicators.renovationCost)} />
              <Row label="Ameublement" value={fmtTND(indicators.furnishingCost)} />
              <Row label="Charges" value={fmtTND(indicators.annualCharges)} />
              <Row label="Assurance" value={fmtTND(indicators.insurance)} />
              <Row label="Gestion" value={fmtTND(indicators.managementFees)} />
              <Row label="Fiscalité" value={fmtTND(indicators.taxation)} />
              <Row label="Cashflow annuel" value={fmtTND(indicators.annualCashflow)} />
              <Row label="ROI 1 an" value={fmtPct(indicators.roiAnnualPct)} />
              <Row label="ROI 5 ans" value={fmtPct(indicators.roi5yPct)} />
              <Row label="ROI 10 ans" value={fmtPct(indicators.roi10yPct)} />
              <Row label="Récupération du capital" value={`${indicators.paybackYears} ans`} />
              <Row label="Date de récupération" value={indicators.paybackDateLabel} />
              <Row label="Prix au m²" value={indicators.pricePerM2 != null ? fmtTND(indicators.pricePerM2) : "—"} />
              <Row label="Ratio prix / loyer" value={fmtNum(indicators.priceToRentRatio, 1)} />
            </div>
          </AnimatedCard>
        </TabsContent>

        {/* PRÉVISIONS */}
        <TabsContent value="previsions" className="mt-4 space-y-4">
          <AnimatedCard className="p-5">
            <SectionHeading icon={LineChart} title="Évolution de la valeur et du gain cumulé" subtitle="Horizons 1 / 3 / 5 / 10 ans" />
            <div className="mt-2 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={areaData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="invValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="invGain" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(v: number) => fmtTND(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine y={indicators.totalCost} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "Seuil de rentabilité", fontSize: 10 }} />
                  <Area type="monotone" dataKey="valeurBien" name="Valeur du bien" stroke="#6366f1" fill="url(#invValue)" />
                  <Area type="monotone" dataKey="gainCumule" name="Gain cumulé" stroke="#10b981" fill="url(#invGain)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </AnimatedCard>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {results.forecastSummary.map((f) => (
              <AnimatedCard key={f.horizon} className="p-4">
                <p className="label-overline text-[9px] uppercase tracking-widest text-muted-foreground">{f.label}</p>
                <p className="mt-1 text-lg font-bold tabular-nums">{fmtTND(f.propertyValue)}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Revenus {fmtTND(f.totalIncome)} · ROI {fmtPct(f.roiPct)}
                </p>
                <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  Gain {fmtTND(f.totalGain)}
                </p>
              </AnimatedCard>
            ))}
          </div>
        </TabsContent>

        {/* SCÉNARIOS */}
        <TabsContent value="scenarios" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {results.scenarios.map((s, i) => {
              const st = s.key === "optimiste" ? "positive" : s.key === "prudent" ? "negative" : "indigo";
              return (
                <AnimatedCard key={s.key} className="p-5" delay={i * 0.05}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold">{s.label}</h3>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        st === "positive"
                          ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                          : st === "negative"
                            ? "border-rose-500/40 text-rose-600 dark:text-rose-400"
                            : "border-indigo-500/40 text-indigo-600 dark:text-indigo-400",
                      )}
                    >
                      {s.riskLabel}
                    </Badge>
                  </div>
                  <div className="mt-3 space-y-2 text-xs">
                    <Row label="Valeur future" value={fmtTND(s.propertyValue)} />
                    <Row label="Revenus" value={fmtTND(s.totalIncome)} />
                    <Row label="ROI" value={fmtPct(s.roiPct)} />
                    <Row label="Rendement net" value={fmtPct(s.netYieldPct)} />
                    <Row label="Croissance loyer" value={fmtPct(s.rentGrowthPct)} />
                    <Row label="Appréciation" value={fmtPct(s.appreciationPct)} />
                  </div>
                  <ul className="mt-3 space-y-1">
                    {s.notes.map((n) => (
                      <li key={n} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                        <span className="mt-1 size-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                        {n}
                      </li>
                    ))}
                  </ul>
                </AnimatedCard>
              );
            })}
          </div>
        </TabsContent>

        {/* COMPARAISON */}
        <TabsContent value="comparaison" className="mt-4 space-y-4">
          <AnimatedCard className="p-5">
            <SectionHeading icon={BarChart3} title="Comparaison avec d'autres investissements" subtitle="À budget équivalent, même zone" />
            <div className="mt-2 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={roiBarData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-12} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="ROI" name="ROI 10 ans (%)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Potentiel" name="Score potentiel" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </AnimatedCard>
          <AnimatedCard className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-semibold">Classe d'actif</th>
                    <th className="px-4 py-3 font-semibold">Prix / m²</th>
                    <th className="px-4 py-3 font-semibold">Rendement net</th>
                    <th className="px-4 py-3 font-semibold">ROI</th>
                    <th className="px-4 py-3 font-semibold">Risque</th>
                    <th className="px-4 py-3 font-semibold">Appréciation</th>
                  </tr>
                </thead>
                <tbody>
                  {results.comparison.map((c) => (
                    <tr key={c.type} className="border-t border-border/40">
                      <td className="px-4 py-2.5 font-medium">{c.label}</td>
                      <td className="px-4 py-2.5 tabular-nums">{fmtTND(c.pricePerM2)}</td>
                      <td className="px-4 py-2.5 tabular-nums">{fmtPct(c.netYieldPct)}</td>
                      <td className="px-4 py-2.5 tabular-nums">{fmtPct(c.roiPct)}</td>
                      <td className="px-4 py-2.5 capitalize">{c.riskLevel}</td>
                      <td className="px-4 py-2.5 tabular-nums">{fmtPct(c.appreciationPct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AnimatedCard>
        </TabsContent>

        {/* ZONES */}
        <TabsContent value="zones" className="mt-4 space-y-4">
          <AnimatedCard className="p-5">
            <SectionHeading icon={Compass} title={`Zone : ${zone.name} — Rang ${zone.rank}/${zone.total}`} subtitle="Attractivité investisseur" />
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Kpi icon={Coins} label="Prix / m²" value={fmtTND(zone.pricePerM2)} />
              <Kpi icon={Wallet} label="Loyer / m²" value={fmtTND(zone.rentPerM2)} />
              <Kpi icon={TrendingUp} label="Demande" value={`${zone.demandIndex}/100`} />
              <Kpi icon={TriangleAlert} label="Risque" value={`${zone.riskScore}/100`} tone={zone.riskScore > 40 ? "negative" : "neutral"} />
            </div>
          </AnimatedCard>
          <AnimatedCard className="overflow-hidden">
            <SectionHeading icon={Compass} title="Meilleures zones d'investissement en Tunisie" subtitle="24 gouvernorats classés" />
            <div className="mt-3 max-h-96 overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/60 backdrop-blur">
                  <tr className="text-left">
                    <th className="px-3 py-2.5 font-semibold">Rang</th>
                    <th className="px-3 py-2.5 font-semibold">Zone</th>
                    <th className="px-3 py-2.5 font-semibold">Prix / m²</th>
                    <th className="px-3 py-2.5 font-semibold">Loyer / m²</th>
                    <th className="px-3 py-2.5 font-semibold">Demande</th>
                    <th className="px-3 py-2.5 font-semibold">Appréc.</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedZones.map((z) => (
                    <tr
                      key={z.region}
                      className={cn(
                        "border-t border-border/40",
                        z.region === zone.region && "bg-indigo-500/5 font-medium",
                      )}
                    >
                      <td className="px-3 py-2 tabular-nums">{z.rank}</td>
                      <td className="px-3 py-2">{z.name}</td>
                      <td className="px-3 py-2 tabular-nums">{fmtTND(z.pricePerM2)}</td>
                      <td className="px-3 py-2 tabular-nums">{fmtTND(z.rentPerM2)}</td>
                      <td className="px-3 py-2 tabular-nums">{z.demandIndex}</td>
                      <td className="px-3 py-2 tabular-nums">{fmtPct(z.appreciationPct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AnimatedCard>
        </TabsContent>

        {/* ASSISTANT */}
        {assistant ? <AssistantTab config={assistant} /> : <TabsContent value="assistant" />}
      </Tabs>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/30 py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

const SUGGESTIONS = [
  "Cet investissement est-il rentable ?",
  "Quel bien offre le meilleur rendement ?",
  "Combien vais-je gagner dans 10 ans ?",
  "Quel est le risque de cet investissement ?",
];

function AssistantTab({ config }: { config: AssistantConfig }) {
  const [question, setQuestion] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [config.messages.length, config.busy]);

  const submit = () => {
    const q = question.trim();
    if (!q || config.busy) return;
    config.onAsk(q);
    setQuestion("");
  };

  return (
    <TabsContent value="assistant" className="mt-4">
      <AnimatedCard className="flex h-[60vh] flex-col p-0">
        <div className="border-b border-border/40 p-4">
          <SectionHeading icon={MessageSquare} title="Assistant investisseur" subtitle="Posez vos questions sur cette analyse" />
        </div>
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {config.messages.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 p-6 text-center">
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted/50">
                  <MessageSquare className="size-5 text-muted-foreground" />
                </span>
                <p className="mt-2 text-xs text-muted-foreground">
                  Posez une question pour obtenir une analyse détaillée et des recommandations personnalisées.
                </p>
              </div>
            ) : (
              config.messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed",
                    m.role === "user"
                      ? "ml-auto bg-gradient-to-r from-indigo-600 to-blue-600 text-white"
                      : "border border-border/40 bg-muted/30 text-foreground",
                  )}
                >
                  {m.content}
                </div>
              ))
            )}
            {config.busy ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="size-3 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                L'assistant analyse…
              </div>
            ) : null}
            <div ref={endRef} />
          </div>
        </ScrollArea>
        <div className="border-t border-border/40 p-3">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => config.onAsk(s)}
                disabled={config.busy}
                className="rounded-full border border-border/50 bg-muted/30 px-2.5 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Votre question…"
              className="h-10"
            />
            <Button onClick={submit} disabled={config.busy || !question.trim()} size="icon" className="h-10 w-10 shrink-0">
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      </AnimatedCard>
    </TabsContent>
  );
}

export function InvestmentTypeIcon({ type }: { type: keyof typeof TYPE_META }) {
  const Icon = TYPE_META[type].icon;
  return <Icon className="size-4" />;
}
