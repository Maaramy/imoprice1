import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Home, Building2, MapPin, Download, Share2, CheckCircle,
  AlertCircle, Lightbulb, TrendingUp, DollarSign, Target, Printer, Calendar,
  Star, Phone, Mail, FileText, Shield, Copy, Check, ExternalLink,
  MessageCircle, QrCode, X, Clock, Ruler, Layers, ChevronRight,
  FileDown, Loader2,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { PROPERTY_TYPES_LABELS, PROPERTY_STATES_LABELS } from "@/convex/types";
import { usePdfExport } from "@/hooks/use-pdf-export";
import { SignatureSeal } from "@/components/SignatureSeal";

function formatPrice(price: number): string {
  return new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency: "TND",
    maximumFractionDigits: 0,
  }).format(price);
}

const EQUIPMENT_LABELS: Record<string, { label: string; icon: string }> = {
  hasGarden: { label: "Jardin", icon: "🌿" },
  hasPool: { label: "Piscine", icon: "🏊" },
  hasTerrace: { label: "Terrasse", icon: "☀️" },
  hasBalcony: { label: "Balcon", icon: "🪴" },
  hasElevator: { label: "Ascenseur", icon: "🛗" },
  hasParking: { label: "Parking", icon: "🅿️" },
  hasAC: { label: "Clim", icon: "❄️" },
  hasHeating: { label: "Chauffage", icon: "🔥" },
  hasSolar: { label: "Solaire", icon: "☀️" },
};

function getEquipmentList(property: any): string[] {
  const list: string[] = [];
  for (const [key, val] of Object.entries(EQUIPMENT_LABELS)) {
    if ((property as any)[key]) list.push(val.icon + " " + val.label);
  }
  return list;
}

