import { useState, useRef, useCallback, lazy, Suspense, useMemo } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import NumericStepper from "@/components/NumericStepper";
const LocationPicker = lazy(() => import("@/components/LocationPicker"));
import LocationSheet from "@/components/LocationSheet";
import type { LocationResult } from "@/components/LocationPicker";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Home, Building2, MapPin, Ruler, Loader2,
  ChevronRight, Check, BedDouble, Bath, CookingPot, Armchair, Car,
  Sparkles, KeyRound, Brain, CheckCircle2, CalendarDays, Layers,
  FileText, AlertTriangle, Rocket, LandPlot, Wallet, TrendingUp, Store,
  MoonStar,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import {
  GOVERNORATS, VILLES_BY_GOUVERNORAT, QUARTIERS_BY_VILLE,
  RENT_FINISH_LABELS, RENT_ZONE_TYPES, RENT_ZONE_LABELS,
  type RentPropertyInput,
} from "@/convex/types";
import { cn } from "@/lib/utils";
import { SegmentedToggle } from "@/components/SegmentedToggle";
import { computeRentEstimation, detectRentZoneType, getRentBasePrice } from "@/lib/rent-estimation";

/* ─────────── DATA ─────────── */

const RENT_TYPES = [
  { v: "maison", l: "Maison", ic: Home },
  { v: "villa", l: "Villa", ic: Building2 },
  { v: "appartement", l: "Appartement", ic: Building2 },
  { v: "studio", l: "Studio", ic: Building2 },
  { v: "duplex", l: "Duplex", ic: Building2 },
  { v: "local_commercial", l: "Local commercial", ic: Store },
  { v: "bureau", l: "Bureau", ic: Building2 },
] as const;

const RENT_STATES = [
  { v: "a_renover", l: "À rénover", c: "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300" },
  { v: "bon_etat", l: "Bon état", c: "border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300" },
  { v: "excellent_etat", l: "Excellent", c: "border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300" },
  { v: "luxe", l: "Luxe", c: "border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300" },
];

const EQUIPMENTS: { k: keyof RDF; l: string; e: string }[] = [
  { k: "isFurnished", l: "Meublé", e: "🛋️" },
  { k: "hasEquippedKitchen", l: "Cuisine équipée", e: "🍳" },
  { k: "hasFiber", l: "Fibre optique", e: "📡" },
  { k: "hasInternet", l: "Internet", e: "🌐" },
  { k: "hasCameras", l: "Caméras", e: "📹" },
  { k: "hasSmartHome", l: "Domotique", e: "🏠" },
  { k: "hasSolar", l: "Panneaux solaires", e: "☀️" },
  { k: "hasAC", l: "Climatisation", e: "❄️" },
  { k: "hasHeating", l: "Chauffage", e: "🔥" },
  { k: "hasElevator", l: "Ascenseur", e: "🛗" },
  { k: "hasParking", l: "Parking", e: "🚗" },
  { k: "hasGarden", l: "Jardin", e: "🌿" },
  { k: "hasPool", l: "Piscine", e: "🏊" },
  { k: "hasTerrace", l: "Terrasse", e: "🏔️" },
  { k: "hasBalcony", l: "Balcon", e: "🏠" },
];

const RESIDENTIAL = ["maison", "villa", "appartement", "studio", "duplex"];

/* ─────────── FORM STATE ─────────── */

type RDF = {
  address: string; gouvernorat: string; ville: string; quartier: string;
  latitude: number | null; longitude: number | null;
  propertyType: string; builtSurface: string; terrainSurface: string;
  floors: string; floor: string;
  bedrooms: string; bathrooms: string; kitchens: string; livingRooms: string; garages: string;
  isFurnished: boolean; hasEquippedKitchen: boolean; hasFiber: boolean; hasInternet: boolean;
  hasCameras: boolean; hasSmartHome: boolean; hasSolar: boolean;
  hasGarden: boolean; hasPool: boolean; hasTerrace: boolean; hasBalcony: boolean;
  hasElevator: boolean; hasParking: boolean; hasAC: boolean; hasHeating: boolean;
  yearBuilt: string; generalState: string; finishLevel: string;
  /** Mensuel (longue durée) ou Nuitée (courte durée) */
  estimationMode: "mensuel" | "nuitée";
  zoneType: string;
  nearBeach: boolean; nearClinic: boolean; nearHospital: boolean;
  nearUniversity: boolean; nearMall: boolean; nearTransport: boolean;
};

const INIT: RDF = {
  address: "", gouvernorat: "", ville: "", quartier: "",
  latitude: null, longitude: null,
  propertyType: "", builtSurface: "", terrainSurface: "", floors: "", floor: "",
  bedrooms: "", bathrooms: "", kitchens: "", livingRooms: "", garages: "",
  isFurnished: false, hasEquippedKitchen: false, hasFiber: false, hasInternet: false,
  hasCameras: false, hasSmartHome: false, hasSolar: false,
  hasGarden: false, hasPool: false, hasTerrace: false, hasBalcony: false,
  hasElevator: false, hasParking: false, hasAC: false, hasHeating: false,
  yearBuilt: "", generalState: "bon_etat", finishLevel: "standard",
  estimationMode: "mensuel", zoneType: "",
  nearBeach: false, nearClinic: false, nearHospital: false,
  nearUniversity: false, nearMall: false, nearTransport: false,
};

