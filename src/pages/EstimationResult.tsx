import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, TrendingUp, Target, DollarSign,
  Building2, MapPin, CheckCircle, AlertCircle, Lightbulb,
  Share2, Star, Phone, FileText,
  RefreshCw, Loader2, ThumbsUp, Plus, ChevronRight,
  BarChart3, Printer, Sparkles, Brain, Home, History,
  CalendarDays, Ruler, Gauge, ShieldCheck, Copy, Check, MessageCircle,
  FileDown, Send, Building, Rocket, AlertTriangle, Scale, Bell,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";
import {
  LineChart as RechartsLineChart,
  BarChart as RechartsBarChart,
  Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { PROPERTY_TYPES_LABELS, PROPERTY_STATES_LABELS } from "@/convex/types";
import { canShowRentComparison, computeRentEstimation } from "@/lib/rent-estimation";
import { computeEnhancedEstimation } from "@/lib/enhanced-estimation";
import { formatPrice } from "./Dashboard";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import MapResizer from "@/components/MapResizer";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { SignatureSeal } from "@/components/SignatureSeal";
import { SegmentedToggle } from "@/components/SegmentedToggle";
import { usePdfExport } from "@/hooks/use-pdf-export";
import { daysUntilNextReset, quotaBarColor } from "@/lib/utils";

// Fix Leaflet marker icons
// @ts-ignore
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function MapCenter({ pos }: { pos: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(pos, 15);
  }, [pos, map]);
  return null;
}

const fadeUp = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } };
const stagger = { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { staggerChildren: 0.05 } };

// ── Exemple de démonstration : maison à Béja estimée par le BIM Engine ──
// Route /estimate/demo → la page résultat s'affiche directement, sans étapes de saisie.
const DEMO_HOUSE = {
  address: "Béja Nord",
  gouvernorat: "Béja",
  ville: "Béja Ville",
  quartier: "Béja Ville",
  propertyType: "maison",
  builtSurface: 110,
  terrainSurface: 140,
  bedrooms: 3,
  bathrooms: 1,
  livingRooms: 1,
  kitchens: 1,
  floors: 1,
  hasParking: true,
  hasTerrace: true,
  hasGarden: true,
  hasAC: true,
  yearBuilt: 2018,
  generalState: "bon_etat",
};
const DEMO_RESULT = computeEnhancedEstimation(DEMO_HOUSE);

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  return (
    <motion.div variants={fadeUp} className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm dark:shadow-gray-900/20">
      <div className="flex items-center gap-3">
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
          <Icon className="size-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{value}</p>
        </div>
      </div>
    </motion.div>
  );
}