export default function ReportView() {
  const { token } = useParams();
  const navigate = useNavigate();
  const sharedReport = useQuery(api.reports.getSharedReport, { token: token || "" });
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const { generatePdf, isExporting, exportProgress } = usePdfExport({
    filename: `estimation-${token?.substring(0, 8) || "report"}.pdf`,
    scale: 2,
  });

  const reportUrl = typeof window !== "undefined"
    ? `${window.location.origin}/report/${token}`
    : "";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(reportUrl);
      setCopied(true);
      toast.success("Lien copié !", { description: "Le lien du rapport a été copié dans le presse-papier." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erreur", { description: "Impossible de copier le lien." });
    }
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `Estimation immobilière - Consultez ce rapport : ${reportUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handlePrint = () => {
    window.print();
    toast.success("Impression", { description: "Rapport prêt pour impression." });
  };

  const handleDownloadPdf = async () => {
    try {
      await generatePdf(reportRef);
      toast.success("PDF téléchargé !", { description: "Le rapport a été téléchargé au format PDF." });
    } catch {
      toast.error("Erreur", { description: "Impossible de générer le PDF. Réessayez." });
    }
  };

  if (!sharedReport) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md px-6"
        >
          <div className="flex size-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800 mx-auto mb-5">
            <FileText className="size-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h1 className="text-base font-bold text-gray-900 dark:text-gray-100">Rapport non trouvé</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Ce rapport n'existe pas ou a expiré. Contactez le propriétaire pour obtenir un nouveau lien.
          </p>
          <Button
            onClick={() => navigate("/")}
            variant="outline"
            className="mt-6 rounded-xl"
          >
            <ArrowLeft className="mr-2 size-4" />
            Retour à l'accueil
          </Button>
        </motion.div>
      </div>
    );
  }

  const { estimation, property, report } = sharedReport;

  const priceEvolution = [
    { year: "Auj.", price: estimation.estimatedValue },
    { year: "1 an", price: estimation.valueYear1 },
    { year: "3 ans", price: estimation.valueYear3 },
    { year: "5 ans", price: estimation.valueYear5 },
  ];

  const equipmentList = getEquipmentList(property);
  const creationDate = new Date(estimation._creationTime).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* ── Toolbar (screen only) ── */}
      <div className="print:hidden sticky top-0 z-30 border-b border-gray-100 dark:border-gray-800 bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 h-14">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Retour</span>
          </button>

          <div className="flex items-center gap-1.5">
            {/* Download PDF */}
            <button
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="flex size-9 items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-all disabled:opacity-50"
              aria-label="Télécharger PDF"
              title="Télécharger PDF"
            >
              {isExporting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileDown className="size-4" />
              )}
            </button>

            {/* Share dialog */}
            <Dialog>
              <DialogTrigger asChild>
                <button
                  className="flex size-9 items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-all"
                  aria-label="Partager"
                >
                  <Share2 className="size-4" />
                </button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle className="text-sm">Partager le rapport</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* QR Code */}
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
                        onClick={handleWhatsAppShare}
                      >
                        <MessageCircle className="size-4 mr-1.5 text-emerald-500" />
                        WhatsApp
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 rounded-xl text-xs"
                        onClick={handlePrint}
                      >
                        <Printer className="size-4 mr-1.5" />
                        Imprimer
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <button
              onClick={handlePrint}
              className="flex size-9 items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-all"
              aria-label="Imprimer"
            >
              <Printer className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Share notice banner (screen only) ── */}
      <div className="print:hidden mx-auto max-w-4xl px-4 pt-4">
        <div className="flex items-center gap-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 px-4 py-2.5 text-xs">
          <Shield className="size-4 text-blue-500 shrink-0" />
          <span className="text-blue-700 dark:text-blue-300">
            Rapport partagé · {creationDate}
          </span>
          <span className="text-blue-300 dark:text-blue-600 mx-1">·</span>
          <span className="text-blue-500 dark:text-blue-400 font-mono">
            ID: {report.token?.substring(0, 10)}...
          </span>
        </div>
      </div>

      {/* Export progress bar */}
      {isExporting && (
        <div className="mx-auto max-w-4xl px-4 pt-3 print:hidden">
          <div className="flex items-center gap-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 px-4 py-2.5">
            <Loader2 className="size-4 text-blue-500 animate-spin shrink-0" />
            <span className="text-xs text-blue-700 dark:text-blue-300">{exportProgress}</span>
            <div className="flex-1 h-1.5 rounded-full bg-blue-100 dark:bg-blue-900/50 overflow-hidden">
              <div className="h-full w-1/2 rounded-full bg-blue-500 animate-pulse" />
            </div>
          </div>
        </div>
      )}

      {/* ══════ REPORT CONTENT ══════ */}
      <div ref={reportRef} className="mx-auto max-w-4xl px-4 py-6 print:py-0">

        {/* Print-only header */}
        <div className="print-report-header">
          <div className="brand">
            <div className="brand-logo"><Home className="size-3 text-white" /></div>
            <span className="brand-name">baticost AI</span>
          </div>
          <div className="report-meta">
            <div>Rapport d'estimation immobilière</div>
            <div>{property.gouvernorat}{property.ville ? `, ${property.ville}` : ""}</div>
            <div>Généré le {creationDate}</div>
            {token && <div>ID: {token.substring(0, 12)}...</div>}
          </div>
        </div>

        {/* Watermark */}
        <div className="print-watermark">BATICOST AI · RAPPORT OFFICIEL</div>

        <div className="space-y-5 print:space-y-6">

          {/* ═══ COVER ═══ */}
          <Card className="border-0 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white shadow-xl rounded-2xl overflow-hidden print:shadow-none print:rounded-none print:from-white print:text-black">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 hidden print:block" />
            <CardContent className="p-7 md:p-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-white/20 print:bg-blue-600">
                    <Home className="size-5 text-white" />
                  </div>
                  <span className="text-base font-bold print:text-gray-900">baticost AI</span>
                </div>
                <Badge className="rounded-full bg-white/20 text-white border-0 text-[10px] print:bg-blue-100 print:text-blue-800">
                  Rapport d'estimation
                </Badge>
              </div>

              <div className="mt-6">
                <p className="text-xs text-blue-200 mb-2 print:text-gray-500">
                  Rapport généré le {creationDate}
                </p>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight print:text-2xl print:text-gray-900">
                  Estimation Immobilière
                </h1>
                <p className="mt-1.5 text-sm text-blue-200 print:text-gray-600">
                  <MapPin className="size-3.5 inline mr-1" />
                  {property.address}, {property.gouvernorat}
                </p>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm print:bg-gray-50 print:border print:border-gray-200">
                  <p className="text-[10px] text-blue-200 print:text-gray-500">Valeur estimée</p>
                  <p className="text-lg sm:text-xl font-bold mt-1 print:text-gray-900">
                    {formatPrice(estimation.estimatedValue)}
                  </p>
                </div>
                <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm print:bg-gray-50 print:border print:border-gray-200">
                  <p className="text-[10px] text-blue-200 print:text-gray-500">Indice de confiance</p>
                  <p className="text-lg sm:text-xl font-bold mt-1 print:text-gray-900">
                    {estimation.confidenceIndex}%
                  </p>
                </div>
                <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm print:bg-gray-50 print:border print:border-gray-200">
                  <p className="text-[10px] text-blue-200 print:text-gray-500">Prix au m²</p>
                  <p className="text-lg sm:text-xl font-bold mt-1 print:text-gray-900">
                    {formatPrice(estimation.avgPricePerSqm)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ═══ PROPERTY DESCRIPTION ═══ */}
          <Card className="border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl print:shadow-none print:rounded-none print:border print:border-gray-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Building2 className="size-4 text-blue-600" />
                Description du bien
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  {[
                    { label: "Type", value: PROPERTY_TYPES_LABELS[property.propertyType] || property.propertyType },
                    { label: "Surface", value: `${property.builtSurface} m²` },
                    { label: "Terrain", value: property.terrainSurface ? `${property.terrainSurface} m²` : "-" },
                    { label: "État", value: PROPERTY_STATES_LABELS[property.generalState], badge: true },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-800">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{item.label}</span>
                      {item.badge ? (
                        <Badge className="rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-0 text-[10px]">
                          {item.value}
                        </Badge>
                      ) : (
                        <span className="text-xs font-medium text-gray-900 dark:text-gray-100">{item.value}</span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {[
                    { label: "Gouvernorat", value: property.gouvernorat },
                    { label: "Ville", value: property.ville },
                    { label: "Quartier", value: property.quartier },
                    { label: "Année", value: property.yearBuilt || "-" },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-800">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{item.label}</span>
                      <span className="text-xs font-medium text-gray-900 dark:text-gray-100">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Equipment badges */}
              {equipmentList.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2.5">Équipements</p>
                  <div className="flex flex-wrap gap-1.5">
                    {equipmentList.map((eq, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="rounded-full text-[10px] border-0"
                      >
                        {eq}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ═══ PRICE BREAKDOWN ═══ */}
          <Card className="border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl print:shadow-none print:rounded-none print:border print:border-gray-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <DollarSign className="size-4 text-emerald-600" />
                Estimation détaillée
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                {[
                  { label: "Valeur estimée", value: formatPrice(estimation.estimatedValue), color: "bg-blue-600" },
                  { label: "Prix minimum", value: formatPrice(estimation.priceMin), color: "bg-amber-500" },
                  { label: "Prix maximum", value: formatPrice(estimation.priceMax), color: "bg-violet-500" },
                  { label: "Vente rapide", value: formatPrice(estimation.fastSalePrice), color: "bg-emerald-500" },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-gray-100 dark:border-gray-700 p-3 text-center bg-white dark:bg-gray-900">
                    <div className={`w-2 h-2 rounded-full ${item.color} mx-auto mb-1.5`} />
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">{item.label}</p>
                    <p className="text-xs font-bold text-gray-900 dark:text-gray-100">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-gray-500 dark:text-gray-400">Indice de confiance</span>
                  <span className={estimation.confidenceIndex >= 80 ? "text-emerald-600 font-semibold" : estimation.confidenceIndex >= 60 ? "text-amber-600 font-semibold" : "text-gray-500"}>
                    {estimation.confidenceIndex}%
                  </span>
                </div>
                <Progress
                  value={estimation.confidenceIndex}
                  className="h-2 bg-gray-100 dark:bg-gray-800 [&>div]:bg-gradient-to-r [&>div]:from-blue-500 [&>div]:to-emerald-500"
                />
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5">
                  Basé sur les caractéristiques du bien et les données du marché tunisien
                </p>
              </div>
            </CardContent>
          </Card>

          {/* ═══ PRICE EVOLUTION ═══ */}
          <Card className="border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl print:shadow-none print:rounded-none print:border print:border-gray-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <TrendingUp className="size-4 text-amber-600" />
                Évolution des prix
              </CardTitle>
              <CardDescription className="text-[10px]">
                Projection sur 5 ans basée sur les tendances du marché tunisien
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-60 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={priceEvolution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="year" stroke="#9ca3af" fontSize={11} />
                    <YAxis
                      stroke="#9ca3af"
                      fontSize={11}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatPrice(value), "Valeur"]}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid #e5e7eb",
                        fontSize: "12px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="price"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      dot={{ fill: "#2563eb", strokeWidth: 2, r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { label: "1 an", value: estimation.valueYear1, bg: "bg-blue-50 dark:bg-blue-950/40" },
                  { label: "3 ans", value: estimation.valueYear3, bg: "bg-amber-50 dark:bg-amber-950/40" },
                  { label: "5 ans", value: estimation.valueYear5, bg: "bg-violet-50 dark:bg-violet-950/40" },
                ].map((item) => (
                  <div key={item.label} className={`rounded-xl ${item.bg} p-3 text-center`}>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">{item.label}</p>
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 mt-0.5">
                      {formatPrice(item.value)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ═══ FACTORS ═══ */}
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: CheckCircle,
                title: "Points forts",
                items: estimation.positiveFactors,
                color: "text-emerald-500",
                bg: "bg-emerald-50 dark:bg-emerald-950/30",
              },
              {
                icon: AlertCircle,
                title: "À améliorer",
                items: estimation.negativeFactors,
                color: "text-amber-500",
                bg: "bg-amber-50 dark:bg-amber-950/30",
              },
              {
                icon: Lightbulb,
                title: "Recommandations",
                items: estimation.improvementSuggestions,
                color: "text-blue-500",
                bg: "bg-blue-50 dark:bg-blue-950/30",
              },
            ].map((section) => (
              <Card
                key={section.title}
                className="border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl print:shadow-none print:rounded-none print:border print:border-gray-300"
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                    <section.icon className={`size-4 ${section.color}`} />
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5">
                    {section.items.slice(0, 5).map((item: string, i: number) => (
                      <div key={i} className="flex items-start gap-1.5 rounded-lg p-1.5 text-xs text-gray-700 dark:text-gray-300">
                        <section.icon className={`size-3 ${section.color} shrink-0 mt-0.5`} />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ═══ COMPARABLES ═══ */}
          {estimation.comparableProperties?.length > 0 && (
            <Card className="border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl print:shadow-none print:rounded-none print:border print:border-gray-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Target className="size-4 text-blue-600" />
                  Biens comparables
                </CardTitle>
                <CardDescription className="text-[10px]">
                  Transactions similaires dans la région
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-700">
                        <th className="text-left py-2.5 text-gray-500 dark:text-gray-400 font-medium">Type</th>
                        <th className="text-left py-2.5 text-gray-500 dark:text-gray-400 font-medium">Surface</th>
                        <th className="text-left py-2.5 text-gray-500 dark:text-gray-400 font-medium">Localisation</th>
                        <th className="text-right py-2.5 text-gray-500 dark:text-gray-400 font-medium">Prix</th>
                        <th className="text-right py-2.5 text-gray-500 dark:text-gray-400 font-medium">Prix/m²</th>
                        <th className="text-right py-2.5 text-gray-500 dark:text-gray-400 font-medium">Dist.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estimation.comparableProperties.slice(0, 6).map((comp: any) => (
                        <tr key={comp.id} className="border-b border-gray-50 dark:border-gray-800">
                          <td className="py-2.5 font-medium text-gray-900 dark:text-gray-100">
                            {PROPERTY_TYPES_LABELS[comp.type] || comp.type}
                          </td>
                          <td className="py-2.5 text-gray-600 dark:text-gray-400">{comp.surface} m²</td>
                          <td className="py-2.5 text-gray-600 dark:text-gray-400">{comp.location}</td>
                          <td className="py-2.5 text-right font-medium text-gray-900 dark:text-gray-100">
                            {formatPrice(comp.price)}
                          </td>
                          <td className="py-2.5 text-right text-gray-600 dark:text-gray-400">
                            {formatPrice(comp.pricePerSqm)}
                          </td>
                          <td className="py-2.5 text-right text-gray-600 dark:text-gray-400">{comp.distance}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ═══ QR CODE & VERIFICATION ═══ */}
          <Card className="border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl print:shadow-none print:rounded-none print:border print:border-gray-300">
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-6">
                {/* QR Code */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 print:p-2 shrink-0">
                  <QRCodeSVG value={reportUrl} size={100} level="M" />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5 justify-center sm:justify-start">
                    <Shield className="size-4 text-blue-500" />
                    Rapport sécurisé
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Scannez le QR code pour consulter ce rapport en ligne ou partagez le lien ci-dessous.
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <code className="text-[10px] bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 truncate flex-1 hidden sm:block">
                      {reportUrl}
                    </code>
                    <div className="flex gap-1.5 print:hidden">
                      <button
                        onClick={handleCopyLink}
                        className="flex size-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        aria-label="Copier le lien"
                      >
                        {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5 text-gray-500" />}
                      </button>
                      <button
                        onClick={handleWhatsAppShare}
                        className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                        aria-label="Partager sur WhatsApp"
                      >
                        <MessageCircle className="size-3.5 text-emerald-600" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">
                    Token: {report.token?.substring(0, 16)}...
                  </p>
                </div>
              </div>

              {/* Signature électronique */}
              <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
                <SignatureSeal
                  token={token}
                  date={creationDate}
                  reportUrl={reportUrl}
                  verified={true}
                />
              </div>
            </CardContent>
          </Card>

          {/* ═══ FOOTER ═══ */}
          <div className="text-center pt-6 pb-8 print:pb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="flex size-6 items-center justify-center rounded-md bg-gradient-to-br from-blue-600 to-blue-700">
                <Home className="size-3 text-white" />
              </div>
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                Esti<span className="text-blue-600">Home</span>
              </span>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">
              Rapport généré automatiquement par baticost AI · {creationDate}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
              Ce rapport est fourni à titre indicatif et ne constitue pas une expertise professionnelle.
            </p>
            <div className="flex items-center justify-center gap-3 mt-3 text-[10px] text-gray-400 dark:text-gray-500">
              <span className="flex items-center gap-1">
                <Shield className="size-3" /> Sécurisé
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="size-3" /> Vérifié
              </span>
              <span className="flex items-center gap-1">
                <Clock className="size-3" /> {creationDate}
              </span>
            </div>
          </div>

        </div>

        {/* Print-only footer */}
        <div className="print-report-footer">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Home className="size-3 text-blue-600" />
            <span className="font-bold text-xs text-blue-600">baticost AI</span>
          </div>
          <div>Rapport d'estimation immobilière · Généré le {creationDate}</div>
          <div>Ce rapport est fourni à titre indicatif. © baticost AI</div>
        </div>
      </div>
    </div>
  );
}
