// ════════════════════════════════════════════════════════════════════════
// MODULE INVESTISSEMENT IMMOBILIER (ROI) — FRONTEND PARTAGÉ
// Types miroirs, catalogue, formatters FR/TND, composants et exports.
// ════════════════════════════════════════════════════════════════════════

import { motion } from "framer-motion";
import {
  Briefcase,
  Building,
  Building2,
  Castle,
  DoorOpen,
  HardHat,
  Home,
  LandPlot,
  Layers,
  Palmtree,
  Store,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { cn } from "@/lib/utils";
import type {
  InvestmentAiInsights as ConvexAiInsights,
  InvestmentAnalysisInput as ConvexInput,
  InvestmentAnalysisResults as ConvexResults,
} from "@/convex/investmentTypes";

/* ─────────────────────────── Réexports (données pures) ─────────────────────────── */

export {
  resolveZoneUtility,
  estimateOccupancyRate,
  forcedRentModeFor,
  ZONE_UTILITIES,
  REGION_CASCADE,
  ALL_CITIES,
  INVESTMENT_ZONES,
  INVESTMENT_ZONE_MAP,
  DEFAULT_ZONE,
  REGION_LABELS,
  FORECAST_HORIZONS,
  SCENARIO_DEFAULTS,
} from "@/convex/investmentTypes";

/* ─────────────────────────── Types miroirs (frontend) ─────────────────────────── */

export type InvestmentType = ConvexInput["type"];
export type RentMode = "nuit" | "mensuel";
export type InvestmentInput = ConvexInput;
export type Indicators = ConvexResults["indicators"];
export type ForecastPoint = ConvexResults["forecasts"][number];
export type ForecastSummary = ConvexResults["forecastSummary"][number];
export type Scenario = ConvexResults["scenarios"][number];
export type ScoreCriterion = ConvexResults["score"]["criteria"][number];
export type Score = ConvexResults["score"];
export type ComparisonItem = ConvexResults["comparison"][number];
export type ZoneInfo = ConvexResults["zone"];
export type AnalysisResults = ConvexResults;
export type AiInsights = ConvexAiInsights;

export interface AnalysisRun {
  _id: string;
  input: InvestmentInput;
  results: AnalysisResults;
  aiInsights?: AiInsights;
  isFavorite?: boolean;
  createdAt: number;
  updatedAt: number;
  shareToken?: string;
  shareExpiresAt?: number;
}

export interface ZoneRow {
  region: string;
  name: string;
  pricePerM2: number;
  rentPerM2: number;
  demandIndex: number;
  appreciationPct: number;
  riskScore: number;
  rank: number;
  highlights: string[];
}

export interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

export interface FormState {
  type: InvestmentType;
  purchasePrice: number;
  surface: number;
  region: string;
  city: string;
  quartier: string;
  rentMode: RentMode;
  monthlyRent: number;
  nightlyRent: number;
  occupancyRate: number;
  renovationCost: number;
  acquisitionFeePct: number;
  financingFees: number;
  agencyFeesPct: number;
  furnishingCost: number;
  annualCharges: number;
  insurance: number;
  managementFeePct: number;
  taxationPct: number;
  appreciationPct: number;
  rentGrowthPct: number;
  inflationPct: number;
  horizonYears: number;
}

/* ─────────────────────────── Catalogue frontend ─────────────────────────── */

export interface TypeMeta {
  label: string;
  icon: LucideIcon;
  desc: string;
}

export const TYPE_META: Record<InvestmentType, TypeMeta> = {
  maison: { label: "Maison", icon: Home, desc: "Maison individuelle, location familiale longue durée." },
  villa: { label: "Villa", icon: Castle, desc: "Villa haut de gamme, forte valorisation." },
  appartement: { label: "Appartement", icon: Building2, desc: "Actif locatif le plus liquide du marché." },
  studio: { label: "Studio", icon: DoorOpen, desc: "Petite surface, rotation locative rapide." },
  duplex: { label: "Duplex", icon: Layers, desc: "Deux niveaux, cible familiale aisée." },
  immeuble: { label: "Immeuble", icon: Building, desc: "Plusieurs lots, risque locatif mutualisé." },
  local_commercial: { label: "Local commercial", icon: Store, desc: "Rendement élevé, baux longs." },
  bureau: { label: "Bureau", icon: Briefcase, desc: "Locataires professionnels, baux fermes." },
  entrepot: { label: "Entrepôt", icon: Warehouse, desc: "Zone industrielle, loyers stables." },
  terrain: { label: "Terrain constructible", icon: LandPlot, desc: "Aucun revenu, plus-value à la revente." },
  residence_touristique: { label: "Résidence touristique", icon: Palmtree, desc: "Location courte durée, saisonnalité." },
  projet_neuf: { label: "Projet immobilier neuf", icon: HardHat, desc: "Promotion neuve, décote sur plan." },
};

export const TYPE_ORDER: InvestmentType[] = [
  "appartement",
  "villa",
  "maison",
  "studio",
  "duplex",
  "immeuble",
  "local_commercial",
  "bureau",
  "entrepot",
  "terrain",
  "residence_touristique",
  "projet_neuf",
];

export const DEFAULT_FORM: FormState = {
  type: "appartement",
  purchasePrice: 0,
  surface: 0,
  region: "Tunis",
  city: "Tunis Centre",
  quartier: "Centre-ville",
  rentMode: "mensuel",
  monthlyRent: 0,
  nightlyRent: 0,
  occupancyRate: 0,
  renovationCost: 0,
  acquisitionFeePct: 6,
  financingFees: 0,
  agencyFeesPct: 2,
  furnishingCost: 0,
  annualCharges: 1200,
  insurance: 400,
  managementFeePct: 5,
  taxationPct: 10,
  appreciationPct: 4.8,
  rentGrowthPct: 4,
  inflationPct: 5,
  horizonYears: 10,
};

/* ─────────────────────────── Formatters ─────────────────────────── */

export function fmtTND(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value)} TND`;
}

export function fmtNum(value: number | null | undefined, decimals = 0): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: decimals }).format(value);
}

export function fmtPct(value: number | null | undefined, decimals = 1): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: decimals }).format(value)} %`;
}

