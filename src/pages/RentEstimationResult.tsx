import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Wallet, TrendingUp, Percent, CalendarClock, Gauge, Target,
  ShieldCheck, MapPin, Building2, FileDown, Loader2, CheckCircle2,
  AlertCircle, Lightbulb, Sparkles, Brain, KeyRound, Ruler, Home,
  MessageCircle, ChevronRight, Copy, Check, LandPlot, Clock, Scale,
  MoonStar, CalendarDays, BedDouble, Building, Send, Star, Phone, Eye, RefreshCw, History,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";
import {
  LineChart as RechartsLineChart,
  Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { formatPrice } from "./Dashboard";
import { RENT_PROPERTY_TYPES_LABELS, RENT_FINISH_LABELS, PROPERTY_STATES_LABELS } from "@/convex/types";
import { rentLevelInfo, getRentMarketHighlights, RENT_LEVELS, computeRentEstimation } from "@/lib/rent-estimation";
import type { RentEstimationResult, RentPropertyInput } from "@/convex/types";
import { toast } from "sonner";
import { usePdfExport } from "@/hooks/use-pdf-export";
import { cn } from "@/lib/utils";
import { SegmentedToggle } from "@/components/SegmentedToggle";

const fmtRent = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} TND`;
const fmtM2 = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} TND/m²`;

const fadeUp = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } };

// ── Exemple de démonstration : maison à Nabeul (120 m²) estimée par le BIM Engine ──
// Route /estimate/loyer/demo → la page résultat s'affiche directement, sans étapes
// de saisie, avec les deux volets : loyer mensuel (longue durée) et nuitée (courte
// durée — zone touristique détectée automatiquement par l'IA).
const DEMO_RENT_HOUSE: RentPropertyInput = {
  address: "Route Touristique, zone côtière",
  gouvernorat: "Nabeul",
  ville: "Nabeul",
  quartier: "Zone touristique",
  propertyType: "maison",
  estimationMode: "nuitée",
  builtSurface: 120,
  terrainSurface: 250,
  bedrooms: 3,
  bathrooms: 2,
  kitchens: 1,
  livingRooms: 1,
  garages: 1,
  floors: 1,
  hasGarden: true,
  hasPool: true,
  hasTerrace: true,
  hasBalcony: true,
  hasParking: true,
  hasAC: true,
  hasFiber: true,
  hasInternet: true,
  hasEquippedKitchen: true,
  isFurnished: true,
  nearBeach: true,
  yearBuilt: 2021,
  generalState: "excellent_etat",
  finishLevel: "premium",
};
const DEMO_RENT_RESULT = computeRentEstimation(DEMO_RENT_HOUSE);

