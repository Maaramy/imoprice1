import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { ArrowLeft, Scale, Trash2, Plus, Building2, Home, KeyRound, BarChart3, MapPin, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatPrice } from "./Dashboard";
import { useI18n } from "@/lib/i18n";

export type CompareEntry = {
  kind: "vente" | "loyer";
  id: string;
  title: string;
  location: string;
  propertyType: string;
  builtSurface?: number;
  gouvernorat?: string;
  // vente
  estimatedValue?: number;
  priceMin?: number;
  priceMax?: number;
  fastSalePrice?: number;
  maxProfitPrice?: number;
  avgPricePerSqm?: number;
  confidenceIndex?: number;
  valueYear1?: number;
  valueYear3?: number;
  valueYear5?: number;
  // loyer
  estimatedRent?: number;
  rentMin?: number;
  rentMax?: number;
  grossYield?: number;
};

const SELECTION_KEY = "compare_selection";

export function getCompareSelection(): CompareEntry[] {
  try {
    const raw = sessionStorage.getItem(SELECTION_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCompareSelection(entries: CompareEntry[]) {
  try {
    sessionStorage.setItem(SELECTION_KEY, JSON.stringify(entries));
  } catch {
    // ignore
  }
}

export function typeLabel(type?: string) {
  const map: Record<string, string> = {
    appartement: "Appartement", maison: "Maison", villa: "Villa", studio: "Studio",
    duplex: "Duplex", immeuble: "Immeuble", local_commercial: "Local commercial",
    bureau: "Bureau", magasin: "Magasin", restaurant: "Restaurant", cafe: "Café",
    entrepot: "Entrepôt", atelier: "Atelier", terrain_constructible: "Terrain constructible",
    terrain_agricole: "Terrain agricole", ferme: "Ferme", garage: "Garage",
    parking: "Parking", depot: "Dépôt", mixte: "Mixte",
  };
  return map[type || ""] || type || "Bien";
}

type Metric = { key: string; label: string; best: "max" | "min" | "none" };

const SALE_METRICS: Metric[] = [
  { key: "value", label: "compare.metric.value", best: "max" },
  { key: "range", label: "compare.metric.range", best: "none" },
  { key: "fast", label: "compare.metric.fast", best: "max" },
  { key: "profit", label: "compare.metric.profit", best: "max" },
  { key: "perSqm", label: "compare.metric.perSqm", best: "min" },
  { key: "confidence", label: "compare.metric.confidence", best: "max" },
  { key: "surface", label: "compare.metric.surface", best: "max" },
  { key: "year", label: "compare.metric.year", best: "max" },
  { key: "year3", label: "compare.metric.year3", best: "max" },
  { key: "year5", label: "compare.metric.year5", best: "max" },
];

const RENT_METRICS: Metric[] = [
  { key: "rent", label: "compare.metric.rent", best: "none" },
  { key: "yield", label: "compare.metric.yield", best: "max" },
  { key: "confidence", label: "compare.metric.confidence", best: "max" },
  { key: "surface", label: "compare.metric.surface", best: "max" },
];

function metricValue(e: CompareEntry, key: string): number | null {
  switch (key) {
    case "value": return e.estimatedValue ?? null;
    case "range": return e.priceMin != null && e.priceMax != null ? e.priceMax - e.priceMin : null;
    case "fast": return e.fastSalePrice ?? null;
    case "profit": return e.maxProfitPrice ?? null;
    case "perSqm": return e.avgPricePerSqm ?? null;
    case "confidence": return e.confidenceIndex ?? null;
    case "surface": return e.builtSurface ?? null;
    case "year": return e.valueYear1 ?? null;
    case "year3": return e.valueYear3 ?? null;
    case "year5": return e.valueYear5 ?? null;
    case "rent": return e.estimatedRent ?? null;
    case "yield": return e.grossYield ?? null;
    default: return null;
  }
}

function formatMetric(e: CompareEntry, key: string): string {
  const v = metricValue(e, key);
  if (v == null) return "—";
  switch (key) {
    case "confidence": return `${v}%`;
    case "surface": return `${v} m²`;
    case "yield": return `${v.toFixed(1)}%`;
    case "range": return `${formatPrice(e.priceMin || 0)} – ${formatPrice(e.priceMax || 0)}`;
    case "rent": return `${formatPrice(v)} / mois`;
    default: return formatPrice(v);
  }
}

export default function Compare() {
  const nav = useNavigate();
  const { t } = useI18n();
  const [entries, setEntries] = useState<CompareEntry[]>(getCompareSelection);

  const hasSale = entries.some((e) => e.kind === "vente");
  const hasRent = entries.some((e) => e.kind === "loyer");
  const metrics = hasRent && !hasSale ? RENT_METRICS : SALE_METRICS;

  const chartData = useMemo(
    () =>
      entries.map((e) => ({
        name: e.title.length > 14 ? e.title.slice(0, 14) + "…" : e.title,
        value: e.kind === "vente" ? e.estimatedValue || 0 : (e.estimatedRent || 0) * 12,
      })),
    [entries],
  );

  const remove = (id: string) => {
    const next = entries.filter((e) => e.id !== id);
    setEntries(next);
    saveCompareSelection(next);
  };

  if (entries.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-gray-950 dark:to-gray-900">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <button onClick={() => nav("/dashboard")} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors">
            <ArrowLeft className="size-4" /> {t("compare.back")}
          </button>
          <Card className="mt-6 rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 mb-4">
                <Scale className="size-7" />
              </div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t("compare.title")}</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-sm">{t("compare.empty")}</p>
              <Button onClick={() => nav("/dashboard")} className="mt-6 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white">
                <Plus className="size-4 mr-1.5" /> {t("compare.add")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-gray-950 dark:to-gray-900 pb-16">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 py-4 sm:py-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
          <div className="flex items-center gap-2.5 min-w-0">
            <button onClick={() => nav("/dashboard")} className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
              <ArrowLeft className="size-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 truncate">
                <Scale className="size-4.5 text-blue-600 dark:text-blue-400 shrink-0" />
                {t("compare.title")}
              </h1>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {entries.length} bien{entries.length > 1 ? "s" : ""} · {hasRent ? t("compare.metric.rent") : t("compare.metric.value")}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => nav("/dashboard")} className="rounded-xl text-xs shrink-0">
            <Plus className="size-3.5 mr-1" /> {t("compare.add")}
          </Button>
        </div>

        {/* Bar chart */}
        {chartData.length >= 2 && (
          <Card className="mb-4 sm:mb-6 rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <CardHeader className="pb-2 pt-3 sm:pt-5 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <div className="flex size-6 sm:size-7 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/50">
                  <BarChart3 className="size-3.5 sm:size-4 text-blue-600 dark:text-blue-400" />
                </div>
                {hasRent && !hasSale ? t("compare.metric.rent") : t("compare.metric.value")}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 sm:px-6 pt-0 pb-3 sm:pb-5">
              <div className="flex items-end gap-2 sm:gap-4 h-40 sm:h-52 px-1">
                {chartData.map((d, i) => {
                  const max = Math.max(...chartData.map((x) => x.value), 1);
                  const h = Math.max((d.value / max) * 100, 4);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                      <span className="text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-200 truncate max-w-full">
                        {formatPrice(d.value)}
                      </span>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ delay: i * 0.06, duration: 0.4, ease: "easeOut" }}
                        className={`w-full max-w-16 rounded-t-lg ${entries[i].kind === "loyer" ? "bg-gradient-to-t from-emerald-600 to-teal-400" : "bg-gradient-to-t from-blue-700 to-blue-400"}`}
                      />
                      <span className="text-[9px] sm:text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-full">{d.name}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Comparison table */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="text-left text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500 font-semibold px-3 sm:px-4 py-3 w-40">
                    {t("compare.title")}
                  </th>
                  {entries.map((e) => (
                    <th key={e.id} className="px-3 sm:px-4 py-3 text-left align-top">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <div className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${e.kind === "loyer" ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400" : "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"}`}>
                              {e.kind === "loyer" ? <KeyRound className="size-3.5" /> : e.propertyType === "maison" || e.propertyType === "villa" ? <Home className="size-3.5" /> : <Building2 className="size-3.5" />}
                            </div>
                            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate max-w-[120px]">{e.title}</span>
                          </div>
                          <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1 truncate">
                            <MapPin className="size-3 shrink-0" /> {e.location}
                          </p>
                          <Badge className="mt-1.5 rounded-full border-0 text-[9px] bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 font-medium">
                            {typeLabel(e.propertyType)}
                          </Badge>
                        </div>
                        <button
                          onClick={() => remove(e.id)}
                          className="text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors shrink-0 mt-0.5"
                          aria-label={t("common.delete")}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metrics.map((m, idx) => {
                  const values = entries.map((e) => metricValue(e, m.key));
                  const bestVal =
                    m.best === "max" ? Math.max(...values.filter((v): v is number => v != null), -Infinity)
                    : m.best === "min" ? Math.min(...values.filter((v): v is number => v != null), Infinity)
                    : null;
                  return (
                    <tr key={m.key} className={idx % 2 ? "bg-slate-50/50 dark:bg-slate-900/30" : ""}>
                      <td className="px-3 sm:px-4 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                        {t(m.label)}
                      </td>
                      {entries.map((e) => {
                        const v = metricValue(e, m.key);
                        const isBest = v != null && bestVal != null && (m.best === "max" ? v === bestVal : m.best === "min" ? v === bestVal : false);
                        return (
                          <td key={e.id} className="px-3 sm:px-4 py-2.5">
                            <span className={`text-xs sm:text-sm ${isBest ? "font-bold text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-slate-200"}`}>
                              {formatMetric(e, m.key)}
                            </span>
                            {isBest && <ShieldCheck className="inline size-3 text-emerald-500 ml-1 mb-0.5" />}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                <tr className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-3 sm:px-4 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {t("compare.metric.type")} / {t("compare.metric.location")}
                  </td>
                  {entries.map((e) => (
                    <td key={e.id} className="px-3 sm:px-4 py-2.5 text-xs text-slate-700 dark:text-slate-200">
                      {e.gouvernorat || "—"}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