export function rentModeLabel(mode: RentMode): string {
  return mode === "nuit" ? "Location courte durée (nuitée)" : "Location longue durée (mensuel)";
}

export function stripEmojis(value: string): string {
  return value.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").trim();
}

export function fmtPdf(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "-";
  return fmtNum(value);
}

export function scoreTone(total: number): {
  text: string;
  bg: string;
  border: string;
  hex: string;
} {
  if (total >= 70) return { text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", hex: "#10b981" };
  if (total >= 55) return { text: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/30", hex: "#6366f1" };
  if (total >= 40) return { text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", hex: "#f59e0b" };
  return { text: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/30", hex: "#ef4444" };
}

export const CHART_COLORS = [
  "#6366f1",
  "#3b82f6",
  "#06b6d4",
  "#8b5cf6",
  "#f59e0b",
  "#10b981",
  "#ef4444",
];

/* ─────────────────────────── Composants ─────────────────────────── */

export function ScoreGauge({ score, label }: { score: number; label?: string }) {
  const tone = scoreTone(score);
  const size = 132;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.min(100, Math.max(0, score)) / 100);
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted/40" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            stroke={tone.hex}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 700ms ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-3xl font-extrabold tabular-nums", tone.text)}>{Math.round(score)}</span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">/ 100</span>
        </div>
      </div>
      {label ? <p className={cn("mt-2 text-xs font-semibold", tone.text)}>{label}</p> : null}
    </div>
  );
}