/** Proximités proposées en mode « Nuitée » */
const NEARBY_OPTIONS: { k: keyof RDF; l: string; e: string }[] = [
  { k: "nearBeach", l: "Plage", e: "🏖️" },
  { k: "nearClinic", l: "Clinique", e: "🏥" },
  { k: "nearHospital", l: "Hôpital", e: "🚑" },
  { k: "nearUniversity", l: "Université", e: "🎓" },
  { k: "nearMall", l: "Centre commercial", e: "🛍️" },
  { k: "nearTransport", l: "Transport public", e: "🚌" },
];

const STEPS = [
  { title: "Localisation", sub: "Où se trouve votre bien ?", icon: MapPin },
  { title: "Type & Surface", sub: "Décrivez le bien à louer", icon: Ruler },
  { title: "Pièces & Équipements", sub: "Confort et prestations", icon: Sparkles },
  { title: "Finition & État", sub: "Année, état et standing", icon: Layers },
];

const stepAnim = {
  initial: { opacity: 0, y: 16, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -12, scale: 0.98 },
};

/* ─────────── COMPONENT ─────────── */

export default function NewRentEstimation() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [need, setNeed] = useState<"louer_bien" | "louer">("louer_bien");
  const [f, setF] = useState<RDF>(INIT);
  const createRent = useMutation(api.rent.createRentEstimation);

  const [govSheetOpen, setGovSheetOpen] = useState(false);
  const [villeSheetOpen, setVilleSheetOpen] = useState(false);
  const [quartierSheetOpen, setQuartierSheetOpen] = useState(false);
  const [progressPct, setProgressPct] = useState(0);

  const villes = f.gouvernorat ? VILLES_BY_GOUVERNORAT[f.gouvernorat] || [] : [];
  const quartiers = f.ville ? QUARTIERS_BY_VILLE[f.ville] || [] : [];

  const villeCountByGov = useMemo(() => {
    const m: Record<string, string> = {};
    Object.entries(VILLES_BY_GOUVERNORAT).forEach(([g, vs]) => { m[g] = `${vs.length} villes`; });
    return m;
  }, []);
  const quartierCountByVille = useMemo(() => {
    const m: Record<string, string> = {};
    Object.entries(QUARTIERS_BY_VILLE).forEach(([v, qs]) => { m[v] = `${qs.length} quartiers`; });
    return m;
  }, []);

  const matchLoc = useCallback((loc: LocationResult) => {
    const up: Partial<RDF> = {};
    const stateName = loc.state?.trim() || "";
    const cityName = loc.city?.trim() || "";
    if (stateName) {
      const g = GOVERNORATS.find(
        (x) => x.toLowerCase() === stateName.toLowerCase()
          || stateName.toLowerCase().includes(x.toLowerCase())
          || x.toLowerCase().includes(stateName.toLowerCase()),
      );
      if (g) {
        up.gouvernorat = g;
        if (cityName) {
          const vs = VILLES_BY_GOUVERNORAT[g] || [];
          const v = vs.find((x) => x.toLowerCase() === cityName.toLowerCase()
            || cityName.toLowerCase().includes(x.toLowerCase())
            || x.toLowerCase().includes(cityName.toLowerCase()));
          if (v) up.ville = v;
        }
      }
    } else if (cityName) {
      for (const g of GOVERNORATS) {
        const vs = VILLES_BY_GOUVERNORAT[g] || [];
        const v = vs.find((x) => x.toLowerCase() === cityName.toLowerCase()
          || cityName.toLowerCase().includes(x.toLowerCase())
          || x.toLowerCase().includes(cityName.toLowerCase()));
        if (v) { up.gouvernorat = g; up.ville = v; break; }
      }
    }
    if (Object.keys(up).length > 0) setF((p) => ({ ...p, ...up }));
  }, []);

  const handleLoc = useCallback((loc: LocationResult) => {
    setF((p) => ({ ...p, latitude: loc.lat, longitude: loc.lng, address: loc.formattedAddress }));
    matchLoc(loc);
  }, [matchLoc]);

  const upd = (field: keyof RDF, value: string | boolean) => {
    setF((p) => {
      const n = { ...p, [field]: value };
      if (field === "gouvernorat") { n.ville = ""; n.quartier = ""; }
      else if (field === "ville") n.quartier = "";
      return n;
    });
  };

  const valid = () => {
    switch (step) {
      case 0: return !!f.gouvernorat && !!f.ville;
      case 1: return !!f.propertyType && !!f.builtSurface;
      case 2: return true;
      case 3: return !!f.generalState && !!f.finishLevel;
      default: return true;
    }
  };

  const submit = async () => {
    setLoading(true);
    setProgressPct(0);

    try {
      const animatePct = (target: number, duration = 500) =>
        new Promise<void>((r) => {
          const start = progressPct;
          const diff = target - start;
          const startTime = Date.now();
          const tick = () => {
            const elapsed = Date.now() - startTime;
            const p = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            setProgressPct(start + diff * eased);
            if (p < 1) requestAnimationFrame(tick); else r();
          };
          requestAnimationFrame(tick);
        });

      const property: RentPropertyInput = {
        address: f.address || undefined,
        gouvernorat: f.gouvernorat,
        ville: f.ville,
        quartier: f.quartier,
        latitude: f.latitude ?? undefined,
        longitude: f.longitude ?? undefined,
        propertyType: f.propertyType,
        builtSurface: parseFloat(f.builtSurface),
        terrainSurface: f.terrainSurface ? parseFloat(f.terrainSurface) : undefined,
        floors: f.floors ? parseInt(f.floors) : undefined,
        floor: f.floor ? parseInt(f.floor) : undefined,
        bedrooms: f.bedrooms ? parseInt(f.bedrooms) : undefined,
        bathrooms: f.bathrooms ? parseInt(f.bathrooms) : undefined,
        kitchens: f.kitchens ? parseInt(f.kitchens) : undefined,
        livingRooms: f.livingRooms ? parseInt(f.livingRooms) : undefined,
        garages: f.garages ? parseInt(f.garages) : undefined,
        isFurnished: f.isFurnished,
        hasEquippedKitchen: f.hasEquippedKitchen,
        hasFiber: f.hasFiber,
        hasInternet: f.hasInternet,
        hasCameras: f.hasCameras,
        hasSmartHome: f.hasSmartHome,
        hasSolar: f.hasSolar,
        hasGarden: f.hasGarden,
        hasPool: f.hasPool,
        hasTerrace: f.hasTerrace,
        hasBalcony: f.hasBalcony,
        hasElevator: f.hasElevator,
        hasParking: f.hasParking,
        hasAC: f.hasAC,
        hasHeating: f.hasHeating,
        yearBuilt: f.yearBuilt ? parseInt(f.yearBuilt) : undefined,
        generalState: f.generalState,
        finishLevel: f.finishLevel as RentPropertyInput["finishLevel"],
        estimationMode: f.estimationMode,
        zoneType: (f.zoneType || undefined) as RentPropertyInput["zoneType"],
        nearBeach: f.nearBeach,
        nearClinic: f.nearClinic,
        nearHospital: f.nearHospital,
        nearUniversity: f.nearUniversity,
        nearMall: f.nearMall,
        nearTransport: f.nearTransport,
      };

      await animatePct(30);
      const local = computeRentEstimation(property);
      await animatePct(55);

      const { estimationId } = await createRent({ property });
      await animatePct(85);

      sessionStorage.setItem(`rent_${estimationId}`, JSON.stringify({ property, result: local }));
      // Personnalisation : profil bailleur / locataire sélectionné dans le formulaire
      sessionStorage.setItem(`rent_intent_${estimationId}`, need);
      await animatePct(100);
      await new Promise((r) => setTimeout(r, 350));

      toast.success("Estimation de loyer créée !", { description: "Redirection vers les résultats..." });
      setTimeout(() => nav(`/estimate/loyer/${estimationId}`), 350);
    } catch (e) {
      console.error(e);
      toast.error("Erreur", { description: e instanceof Error ? e.message : "Une erreur est survenue" });
      setLoading(false);
    }
  };

  const indicator = f.gouvernorat && f.propertyType
    ? getRentBasePrice(f.gouvernorat, f.propertyType)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* ═══ HEADER ═══ */}
      <header className="sticky top-0 z-40 border-b border-slate-200/60 dark:border-gray-800/60 bg-white/70 dark:bg-gray-950/70 backdrop-blur-2xl shadow-xs">
        <div className="mx-auto max-w-3xl px-3 sm:px-4">
          <div className="flex items-center justify-between h-12 sm:h-14">
            <button onClick={() => nav("/estimate")}
              className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors">
              <ArrowLeft className="size-3.5 sm:size-4" />
              <span>Modules</span>
            </button>
            <div className="flex items-center gap-2">
              <Badge className="rounded-full border-0 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 text-[10px] font-semibold gap-1">
                <KeyRound className="size-3" /> Estimation de loyer
              </Badge>
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/50">
                <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">{step + 1}</span>
                <span className="text-[10px] text-slate-300 dark:text-slate-600">/</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">{STEPS.length}</span>
              </div>
            </div>
          </div>

          <div className="flex items-start justify-between pb-2.5 sm:pb-3 overflow-x-auto scrollbar-none gap-0">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === step;
              const isDone = i < step;
              return (
                <button
                  key={i}
                  onClick={() => { if (i <= step) setStep(i); }}
                  className={cn("flex flex-col items-center gap-1 transition-all duration-300 min-w-0 flex-1 px-0.5", i <= step ? "cursor-pointer" : "cursor-default")}
                  aria-label={`Étape ${i + 1} : ${s.title}`}
                >
                  <div className={cn(
                    "relative z-10 flex items-center justify-center rounded-full transition-all duration-300",
                    isActive ? "size-7 sm:size-8 bg-gradient-to-br from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-200/50 dark:shadow-emerald-900/50" :
                    isDone ? "size-6 sm:size-7 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400" :
                    "size-6 sm:size-7 bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600"
                  )}>
                    {isDone ? <Check className="size-3 sm:size-3.5" strokeWidth={2.5} /> : <Icon className="size-3 sm:size-3.5" />}
                  </div>
                  <span className={cn(
                    "text-[10px] sm:text-xs font-semibold whitespace-nowrap tracking-tight leading-tight text-center",
                    isActive ? "text-emerald-700 dark:text-emerald-400" : isDone ? "text-emerald-500 dark:text-emerald-500" : "text-slate-300 dark:text-slate-600"
                  )}>
                    {s.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ═══ MAIN ═══ */}
      <div className="mx-auto max-w-3xl px-3 sm:px-4 py-3 sm:py-4 pb-20 sm:pb-24">

        <motion.div
          key={`h-${step}`}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mb-3 sm:mb-4"
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex size-9 sm:size-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-500 shadow-md shadow-emerald-200/40 dark:shadow-emerald-900/40">
              {(() => { const Icon = STEPS[step].icon; return <Icon className="size-4 sm:size-5 text-white" />; })()}
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">{STEPS[step].title}</h1>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">{STEPS[step].sub}</p>
            </div>
          </div>
        </motion.div>

        {/* Progress Overlay */}
        {loading && (
          <Card className="border-0 bg-gradient-to-br from-emerald-700 via-teal-800 to-slate-900 text-white shadow-2xl rounded-2xl overflow-hidden relative">
            <CardContent className="p-6 sm:p-8 text-center">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="mx-auto flex size-16 sm:size-20 items-center justify-center rounded-2xl sm:rounded-3xl bg-white/10 backdrop-blur-md mb-4 ring-1 ring-white/20"
              >
                <Wallet className="size-8 sm:size-10 text-white" />
              </motion.div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight">Estimation en cours</h2>
              <p className="text-xs sm:text-sm text-emerald-200/70 mt-1">
                {f.estimationMode === "nuitée"
                  ? "Notre IA analyse le profil de zone et le potentiel de location courte durée..."
                  : "Notre IA analyse le marché locatif de votre zone..."}
              </p>
              <div className="max-w-xs mx-auto mt-5 mb-6">
                <div className="flex items-center justify-between text-[10px] sm:text-xs text-emerald-200/70 mb-2">
                  <span>Progression</span>
                  <span className="font-bold text-emerald-300">{Math.round(progressPct)}%</span>
                </div>
                <div className="h-2.5 sm:h-3 bg-white/15 rounded-full overflow-hidden shadow-inner">
                  <motion.div className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-400" style={{ width: `${progressPct}%` }} />
                </div>
              </div>
              <div className="max-w-xs mx-auto space-y-1.5">
                {[
                  { label: "Analyse du marché locatif", ic: Brain },
                  { label: "Calcul du loyer & du rendement", ic: TrendingUp },
                  { label: "Génération du rapport", ic: FileText },
                ].map((s, i) => {
                  const threshold = [30, 60, 85][i];
                  const isDone = progressPct >= threshold;
                  const Icon = s.ic;
                  return (
                    <div key={s.label} className={cn("flex items-center gap-2.5 sm:gap-3 rounded-xl p-2.5 sm:p-3 transition-all duration-500", isDone ? "bg-white/5" : "bg-white/5 opacity-40")}>
                      <div className={cn("flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-lg", isDone ? "bg-emerald-400/30 text-emerald-300" : "bg-white/10 text-white/50")}>
                        {isDone ? <Check className="size-3.5 sm:size-4" strokeWidth={3} /> : <Icon className="size-3.5 sm:size-4" />}
                      </div>
                      <span className={cn("text-xs sm:text-sm font-medium", isDone ? "text-emerald-200" : "text-white/50")}>{s.label}</span>
                      {isDone && <span className="ml-auto text-[10px] font-medium text-emerald-300/70">✓ Terminé</span>}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ MODE DE LOCATION ═══ */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-3 sm:mb-4">
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 rounded-2xl border border-emerald-200/70 dark:border-emerald-900/50 bg-white dark:bg-slate-900 p-1.5 shadow-sm">
            {([
              { v: "mensuel", l: "Mensuel", d: "Longue durée · mois", ic: CalendarDays },
              { v: "nuitée", l: "Nuitée", d: "Courte durée · /nuit", ic: MoonStar },
            ] as const).map((m) => {
              const Icon = m.ic;
              const active = f.estimationMode === m.v;
              return (
                <button key={m.v} type="button" onClick={() => upd("estimationMode", m.v)}
                  aria-pressed={active}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 sm:py-3 transition-all duration-200",
                    active
                      ? "border-emerald-400 dark:border-emerald-500 bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-200/40 dark:shadow-emerald-900/40"
                      : "border-transparent bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20"
                  )}
                >
                  <div className={cn("flex size-7 sm:size-8 items-center justify-center rounded-lg", active ? "bg-white/20" : "bg-slate-100 dark:bg-slate-700")}>
                    <Icon className={cn("size-4", active ? "text-white" : "text-emerald-600 dark:text-emerald-400")} />
                  </div>
                  <div className="text-left min-w-0">
                    <p className={cn("text-xs sm:text-sm font-bold leading-tight", active ? "text-white" : "text-slate-700 dark:text-slate-300")}>{m.l}</p>
                    <p className={cn("text-[9px] sm:text-[10px] truncate", active ? "text-emerald-100/80" : "text-slate-400 dark:text-slate-500")}>{m.d}</p>
                  </div>
                </button>
              );
            })}
          </div>
          {f.estimationMode === "nuitée" && (
            <p className="mt-1.5 text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <Sparkles className="size-3 text-emerald-500 shrink-0" />
              Le BIM Engine détecte automatiquement le profil de la zone (touristique, urbain, universitaire…) et estime le tarif par nuitée + le revenu annuel.
            </p>
          )}
        </motion.div>

        {/* ═══ FORM CARD ═══ */}
        <Card className={cn(
          "border-slate-200/70 dark:border-slate-800/70 shadow-sm dark:shadow-slate-900/20 rounded-xl sm:rounded-2xl overflow-hidden transition-all duration-300",
          loading && "hidden"
        )}>
          <CardContent className="p-4 sm:p-6">
            {/* ── Personnalisation : bailleur ou locataire ── */}
            <div className="mb-5 sm:mb-6 rounded-xl border border-emerald-100 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/50 dark:from-emerald-950/30 dark:via-slate-900/50 dark:to-teal-950/20 p-3.5 sm:p-4">
              <div className="flex items-start gap-2.5 mb-3">
                <div className="flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white">
                  <KeyRound className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">Votre besoin</p>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 leading-snug">
                    Le résultat de l'estimation reste identique — seules l'interprétation et les recommandations s'adaptent à votre profil.
                  </p>
                </div>
              </div>
              <SegmentedToggle
                options={[
                  { value: "louer_bien", label: "Je veux louer mon bien", emoji: "🏠" },
                  { value: "louer", label: "Je veux louer un bien", emoji: "🔎" },
                ]}
                value={need}
                onChange={(v) => setNeed(v as "louer_bien" | "louer")}
                accent="emerald"
                size="lg"
                ariaLabel="Votre besoin pour cette estimation de loyer"
              />
              <p className="mt-2.5 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                {need === "louer_bien" ? (
                  <>👨‍💼 <span className="font-semibold text-emerald-700 dark:text-emerald-300">Profil bailleur</span> — fixation du loyer, mise en location et conseils propriétaire.</>
                ) : (
                  <>🕵️ <span className="font-semibold text-emerald-700 dark:text-emerald-300">Profil locataire</span> — analyse du loyer, positionnement, négociation et budget.</>
                )}
              </p>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`step-${step}`}
                variants={stepAnim}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                {/* ═══════ STEP 0 — Localisation ═══════ */}
                {step === 0 && (
                  <div className="space-y-3 sm:space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <MapPin className="size-4 text-emerald-600 dark:text-emerald-400" /> Adresse du bien
                      </Label>
                      <Suspense fallback={
                        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4">
                          <div className="flex items-center gap-2">
                            <div className="size-5 rounded-full border-2 border-emerald-200 border-t-emerald-500 animate-spin" />
                            <p className="text-xs text-slate-400 dark:text-slate-500">Chargement...</p>
                          </div>
                        </div>
                      }>
                        <LocationPicker onLocationChange={handleLoc} autoLocate />
                      </Suspense>
                    </div>

                    <Separator className="dark:bg-slate-800" />

                    <div>
                      <div className="flex items-center gap-2 mb-2 sm:mb-3">
                        <div className="h-px flex-1 bg-gradient-to-r from-slate-100 to-transparent dark:from-slate-800" />
                        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Localisation</span>
                        <div className="h-px flex-1 bg-gradient-to-l from-slate-100 to-transparent dark:from-slate-800" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                        {[
                          { k: "gouvernorat" as const, label: "Gouvernorat", open: () => setGovSheetOpen(true), disabled: false },
                          { k: "ville" as const, label: "Ville", open: () => setVilleSheetOpen(true), disabled: !f.gouvernorat },
                          { k: "quartier" as const, label: "Quartier", open: () => setQuartierSheetOpen(true), disabled: !f.ville },
                        ].map((field) => (
                          <div key={field.k} className="space-y-1">
                            <Label className="text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400">
                              {field.label}{field.k !== "quartier" && <span className="text-red-400"> *</span>}
                            </Label>
                            <button
                              type="button"
                              onClick={() => !field.disabled && field.open()}
                              disabled={field.disabled}
                              className={cn(
                                "flex items-center justify-between w-full rounded-xl border h-10 sm:h-11 px-3 sm:px-4 text-xs sm:text-sm transition-all",
                                f[field.k]
                                  ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-300 font-semibold"
                                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500",
                                field.disabled && "opacity-50 cursor-not-allowed"
                              )}
                            >
                              <span>{f[field.k] || (field.disabled ? "—" : "Sélectionner")}</span>
                              <ChevronRight className="size-3.5 sm:size-4 shrink-0 opacity-50" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <LocationSheet open={govSheetOpen} onOpenChange={setGovSheetOpen} title="Gouvernorat"
                        description="Sélectionnez le gouvernorat de votre bien" items={GOVERNORATS} selected={f.gouvernorat}
                        onSelect={(v) => upd("gouvernorat", v)} extraInfo={villeCountByGov} />
                      <LocationSheet open={villeSheetOpen} onOpenChange={setVilleSheetOpen} title="Ville"
                        description={f.gouvernorat ? `Sélectionnez une ville dans le gouvernorat de ${f.gouvernorat}` : "Sélectionnez d'abord un gouvernorat"}
                        items={villes} selected={f.ville} onSelect={(v) => upd("ville", v)} extraInfo={quartierCountByVille} />
                      <LocationSheet open={quartierSheetOpen} onOpenChange={setQuartierSheetOpen} title="Quartier"
                        description={f.ville ? `Sélectionnez un quartier à ${f.ville}` : "Sélectionnez d'abord une ville"}
                        items={quartiers} selected={f.quartier} onSelect={(v) => upd("quartier", v)} />
                    </div>

                    {f.estimationMode === "nuitée" && (
                      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl border border-sky-200/60 dark:border-sky-800/50 bg-gradient-to-br from-sky-50 via-white to-indigo-50/80 dark:from-sky-950/30 dark:via-slate-900/50 dark:to-indigo-950/20 overflow-hidden shadow-sm">
                        <div className="h-1 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600" />
                        <div className="p-3 sm:p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 shadow-sm">
                                <MapPin className="size-4 text-white" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">📍 {f.ville || f.gouvernorat}{f.quartier ? ` — ${f.quartier}` : ""}</p>
                                <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500">Profil de zone · location courte durée</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-[10px] sm:text-xs font-bold bg-gradient-to-r from-sky-600 to-indigo-500 dark:from-sky-400 dark:to-indigo-300 bg-clip-text text-transparent">
                                {(() => {
                                  const auto = f.gouvernorat ? detectRentZoneType(f.gouvernorat, f.ville, f.quartier) : null;
                                  const label = (f.zoneType || auto) ? RENT_ZONE_LABELS[(f.zoneType || auto) as keyof typeof RENT_ZONE_LABELS] : "Non détectée";
                                  return label;
                                })()}
                              </p>
                              <p className="text-[9px] text-slate-400 dark:text-slate-500">
                                {f.zoneType ? "choisie manuellement" : f.gouvernorat ? "détectée par l'IA" : "à partir de la localisation"}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="space-y-1.5">
                              <Label className="text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400">Type de zone</Label>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
                                <button type="button" onClick={() => upd("zoneType", "")}
                                  aria-pressed={f.zoneType === ""}
                                  className={cn(
                                    "rounded-xl border-2 px-2.5 py-2 text-[10px] sm:text-[11px] font-semibold transition-all",
                                    f.zoneType === ""
                                      ? "border-emerald-400 dark:border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-100/60 dark:from-emerald-900/30 dark:to-teal-800/20 text-emerald-700 dark:text-emerald-300"
                                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 hover:border-slate-300"
                                  )}
                                >
                                  ✨ Automatique
                                </button>
                                {RENT_ZONE_TYPES.map((z) => (
                                  <button key={z} type="button" onClick={() => upd("zoneType", z)}
                                    aria-pressed={f.zoneType === z}
                                    className={cn(
                                      "rounded-xl border-2 px-2.5 py-2 text-[10px] sm:text-[11px] font-semibold transition-all",
                                      f.zoneType === z
                                        ? "border-sky-400 dark:border-sky-500 bg-gradient-to-br from-sky-50 to-indigo-100/60 dark:from-sky-900/30 dark:to-indigo-900/20 text-sky-700 dark:text-sky-300"
                                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 hover:border-slate-300"
                                    )}
                                  >
                                    {RENT_ZONE_LABELS[z]}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400">Proximités valorisantes (optionnel)</Label>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
                                {NEARBY_OPTIONS.map((n) => {
                                  const selected = !!f[n.k];
                                  return (
                                    <button key={n.k} type="button" onClick={() => upd(n.k, !selected)}
                                      aria-pressed={selected}
                                      className={cn(
                                        "flex items-center gap-1.5 rounded-xl border-2 px-2.5 py-2 text-[10px] sm:text-[11px] font-medium transition-all",
                                        selected
                                          ? "border-emerald-400 dark:border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-100/60 dark:from-emerald-900/30 dark:to-teal-800/20 text-emerald-700 dark:text-emerald-300"
                                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 hover:border-emerald-200 dark:hover:border-emerald-900"
                                      )}
                                    >
                                      <span>{n.e}</span>
                                      <span className="truncate flex-1 text-left">{n.l}</span>
                                      {selected && <Check className="size-3 shrink-0 text-emerald-500" strokeWidth={3} />}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {f.gouvernorat && f.propertyType && indicator && (
                      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl border border-emerald-200/60 dark:border-emerald-800/50 bg-gradient-to-br from-emerald-50 via-white to-teal-50/80 dark:from-emerald-950/30 dark:via-slate-900/50 dark:to-teal-950/20 overflow-hidden shadow-sm">
                        <div className="h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600" />
                        <div className="p-3 sm:p-4 flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
                              <Wallet className="size-4 text-white" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">📍 {f.ville || f.gouvernorat}{f.quartier ? ` — ${f.quartier}` : ""}</p>
                              <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500">Loyer de base · marché locatif tunisien</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm sm:text-base font-bold bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
                              {indicator.toLocaleString("fr-FR")} TND
                            </p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500">/ m² / mois indicatif</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* ═══════ STEP 1 — Type & Surface ═══════ */}
                {step === 1 && (
                  <div className="space-y-3 sm:space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Building2 className="size-4 text-emerald-600 dark:text-emerald-400" /> Type de bien <span className="text-red-400">*</span>
                      </Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
                        {RENT_TYPES.map((t) => {
                          const selected = f.propertyType === t.v;
                          const Icon = t.ic;
                          return (
                            <button key={t.v} type="button" onClick={() => upd("propertyType", t.v)}
                              aria-pressed={selected}
                              className={cn(
                                "group relative flex items-center gap-2 sm:gap-2.5 rounded-xl border-2 px-3 sm:px-3.5 py-2.5 sm:py-3 text-left text-xs sm:text-sm transition-all duration-200",
                                selected
                                  ? "border-emerald-400 dark:border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-100/50 dark:from-emerald-900/30 dark:to-teal-800/20 text-emerald-700 dark:text-emerald-300 shadow-sm"
                                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                              )}
                            >
                              <div className={cn("flex size-7 sm:size-8 items-center justify-center rounded-lg transition-all", selected ? "bg-emerald-500 text-white shadow-xs" : "bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-slate-200")}>
                                <Icon className="size-3.5 sm:size-4" />
                              </div>
                              <span className="font-semibold leading-tight">{t.l}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <Separator className="dark:bg-slate-800" />

                    {!f.propertyType ? (
                      <div className="rounded-xl border-2 border-dashed border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/10 p-4 sm:p-6 text-center">
                        <p className="text-xs sm:text-sm font-medium text-amber-700 dark:text-amber-400">Sélectionnez d'abord un type de bien ci-dessus</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="rbs" className="text-[10px] sm:text-xs font-medium text-slate-600 dark:text-slate-400">
                            Surface habitable (m²) <span className="text-red-400">*</span>
                          </Label>
                          <div className="relative mt-1">
                            <Ruler className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 size-3.5 sm:size-4 text-slate-400 pointer-events-none" />
                            <Input id="rbs" type="number" placeholder="ex: 90" value={f.builtSurface} onChange={(e) => upd("builtSurface", e.target.value)}
                              className={cn("rounded-xl border-slate-200 dark:border-slate-700 h-10 sm:h-11 pl-9 sm:pl-10 text-xs sm:text-sm font-semibold [&::-webkit-inner-spin-button]:appearance-none", f.builtSurface && "border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10")} />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                          <div className="space-y-1">
                            <Label className="text-[10px] sm:text-xs font-medium text-slate-600 dark:text-slate-400">Terrain (m²)</Label>
                            <div className="relative">
                              <LandPlot className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 size-3.5 sm:size-4 text-slate-400 pointer-events-none" />
                              <Input type="number" placeholder="ex: 300" value={f.terrainSurface} onChange={(e) => upd("terrainSurface", e.target.value)}
                                className="rounded-xl border-slate-200 dark:border-slate-700 h-10 sm:h-11 pl-9 sm:pl-10 text-xs sm:text-sm font-semibold [&::-webkit-inner-spin-button]:appearance-none" />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] sm:text-xs font-medium text-slate-600 dark:text-slate-400">Nombre d'étages (bâtiment)</Label>
                            <NumericStepper value={f.floors} onChange={(v) => upd("floors", v)} min={0} max={50} placeholder="2" />
                          </div>
                        </div>
                        {(f.propertyType === "appartement" || f.propertyType === "studio" || f.propertyType === "duplex") && (
                          <div className="space-y-1">
                            <Label className="text-[10px] sm:text-xs font-medium text-slate-600 dark:text-slate-400">Étage du bien</Label>
                            <NumericStepper value={f.floor} onChange={(v) => upd("floor", v)} min={0} max={50} placeholder="2" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ═══════ STEP 2 — Pièces & Équipements ═══════ */}
                {step === 2 && (
                  <div className="space-y-3 sm:space-y-4">
                    {RESIDENTIAL.includes(f.propertyType) && (
                      <>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex size-5 sm:size-6 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                            <BedDouble className="size-3 sm:size-3.5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">Pièces</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
                          {[
                            { k: "bedrooms" as const, l: "Chambres", ic: BedDouble },
                            { k: "bathrooms" as const, l: "Salles de bain", ic: Bath },
                            { k: "kitchens" as const, l: "Cuisines", ic: CookingPot },
                            { k: "livingRooms" as const, l: "Salons", ic: Armchair },
                            { k: "garages" as const, l: "Garages", ic: Car },
                          ].map((r) => (
                            <div key={r.k} className="space-y-1">
                              <Label className="text-[10px] sm:text-xs font-medium text-slate-600 dark:text-slate-400">{r.l}</Label>
                              <NumericStepper value={f[r.k]} onChange={(v) => upd(r.k, v)} min={0} max={30} />
                            </div>
                          ))}
                        </div>
                        <Separator className="dark:bg-slate-800" />
                      </>
                    )}

                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex size-5 sm:size-6 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                        <Sparkles className="size-3 sm:size-3.5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">Équipements & prestations</span>
                      <span className="text-[10px] text-slate-400 ml-auto">chaque équipement valorise le loyer</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
                      {EQUIPMENTS.map((e) => {
                        const selected = !!f[e.k];
                        return (
                          <button key={e.k} type="button" onClick={() => upd(e.k, !selected)}
                            aria-pressed={selected}
                            className={cn(
                              "flex items-center gap-2 rounded-xl border-2 px-2.5 sm:px-3 py-2 text-[11px] sm:text-xs font-medium transition-all duration-150",
                              selected
                                ? "border-emerald-400 dark:border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-100/60 dark:from-emerald-900/30 dark:to-teal-800/20 text-emerald-700 dark:text-emerald-300"
                                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 hover:border-emerald-200 dark:hover:border-emerald-900 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20"
                            )}
                          >
                            <span className="text-sm">{e.e}</span>
                            <span className="truncate flex-1 text-left">{e.l}</span>
                            {selected && <Check className="size-3.5 shrink-0 text-emerald-500" strokeWidth={3} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ═══════ STEP 3 — Finition & État ═══════ */}
                {step === 3 && (
                  <div className="space-y-3 sm:space-y-4">
                    <div className="space-y-1">
                      <Label className="text-[10px] sm:text-xs font-medium text-slate-600 dark:text-slate-400">Année de construction</Label>
                      <div className="relative">
                        <CalendarDays className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 size-3.5 sm:size-4 text-slate-400 pointer-events-none" />
                        <Input type="number" placeholder="ex: 2015" value={f.yearBuilt} onChange={(e) => upd("yearBuilt", e.target.value)}
                          className="rounded-xl border-slate-200 dark:border-slate-700 h-10 sm:h-11 pl-9 sm:pl-10 text-xs sm:text-sm font-semibold [&::-webkit-inner-spin-button]:appearance-none" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">État général <span className="text-red-400">*</span></Label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                        {RENT_STATES.map((s) => (
                          <button key={s.v} type="button" onClick={() => upd("generalState", s.v)}
                            aria-pressed={f.generalState === s.v}
                            className={cn(
                              "rounded-xl border-2 px-2.5 sm:px-3 py-2.5 text-[11px] sm:text-xs font-semibold transition-all",
                              f.generalState === s.v ? cn(s.c, "border-current shadow-sm") : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-400 hover:border-slate-300"
                            )}
                          >
                            {s.l}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">Niveau de finition <span className="text-red-400">*</span></Label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                        {Object.entries(RENT_FINISH_LABELS).map(([v, l]) => (
                          <button key={v} type="button" onClick={() => upd("finishLevel", v)}
                            aria-pressed={f.finishLevel === v}
                            className={cn(
                              "rounded-xl border-2 px-2.5 sm:px-3 py-2.5 text-[11px] sm:text-xs font-semibold transition-all",
                              f.finishLevel === v
                                ? "border-emerald-400 dark:border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-100/60 dark:from-emerald-900/30 dark:to-teal-800/20 text-emerald-700 dark:text-emerald-300 shadow-sm"
                                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-400 hover:border-slate-300"
                            )}
                          >
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-emerald-200/60 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 px-3.5 py-2.5 flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <p className="text-[10px] sm:text-xs text-emerald-700 dark:text-emerald-300">
                        Finition « {RENT_FINISH_LABELS[f.finishLevel] ?? "Standard"} » : le loyer au m² sera ajusté de{" "}
                        {f.finishLevel === "economique" ? "-18 %" : f.finishLevel === "premium" ? "+12 %" : f.finishLevel === "luxe" ? "+30 %" : "±0 %"} par rapport au standard.
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* ═══ NAVIGATION ═══ */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || loading}
            className="rounded-xl h-10 sm:h-11 px-4 text-xs sm:text-sm">
            <ArrowLeft className="size-3.5 mr-1" /> Précédent
          </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!valid() || loading}
                className="rounded-xl h-10 sm:h-11 px-5 text-xs sm:text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-200/50 dark:shadow-emerald-900/50">
                Continuer <ChevronRight className="size-3.5 ml-1" />
              </Button>
            ) : (
              <Button onClick={submit} disabled={!valid() || loading}
                className="rounded-xl h-10 sm:h-11 px-5 text-xs sm:text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-200/50 dark:shadow-emerald-900/50">
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Wallet className="size-4" />}
                {loading ? "Estimation en cours..." : f.estimationMode === "nuitée" ? "Estimer la nuitée" : "Estimer le loyer"}
              </Button>
            )}
          </div>
        </div>
      </div>
  );
}