const TREND_META = {
  hausse: { label: "Hausse", icon: TrendingUp, cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 ring-emerald-200/70 dark:ring-emerald-800/60" },
  stabilite: { label: "Stabilité", icon: Gauge, cls: "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 ring-sky-200/70 dark:ring-sky-800/60" },
  baisse: { label: "Baisse", icon: TrendingUp, cls: "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 ring-red-200/70 dark:ring-red-800/60" },
};

function Stat({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  return (
    <motion.div variants={fadeUp} className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-3.5 sm:p-4 shadow-sm dark:shadow-gray-900/20">
      <div className="flex items-center gap-3">
        <div className={`flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
          <Icon className="size-4 sm:size-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
          <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{value}</p>
        </div>
      </div>
    </motion.div>
  );
}

export default function RentEstimationResult() {
  const { id } = useParams<{ id: string }>();
  const isDemo = id === "demo";
  const nav = useNavigate();
  const deleteRent = useMutation(api.rent.deleteRentEstimation);
  const reEstimateRent = useMutation(api.rent.reEstimateRent);
  const [reesting, setReesting] = useState(false);
  const { t } = useI18n();

  // Mode démo : pas de dossier Convex → on saute la requête (évite un appel avec un id invalide)
  const dbResult = useQuery(api.rent.getRentEstimation, (!isDemo && id) ? { estimationId: id as any } : "skip");

  const [session, setSession] = useState<{ property: RentPropertyInput; result: RentEstimationResult } | null>(null);
  const [copied, setCopied] = useState(false);
  const [displayMode, setDisplayMode] = useState<"mensuel" | "nuitée">("mensuel");

  // Profil sélectionné dans le formulaire (bailleur / locataire) — personnalise uniquement
  // l'interprétation et les recommandations affichées, jamais le résultat de l'estimation.
  const [intent, setIntent] = useState<"louer_bien" | "louer">(() => {
    try {
      return sessionStorage.getItem(`rent_intent_${id}`) === "louer" ? "louer" : "louer_bien";
    } catch {
      return "louer_bien";
    }
  });
  const changeIntent = (v: "louer_bien" | "louer") => {
    setIntent(v);
    try { sessionStorage.setItem(`rent_intent_${id}`, v); } catch { /* ignore */ }
  };

  useEffect(() => {
    if (!id || isDemo) return;
    try {
      const s = sessionStorage.getItem(`rent_${id}`);
      if (s) setSession(JSON.parse(s));
    } catch { /* ignore */ }
  }, [id, isDemo]);

  const result: RentEstimationResult | null = isDemo ? DEMO_RENT_RESULT : (session?.result ?? (dbResult as any) ?? null);
  const property: RentPropertyInput = isDemo ? DEMO_RENT_HOUSE : (session?.property ?? (dbResult as any)?.property ?? {});

  // Mode d'affichage : l'estimation nuitée est disponible dès que le moteur
  // l'a calculée (zoneProfile + nightly), quel que soit le mode choisi au formulaire.
  const hasNightly = !!(result && (result as any).nightly?.nightlyRent > 0);

  // ── Agences partenaires (même démarche que l'estimation vente/achat) ──
  const [agencyDialog, setAgencyDialog] = useState<{ open: boolean; partnerId: string; name: string }>({ open: false, partnerId: "", name: "" });
  const [agencyMessage, setAgencyMessage] = useState("");
  const [rentPriceScenario, setRentPriceScenario] = useState("realiste");
  const [sendingAgency, setSendingAgency] = useState(false);
  const [sentRecap, setSentRecap] = useState<{ scenario: string; price: number; agencyName: string } | null>(null);
  const sendRentToAgency = useMutation(api.agencies.sendRentEstimationToAgency);
  const activeAgencies = useQuery(api.agencies.getActiveAgencies, {
    region: (property as RentPropertyInput)?.gouvernorat || "",
  });
  const agencyResponses = useQuery(api.agencies.getAgencyResponsesForRentEstimation, (!isDemo && id) ? { rentEstimationId: id as any } : "skip");

  const reportRef = useRef<HTMLDivElement>(null);
  const { generatePdf, isExporting, exportProgress } = usePdfExport({
    filename: "rapport-estimation-loyer.pdf",
  });

  const handleExport = useCallback(async () => {
    try {
      await generatePdf(reportRef);
      toast.success("Rapport PDF généré", { description: "Téléchargement du rapport de location..." });
    } catch {
      toast.error("Erreur PDF", { description: "Impossible de générer le rapport." });
    }
  }, [generatePdf]);

  const handleDelete = useCallback(async () => {
    if (isDemo || !id) return;
    try {
      await deleteRent({ estimationId: id as any });
      sessionStorage.removeItem(`rent_${id}`);
      toast.success("Estimation supprimée");
      nav("/dashboard");
    } catch {
      toast.error("Erreur", { description: "Impossible de supprimer." });
    }
  }, [id, isDemo, deleteRent, nav]);

  const handleReEstimate = useCallback(async () => {
    if (isDemo || !id) return;
    setReesting(true);
    try {
      await reEstimateRent({ estimationId: id as any });
      sessionStorage.removeItem(`rent_${id}`);
      toast.success("Estimation de loyer mise à jour", { description: "Recalculée avec les dernières données du marché." });
    } catch (e: any) {
      toast.error("Erreur", { description: e?.data?.message || "Impossible de re-estimer." });
    }
    setReesting(false);
  }, [id, isDemo, reEstimateRent]);

  const copyLink = useCallback(() => {
    if (isDemo) {
      toast.info("Exemple de démonstration", { description: "Le partage de lien est disponible sur vos propres estimations." });
      return;
    }
    if (!id) return;
    const url = `${window.location.origin}/estimate/loyer/${id}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }).catch(() => {});
  }, [id, isDemo]);

  const highlights = useMemo(() => getRentMarketHighlights(), []);

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-7 animate-spin text-emerald-500" />
          <p className="text-sm text-slate-400">Chargement de l'estimation de loyer...</p>
        </div>
      </div>
    );
  }

  const p = property as RentPropertyInput;
  const typeLabel = RENT_PROPERTY_TYPES_LABELS[p.propertyType || "appartement"] || "Bien";
  const level = rentLevelInfo(result.marketAverages.level);
  const trend = TREND_META[result.forecastSummary.trend];
  const TrendIcon = trend.icon;
  const zone = [p.quartier, p.ville, p.gouvernorat].filter(Boolean).join(" — ") || "Tunisie";
  const stateLabel = PROPERTY_STATES_LABELS[p.generalState || "bon_etat"];
  const finishLabel = RENT_FINISH_LABELS[p.finishLevel || "standard"];

  // Scénarios de loyer partageables à une agence (prudent / réaliste / optimiste)
  const rentScenarios = [
    {
      key: "prudent" as const,
      label: "Prudent",
      price: result.rentMin,
      desc: "Loyer d'appel pour louer vite",
      color: "bg-amber-500",
      textColor: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-900/20",
      borderColor: "border-amber-200 dark:border-amber-800/50",
      ringColor: "ring-amber-200 dark:ring-amber-800/50",
    },
    {
      key: "realiste" as const,
      label: "Réaliste",
      price: result.estimatedRent,
      desc: "Loyer équilibré du marché",
      color: "bg-emerald-500",
      textColor: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
      borderColor: "border-emerald-200 dark:border-emerald-800/50",
      ringColor: "ring-emerald-200 dark:ring-emerald-800/50",
    },
    {
      key: "optimiste" as const,
      label: "Optimiste",
      price: result.rentMax,
      desc: "Bien valorisé, locataire premium",
      color: "bg-blue-500",
      textColor: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      borderColor: "border-blue-200 dark:border-blue-800/50",
      ringColor: "ring-blue-200 dark:ring-blue-800/50",
    },
  ];

  const yearsToAmortize =
    result.saleValue > 0 && result.annualRent > 0 ? result.saleValue / result.annualRent : 0;
  const comparatifMessage =
    result.grossYield >= 6
      ? `Avec un rendement brut de ${result.grossYield.toFixed(1)} %, votre bien amortit son prix d'achat en ~${Math.round(yearsToAmortize)} ans de loyers. La location est très rentable : conservez le bien et louez-le.`
      : result.grossYield >= 4.5
        ? `Avec un rendement brut de ${result.grossYield.toFixed(1)} %, votre bien amortit son prix d'achat en ~${Math.round(yearsToAmortize)} ans. La location offre un équilibre sain entre revenu régulier et valorisation du capital.`
        : `Le rendement brut de ${result.grossYield.toFixed(1)} % est modéré (~${Math.round(yearsToAmortize)} ans pour amortir le prix d'achat). La vente peut être plus avantageuse si vous visez une liquidité immédiate.`;

  const chartData = result.forecast.map((pt) => ({
    label: pt.label,
    loyer: pt.rent,
  }));

  const nightly = (result as any).nightly as RentEstimationResult["nightly"] | undefined;
  const zoneProfile = (result as any).zoneProfile as RentEstimationResult["zoneProfile"] | undefined;

  /* ── Interprétation & recommandations personnalisées selon le profil ── */
  const ownerSummary = `Votre bien se loue en moyenne ${fmtRent(result.estimatedRent)}/mois (fourchette ${fmtRent(result.rentMin)} – ${fmtRent(result.rentMax)}) avec ${result.confidenceIndex}% de fiabilité. Ce loyer correspond au scénario « réaliste » : un positionnement équilibré qui attire les locataires sérieux sans laisser de loyer sur la table.`;
  const tenantSummary = `Ce bien se loue environ ${fmtRent(result.estimatedRent)}/mois (fourchette ${fmtRent(result.rentMin)} – ${fmtRent(result.rentMax)}) avec ${result.confidenceIndex}% de fiabilité. C'est votre référence pour évaluer le loyer demandé et négocier en connaissance de cause.`;
  const ownerBullets = [
    `Positionnement du loyer : affichez autour de ${fmtRent(result.estimatedRent)}/mois (fourchette ${fmtRent(result.rentMin)} – ${fmtRent(result.rentMax)}), soit ${result.rentPerSqm.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} TND/m²/mois pour un marché ${level.label.toLowerCase()}.`,
    `Louer vite : ${fmtRent(result.rentMin)} (scénario prudent) — un loyer d'appel attractif réduit la durée de vacance.`,
    `Maximiser le loyer : ${fmtRent(result.rentMax)} (scénario optimiste) — à condition que le bien soit bien valorisé (finition ${finishLabel.toLowerCase()}, équipements soignés).`,
    `Mise en location : soignez l'annonce (photos lumineuses, description précise) et mettez en avant les équipements : ${[p.isFurnished && "meublé", p.hasAC && "clim", p.hasHeating && "chauffage", p.hasFiber && "fibre", p.hasPool && "piscine", p.hasGarden && "jardin"].filter(Boolean).join(", ") || "—"}.`,
    `Sélectionnez soigneusement le locataire : justificatifs de revenus, garant, dépôt de garantie et état des lieux détaillé.`,
    `Tendance : ${trend.label.toLowerCase()} — ${result.forecastSummary.message}`,
    ...(nightly ? [`Courte durée : ${fmtRent(nightly.nightlyRent)}/nuit en location saisonnière (zone ${zoneProfile?.label.toLowerCase() || "touristique"}) — une alternative rentable selon la zone.`] : []),
  ];
  const tenantBullets = [
    `Loyer de référence : ce bien se loue environ ${fmtRent(result.estimatedRent)}/mois (fourchette ${fmtRent(result.rentMin)} – ${fmtRent(result.rentMax)}).`,
    `Positionnement : ${result.rentPerSqm.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} TND/m²/mois — loyers moyens de la zone : ${fmtM2(result.marketAverages.gouvernorat)} (gouvernorat), ${fmtM2(result.marketAverages.ville)} (ville), ${fmtM2(result.marketAverages.quartier)} (quartier).`,
    `Négociation : un bail longue durée ou un bien à rafraîchir justifie de viser le bas de fourchette (${fmtRent(result.rentMin)}).`,
    `Avant de signer : vérifiez l'état des lieux, les charges et les équipements annoncés (meublé, clim, fibre…).`,
    `Budget : prévoyez un dépôt de garantie (1 à 2 mois de loyer) et d'éventuels frais d'agence.`,
    `Tendance : ${trend.label.toLowerCase()} — ${result.forecastSummary.message}${result.forecastSummary.trend === "hausse" ? " Si la tendance est haussière, signer tôt protège votre budget." : " Prenez le temps de comparer plusieurs biens."}`,
    `Durée moyenne de location dans la zone : ${result.avgRentalDurationMonths} mois — utile pour négocier un bail adapté à votre projet.`,
  ];

  const primaryValue = displayMode === "nuitée" && nightly ? nightly.nightlyRent : result.estimatedRent;
  const primaryUnit = displayMode === "nuitée" && nightly ? "/ nuit" : "/ mois";
  const primaryMin = displayMode === "nuitée" && nightly ? nightly.nightlyMin : result.rentMin;
  const primaryMax = displayMode === "nuitée" && nightly ? nightly.nightlyMax : result.rentMax;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* ═══ HEADER ═══ */}
      <header className="sticky top-0 z-40 border-b border-slate-200/60 dark:border-gray-800/60 bg-white/70 dark:bg-gray-950/70 backdrop-blur-2xl shadow-xs">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <button onClick={() => nav("/dashboard")}
              className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors">
              <ArrowLeft className="size-3.5 sm:size-4" />
              <span>Tableau de bord</span>
            </button>
            <div className="flex items-center gap-2">

              {!isDemo && (
                <button
                  onClick={handleReEstimate}
                  disabled={reesting}
                  className="flex size-9 items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-all disabled:opacity-50"
                  aria-label={t("rent.result.reestimate")}
                  title={t("rent.result.reestimate")}
                >
                  <RefreshCw className={`size-4 ${reesting ? "animate-spin" : ""}`} />
                </button>
              )}
              <Button variant="ghost" size="sm" onClick={copyLink}
                className="h-9 rounded-xl text-[11px] sm:text-xs text-slate-500 hover:text-slate-900 gap-1.5 px-2.5">
                {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                <span className="hidden sm:inline">{copied ? "Lien copié" : "Partager"}</span>
              </Button>
              <Button onClick={handleExport} disabled={isExporting}
                className="h-9 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-semibold gap-1.5 shadow-md shadow-emerald-200/50 dark:shadow-emerald-900/50 px-3 sm:px-4">
                {isExporting ? <Loader2 className="size-3.5 animate-spin" /> : <FileDown className="size-3.5" />}
                <span className="hidden sm:inline">Rapport PDF</span>
                <span className="sm:hidden">PDF</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Exemple de démonstration — accès direct à la page résultat */}
      {isDemo && (
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-4 print:hidden">
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 px-3.5 py-2.5 sm:px-4 shadow-sm">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400">
                <Sparkles className="size-4" />
              </div>
              <p className="text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 leading-snug">
                <strong>Exemple de démonstration</strong> — maison de 120 m² à Nabeul estimée par le BIM Engine
                (loyer mensuel &amp; nuitée). Créez votre propre estimation pour un résultat personnalisé.
              </p>
            </div>
          </motion.div>
        </div>
      )}

      <div ref={reportRef} className="mx-auto max-w-6xl px-4 sm:px-6 pt-5 pb-16">
        <div className="report-content">
          {/* ═══ HERO — LOYER ESTIMÉ ═══ */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-600 via-emerald-700 to-green-900 text-white shadow-2xl shadow-green-200/40 dark:shadow-green-950/40"
          >
            <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "radial-gradient(circle at 30px 30px, white 1.5px, transparent 0)", backgroundSize: "60px 60px" }} />
            <div className="absolute -right-20 -top-20 size-64 rounded-full bg-white/10 blur-3xl" />
            <div className="relative p-5 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 sm:size-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md ring-1 ring-white/20">
                    <KeyRound className="size-5 sm:size-6 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-emerald-200/80">
                      {displayMode === "nuitée" && nightly ? "Tarif par nuitée recommandé · courte durée" : "Loyer mensuel recommandé"} · {typeLabel}
                    </p>
                    <p className="text-xs sm:text-sm text-emerald-100/90 flex items-center gap-1 mt-0.5">
                      <MapPin className="size-3.5" /> {zone}
                    </p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] sm:text-xs font-bold ring-1 ring-white/25 bg-white/15 backdrop-blur-md`}>
                  <span className={`size-2 rounded-full ${level.dot}`} /> Marché {level.label.toLowerCase()}
                </span>
              </div>

              <div className="mt-4 sm:mt-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-3xl sm:text-5xl font-black tracking-tight">
                    {fmtRent(primaryValue)}
                    <span className="text-sm sm:text-lg font-semibold text-emerald-200/80"> {primaryUnit}</span>
                  </p>
                  <p className="mt-2 text-xs sm:text-sm text-emerald-100/80">
                    Fourchette : <span className="font-bold text-white">{fmtRent(primaryMin)} – {fmtRent(primaryMax)}</span>
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                  <div className="inline-flex rounded-xl bg-white/10 backdrop-blur-md p-1 ring-1 ring-white/15">
                    {[
                      { v: "mensuel" as const, l: "Mensuel", ic: CalendarDays },
                      { v: "nuitée" as const, l: "Nuitée", ic: MoonStar },
                    ].map((m) => {
                      const Icon = m.ic;
                      const active = displayMode === m.v;
                      return (
                        <button key={m.v} onClick={() => setDisplayMode(m.v)}
                          disabled={m.v === "nuitée" && !hasNightly}
                          aria-pressed={active}
                          className={cn(
                            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] sm:text-xs font-bold transition-all",
                            active ? "bg-white text-emerald-800 shadow-sm" : "text-emerald-100/90 hover:bg-white/10",
                            m.v === "nuitée" && !hasNightly && "opacity-40 cursor-not-allowed",
                          )}
                        >
                          <Icon className="size-3.5" /> {m.l}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur-md px-3.5 py-2 ring-1 ring-white/15">
                    <Ruler className="size-4 text-emerald-200" />
                    <span className="text-sm sm:text-base font-bold">
                      {displayMode === "nuitée" && nightly ? `${nightly.nightlyRent.toLocaleString("fr-FR")} TND/nuit` : `${result.rentPerSqm.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} TND/m²/mois`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur-md px-3.5 py-2 ring-1 ring-white/15">
                    <ShieldCheck className="size-4 text-emerald-200" />
                    <span className="text-sm sm:text-base font-bold">{result.confidenceIndex}%</span>
                    <span className="text-[10px] text-emerald-200/80">de fiabilité</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ═══ INTERPRÉTATION PERSONNALISÉE (bailleur / locataire) ═══ */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mt-4 sm:mt-6"
          >
            <Card className="border-emerald-100 dark:border-emerald-900/60 rounded-2xl overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/50 ring-1 ring-emerald-100 dark:ring-emerald-900">
                        <KeyRound className="size-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Interprétation personnalisée</p>
                        <p className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100 truncate">
                          {intent === "louer_bien" ? "Conseils pour louer votre bien" : "Conseils pour louer ce bien"}
                        </p>
                      </div>
                    </div>
                    <p className="text-[11px] sm:text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                      💡 {intent === "louer_bien" ? ownerSummary : tenantSummary}
                    </p>
                  </div>
                  <div className="shrink-0 w-full lg:w-[340px]">
                    <SegmentedToggle
                      options={[
                        { value: "louer_bien", label: "Louer mon bien", emoji: "🏠" },
                        { value: "louer", label: "Louer un bien", emoji: "🔎" },
                      ]}
                      value={intent}
                      onChange={(v) => changeIntent(v as "louer_bien" | "louer")}
                      accent="emerald"
                      size="md"
                      ariaLabel="Changer le profil d'interprétation"
                    />
                  </div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {(intent === "louer_bien" ? ownerBullets : tenantBullets).map((b, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 p-2.5">
                      <CheckCircle2 className={`size-4 shrink-0 mt-0.5 ${intent === "louer_bien" ? "text-emerald-500" : "text-sky-500"}`} />
                      <p className="text-[11px] sm:text-xs leading-relaxed text-gray-700 dark:text-gray-300">{b}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ═══ STATS ═══ */}
          <div className="mt-4 sm:mt-6 grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
            <Stat label="Rendement brut / an" value={`${result.grossYield.toFixed(1)} %`} icon={Percent} color="bg-gradient-to-br from-emerald-500 to-emerald-600" />
            <Stat label={displayMode === "nuitée" && nightly ? "Revenu annuel nuitée" : "Loyer annuel"}
              value={displayMode === "nuitée" && nightly ? fmtRent(nightly.annualRevenue) : fmtRent(result.annualRent)}
              icon={Wallet} color="bg-gradient-to-br from-teal-500 to-teal-600" />
            <Stat label="Durée moy. de location" value={`${result.avgRentalDurationMonths} mois`} icon={Clock} color="bg-gradient-to-br from-sky-500 to-blue-600" />
            <Stat label={displayMode === "nuitée" && nightly ? "Rendement nuitée / an" : "Valeur vente estimée"}
              value={displayMode === "nuitée" && nightly ? `${nightly.nightlyYield.toFixed(1)} %` : formatPrice(result.saleValue)}
              icon={displayMode === "nuitée" && nightly ? MoonStar : Home}
              color="bg-gradient-to-br from-violet-500 to-indigo-600" />
          </div>

          {/* ═══ ONGLETS ═══ */}
          <Tabs defaultValue="apercu" className="space-y-4 mt-4 sm:mt-6">
            <div className="sticky top-14 z-20 -mx-4 px-4 sm:-mx-6 sm:px-6 bg-gray-50/90 dark:bg-gray-950/90 backdrop-blur-sm pb-1 overflow-x-auto scrollbar-none">
              <TabsList className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-1 w-full grid grid-cols-5 gap-0.5 sm:inline-flex sm:w-auto sm:gap-0.5">
                {[
                  { v: "apercu", l: "Aperçu", i: ShieldCheck },
                  { v: "evolution", l: "Évolution", i: TrendingUp },
                  { v: "analyse", l: "Analyse", i: Lightbulb },
                  { v: "marche", l: "Marché", i: LandPlot },
                  { v: "agences", l: "Agences", i: Building },
                ].map((t) => (
                  <TabsTrigger key={t.v} value={t.v}
                    className="rounded-lg data-[state=active]:bg-emerald-50 dark:data-[state=active]:bg-emerald-900/30 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-300 text-[11px] sm:text-xs lg:text-sm px-1 sm:px-3 py-1.5 whitespace-nowrap min-w-0 flex items-center justify-center">
                    {t.l}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* ═══ APERÇU ═══ */}
            <TabsContent value="apercu" className="space-y-0 mt-0">
          {/* ═══ BIEN ANALYSÉ ═══ */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ duration: 0.4, delay: 0.5 }} className="mt-4 sm:mt-6">
            <Card className="border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm sm:text-base text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                    <Building2 className="size-4 text-gray-500" />
                  </div>
                  Informations du bien
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {[
                    { l: "Type", v: typeLabel },
                    { l: "Surface habitable", v: p.builtSurface ? `${p.builtSurface} m²` : "—" },
                    { l: "Terrain", v: p.terrainSurface ? `${p.terrainSurface} m²` : "—" },
                    { l: "Localisation", v: zone },
                    { l: "État", v: stateLabel },
                    { l: "Finition", v: finishLabel },
                    { l: "Chambres", v: p.bedrooms ? `${p.bedrooms}` : "—" },
                    { l: "Meublé", v: p.isFurnished ? "Oui" : "Non" },
                  ].map((item) => (
                    <div key={item.l} className="rounded-lg bg-gray-50 dark:bg-gray-800/50 px-3 py-2.5">
                      <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-gray-400">{item.l}</p>
                      <p className="mt-0.5 text-[11px] sm:text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{item.v}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ═══ SCÉNARIOS DE LOYER ═══ */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ duration: 0.4, delay: 0.08 }} className="mt-4 sm:mt-6">
            <Card className="border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Target className="size-4 text-emerald-600 dark:text-emerald-400" /> Scénarios de loyer
                </CardTitle>
                <CardDescription className="text-xs text-gray-500 dark:text-gray-400">3 stratégies de mise en location</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 p-3 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <div className="size-2 rounded-full bg-amber-500" />
                      <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">Prudent</span>
                    </div>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{fmtRent(result.rentMin)}</p>
                    <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5 leading-tight">Loyer d'appel pour louer vite</p>
                  </div>
                  <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-900/20 p-3 text-center ring-2 ring-offset-1 ring-emerald-200 dark:ring-emerald-800/50">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <div className="size-2 rounded-full bg-emerald-500" />
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Réaliste</span>
                    </div>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{fmtRent(result.estimatedRent)}</p>
                    <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5 leading-tight">Loyer équilibré du marché</p>
                  </div>
                  <div className="rounded-xl border border-blue-200 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-900/20 p-3 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <div className="size-2 rounded-full bg-blue-500" />
                      <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">Optimiste</span>
                    </div>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{fmtRent(result.rentMax)}</p>
                    <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5 leading-tight">Bien valorisé, locataire premium</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ═══ STRATÉGIE RECOMMANDÉE ═══ */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.12 }}
            className="mt-4 sm:mt-6"
          >
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 ring-1 ring-emerald-100 dark:ring-emerald-900">
                    <Scale className="size-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                      Stratégie recommandée
                    </p>
                    <p className="mt-0.5 text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100">
                      Quelle stratégie valorise le mieux votre bien ?
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] sm:text-xs font-bold ring-1 ring-emerald-200 dark:ring-emerald-900 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
                  <TrendingUp className="size-3.5" /> Rendement brut : {result.grossYield.toFixed(1)} %
                </span>
              </div>

              <p className="mt-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 px-4 py-3 text-[11px] sm:text-xs leading-relaxed text-gray-700 dark:text-gray-300 ring-1 ring-gray-100 dark:ring-gray-800">
                💡 {comparatifMessage}
              </p>
            </div>
          </motion.div>

          {/* ═══ LOCATION PAR NUITÉE (COURTE DURÉE) ═══ */}
          {nightly && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.16 }}
              className="mt-4 sm:mt-6"
            >
              <Card className="border-sky-100 dark:border-sky-900/50 shadow-sm rounded-2xl overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm sm:text-base text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-sky-50 dark:bg-sky-950/50">
                      <MoonStar className="size-4 text-sky-600 dark:text-sky-400" />
                    </div>
                    Location par nuitée · courte durée
                  </CardTitle>
                  <CardDescription className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
                    Potentiel locatif saisonnier estimé par le BIM Engine (Airbnb, locations vacances, séjours pro)
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-1">
                  {/* Profil de zone */}
                  {zoneProfile && (
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] sm:text-xs font-bold ring-1 ring-sky-200 dark:ring-sky-800/60 bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300">
                        <MapPin className="size-3.5" /> {zoneProfile.label}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] sm:text-[10px] font-semibold ring-1 ring-gray-200 dark:ring-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                        {zoneProfile.detected ? "détectée par l'IA" : "profil renseigné"}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] sm:text-[10px] font-semibold ring-1 ring-emerald-200 dark:ring-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
                        ×{zoneProfile.multiplier} vs mensuel /30 j
                      </span>
                      {zoneProfile.nearby.map((n) => (
                        <span key={n} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] sm:text-[10px] font-semibold ring-1 ring-indigo-200 dark:ring-indigo-800/60 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300">
                          <BedDouble className="size-3" /> {n}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
                    {[
                      { l: "Tarif / nuit", v: fmtRent(nightly.nightlyRent), c: "text-sky-600 dark:text-sky-400" },
                      { l: "Fourchette nuitée", v: `${fmtRent(nightly.nightlyMin)} – ${fmtRent(nightly.nightlyMax)}`, c: "text-gray-900 dark:text-gray-100" },
                      { l: "Taux d'occupation", v: `${nightly.occupancyRate} %`, c: "text-gray-900 dark:text-gray-100" },
                      { l: "Semaine (7 nuits)", v: fmtRent(nightly.weeklyEstimate), c: "text-gray-900 dark:text-gray-100" },
                      { l: "Mois courte durée", v: fmtRent(nightly.monthlyEstimate), c: "text-gray-900 dark:text-gray-100" },
                      { l: "Revenu annuel est.", v: fmtRent(nightly.annualRevenue), c: "text-emerald-600 dark:text-emerald-400" },
                    ].map((s) => (
                      <div key={s.l} className="rounded-lg bg-gray-50 dark:bg-gray-800/50 px-3 py-2.5">
                        <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-gray-400">{s.l}</p>
                        <p className={`mt-0.5 text-[11px] sm:text-xs font-bold truncate ${s.c}`}>{s.v}</p>
                      </div>
                    ))}
                  </div>

                  {/* ═══ HÔTE SAISONS — tarifs par période ═══ */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                        <CalendarDays className="size-3.5 text-sky-500" /> Hôte saisons — tarifs par période
                      </p>
                      <span className="text-[9px] text-gray-400">365 nuits / an</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {(nightly.seasons ?? []).map((s) => {
                        const meta =
                          s.key === "haute"
                            ? { ring: "ring-orange-200/70 dark:ring-orange-800/50", bg: "bg-orange-50 dark:bg-orange-950/30", text: "text-orange-600 dark:text-orange-400", dot: "bg-orange-500" }
                            : s.key === "moyenne"
                              ? { ring: "ring-emerald-200/70 dark:ring-emerald-800/50", bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" }
                              : { ring: "ring-sky-200/70 dark:ring-sky-800/50", bg: "bg-sky-50 dark:bg-sky-950/30", text: "text-sky-600 dark:text-sky-400", dot: "bg-sky-500" };
                        return (
                          <div key={s.key} className={`rounded-xl border border-transparent ${meta.bg} ring-1 ${meta.ring} p-3 ${s.isBest ? "ring-2" : ""}`}>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className={`size-2 shrink-0 rounded-full ${meta.dot}`} />
                                <span className="text-[11px] font-bold text-gray-900 dark:text-gray-100 truncate">{s.label}</span>
                              </div>
                              {s.isBest && (
                                <span className="shrink-0 rounded-full bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-700 px-1.5 py-0.5 text-[8px] font-bold text-amber-600 dark:text-amber-400">
                                  ★ Meilleure
                                </span>
                              )}
                            </div>
                            <p className="text-[9px] text-gray-400 dark:text-gray-500 mb-2 leading-tight">{s.months}</p>
                            <p className="text-sm font-black text-gray-900 dark:text-gray-100">
                              {fmtRent(s.pricePerNight)}<span className="text-[10px] font-semibold text-gray-400">/nuit</span>
                            </p>
                            <div className="mt-2 flex items-center justify-between gap-2 text-[10px]">
                              <span className="text-gray-500 dark:text-gray-400">Occ. {s.occupancyRate} %</span>
                              <span className={`font-bold ${meta.text}`}>{fmtRent(s.revenue)}</span>
                            </div>
                            <div className="mt-1.5 h-1.5 rounded-full bg-gray-200/70 dark:bg-gray-700/60 overflow-hidden">
                              <div className={`h-full rounded-full ${meta.dot} opacity-70`} style={{ width: `${s.revenueShare}%` }} />
                            </div>
                            <p className="mt-2 text-[9px] leading-relaxed text-gray-500 dark:text-gray-400">{s.tip}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-sky-950/30 dark:to-indigo-950/30 ring-1 ring-sky-100 dark:ring-sky-900/40 px-3.5 py-3">
                    <div className="flex items-center gap-2">
                      <Percent className="size-4 text-sky-600 dark:text-sky-400" />
                      <p className="text-[11px] sm:text-xs text-gray-700 dark:text-gray-300">
                        <span className="font-bold text-sky-700 dark:text-sky-300">Rendement courte durée : {nightly.nightlyYield.toFixed(1)} %/an</span>
                        <span className="text-gray-400"> · {zoneProfile ? `zone ${zoneProfile.label.toLowerCase()}` : "location saisonnière"} · occupation {nightly.occupancyRate} %</span>
                      </p>
                    </div>
                    <span className="text-[10px] sm:text-xs font-bold text-sky-700 dark:text-sky-300">
                      {nightly.nightlyYield >= 6 ? "🏆 Très rentable" : nightly.nightlyYield >= 4.5 ? "✅ Rentable" : "ℹ️ Complémentaire"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
          </TabsContent>

          {/* ═══ ÉVOLUTION ═══ */}
          <TabsContent value="evolution" className="space-y-0 mt-0">
            {/* Historique des loyers — suivi des re-estimations */}
            {(() => {
              const history = Array.isArray((property as any).history) ? (property as any).history : [];
              return history.length >= 1 && (
                <Card className="border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl overflow-hidden mb-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm sm:text-base text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/50">
                        <History className="size-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      {t("rent.result.history")}
                    </CardTitle>
                    <CardDescription className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
                      Évolution du loyer à chaque re-estimation (bouton ↻ en haut).
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-36 sm:h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsLineChart data={history.map((h: any) => ({
                          date: new Date(h.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }),
                          loyer: h.estimatedRent,
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                          <YAxis stroke="#94a3b8" fontSize={10} width={44} />
                          <Tooltip formatter={(value: number) => [fmtRent(value), "Loyer"]} contentStyle={{ borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "12px" }} />
                          <Line type="monotone" dataKey="loyer" stroke="#059669" strokeWidth={2.5} dot={{ fill: "#059669", r: 4 }} activeDot={{ r: 6 }} />
                        </RechartsLineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
          {/* ═══ PRÉVISIONS + MARCHÉ ═══ */}
          <div className="mt-4 sm:mt-6 grid gap-4 sm:gap-6 lg:grid-cols-5">
            {/* Forecast chart */}
            <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ duration: 0.4, delay: 0.05 }} className="lg:col-span-3">
              <Card className="border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm sm:text-base text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/50">
                      <TrendingUp className="size-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    Prévision de l'évolution des loyers
                  </CardTitle>
                  <CardDescription className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
                    Projection automatique basée sur les tendances du marché tunisien
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] sm:text-xs font-bold ring-1 ${trend.cls}`}>
                      <TrendIcon className="size-3.5" /> Tendance : {trend.label}
                    </span>
                    <span className="text-[10px] sm:text-xs text-gray-400">
                      +{result.forecastSummary.change6m.toFixed(1)} % · 6m &nbsp;·&nbsp; +{result.forecastSummary.change12m.toFixed(1)} % · 12m &nbsp;·&nbsp; +{result.forecastSummary.change24m.toFixed(1)} % · 24m
                    </span>
                  </div>
                  <div className="h-44 sm:h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={chartData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickMargin={6} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `${Math.round(v)}`} width={46} />
                        <Tooltip formatter={(value: number) => [fmtRent(value), "Loyer"]}
                          contentStyle={{ borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "12px" }} />
                        <ReferenceLine y={result.estimatedRent} stroke="#94a3b8" strokeDasharray="4 4" />
                        <Line type="monotone" dataKey="loyer" stroke="#059669" strokeWidth={2.5}
                          dot={{ fill: "#059669", r: 4 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="mt-3 text-[10px] sm:text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                    💡 {result.forecastSummary.message}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Market averages */}
            <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ duration: 0.4, delay: 0.1 }} className="lg:col-span-2">
              <Card className="border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm sm:text-base text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-teal-50 dark:bg-teal-950/50">
                      <Building2 className="size-4 text-teal-600 dark:text-teal-400" />
                    </div>
                    Prix moyens des loyers
                  </CardTitle>
                  <CardDescription className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
                    Loyer moyen au m²/mois pour ce type de bien
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: `Gouvernorat · ${p.gouvernorat || "—"}`, value: result.marketAverages.gouvernorat },
                    { label: `Ville · ${p.ville || "—"}`, value: result.marketAverages.ville },
                    { label: `Quartier · ${p.quartier || "—"}`, value: result.marketAverages.quartier },
                  ].map((m) => (
                    <div key={m.label} className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 px-3.5 py-3">
                      <div className="min-w-0">
                        <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">{m.label}</p>
                        <p className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100">{fmtM2(m.value)}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ${
                        m.value >= result.marketAverages.quartier
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200/70 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800/60"
                          : "bg-sky-50 text-sky-700 ring-sky-200/70 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-800/60"
                      }`}>
                        <span className={`size-1.5 rounded-full ${rentLevelInfo(result.marketAverages.level).dot}`} />
                        {rentLevelInfo(result.marketAverages.level).label}
                      </span>
                    </div>
                  ))}

                  {/* Legend */}
                  <Separator className="dark:bg-gray-800" />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Échelle du marché</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {Object.entries(RENT_LEVELS).map(([k, v]) => (
                        <div key={k} className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400">
                          <span className={`size-2 rounded-full ${v.dot}`} /> {v.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          </TabsContent>

          {/* ═══ ANALYSE ═══ */}
          <TabsContent value="analyse" className="space-y-0 mt-0">
          {/* ═══ FACTEURS ═══ */}
          <div className="mt-4 sm:mt-6 grid gap-4 sm:gap-6 md:grid-cols-3">
            <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ duration: 0.4, delay: 0.2 }}>
              <Card className="border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-500" /> Points forts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {result.positiveFactors.slice(0, 6).map((f, i) => (
                      <div key={i} className="flex items-start gap-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/25 p-2.5">
                        <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-[11px] sm:text-xs text-gray-700 dark:text-gray-300">{f}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ duration: 0.4, delay: 0.25 }}>
              <Card className="border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <AlertCircle className="size-4 text-amber-500" /> Points de vigilance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {result.negativeFactors.slice(0, 6).map((f, i) => (
                      <div key={i} className="flex items-start gap-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/25 p-2.5">
                        <AlertCircle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                        <span className="text-[11px] sm:text-xs text-gray-700 dark:text-gray-300">{f}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ duration: 0.4, delay: 0.3 }}>
              <Card className="border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Lightbulb className="size-4 text-violet-500" /> Pour maximiser le loyer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {result.improvementSuggestions.slice(0, 6).map((f, i) => (
                      <div key={i} className="flex items-start gap-2.5 rounded-lg bg-violet-50/60 dark:bg-violet-950/25 p-2.5">
                        <Lightbulb className="size-4 text-violet-500 shrink-0 mt-0.5" />
                        <span className="text-[11px] sm:text-xs text-gray-700 dark:text-gray-300">{f}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* ═══ CONSEILLER IA ═══ */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ duration: 0.4, delay: 0.35 }} className="mt-4 sm:mt-6">
            <Card className="border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500" />
              <CardHeader className="pb-3">
                <CardTitle className="text-sm sm:text-base text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 shadow-md shadow-emerald-200/40 dark:shadow-emerald-900/40">
                    <Brain className="size-4 text-white" />
                  </div>
                  Conseiller IA — votre expert locatif
                </CardTitle>
                <CardDescription className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
                  Réponses personnalisées basées sur votre bien et le marché tunisien
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {result.advisor.questions.map((qa, i) => (
                    <div key={i} className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 p-3.5 sm:p-4">
                      <p className="flex items-start gap-2 text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100">
                        <MessageCircle className="size-4 text-emerald-500 shrink-0 mt-0.5" /> {qa.q}
                      </p>
                      <p className="mt-1.5 pl-6 text-[11px] sm:text-xs leading-relaxed text-gray-600 dark:text-gray-300">{qa.a}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
          </TabsContent>

          {/* ═══ MARCHÉ ═══ */}
          <TabsContent value="marche" className="space-y-0 mt-0">
          {/* ═══ MARCHÉ / BEST ZONES ═══ */}
          <div className="mt-4 sm:mt-6 grid gap-4 sm:gap-6 md:grid-cols-2">
            <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ duration: 0.4, delay: 0.4 }}>
              <Card className="border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs sm:text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Sparkles className="size-4 text-amber-500" /> Zones locatives les plus demandées
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {highlights.hotZones.map((z) => (
                    <div key={z.quartier} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <MapPin className="size-3.5 text-amber-500 shrink-0" />
                        <span className="text-[11px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{z.quartier}</span>
                        <span className="text-[10px] text-gray-400">· {z.gouvernorat}</span>
                      </div>
                      <span className="text-[10px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">{z.rentM2} TND/m²</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ duration: 0.4, delay: 0.45 }}>
              <Card className="border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs sm:text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Percent className="size-4 text-emerald-500" /> Meilleurs rendements locatifs
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {highlights.bestYields.map((z) => (
                    <div key={z.quartier} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <TrendingUp className="size-3.5 text-emerald-500 shrink-0" />
                        <span className="text-[11px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{z.quartier}</span>
                        <span className="text-[10px] text-gray-400">· {z.gouvernorat}</span>
                      </div>
                      <span className="text-[10px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">{z.yield} % / an</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* ═══ COMPARABLES ═══ */}
          <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ duration: 0.4, delay: 0.15 }} className="mt-4 sm:mt-6">
            <Card className="border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm sm:text-base text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-sky-50 dark:bg-sky-950/50">
                    <Home className="size-4 text-sky-600 dark:text-sky-400" />
                  </div>
                  Biens locatifs similaires
                </CardTitle>
                <CardDescription className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
                  Comparaison avec les loyers de biens équivalents dans la zone
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.comparableRentals.map((c, i) => (
                    <div key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-gray-50 dark:bg-gray-800/50 px-3.5 py-3">
                      <div className="flex min-w-0 flex-1 items-center gap-2.5">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-gray-900 ring-1 ring-gray-100 dark:ring-gray-700">
                          <Home className="size-4 text-sky-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                            {c.type} · {c.surface} m² {c.furnished ? "· Meublé" : ""}
                          </p>
                          <p className="text-[10px] text-gray-400 truncate">{c.quartier} · {c.distance}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                        <div className="text-right">
                          <p className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400">{fmtRent(c.rent)}</p>
                          <p className="text-[10px] text-gray-400">{c.rentPerSqm.toLocaleString("fr-FR")} TND/m²</p>
                        </div>
                        {i === 0 && (
                          <Badge className="rounded-full border-0 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 text-[9px] font-semibold">
                            Référence
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
          </TabsContent>

          {/* ═══ AGENCES ═══ */}
          <TabsContent value="agences" className="space-y-3 mt-0">
            <Card className="border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <Building className="size-4 text-emerald-600 dark:text-emerald-400" /> Agences à {p?.gouvernorat || "votre région"}
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-500 dark:text-gray-400">
                      Envoyez votre estimation de loyer aux agences partenaires
                    </CardDescription>
                  </div>
                  <button
                    onClick={() => nav("/providers")}
                    className="shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-medium text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40 transition-colors"
                  >
                    Toutes les agences ↗
                  </button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {activeAgencies === undefined ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="size-5 text-gray-400 animate-spin" />
                  </div>
                ) : activeAgencies.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Building2 className="size-10 text-gray-300 dark:text-gray-600 mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">Aucune agence inscrite dans {p?.gouvernorat || "cette région"} pour le moment</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Consultez l'annuaire complet des agences partenaires
                    </p>
                    <button
                      onClick={() => nav("/providers")}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 dark:border-emerald-900/40 px-3.5 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                    >
                      Voir l'annuaire des agences
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {activeAgencies.map((agency: any) => (
                      <div key={agency._id} className="rounded-xl border border-gray-100 dark:border-gray-800 p-3 hover:shadow-sm hover:border-emerald-100 dark:hover:border-emerald-800 dark:hover:bg-gray-900/50 transition-all">
                        <div className="flex items-start justify-between mb-1.5">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {agency.logoUrl ? (
                              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-800 overflow-hidden">
                                <img src={agency.logoUrl} alt={agency.name} className="size-full object-cover" />
                              </div>
                            ) : (
                              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30">
                                <Building className="size-4 text-emerald-600 dark:text-emerald-400" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <a href={`/agency/${agency._id}`}
                                className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors block"
                              >
                                {agency.name}
                              </a>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                      Agence immobilière{agency.specialties?.length ? ` · ${agency.specialties.join(", ")}` : ""}
                    </p>
                            </div>
                          </div>
                          {agency.rating && (
                            <div className="flex items-center gap-0.5 shrink-0 ml-2">
                              <Star className="size-3 fill-amber-400 text-amber-400" />
                              <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">{agency.rating}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-1">
                          {agency.address} · {(agency.regions || []).join(", ")}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{agency.phone}</p>
                        <div className="flex gap-1.5">
                          <a
                            href={`tel:${agency.phone}`}
                            className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs h-8 inline-flex items-center justify-center gap-1 transition-all"
                          >
                            <Phone className="size-3" /> Appeler
                          </a>
                          <button
                            onClick={() => {
                              setAgencyDialog({ open: true, partnerId: agency._id, name: agency.name });
                              setAgencyMessage("");
                              setRentPriceScenario("realiste");
                              setSentRecap(null);
                            }}
                            className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs h-8 inline-flex items-center justify-center gap-1 transition-all"
                          >
                            <Send className="size-3" /> Envoyer
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Agency responses (counter-offers de loyer) */}
            {agencyResponses && agencyResponses.length > 0 && (
              <Card className="border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <MessageCircle className="size-4 text-emerald-500" /> Réponses des agences
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-500 dark:text-gray-400">
                    Les agences vous ont proposé un loyer
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {agencyResponses.map((res: any) => {
                      const diffPct = res.estimatedRent
                        ? Math.round(((res.suggestedPrice - res.estimatedRent) / res.estimatedRent) * 100)
                        : 0;
                      return (
                        <div key={res._id} className="rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 p-3">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              {res.agencyLogo ? (
                                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-gray-900 overflow-hidden">
                                  <img src={res.agencyLogo} alt={res.agencyName} className="size-full object-cover" />
                                </div>
                              ) : (
                                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                                  <Building className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                              )}
                              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{res.agencyName}</p>
                            </div>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold ${diffPct >= 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"}`}>
                              {diffPct >= 0 ? "+" : ""}{diffPct}% vs estimé
                            </span>
                          </div>
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{fmtRent(res.suggestedPrice)}</span>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">/ mois · suggéré le {new Date(res.suggestedAt || Date.now()).toLocaleDateString("fr-FR")}</span>
                          </div>
                          {res.agencyMessage && (
                            <p className="text-[11px] text-gray-600 dark:text-gray-300 bg-white/60 dark:bg-gray-900/60 rounded-lg px-2.5 py-1.5 leading-relaxed">
                              "{res.agencyMessage}"
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Info card */}
            <Card className="border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl">
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-100 dark:border-emerald-900/30 p-3.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Vous êtes une agence immobilière ?</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Abonnez-vous pour apparaître ici et recevoir des demandes de clients</p>
                  </div>
                  <Button
                    onClick={() => nav("/pricing")}
                    className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 shrink-0 h-8 text-xs px-4 shadow-sm"
                  >
                    <Sparkles className="mr-1.5 size-3.5" /> Voir l'offre
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Send to agency Dialog — avec aperçu du scénario envoyé */}
            <Dialog open={agencyDialog.open} onOpenChange={(open) => {
              setAgencyDialog(prev => ({ ...prev, open }));
              if (!open) setSentRecap(null);
            }}>
              <DialogContent className="rounded-2xl sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle className="text-sm flex items-center gap-2">
                    <Send className="size-4 text-emerald-500" />
                    Envoyer à {agencyDialog.name}
                  </DialogTitle>
                </DialogHeader>

                {sentRecap ? (
                  /* ═══ RÉCAP APRÈS ENVOI — aperçu du scénario envoyé ═══ */
                  <div className="space-y-3">
                    <div className="flex flex-col items-center text-center pt-2 pb-1">
                      <div className="flex size-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 mb-3">
                        <CheckCircle2 className="size-6 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Estimation envoyée</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        à <span className="font-semibold text-gray-700 dark:text-gray-300">{sentRecap.agencyName}</span> · ils vous contacteront sous peu
                      </p>
                    </div>
                    <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/30 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1.5">
                        Scénario envoyé
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="size-2 shrink-0 rounded-full bg-emerald-500" />
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{sentRecap.scenario}</span>
                        </div>
                        <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300 shrink-0">{fmtRent(sentRecap.price)}<span className="text-[10px] font-medium">/mois</span></span>
                      </div>
                      {nightly && (
                        <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-emerald-100 dark:border-emerald-900/40 pt-1.5">
                          <span className="text-[10px] text-gray-500 dark:text-gray-400">Aussi visible par l'agence</span>
                          <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400">{fmtRent(nightly.nightlyRent)}/nuit</span>
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={() => setAgencyDialog({ open: false, partnerId: "", name: "" })}
                      className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 h-9 text-xs font-semibold"
                    >
                      Fermer
                    </Button>
                  </div>
                ) : (
                <div className="space-y-3">
                  <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 p-3">
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-1">Vos coordonnées seront incluses</p>
                    <p className="text-[10px] text-emerald-500 dark:text-emerald-400">
                      L'agence recevra votre estimation de loyer avec votre nom, email et téléphone.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Message (optionnel)</label>
                    {/* Rent price scenario selector */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Scénario de loyer à partager
                      </label>
                      <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Scénario de loyer à partager">
                        {rentScenarios.map((s) => (
                          <button
                            key={s.label}
                            type="button"
                            role="radio"
                            aria-checked={rentPriceScenario === s.key}
                            onClick={() => setRentPriceScenario(s.key)}
                            className={`rounded-xl border p-2 text-center transition-all ${rentPriceScenario === s.key ? `${s.borderColor} ${s.bgColor} ring-2 ring-offset-1 ${s.ringColor || ""}` : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"}`}
                          >
                            <div className="flex items-center justify-center gap-1 mb-0.5">
                              <div className={`size-1.5 rounded-full ${s.color}`} />
                              <span className={`text-[9px] font-semibold ${s.textColor}`}>{s.label}</span>
                            </div>
                            <p className="text-[10px] font-bold text-gray-900 dark:text-gray-100 leading-tight">{fmtRent(s.price)}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* ═══ APERÇU — ce que l'agence recevra ═══ */}
                    {(() => {
                      const sc = rentScenarios.find((s) => s.key === rentPriceScenario) ?? rentScenarios[1];
                      return (
                        <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1">
                            <Eye className="size-3" /> Aperçu de ce que {agencyDialog.name} recevra
                          </p>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2 text-[11px]">
                              <span className="text-gray-500 dark:text-gray-400">Bien</span>
                              <span className="font-semibold text-gray-800 dark:text-gray-200 text-right truncate">
                                {typeLabel} · {p.builtSurface ? `${p.builtSurface} m²` : "surface —"} · {zone}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 text-[11px]">
                              <span className="text-gray-500 dark:text-gray-400">Scénario</span>
                              <span className="font-bold text-gray-900 dark:text-gray-100">
                                {sc.label} · {fmtRent(sc.price)}<span className="font-medium text-gray-400">/mois</span>
                              </span>
                            </div>
                            {nightly && (
                              <div className="flex items-center justify-between gap-2 text-[11px]">
                                <span className="text-gray-500 dark:text-gray-400">Nuitée (courte durée)</span>
                                <span className="font-bold text-sky-600 dark:text-sky-400">{fmtRent(nightly.nightlyRent)}/nuit</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between gap-2 text-[11px]">
                              <span className="text-gray-500 dark:text-gray-400">Coordonnées</span>
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Nom · Email · Téléphone inclus</span>
                            </div>
                            {agencyMessage.trim() && (
                              <div className="rounded-lg bg-white dark:bg-gray-900/70 px-2.5 py-1.5 text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed">
                                “{agencyMessage.trim()}”
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    <Textarea
                      value={agencyMessage}
                      onChange={(e) => setAgencyMessage(e.target.value)}
                      placeholder="Bonjour, je souhaite confier la gestion locative de mon bien à votre agence..."
                      className="rounded-xl text-xs resize-none min-h-[80px]"
                    />
                  </div>
                  <Button
                    onClick={async () => {
                      if (isDemo || !id) return;
                      setSendingAgency(true);
                      try {
                        await sendRentToAgency({
                          rentEstimationId: id as any,
                          agencyPartnerId: agencyDialog.partnerId as any,
                          message: agencyMessage || undefined,
                          rentPriceScenario: rentPriceScenario as any,
                        });
                        toast.success("Estimation envoyée !", {
                          description: `Votre estimation de loyer a été envoyée à ${agencyDialog.name}. Ils vous contacteront sous peu.`,
                        });
                        const sc = rentScenarios.find((s) => s.key === rentPriceScenario) ?? rentScenarios[1];
                        setSentRecap({ scenario: sc.label, price: sc.price, agencyName: agencyDialog.name });
                      } catch (e: any) {
                        toast.error("Erreur", { description: e?.data?.message || e?.message || "Impossible d'envoyer" });
                      }
                      setSendingAgency(false);
                    }}
                    disabled={sendingAgency || isDemo}
                    className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 h-9 text-xs font-semibold"
                  >
                    {isDemo ? (
                      <><Sparkles className="mr-1.5 size-3.5" /> Exemple — envoi désactivé</>
                    ) : sendingAgency ? (
                      <><Loader2 className="mr-1.5 size-3.5 animate-spin" /> Envoi en cours...</>
                    ) : (
                      <><Send className="mr-1.5 size-3.5" /> Envoyer l'estimation</>
                    )}
                  </Button>
                </div>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>
          </Tabs>
        </div>

        {/* ═══ ACTIONS ═══ */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => nav("/estimate")}
              className="rounded-xl h-10 px-4 text-xs text-slate-600 dark:text-slate-300">
              <ChevronRight className="size-3.5 mr-1 rotate-180" /> Modules
            </Button>
            <Button variant="outline" onClick={() => nav("/estimate/loyer/new")}
              className="rounded-xl h-10 px-4 text-xs text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/40">
              <Sparkles className="size-3.5 mr-1" /> Nouvelle estimation de loyer
            </Button>
          </div>
          {!isDemo && (
            <Button variant="ghost" size="sm" onClick={handleDelete}
              className="text-[11px] text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 h-8">
              Supprimer l'estimation
            </Button>
          )}
        </div>

        {exportProgress && (
          <p className="mt-3 text-center text-[11px] text-gray-400">{exportProgress}</p>
        )}
      </div>
    </div>
  );
}