export function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  tone = "neutral",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "positive" | "negative" | "indigo";
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "negative"
        ? "text-rose-600 dark:text-rose-400"
        : tone === "indigo"
          ? "text-indigo-600 dark:text-indigo-400"
          : "text-foreground";
  return (
    <div className="rounded-2xl border border-border/40 bg-card/80 p-4 shadow-soft">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
          <Icon className="size-4" />
        </span>
        <span className="label-overline text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
      </div>
      <p className={cn("mt-2 text-lg font-bold tabular-nums tracking-tight", toneClass)}>{value}</p>
      {sub ? <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export function NumField({
  label,
  value,
  onChange,
  suffix,
  hint,
  min = 0,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-foreground">{label}</span>
      <div className="mt-1 flex items-center gap-2 rounded-xl border border-border/50 bg-background px-3 py-2 focus-within:border-indigo-500/60">
        <input
          type="number"
          inputMode="decimal"
          value={Number.isFinite(value) ? value : 0}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const n = Number(e.target.value);
            onChange(Number.isFinite(n) ? n : 0);
          }}
          className="w-full bg-transparent text-sm tabular-nums outline-none"
        />
        {suffix ? <span className="shrink-0 text-xs text-muted-foreground">{suffix}</span> : null}
      </div>
      {hint ? <span className="mt-1 block text-[10px] text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

export function SectionHeading({
  icon: Icon,
  title,
  subtitle,
  right,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
          <Icon className="size-4" />
        </span>
        <div>
          <h3 className="text-sm font-bold tracking-tight">{title}</h3>
          {subtitle ? <p className="text-[10px] text-muted-foreground">{subtitle}</p> : null}
        </div>
      </div>
      {right}
    </div>
  );
}

export function AnimatedCard({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
      className={cn("rounded-2xl border border-border/40 bg-card/80 shadow-soft", className)}
    >
      {children}
    </motion.div>
  );
}

/* ─────────────────────────── Export CSV ─────────────────────────── */

function csvEscape(value: unknown): string {
  const s = String(value ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

export function exportCsv(run: AnalysisRun) {
  const { input, results } = run;
  const { indicators } = results;
  const rows: Array<[string, string]> = [
    ["Type de bien", TYPE_META[input.type].label],
    ["Localisation", `${input.quartier}, ${input.city}, ${input.region}`],
    ["Prix d'achat", fmtPdf(indicators.purchasePrice)],
    ["Coût total de l'investissement", fmtPdf(indicators.totalCost)],
    ["Frais d'acquisition", fmtPdf(indicators.acquisitionFees)],
    ["Frais de financement", fmtPdf(indicators.financingFees)],
    ["Honoraires d'agence", fmtPdf(indicators.agencyFees)],
    ["Ameublement", fmtPdf(indicators.furnishingCost)],
    ["Aménagement", fmtPdf(indicators.renovationCost)],
    ["Mode de location", rentModeLabel(input.rentMode)],
    ["Loyer mensuel de référence", fmtPdf(indicators.monthlyRent)],
    ["Taux d'occupation", fmtPct(indicators.occupancyRate)],
    ["Revenus locatifs annuels", fmtPdf(indicators.grossAnnualRent)],
    ["Charges d'exploitation", fmtPdf(indicators.operatingExpenses)],
    ["Revenu net annuel", fmtPdf(indicators.netAnnualIncome)],
    ["Cashflow mensuel", fmtPdf(indicators.monthlyCashflow)],
    ["Cashflow annuel", fmtPdf(indicators.annualCashflow)],
    ["Rendement brut", fmtPct(indicators.grossYieldPct)],
    ["Rendement net", fmtPct(indicators.netYieldPct)],
    ["ROI 1 an", fmtPct(indicators.roiAnnualPct)],
    ["ROI 5 ans", fmtPct(indicators.roi5yPct)],
    ["ROI 10 ans", fmtPct(indicators.roi10yPct)],
    ["Récupération du capital (années)", fmtPdf(indicators.paybackYears)],
    ["Date de récupération", indicators.paybackDateLabel],
    ["Prix au m²", indicators.pricePerM2 != null ? fmtPdf(indicators.pricePerM2) : "-"],
    ["Ratio prix/loyer", fmtPdf(indicators.priceToRentRatio)],
    ["Score IA", `${results.score.total}/100 (${results.score.grade})`],
    ["Confiance", fmtPct(results.confidencePct)],
    ["Zone", `${results.zone.name} — rang ${results.zone.rank}/${results.zone.total}`],
  ];

  const lines = [
    "Indicateur;Valeur",
    ...rows.map(([k, v]) => `${csvEscape(k)};${csvEscape(v)}`),
    "",
    "Horizon;Valeur du bien;Revenus cumulés;Gain cumulé;ROI",
    ...results.forecastSummary.map(
      (f) => `${csvEscape(f.label)};${f.propertyValue};${f.totalIncome};${f.totalGain};${f.roiPct}`,
    ),
    "",
    "Scénario;Valeur future;Revenus;ROI;Rendement net;Risque",
    ...results.scenarios.map(
      (s) => `${csvEscape(s.label)};${s.propertyValue};${s.totalIncome};${s.roiPct};${s.netYieldPct};${s.riskLabel}`,
    ),
    "",
    "Classe d'actif;Rendement net;ROI;Risque;Appréciation",
    ...results.comparison.map(
      (c) => `${csvEscape(c.label)};${c.netYieldPct};${c.roiPct};${c.riskLevel};${c.appreciationPct}`,
    ),
  ];

  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `investissement-${input.type}-${new Date(run.createdAt).toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─────────────────────────── Export PDF ─────────────────────────── */

const PDF_INDIGO = [79, 70, 229] as [number, number, number];
const PDF_SLATE = [71, 85, 105] as [number, number, number];

export function generatePdf(run: AnalysisRun) {
  const { input, results, aiInsights } = run;
  const { indicators } = results;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const width = doc.internal.pageSize.getWidth();
  const location = `${input.quartier}, ${input.city}, ${input.region}`;

  // Page de garde
  doc.setFillColor(PDF_INDIGO[0], PDF_INDIGO[1], PDF_INDIGO[2]);
  doc.rect(0, 0, width, 180, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Rapport d'investissement immobilier", 40, 80);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`${TYPE_META[input.type].label} — ${location}`, 40, 108);
  doc.text(`Score IA : ${results.score.total}/100 (${results.score.grade})`, 40, 130);

  doc.setTextColor(PDF_SLATE[0], PDF_SLATE[1], PDF_SLATE[2]);
  doc.setFontSize(10);
  doc.text(
    `Généré le ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(run.createdAt))}`,
    40,
    160,
  );

  let y = 220;
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Indicateurs financiers", 40, y);
  y += 10;

  const kpis: Array<[string, string]> = [
    ["Coût total", fmtTND(indicators.totalCost)],
    ["Revenus locatifs annuels", fmtTND(indicators.grossAnnualRent)],
    ["Revenu net annuel", fmtTND(indicators.netAnnualIncome)],
    ["Cashflow mensuel", fmtTND(indicators.monthlyCashflow)],
    ["Rendement brut", fmtPct(indicators.grossYieldPct)],
    ["Rendement net", fmtPct(indicators.netYieldPct)],
    ["ROI 1 an", fmtPct(indicators.roiAnnualPct)],
    ["ROI 5 ans", fmtPct(indicators.roi5yPct)],
    ["ROI 10 ans", fmtPct(indicators.roi10yPct)],
    ["Récupération du capital", `${indicators.paybackYears} ans — ${indicators.paybackDateLabel}`],
    ["Prix au m²", indicators.pricePerM2 != null ? fmtTND(indicators.pricePerM2) : "—"],
    ["Ratio prix / loyer", fmtNum(indicators.priceToRentRatio, 1)],
  ];
  autoTable(doc, {
    startY: y,
    head: [["Indicateur", "Valeur"]],
    body: kpis,
    theme: "striped",
    headStyles: { fillColor: PDF_INDIGO, textColor: 255 },
    styles: { fontSize: 9 },
    margin: { left: 40, right: 40 },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Prévisions", 40, y);
  autoTable(doc, {
    startY: y + 10,
    head: [["Horizon", "Valeur du bien", "Revenus cumulés", "Gain cumulé", "ROI"]],
    body: results.forecastSummary.map((f) => [
      f.label,
      fmtPdf(f.propertyValue),
      fmtPdf(f.totalIncome),
      fmtPdf(f.totalGain),
      fmtPct(f.roiPct),
    ]),
    theme: "grid",
    headStyles: { fillColor: PDF_INDIGO, textColor: 255 },
    styles: { fontSize: 9 },
    margin: { left: 40, right: 40 },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Scénarios", 40, y);
  autoTable(doc, {
    startY: y + 10,
    head: [["Scénario", "Valeur future", "Revenus", "ROI", "Rendement net", "Risque"]],
    body: results.scenarios.map((s) => [
      s.label,
      fmtPdf(s.propertyValue),
      fmtPdf(s.totalIncome),
      fmtPct(s.roiPct),
      fmtPct(s.netYieldPct),
      s.riskLabel,
    ]),
    theme: "grid",
    headStyles: { fillColor: PDF_INDIGO, textColor: 255 },
    styles: { fontSize: 9 },
    margin: { left: 40, right: 40 },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;

  if (y > 640) {
    doc.addPage();
    y = 60;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Détail du score IA", 40, y);
  autoTable(doc, {
    startY: y + 10,
    head: [["Critère", "Score", "Poids"]],
    body: results.score.criteria.map((c) => [c.label, `${c.score} / ${c.max}`, `${c.weight}`]),
    theme: "striped",
    headStyles: { fillColor: PDF_INDIGO, textColor: 255 },
    styles: { fontSize: 9 },
    margin: { left: 40, right: 40 },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;

  if (y > 640) {
    doc.addPage();
    y = 60;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`Zone : ${results.zone.name} — rang ${results.zone.rank}/${results.zone.total}`, 40, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    `Prix moyen ${results.zone.pricePerM2} TND/m² · loyer moyen ${results.zone.rentPerM2} TND/m²/mois · ` +
      `demande ${results.zone.demandIndex}/100 · appréciation ${results.zone.appreciationPct} %/an · risque ${results.zone.riskScore}/100`,
    40,
    y + 16,
  );
  y += 40;

  if (aiInsights) {
    if (y > 620) {
      doc.addPage();
      y = 60;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Analyse de l'IA", 40, y);
    y += 18;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const paragraphs = [aiInsights.summary, aiInsights.verdict, aiInsights.marketNotes];
    for (const p of paragraphs) {
      const lines = doc.splitTextToSize(stripEmojis(p), width - 80) as string[];
      doc.text(lines, 40, y);
      y += lines.length * 12 + 8;
    }
    const recs = aiInsights.recommendations.map((r) => `• ${stripEmojis(r)}`);
    if (recs.length) {
      doc.setFont("helvetica", "bold");
      doc.text("Recommandations", 40, y);
      y += 14;
      doc.setFont("helvetica", "normal");
      for (const r of recs) {
        const lines = doc.splitTextToSize(r, width - 90) as string[];
        doc.text(lines, 46, y);
        y += lines.length * 12 + 2;
      }
    }
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("baticost AI — Analyse de rentabilité des investissements immobiliers", 40, doc.internal.pageSize.getHeight() - 24);
    doc.text(`Page ${i}/${pages}`, width - 80, doc.internal.pageSize.getHeight() - 24);
  }

  doc.save(`rapport-investissement-${input.type}-${Date.now()}.pdf`);
}