function FactorCard({ icon: Icon, title, items, color }: { icon: any; title: string; items: string[]; color: string }) {
  if (!items?.length) return null;
  return (
    <Card className="border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Icon className={`size-4.5 ${color}`} aria-hidden="true" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.slice(0, 6).map((item, i) => (
            <div key={i} className="flex items-start gap-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 p-2.5">
              <Icon className={`size-4 ${color} shrink-0 mt-0.5`} />
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug">{item}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function EstimationResult() {
  const nav = useNavigate();
  const { id } = useParams();
  const isDemo = id === "demo";
  // Mode démo : pas de dossier Convex → on saute la requête (évite un appel avec un id invalide)
  const estimation = useQuery(api.estimation.getEstimation, (isDemo ? "skip" : { estimationId: id as any }) as any);
  const reEstimate = useMutation(api.estimation.reEstimateProperty);
  const shareToken = useMutation(api.reports.createShareToken);
  const [reesting, setReesting] = useState(false);
  const [tab, setTab] = useState("overview");

  // Profil sélectionné dans le formulaire (vendeur / acheteur) — personnalise uniquement
  // l'interprétation et les recommandations affichées, jamais le résultat de l'estimation.
  const [intent, setIntent] = useState<"vendre" | "acheter">(() => {
    try {
      return sessionStorage.getItem(`intent_${id}`) === "acheter" ? "acheter" : "vendre";
    } catch {
      return "vendre";
    }
  });
  const changeIntent = (v: "vendre" | "acheter") => {
    setIntent(v);
    try { sessionStorage.setItem(`intent_${id}`, v); } catch { /* ignore */ }
  };

  const enhanced = useMemo(() => {
    try { const s = sessionStorage.getItem(`enhanced_${id}`); return s ? JSON.parse(s) : null; } catch { return null; }
  }, [id]);

  // Hooks MUST be declared before any early return (React rule)
  const reportRef = useRef<HTMLDivElement>(null);
  const { generatePdf, isExporting, exportProgress } = usePdfExport({
    filename: `estimation-${id || "report"}.pdf`,
    scale: 2,
  });
  const [copied, setCopied] = useState(false);
  const [shareTokenStr, setShareTokenStr] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [agencyDialog, setAgencyDialog] = useState<{ open: boolean; partnerId: string; name: string }>({ open: false, partnerId: "", name: "" });
  const [agencyMessage, setAgencyMessage] = useState("");
  const [priceScenario, setPriceScenario] = useState("realiste");
  const [sendingAgency, setSendingAgency] = useState(false);
  const r = isDemo ? DEMO_RESULT : (estimation || null);
  const p = isDemo ? DEMO_HOUSE : ((estimation as any)?.property || null);

  // ── Suivi de la valeur (historique des re-estimations) ──
  const historyData = useQuery(api.estimation.getPropertyHistory, (!isDemo && p?._id) ? { propertyId: p?._id as any } : "skip");

  // ── Alerte prix du marché ──
  const createPriceAlert = useMutation(api.alerts.createPriceAlert);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertDir, setAlertDir] = useState<"above" | "below">("above");
  const [alertTarget, setAlertTarget] = useState<string>("");
  const [savingAlert, setSavingAlert] = useState(false);
  const { t } = useI18n();

  const sendToAgency = useMutation(api.agencies.sendEstimationToAgency);

  // Query active agencies for the property's gouvernorat
  const activeAgencies = useQuery(api.agencies.getActiveAgencies, {
    region: p?.gouvernorat || "",
  });
  // Agency counter-offers received for this estimation (skip en mode démo : pas de dossier)
  const agencyResponses = useQuery(api.agencies.getAgencyResponsesForEstimation, (isDemo ? "skip" : { estimationId: id as any }) as any);
  const comps = (r as any)?.comparableProperties || [];
  const evo = r ? [
    { year: "Auj.", price: r.estimatedValue },
    { year: "1 an", price: r.valueYear1 },
    { year: "3 ans", price: r.valueYear3 },
    { year: "5 ans", price: r.valueYear5 },
  ] : [];

  // ── Comparatif Location vs Vente — loyer potentiel du même bien via le BIM Engine ──
  const rentComparison = useMemo(() => {
    if (!canShowRentComparison(p)) return null;
    try {
      return computeRentEstimation({
        address: p.address || "",
        gouvernorat: p.gouvernorat || "",
        ville: p.ville || "",
        quartier: p.quartier || "",
        latitude: p.latitude,
        longitude: p.longitude,
        propertyType: p.propertyType,
        builtSurface: p.builtSurface,
        terrainSurface: p.terrainSurface,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        kitchens: p.kitchens,
        livingRooms: p.livingRooms,
        garages: p.garages,
        floors: p.floors,
        hasGarden: !!p.hasGarden,
        hasPool: !!p.hasPool,
        hasTerrace: !!p.hasTerrace,
        hasBalcony: !!p.hasBalcony,
        hasElevator: !!p.hasElevator,
        hasParking: !!p.hasParking,
        hasAC: !!p.hasAC,
        hasHeating: !!p.hasHeating,
        hasSolar: !!p.hasSolar,
        yearBuilt: p.yearBuilt,
        generalState: p.generalState || "bon_etat",
      });
    } catch {
      return null;
    }
  }, [p]);

  const fmtC = (p: number) => {
    if (p >= 1000000) return `${(p / 1000000).toFixed(1)}M TND`;
    if (p >= 1000) return `${(p / 1000).toFixed(0)}k TND`;
    return `${p} TND`;
  };

  // ── Skeleton loading ──
  if (!r) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
        <header className="sticky top-0 z-30 border-b border-gray-100 dark:border-gray-800 bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl h-14" />
        <div className="mx-auto max-w-6xl px-4 pt-5 space-y-4">
          {/* Hero skeleton */}
          <div className="rounded-2xl bg-gray-200 dark:bg-gray-800 h-36 sm:h-40 animate-pulse" />
          {/* Stats skeletons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="rounded-xl bg-gray-200 dark:bg-gray-800 h-20 animate-pulse" />)}
          </div>
          {/* Tabs skeleton */}
          <div className="rounded-xl bg-gray-200 dark:bg-gray-800 h-10 animate-pulse" />
          <div className="grid gap-4 sm:grid-cols-2">
            {[1,2].map(i => <div key={i} className="rounded-2xl bg-gray-200 dark:bg-gray-800 h-48 animate-pulse" />)}
          </div>
          <div className="rounded-2xl bg-gray-200 dark:bg-gray-800 h-24 animate-pulse" />
        </div>
      </div>
    );
  }

  const handleShare = async () => {
    if (isDemo) {
      toast.info("Exemple de démonstration", { description: "Le partage de rapport est disponible sur vos propres estimations." });
      return;
    }
    try {
      const token = await shareToken({ estimationId: id as any, propertyId: p?._id || "" });
      setShareTokenStr(token);
      setShareOpen(true);
    } catch { toast.error("Erreur", { description: "Impossible de créer le lien de partage." }); }
  };

  const handleCopyLink = async () => {
    if (!shareTokenStr) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/report/${shareTokenStr}`);
      setCopied(true);
      toast.success("Lien copié !");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erreur");
    }
  };

  const reportUrl = shareTokenStr ? `${window.location.origin}/report/${shareTokenStr}` : "";

  const handleReE = async () => {
    if (isDemo) return;
    setReesting(true);
    toast.promise(reEstimate({ propertyId: p?._id || "", estimationId: id as any }), {
      loading: "Mise à jour...",
      success: "Estimation mise à jour",
      error: "Erreur",
    });
    try { await reEstimate({ propertyId: p?._id || "", estimationId: id as any }); } catch {} finally { setReesting(false); }
  };

  const handleEdit = () => {
    if (p) {
      // Save property data to localStorage so NewEstimation picks it up
      const draft = {
        address: p.address || "",
        gouvernorat: p.gouvernorat || "",
        ville: p.ville || "",
        quartier: p.quartier || "",
        latitude: p.latitude ?? null,
        longitude: p.longitude ?? null,
        propertyType: p.propertyType || "",
        builtSurface: String(p.builtSurface || ""),
        terrainSurface: String(p.terrainSurface || ""),
        floors: String(p.floors || ""),
        bedrooms: String(p.bedrooms || ""),
        bathrooms: String(p.bathrooms || ""),
        kitchens: String(p.kitchens || ""),
        livingRooms: String(p.livingRooms || ""),
        garages: String(p.garages || ""),
        hasGarden: !!p.hasGarden,
        hasPool: !!p.hasPool,
        hasTerrace: !!p.hasTerrace,
        hasBalcony: !!p.hasBalcony,
        hasElevator: !!p.hasElevator,
        hasParking: !!p.hasParking,
        hasAC: !!p.hasAC,
        hasHeating: !!p.hasHeating,
        hasSolar: !!p.hasSolar,
        yearBuilt: String(p.yearBuilt || ""),
        generalState: p.generalState || "bon_etat",
      };
      localStorage.setItem("baticost_draft", JSON.stringify(draft));
      nav("/estimate/new");
    }
  };

  // Price scenarios
  const scenarios = r ? [
    {
      priceKey: "optimiste" as const,
      label: "Optimiste",
      price: r.maxProfitPrice,
      desc: "Mise en valeur + bonnes conditions marché",
      color: "bg-emerald-500",
      textColor: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
      borderColor: "border-emerald-200 dark:border-emerald-800/50",
      ringColor: "ring-emerald-200 dark:ring-emerald-800/50",
    },
    {
      priceKey: "realiste" as const,
      label: "Réaliste",
      price: r.estimatedValue,
      desc: "Estimation équilibrée du marché",
      color: "bg-blue-500",
      textColor: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      borderColor: "border-blue-200 dark:border-blue-800/50",
      ringColor: "ring-blue-200 dark:ring-blue-800/50",
    },
    {
      priceKey: "vente_rapide" as const,
      label: "Vente rapide",
      price: r.fastSalePrice,
      desc: "Prix attractif pour vendre rapidement",
      color: "bg-amber-500",
      textColor: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-900/20",
      borderColor: "border-amber-200 dark:border-amber-800/50",
      ringColor: "ring-amber-200 dark:ring-amber-800/50",
    },
  ] : [];

  // Sparkline helper: mini bar comparing comp price to estimated price
  const SparkBar = ({ value, maxValue }: { value: number; maxValue: number }) => {
    const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
    const isAbove = value >= maxValue;
    return (
      <div className="flex items-end gap-0.5 h-6">
        <div className="flex flex-col items-center justify-end h-full w-2">
          <div
            className={`w-full rounded-t-sm transition-all ${isAbove ? "bg-emerald-400" : "bg-blue-400"}`}
            style={{ height: `${Math.max(pct, 4)}%` }}
          />
        </div>
      </div>
    );
  };

  /* ── Interprétation & recommandations personnalisées selon le profil ── */
  const negotiationPct = (r as any).negotiationDiscount ?? 5;
  const fiveYearGrowth = r.estimatedValue > 0 ? Math.round(((r.valueYear5 - r.estimatedValue) / r.estimatedValue) * 100) : 0;
  const sellerSummary = `Votre bien est estimé à ${fmtC(r.estimatedValue)} (fourchette ${fmtC(r.priceMin)} – ${fmtC(r.priceMax)}) avec ${r.confidenceIndex}% de confiance. Ce montant correspond au scénario « réaliste » : un positionnement équilibré qui attire les acheteurs sérieux sans brader votre bien.`;
  const buyerSummary = `Ce bien est estimé à ${fmtC(r.estimatedValue)} (fourchette ${fmtC(r.priceMin)} – ${fmtC(r.priceMax)}) avec ${r.confidenceIndex}% de confiance. C'est votre référence d'achat : plus l'offre se rapproche du bas de fourchette, plus l'opportunité est intéressante.`;
  const sellerBullets = [
    `Positionnement du prix : affichez autour de ${fmtC(r.estimatedValue)} (fourchette ${fmtC(r.priceMin)} – ${fmtC(r.priceMax)}) pour rester dans la moyenne du marché (${formatPrice(r.avgPricePerSqm)}/m²).`,
    `Vente rapide : ${fmtC(r.fastSalePrice)} — un prix attractif qui raccourcit le délai de vente.`,
    `Max profit : ${fmtC(r.maxProfitPrice)} — visez ce niveau en mettant le bien en valeur et en acceptant un délai plus long.`,
    `Mise en valeur du bien : ${r.improvementSuggestions.slice(0, 3).join(" ; ") || "soignez l'état général, les finitions et les équipements visibles."}`,
    `Préparez vos documents (acte de propriété, plan cadastral, certificat) : ils inspirent confiance et fluidifient la vente.`,
    `Négociation : laissez ~${negotiationPct}% de marge sur le prix d'affichage — les acheteurs négocient presque toujours.`,
    `Argument de valeur : +${fiveYearGrowth}% de valorisation estimée sur 5 ans (${fmtC(r.valueYear5)}).`,
  ];
  const buyerBullets = [
    `Référence d'achat : ce bien vaut en moyenne ${fmtC(r.estimatedValue)} — comparez aux biens comparables listés ci-dessous avant toute offre.`,
    `Positionnement : ${formatPrice(r.avgPricePerSqm)}/m² — le prix/m² du marché local pour ce type de bien.`,
    `Négociation : le marché tunisien laisse typiquement ~${negotiationPct}% de marge — une offre autour de ${fmtC(r.priceMin)} est un point d'entrée réaliste.`,
    `Points de vigilance avant l'achat : ${r.negativeFactors.slice(0, 3).join(" ; ") || "vérifiez l'état général, la situation juridique et les charges du bien."}`,
    `Frais annexes à prévoir : droits d'enregistrement, notaire et vérification du titre de propriété (acte, plan cadastral).`,
    `Potentiel : +${fiveYearGrowth}% de valorisation estimée sur 5 ans (${fmtC(r.valueYear5)}) — un argument pour un achat à moyen terme.`,
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-gray-100 dark:border-gray-800 bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 h-14">            <button onClick={() => nav("/dashboard")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors">
            <ArrowLeft className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Retour</span>
          </button>              <button onClick={handleEdit} className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors ml-auto mr-2" title="Modifier l'estimation" aria-label="Modifier l'estimation">
            <FileText className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline text-xs">Modifier</span>
          </button>
          <div className="flex items-center gap-1.5">

            <Dialog open={shareOpen} onOpenChange={setShareOpen}>
              <DialogTrigger asChild>
                <button onClick={handleShare} className="flex size-9 items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-all" aria-label="Partager le rapport">
                  <Share2 className="size-4" aria-hidden="true" />
                </button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle className="text-sm">Partager ce rapport</DialogTitle>
                </DialogHeader>
                {shareTokenStr && (
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                        <QRCodeSVG value={reportUrl} size={140} level="M" />
                      </div>
                    </div>
                    <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                      Scannez pour consulter ce rapport
                    </p>
                    <Separator />
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Input
                          value={reportUrl}
                          readOnly
                          className="text-xs rounded-xl"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="rounded-xl shrink-0"
                          onClick={handleCopyLink}
                        >
                          {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 rounded-xl text-xs"
                          onClick={() => {
                            const text = encodeURIComponent(`Estimation immobilière - Consultez ce rapport : ${reportUrl}`);
                            window.open(`https://wa.me/?text=${text}`, "_blank");
                          }}
                        >
                          <MessageCircle className="size-4 mr-1.5 text-emerald-500" />
                          WhatsApp
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 rounded-xl text-xs"
                          onClick={() => { window.print(); toast.success("Impression prête"); }}
                        >
                          <Printer className="size-4 mr-1.5" />
                          Imprimer
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
            <button
              onClick={async () => {
                try {
                  await generatePdf(reportRef);
                  toast.success("PDF téléchargé !");
                } catch {
                  toast.error("Erreur PDF");
                }
              }}
              disabled={isExporting}
              className="flex size-9 items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-all disabled:opacity-50"
              aria-label="Télécharger PDF"
              title="Télécharger PDF"
            >
              {isExporting ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
            </button>
            {!isDemo && (
              <button onClick={handleReE} disabled={reesting} className="flex size-9 items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-all" aria-label={reesting ? "Mise à jour en cours" : "Actualiser l'estimation"}>
                <RefreshCw className={`size-4 ${reesting ? "animate-spin" : ""}`} aria-hidden="true" />
              </button>
            )}
            <button onClick={() => { window.print(); toast.success("Impression", { description: "Rapport prêt pour impression." }); }}
              className="flex size-9 items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-all" aria-label="Imprimer le rapport">
              <Printer className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="px-4 pb-2.5">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-gray-500 dark:text-gray-400">Indice de confiance</span>
            <span className={r.confidenceIndex >= 80 ? "text-emerald-600 font-semibold" : r.confidenceIndex >= 60 ? "text-amber-600 font-semibold" : "text-gray-500 font-semibold"}>
              {r.confidenceIndex}%
            </span>
          </div>
          <Progress value={r.confidenceIndex} className="h-1.5 bg-gray-100 dark:bg-gray-800 [&>div]:bg-gradient-to-r [&>div]:from-blue-500 [&>div]:to-emerald-500" />
        </div>
      </header>

      {/* Exemple de démonstration — accès direct à la page résultat */}
      {isDemo && (
        <div className="mx-auto max-w-6xl px-4 pt-3 print:hidden">
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex items-center gap-2.5 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-gradient-to-r from-blue-50 to-sky-50 dark:from-blue-950/40 dark:to-sky-950/30 px-3.5 py-2.5 sm:px-4 shadow-sm">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                <Sparkles className="size-4" />
              </div>
              <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-300 leading-snug">
                <strong>Exemple de démonstration</strong> — maison de 110 m² à Béja estimée par le BIM Engine.
                Créez votre propre estimation pour un résultat personnalisé.
              </p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Print header */}
      <div className="print-report-header">
        <div className="brand">
          <div className="brand-logo"><Home className="size-3 text-white" /></div>
          <span className="brand-name">baticost AI</span>
        </div>
        <div className="report-meta">
          <div>Rapport d'estimation immobilière</div>
          <div>{p?.gouvernorat}{p?.ville ? `, ${p.ville}` : ""}</div>
          <div>Généré le {new Date().toLocaleDateString("fr-FR")}</div>
        </div>
      </div>

      {/* Export progress bar */}
      {isExporting && (
        <div className="mx-auto max-w-6xl px-4 pt-3 print:hidden">
          <div className="flex items-center gap-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 px-4 py-2.5">
            <Loader2 className="size-4 text-blue-500 animate-spin shrink-0" />
            <span className="text-xs text-blue-700 dark:text-blue-300">{exportProgress}</span>
            <div className="flex-1 h-1.5 rounded-full bg-blue-100 dark:bg-blue-900/50 overflow-hidden">
              <div className="h-full w-1/2 rounded-full bg-blue-500 animate-pulse" />
            </div>
          </div>
        </div>
      )}

      <div ref={reportRef} className="mx-auto max-w-6xl px-4 pt-5">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="mb-4 border-0 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white shadow-xl rounded-2xl overflow-hidden">
            <CardContent className="p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="rounded-full bg-white/15 text-white border-0 text-[10px] px-2 py-0.5 backdrop-blur-sm font-medium">
                      <Gauge className="size-3 inline mr-1" />
                      {r.confidenceIndex >= 80 ? "Haute confiance" : r.confidenceIndex >= 60 ? "Confiance moyenne" : "Indicatif"}
                    </Badge>
                    {enhanced?.imageInsights?.hasImageAnalysis && (
                      <Badge className="rounded-full bg-violet-400/25 text-white border-0 text-[10px] px-2 py-0.5 backdrop-blur-sm">
                        <Sparkles className="size-2.5 inline mr-1" />IA
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-blue-200/80 mb-0.5">Valeur estimée</p>
                  <p className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">{formatPrice(r.estimatedValue)}</p>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-blue-200/70">
                    <span>Min <strong className="text-white">{formatPrice(r.priceMin)}</strong></span>
                    <span className="opacity-30">•</span>
                    <span>Max <strong className="text-white">{formatPrice(r.priceMax)}</strong></span>
                  </div>
                </div>
                <div className="flex sm:flex-col gap-2 shrink-0">
                  <div className="rounded-xl bg-white/10 px-4 py-2.5 backdrop-blur-sm flex sm:flex-col items-center sm:items-start gap-2 sm:gap-0.5">
                    <span className="text-[10px] text-blue-200/70">Vente rapide</span>
                    <span className="text-sm font-bold">{fmtC(r.fastSalePrice)}</span>
                  </div>
                  <div className="rounded-xl bg-white/10 px-4 py-2.5 backdrop-blur-sm flex sm:flex-col items-center sm:items-start gap-2 sm:gap-0.5">
                    <span className="text-[10px] text-blue-200/70">Max profit</span>
                    <span className="text-sm font-bold">{fmtC(r.maxProfitPrice)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Interprétation personnalisée selon le profil (vendeur / acheteur) */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="mb-4 border-blue-100 dark:border-blue-900/60 rounded-2xl overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-blue-500 via-sky-500 to-blue-600" />
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/50 ring-1 ring-blue-100 dark:ring-blue-900">
                      <Target className="size-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Interprétation personnalisée</p>
                      <p className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100 truncate">
                        {intent === "vendre" ? "Conseils pour vendre votre bien" : "Conseils pour acheter ce bien"}
                      </p>
                    </div>
                  </div>
                  <p className="text-[11px] sm:text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                    💡 {intent === "vendre" ? sellerSummary : buyerSummary}
                  </p>
                </div>
                <div className="shrink-0 w-full lg:w-[340px]">
                  <SegmentedToggle
                    options={[
                      { value: "vendre", label: "Vendre", emoji: "🏠" },
                      { value: "acheter", label: "Acheter", emoji: "🔎" },
                    ]}
                    value={intent}
                    onChange={(v) => changeIntent(v as "vendre" | "acheter")}
                    accent="blue"
                    size="md"
                    ariaLabel="Changer le profil d'interprétation"
                  />
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {(intent === "vendre" ? sellerBullets : buyerBullets).map((b, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 p-2.5">
                    <CheckCircle className={`size-4 shrink-0 mt-0.5 ${intent === "vendre" ? "text-blue-500" : "text-emerald-500"}`} />
                    <p className="text-[11px] sm:text-xs leading-relaxed text-gray-700 dark:text-gray-300">{b}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats */}
        <motion.div variants={stagger} initial="initial" animate="animate" className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
          <StatCard label="Prix / m²" value={formatPrice(r.avgPricePerSqm)} icon={BarChart3} color="bg-blue-500" />
          <StatCard label="Gouvernorat" value={p?.gouvernorat || "N/A"} icon={MapPin} color="bg-violet-500" />
          <StatCard label="Type" value={PROPERTY_TYPES_LABELS[p?.propertyType] || p?.propertyType || "N/A"} icon={Building2} color="bg-emerald-500" />
          <StatCard label="Surface" value={`${p?.builtSurface || 0} m²`} icon={Ruler} color="bg-amber-500" />
        </motion.div>

        {/* AI Insights */}
        {enhanced?.imageInsights?.hasImageAnalysis && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="mb-4 border-violet-100 dark:border-violet-900 bg-gradient-to-r from-violet-50 to-blue-50 dark:from-violet-950 dark:to-blue-950 shadow-sm rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="size-4 text-violet-600 dark:text-violet-400" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Analyse IA des photos</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 rounded-lg bg-white/50 dark:bg-gray-900/50">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{enhanced.imageInsights.analyzedImages ?? "—"}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">Photos</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-white/50 dark:bg-gray-900/50">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{Math.round((enhanced.imageInsights.aiQualityScore ?? 0) * 100)}%</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">Qualité</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-white/50 dark:bg-gray-900/50">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{(enhanced.imageInsights.detectedFeatures ?? []).length}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">Caractéristiques</p>
                  </div>
                </div>
                {(enhanced.imageInsights.detectedFeatures ?? []).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(enhanced.imageInsights.detectedFeatures ?? []).map((f: string, i: number) => (
                      <Badge key={i} className="rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border-0 text-[10px]">{f}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <div className="sticky top-[101px] z-20 -mx-4 px-4 bg-gray-50/90 dark:bg-gray-950/90 backdrop-blur-sm pb-1 overflow-x-auto scrollbar-none">
            <TabsList className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-1 w-full grid grid-cols-4 gap-0.5 sm:inline-flex sm:w-auto sm:gap-0.5">
              {[
                { v: "overview", l: "Aperçu", i: ShieldCheck },
                { v: "evolution", l: "Évolution", i: TrendingUp },
                { v: "factors", l: "Analyse", i: Lightbulb },
                { v: "professionals", l: "Agences", i: Building },
              ].map((t) => (
                <TabsTrigger key={t.v} value={t.v}
                  className="rounded-lg data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/30 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-300 text-[11px] sm:text-xs lg:text-sm px-1 sm:px-3 py-1.5 whitespace-nowrap min-w-0 flex items-center justify-center">
                  {t.l}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-3 mt-0">
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Property Details */}
              <Card className="border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Home className="size-4 text-blue-500" /> Détails du bien
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
                    {[
                      { l: "Type", v: PROPERTY_TYPES_LABELS[p?.propertyType] || p?.propertyType },
                      { l: "Surface", v: `${p?.builtSurface} m²` },
                      { l: "Terrain", v: p?.terrainSurface ? `${p?.terrainSurface} m²` : "—" },
                      { l: "État", v: PROPERTY_STATES_LABELS[p?.generalState],
                        badge: true, c: p?.generalState === "luxe" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" :
                               p?.generalState === "excellent_etat" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" :
                               p?.generalState === "a_renover" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
                      { l: "Année", v: p?.yearBuilt || "—" },
                      { l: "Adresse", v: p?.address, trunc: true },
                      ...(p ? [
                        { l: "Pièces", v: [p.bedrooms ? `${p.bedrooms} ch` : "", p.bathrooms ? `${p.bathrooms} sdb` : "", p.kitchens ? `${p.kitchens} cuis` : ""].filter(Boolean).join(" · ") || "—" },
                      ] : []),
                    ].map((row, i) => (
                      <div key={i} className="flex items-center justify-between py-2 text-sm">
                        <span className="text-gray-500 dark:text-gray-400">{row.l}</span>
                        {(row as any).badge ? (
                          <Badge className={`rounded-full ${(row as any).c} border-0 text-xs`}>{row.v}</Badge>
                        ) : (
                          <span className={`font-medium text-gray-900 dark:text-gray-100 text-right ${row.trunc ? "max-w-[160px] truncate sm:max-w-[220px]" : ""}`}>{row.v}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Comparables */}
              <Card className="border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <BarChart3 className="size-4 text-blue-500" /> Biens comparables
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-500 dark:text-gray-400">Transactions récentes</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  {comps.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Aucun comparable</p>
                  ) : (
                    <div className="space-y-1.5">
                      {comps.slice(0, 5).map((comp: any) => {
                        const maxCompPrice = Math.max(...comps.map((c: any) => c.pricePerSqm));
                        return (
                          <div key={comp.id} className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800/40 p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800/70 transition-colors">
                            <div className="flex items-center gap-2.5 min-w-0">
                              {/* Sparkline mini bar */}
                              <div className="flex items-end gap-px h-6 w-3 shrink-0">
                                <div
                                  className={`w-full rounded-sm transition-all ${comp.pricePerSqm >= r.avgPricePerSqm ? "bg-emerald-400/70" : "bg-blue-400/70"}`}
                                  style={{ height: `${Math.max((comp.pricePerSqm / maxCompPrice) * 100, 4)}%` }}
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatPrice(comp.price)}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{comp.surface} m² · {comp.distance}</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0 ml-2">
                              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{formatPrice(comp.pricePerSqm)}/m²</p>
                              <p className="text-[10px] text-gray-400 dark:text-gray-500">{comp.location}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Graphique comparatif des prix par quartier */}
            {comps.length > 0 && r?.avgPricePerSqm && (
              <Card className="border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <BarChart3 className="size-4 text-blue-500" /> Comparatif des prix / m²
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-500 dark:text-gray-400">
                    Votre bien vs le marché local ({p?.gouvernorat || "Tunisie"})
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="h-52 sm:h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart
                        data={(() => {
                          // Regrouper les comparables par quartier (moyenne)
                          const quartierMap: Record<string, { total: number; count: number }> = {};
                          comps.forEach((c: any) => {
                            const q = c.location?.split(",")?.pop()?.trim() || c.location || "Autres";
                            if (!quartierMap[q]) quartierMap[q] = { total: 0, count: 0 };
                            quartierMap[q].total += c.pricePerSqm || 0;
                            quartierMap[q].count += 1;
                          });
                          
                          const chartData = Object.entries(quartierMap).map(([name, data]) => ({
                            name: name.length > 12 ? name.substring(0, 12) + "…" : name,
                            "Marché local": Math.round(data.total / data.count),
                          }));

                          // Ajouter le bien estimé en premier
                          const propertyLabel = p?.quartier 
                            ? (p.quartier.length > 12 ? p.quartier.substring(0, 12) + "…" : p.quartier)
                            : p?.ville 
                              ? (p.ville.length > 12 ? p.ville.substring(0, 12) + "…" : p.ville)
                              : "Votre bien";

                          return [
                            { name: propertyLabel + " ✦", "Votre bien": r.avgPricePerSqm, fill: "#2563eb" },
                            ...chartData.map(d => ({ ...d, "Votre bien": null, fill: "#94a3b8" })),
                          ];
                        })()}
                        margin={{ top: 8, right: 8, left: -8, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                        <XAxis 
                          dataKey="name" 
                          stroke="#94a3b8" 
                          fontSize={9} 
                          tickMargin={4}
                          angle={-20}
                          textAnchor="end"
                          height={40}
                        />
                        <YAxis 
                          stroke="#94a3b8" 
                          fontSize={10} 
                          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                          width={28}
                        />
                        <Tooltip 
                          formatter={(value: number, name: string) => [formatPrice(value), name === "Votre bien" ? "Votre bien" : "Marché"]}
                          contentStyle={{ borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "11px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
                        />
                        <Bar 
                          dataKey="Votre bien" 
                          fill="#2563eb" 
                          radius={[4, 4, 0, 0]}
                          maxBarSize={24}
                          label={false}
                        />
                        <Bar 
                          dataKey="Marché local" 
                          fill="#94a3b8" 
                          radius={[4, 4, 0, 0]}
                          maxBarSize={24}
                          opacity={0.7}
                        />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-1 flex items-center justify-center gap-4 text-[10px] text-gray-400 dark:text-gray-500">
                    <span className="flex items-center gap-1">
                      <span className="size-2.5 rounded-sm bg-blue-500" /> Votre bien
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="size-2.5 rounded-sm bg-slate-400 opacity-70" /> Marché local
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Features summary */}
            {p && (p.hasGarden || p.hasPool || p.hasTerrace || p.hasBalcony || p.hasElevator || p.hasParking || p.hasAC || p.hasHeating || p.hasSolar) && (
              <Card className="border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Home className="size-4 text-blue-500" /> Équipements
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { k: p.hasGarden, l: "Jardin", c: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300" },
                      { k: p.hasPool, l: "Piscine", c: "bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300" },
                      { k: p.hasTerrace, l: "Terrasse", c: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300" },
                      { k: p.hasBalcony, l: "Balcon", c: "bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300" },
                      { k: p.hasElevator, l: "Ascenseur", c: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300" },
                      { k: p.hasParking, l: "Parking", c: "bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300" },
                      { k: p.hasAC, l: "Clim", c: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300" },
                      { k: p.hasHeating, l: "Chauffage", c: "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300" },
                      { k: p.hasSolar, l: "Solaire", c: "bg-lime-50 text-lime-600 dark:bg-lime-900/30 dark:text-lime-300" },
                    ].filter(f => f.k).map((feat, i) => (
                      <Badge key={i} className={`rounded-full ${feat.c} border-0 text-[10px] px-2.5 py-1 font-medium`}>{feat.l}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Map */}
            {p?.latitude && p?.longitude && (
              <Card className="border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <MapPin className="size-4 text-blue-500" /> Localisation
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <MapContainer center={[p.latitude, p.longitude]} zoom={15} scrollWheelZoom={typeof window !== 'undefined' && 'ontouchstart' in window ? false : true} dragging={typeof window !== 'undefined' && 'ontouchstart' in window ? false : true} zoomControl={false} className="w-full h-48 sm:h-56">
                    <MapResizer />
                    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapCenter pos={[p.latitude, p.longitude]} />
                    <Marker position={[p.latitude, p.longitude]} />
                  </MapContainer>
                  <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-800 text-center">
                    <a href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 underline-offset-2 hover:underline inline-flex items-center gap-1">
                      <MapPin className="size-3" /> Voir sur Google Maps
                    </a>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Scénarios de prix */}
            <Card className="border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Target className="size-4 text-blue-500" /> Scénarios de prix
                </CardTitle>
                <CardDescription className="text-xs text-gray-500 dark:text-gray-400">3 stratégies de mise en vente</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-3 gap-2">
                  {scenarios.map((s) => (
                    <div key={s.label} className={`rounded-xl ${s.bgColor} ${s.borderColor} border p-3 text-center`}>
                      <div className={`flex items-center justify-center gap-1 mb-1`}>
                        <div className={`size-2 rounded-full ${s.color}`} />
                        <span className={`text-[10px] font-semibold ${s.textColor}`}>{s.label}</span>
                      </div>
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{fmtC(s.price)}</p>
                      <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5 leading-tight">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Intervalle */}
            <Card className="border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <BarChart3 className="size-4 text-blue-500" /> Intervalle de prix
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="relative pt-2 pb-4">
                  <div className="h-2 rounded-full bg-gradient-to-r from-red-300 via-amber-200 via-emerald-200 via-blue-200 to-violet-300 dark:from-red-700 dark:via-amber-600 dark:via-emerald-600 dark:via-blue-600 dark:to-violet-600">
                    <div className="absolute -top-0.5 h-3 w-1 bg-gray-900 dark:bg-white rounded-full shadow-sm"
                      style={{ left: `${((r.estimatedValue - r.priceMin) / (r.priceMax - r.priceMin)) * 100}%` }} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <div><p className="text-gray-400 dark:text-gray-500">Min</p><p className="font-semibold text-gray-900 dark:text-gray-100">{fmtC(r.priceMin)}</p></div>
                    <div className="text-center"><p className="text-gray-400 dark:text-gray-500">Estimé</p><p className="font-bold text-blue-700 dark:text-blue-400">{fmtC(r.estimatedValue)}</p></div>
                    <div className="text-right"><p className="text-gray-400 dark:text-gray-500">Max</p><p className="font-semibold text-gray-900 dark:text-gray-100">{fmtC(r.priceMax)}</p></div>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Alerte prix du marché */}
            <Card className="border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Bell className="size-4 text-amber-500" /> {t("estimate.result.alert.create")}
                </CardTitle>
                <CardDescription className="text-xs text-gray-500 dark:text-gray-400">
                  {p?.gouvernorat || "Tunisie"} · {PROPERTY_TYPES_LABELS[p?.propertyType] || "Bien"} · {formatPrice(r.avgPricePerSqm)}/m² actuellement
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={alertDir}
                    onChange={(e) => setAlertDir(e.target.value as "above" | "below")}
                    className="h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-xs flex-1"
                  >
                    <option value="above">↑ {t("dashboard.alerts.direction.above")}</option>
                    <option value="below">↓ {t("dashboard.alerts.direction.below")}</option>
                  </select>
                  <input
                    type="number"
                    min={0}
                    value={alertTarget}
                    onChange={(e) => setAlertTarget(e.target.value)}
                    placeholder={`Seuil TND/m² (actuel : ${r.avgPricePerSqm})`}
                    className="h-10 flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-xs"
                  />
                  <Button
                    disabled={savingAlert || !alertTarget || Number(alertTarget) <= 0}
                    onClick={async () => {
                      setSavingAlert(true);
                      try {
                        await createPriceAlert({
                          gouvernorat: p?.gouvernorat || "Tunis",
                          propertyType: p?.propertyType || "appartement",
                          direction: alertDir,
                          targetPrice: Number(alertTarget),
                        });
                        toast.success(t("estimate.result.alert.created"), { description: `Vous serez notifié par message et email.` });
                        setAlertTarget("");
                      } catch (e: any) {
                        toast.error("Erreur", { description: e?.data?.message || "Impossible de créer l'alerte" });
                      }
                      setSavingAlert(false);
                    }}
                    className="h-10 shrink-0 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 text-xs font-semibold"
                  >
                    {savingAlert ? <Loader2 className="size-3.5 animate-spin mr-1" /> : <Bell className="size-3.5 mr-1" />}
                    {t("estimate.result.alert.create")}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Stratégie recommandée — Location vs Vente */}
            {rentComparison && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
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
                      <TrendingUp className="size-3.5" /> Rendement locatif brut : {((rentComparison.annualRent / r.estimatedValue) * 100).toFixed(1)} %
                    </span>
                  </div>

                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <p className="flex-1 rounded-xl bg-gray-50 dark:bg-gray-800/60 px-4 py-3 text-[11px] sm:text-xs leading-relaxed text-gray-700 dark:text-gray-300 ring-1 ring-gray-100 dark:ring-gray-800">
                      💡 {(() => {
                        const y = (rentComparison.annualRent / r.estimatedValue) * 100;
                        const years = r.estimatedValue / rentComparison.annualRent;
                        if (y >= 6) return `Avec un rendement locatif brut de ${y.toFixed(1)} %, ce bien amortit son prix d'achat en ~${Math.round(years)} ans de loyers. Louer plutôt que vendre est la stratégie la plus rentable.`;
                        if (y >= 4.5) return `Avec un rendement locatif brut de ${y.toFixed(1)} %, ce bien amortit son prix d'achat en ~${Math.round(years)} ans. La location offre un bon équilibre entre revenu régulier et valorisation du capital.`;
                        return `Le rendement locatif brut de ${y.toFixed(1)} % est modéré (~${Math.round(years)} ans pour amortir le prix d'achat). La vente peut être plus avantageuse si vous visez une liquidité immédiate.`;
                      })()}
                    </p>
                    <button onClick={() => nav("/estimate/loyer/new")}
                      className="shrink-0 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-[11px] sm:text-xs font-bold text-white transition-colors inline-flex items-center justify-center gap-1.5">
                      <Sparkles className="size-3.5" /> Estimation loyer détaillée
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </TabsContent>

          {/* Evolution */}
          <TabsContent value="evolution" className="space-y-3 mt-0">
            {/* Historique de la valeur — suivi des re-estimations */}
            <Card className="border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <History className="size-4 text-blue-500" /> {t("estimate.result.history")}
                </CardTitle>
                <CardDescription className="text-xs text-gray-500 dark:text-gray-400">
                  Chaque re-estimation (bouton ↻) ajoute un point — ré-estimez pour suivre la valeur du bien.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {!isDemo && (!historyData || (historyData.history || []).length < 2) ? (
                  <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-4 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Pas encore d'historique. Cliquez sur l'icône ↻ (Actualiser) en haut pour re-estimer ce bien
                      avec les dernières données du marché — la valeur sera suivie ici au fil du temps.
                    </p>
                  </div>
                ) : (
                  <div className="h-44 sm:h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={(historyData?.history || []).map((h: any) => ({
                        date: new Date(h.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }),
                        valeur: h.value,
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" stroke="#9ca3af" fontSize={10} />
                        <YAxis stroke="#9ca3af" fontSize={10} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} width={36} />
                        <Tooltip formatter={(value: number) => [formatPrice(value), "Valeur"]} contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "12px" }} />
                        <Line type="monotone" dataKey="valeur" stroke="#2563eb" strokeWidth={2.5} dot={{ fill: "#2563eb", r: 4 }} activeDot={{ r: 6 }} />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <TrendingUp className="size-4 text-blue-500" /> Projection sur 5 ans
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-500 dark:text-gray-400">Tendances du marché tunisien</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="h-56 sm:h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={evo}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="year" stroke="#9ca3af" fontSize={11} />
                        <YAxis stroke="#9ca3af" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(value: number) => [formatPrice(value), "Valeur"]} contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "12px" }} />
                        <Line type="monotone" dataKey="price" stroke="#2563eb" strokeWidth={2.5} dot={{ fill: "#2563eb", strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <CalendarDays className="size-4 text-blue-500" /> Projections détaillées
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {[
                      { l: "Aujourd'hui", v: r.estimatedValue, c: "bg-blue-600" },
                      { l: "Dans 1 an", v: r.valueYear1, c: "bg-emerald-500" },
                      { l: "Dans 3 ans", v: r.valueYear3, c: "bg-amber-500" },
                      { l: "Dans 5 ans", v: r.valueYear5, c: "bg-violet-500" },
                    ].map((item) => (
                      <div key={item.l} className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800/50 p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800/70 transition-colors">
                        <div className="flex items-center gap-2.5">
                          <div className={`size-2.5 rounded-full ${item.c}`} />
                          <span className="text-sm text-gray-600 dark:text-gray-400">{item.l}</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatPrice(item.v)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 p-3 border border-emerald-100 dark:border-emerald-900/30">
                    <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <TrendingUp className="size-3.5" /> Tendance positive
                    </p>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">Croissance estimée de 4-6% par an dans les zones urbaines.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Factors */}
          <TabsContent value="factors" className="space-y-3 mt-0">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2 lg:col-span-1">
                <FactorCard icon={ThumbsUp} title="Points forts" items={r.positiveFactors.slice(0, 6)} color="text-emerald-500" />
              </div>
              <div className="space-y-3">
                <FactorCard icon={AlertCircle} title="Points à améliorer" items={r.negativeFactors.slice(0, 5)} color="text-amber-500" />
                <FactorCard icon={Lightbulb} title="Recommandations" items={r.improvementSuggestions.slice(0, 5)} color="text-blue-500" />
              </div>
            </div>
          </TabsContent>

          {/* Agences */}
          <TabsContent value="professionals" className="space-y-3 mt-0">
            <Card className="border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <Building className="size-4 text-amber-500" /> Agences à {p?.gouvernorat || "votre région"}
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-500 dark:text-gray-400">
                      Envoyez votre estimation aux agences partenaires
                    </CardDescription>
                  </div>
                  <button
                    onClick={() => nav("/providers")}
                    className="shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-medium text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40 transition-colors"
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
                      className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-amber-200 dark:border-amber-900/40 px-3.5 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                    >
                      Voir l'annuaire des agences
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {activeAgencies.map((agency: any) => (
                      <div key={agency._id} className="rounded-xl border border-gray-100 dark:border-gray-800 p-3 hover:shadow-sm hover:border-blue-100 dark:hover:border-blue-800 dark:hover:bg-gray-900/50 transition-all">
                        <div className="flex items-start justify-between mb-1.5">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {agency.logoUrl ? (
                              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-800 overflow-hidden">
                                <img src={agency.logoUrl} alt={agency.name} className="size-full object-cover" />
                              </div>
                            ) : (
                              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30">
                                <Building className="size-4 text-amber-600 dark:text-amber-400" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <a href={`/agency/${agency._id}`}
                                className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate hover:text-amber-600 dark:hover:text-amber-400 transition-colors block"
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
                              setPriceScenario("realiste");
                              setPriceScenario("realiste");
                            }}
                            className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs h-8 inline-flex items-center justify-center gap-1 transition-all"
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

            {/* Agency responses (counter-offers) */}
            {agencyResponses && agencyResponses.length > 0 && (
              <Card className="border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <MessageCircle className="size-4 text-emerald-500" /> Réponses des agences
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-500 dark:text-gray-400">
                    Les agences vous ont proposé un prix
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {agencyResponses.map((res: any) => {
                      const diffPct = res.estimatedValue
                        ? Math.round(((res.suggestedPrice - res.estimatedValue) / res.estimatedValue) * 100)
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
                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatPrice(res.suggestedPrice)}</span>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">suggéré le {new Date(res.suggestedAt || Date.now()).toLocaleDateString("fr-FR")}</span>
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
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-100 dark:border-amber-900/30 p-3.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Vous êtes une agence immobilière ?</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Créez votre profil d'agence pour apparaître ici et recevoir des demandes de clients</p>
                  </div>
                  <Button
                    onClick={() => nav("/agencies")}
                    className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shrink-0 h-8 text-xs px-4 shadow-sm"
                  >
                    <Sparkles className="mr-1.5 size-3.5" /> Espace agence
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Send to agency Dialog */}
            <Dialog open={agencyDialog.open} onOpenChange={(open) => setAgencyDialog(prev => ({ ...prev, open }))}>
              <DialogContent className="rounded-2xl sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle className="text-sm flex items-center gap-2">
                    <Send className="size-4 text-amber-500" />
                    Envoyer à {agencyDialog.name}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 p-3">
                    <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                      {intent === "vendre" ? "🏠 Profil vendeur détecté" : "🔎 Profil acheteur détecté"}
                    </p>
                    <p className="text-[10px] text-blue-500 dark:text-blue-400">
                      {intent === "vendre"
                        ? "L'agence saura que vous souhaitez vendre ce bien : elle pourra vous proposer la commercialisation, un accompagnement et la mise en relation avec des acheteurs."
                        : "L'agence saura que vous recherchez un bien : elle pourra vous proposer des biens disponibles et un accompagnement pour l'achat."}
                    </p>
                    <p className="text-[9px] text-blue-400 dark:text-blue-500 mt-1">
                      Vos coordonnées (nom, email, téléphone) seront incluses.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Message (optionnel)</label>
                    {/* Price scenario selector */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Scénario de prix à partager
                      </label>
                      <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Scénario de prix à partager">
                        {scenarios.map((s) => (
                          <button
                            key={s.label}
                            type="button"
                            role="radio"
                            aria-checked={priceScenario === s.priceKey}
                            onClick={() => setPriceScenario(s.priceKey)}
                            className={`rounded-xl border p-2 text-center transition-all ${priceScenario === s.priceKey ? `${s.borderColor} ${s.bgColor} ring-2 ring-offset-1 ${s.ringColor || ""}` : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"}`}
                          >
                            <div className="flex items-center justify-center gap-1 mb-0.5">
                              <div className={`size-1.5 rounded-full ${s.color}`} />
                              <span className={`text-[9px] font-semibold ${s.textColor}`}>{s.label}</span>
                            </div>
                            <p className="text-[10px] font-bold text-gray-900 dark:text-gray-100 leading-tight">{fmtC(s.price)}</p>
                          </button>
                        ))}
                      </div>
                      <p className="text-[9px] text-gray-400 dark:text-gray-500 leading-tight">
                        L'agence verra le prix de ce scénario dans votre demande.
                      </p>
                    </div>

                    <Textarea
                      value={agencyMessage}
                      onChange={(e) => setAgencyMessage(e.target.value)}
                      placeholder={intent === "vendre"
                        ? "Bonjour, je souhaite confier la vente de mon bien à votre agence..."
                        : "Bonjour, je recherche un bien immobilier correspondant à ce profil..."}
                      className="rounded-xl text-xs resize-none min-h-[80px]"
                    />
                  </div>
                  <Button
                    onClick={async () => {
                      if (!id || !p?._id || isDemo) return;
                      setSendingAgency(true);
                      try {
                        await sendToAgency({
                          estimationId: id as any,
                          propertyId: p._id,
                          agencyPartnerId: agencyDialog.partnerId as any,
                          message: agencyMessage || undefined,
                          priceScenario: priceScenario as any,
                          clientNeed: intent === "vendre" ? "vendeur" : "acheteur",
                        });
                        toast.success("Estimation envoyée !", {
                          description: `Votre estimation a été envoyée à ${agencyDialog.name}. Ils vous contacteront sous peu.`,
                        });
                        setAgencyDialog({ open: false, partnerId: "", name: "" });
                      } catch (e: any) {
                        toast.error("Erreur", { description: e?.data?.message || e?.message || "Impossible d'envoyer" });
                      }
                      setSendingAgency(false);
                    }}
                    disabled={sendingAgency || isDemo}
                    className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 h-9 text-xs font-semibold disabled:opacity-60"
                  >
                    {sendingAgency ? (
                      <><Loader2 className="mr-1.5 size-3.5 animate-spin" /> Envoi en cours...</>
                    ) : isDemo ? (
                      <><Send className="mr-1.5 size-3.5" /> Exemple — envoi désactivé</>
                    ) : (
                      <><Send className="mr-1.5 size-3.5" /> Envoyer l'estimation</>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </div>

      {/* Print footer */}
      <div className="print-report-footer">
        <div>Rapport généré automatiquement par baticost AI — Estimation immobilière IA</div>
        <div>Ce rapport est fourni à titre indicatif et ne constitue pas une expertise professionnelle.</div>
      </div>
    </div>
  );
}
