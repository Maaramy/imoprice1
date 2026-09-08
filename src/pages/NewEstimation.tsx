import { useState, useRef, useCallback, lazy, Suspense, useMemo } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import NumericStepper from "@/components/NumericStepper";
const LocationPicker = lazy(() => import("@/components/LocationPicker"));
import LocationSheet from "@/components/LocationSheet";
import type { LocationResult } from "@/components/LocationPicker";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Building2, Home, MapPin, Search,
  Loader2, ChevronLeft, ChevronRight, Camera,
  X, Sparkles, Brain, CheckCircle2, Check,
  BedDouble, Bath, CookingPot, Armchair, Car, Ruler,
  CalendarDays, Paintbrush, Layers, RefreshCw, Store,
  Warehouse, TreePine, LandPlot, ParkingSquare, Star, FileText, EyeOff,
  Rocket, AlertTriangle, Lock, Target,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { GOVERNORATS, VILLES_BY_GOUVERNORAT, QUARTIERS_BY_VILLE } from "@/convex/types";
import { cn, daysUntilNextReset, quotaBarColor } from "@/lib/utils";
import { SegmentedToggle } from "@/components/SegmentedToggle";
import { getPropertyVisionService, type AnalysisProgress } from "@/lib/property-vision";
import { computeEnhancedEstimation, getBasePrice } from "@/lib/enhanced-estimation";

/* ─────────── DATA ─────────── */

const TYPE_ICONS: Record<string, any> = {
  maison: Home, villa: Building2, appartement: Building2, studio: Building2,
  duplex: Building2, immeuble: Building2, local_commercial: Store, bureau: Building2,
  magasin: Store, restaurant: Store, cafe: Store, entrepot: Warehouse,
  atelier: Warehouse, terrain_constructible: LandPlot, terrain_agricole: TreePine,
  ferme: TreePine, garage: Building2, parking: ParkingSquare, depot: Warehouse, mixte: Building2,
};

const TYPES = [
  { v: "maison", l: "Maison" }, { v: "villa", l: "Villa" },
  { v: "appartement", l: "Appartement" }, { v: "studio", l: "Studio" },
  { v: "duplex", l: "Duplex" }, { v: "immeuble", l: "Immeuble" },
  { v: "local_commercial", l: "Local commercial" }, { v: "bureau", l: "Bureau" },
  { v: "magasin", l: "Magasin" }, { v: "restaurant", l: "Restaurant" },
  { v: "cafe", l: "Café" }, { v: "entrepot", l: "Entrepôt" },
  { v: "atelier", l: "Atelier" }, { v: "terrain_constructible", l: "Terrain constructible" },
  { v: "terrain_agricole", l: "Terrain agricole" }, { v: "ferme", l: "Ferme" },
  { v: "garage", l: "Garage" }, { v: "parking", l: "Parking" },
  { v: "depot", l: "Dépôt" }, { v: "mixte", l: "Mixte" },
];

const STATES = [
  { v: "a_renover", l: "À rénover", d: "Travaux nécessaires", c: "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300", ic: RefreshCw },
  { v: "bon_etat", l: "Bon état", d: "Prêt à habiter", c: "border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300", ic: Check },
  { v: "excellent_etat", l: "Excellent", d: "Bien entretenu", c: "border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300", ic: Star },
  { v: "luxe", l: "Luxe", d: "Haut standing", c: "border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300", ic: Sparkles },
];

/* ─────────── ADAPTIVE FIELDS BY PROPERTY TYPE ─────────── */

function getVisibleRooms(type: string) {
  const residential = ["maison", "villa", "appartement", "studio", "duplex", "immeuble", "mixte"];
  const withKitchen = ["restaurant", "cafe"];
  const withBathroom = ["local_commercial", "bureau", "magasin", "entrepot", "atelier", "depot", "garage", "parking"];

  if (residential.includes(type)) {
    return [
      { k: "bedrooms" as const, l: "Chambres", ic: BedDouble },
      { k: "bathrooms" as const, l: "Salles de bain", ic: Bath },
      { k: "kitchens" as const, l: "Cuisines", ic: CookingPot },
      { k: "livingRooms" as const, l: "Salons", ic: Armchair },
      { k: "garages" as const, l: "Garages", ic: Car },
    ];
  }
  if (withKitchen.includes(type)) {
    return [
      { k: "bathrooms" as const, l: "Sanitaires", ic: Bath },
      { k: "kitchens" as const, l: "Cuisine pro", ic: CookingPot },
    ];
  }
  if (withBathroom.includes(type)) {
    return [
      { k: "bathrooms" as const, l: "Sanitaires", ic: Bath },
    ];
  }
  // land types et autres
  return [];
}

function getSurfaceFields(type: string) {
  const land = ["terrain_constructible", "terrain_agricole", "ferme"];
  const residential = ["maison", "villa", "appartement", "studio", "duplex", "immeuble", "mixte"];

  if (land.includes(type)) {
    return {
      builtSurface: false as const,
      terrainSurface: true as const,
      floors: false as const,
      builtRequired: false as const,
      terrainRequired: true as const,
    };
  }
  if (residential.includes(type)) {
    return {
      builtSurface: true as const,
      terrainSurface: true as const,
      floors: true as const,
      builtRequired: true as const,
      terrainRequired: false as const,
    };
  }
  // commercial, storage, parking, etc.
  return {
    builtSurface: true as const,
    terrainSurface: false as const,
    floors: true as const,
    builtRequired: true as const,
    terrainRequired: false as const,
  };
}

function getVisibleEquipment(type: string) {
  const residential = ["maison", "villa", "appartement", "studio", "duplex", "immeuble", "mixte"];
  const commercial = ["local_commercial", "bureau", "magasin", "restaurant", "cafe"];
  const storage = ["entrepot", "atelier", "depot", "garage", "parking"];

  if (residential.includes(type)) {
    return [
      { k: "hasGarden" as const, l: "Jardin", e: "🌿" },
      { k: "hasPool" as const, l: "Piscine", e: "🏊" },
      { k: "hasTerrace" as const, l: "Terrasse", e: "🏔️" },
      { k: "hasBalcony" as const, l: "Balcon", e: "🏠" },
      { k: "hasElevator" as const, l: "Ascenseur", e: "🛗" },
      { k: "hasParking" as const, l: "Parking", e: "🚗" },
      { k: "hasAC" as const, l: "Climatisation", e: "❄️" },
      { k: "hasHeating" as const, l: "Chauffage", e: "🔥" },
      { k: "hasSolar" as const, l: "Solaire", e: "☀️" },
    ];
  }
  if (commercial.includes(type)) {
    return [
      { k: "hasTerrace" as const, l: "Terrasse", e: "🏔️" },
      { k: "hasParking" as const, l: "Parking", e: "🚗" },
      { k: "hasAC" as const, l: "Climatisation", e: "❄️" },
      { k: "hasHeating" as const, l: "Chauffage", e: "🔥" },
      { k: "hasSolar" as const, l: "Solaire", e: "☀️" },
      { k: "hasElevator" as const, l: "Ascenseur", e: "🛗" },
    ];
  }
  if (storage.includes(type)) {
    return [
      { k: "hasParking" as const, l: "Parking", e: "🚗" },
      { k: "hasAC" as const, l: "Climatisation", e: "❄️" },
      { k: "hasSolar" as const, l: "Solaire", e: "☀️" },
    ];
  }
  // land types
  return [];
}

function getYearBuiltVisible(type: string) {
  const land = ["terrain_constructible", "terrain_agricole", "ferme"];
  return !land.includes(type);
}

/* ─────────── TYPES ─────────── */

type FD = {
  address: string; gouvernorat: string; ville: string; quartier: string;
  latitude: number | null; longitude: number | null;
  propertyType: string; builtSurface: string; terrainSurface: string; floors: string;
  bedrooms: string; bathrooms: string; kitchens: string; livingRooms: string; garages: string;
  hasGarden: boolean; hasPool: boolean; hasTerrace: boolean; hasBalcony: boolean;
  hasElevator: boolean; hasParking: boolean; hasAC: boolean; hasHeating: boolean; hasSolar: boolean;
  yearBuilt: string; generalState: string;
};

const INIT: FD = {
  address: "", gouvernorat: "", ville: "", quartier: "",
  latitude: null, longitude: null,
  propertyType: "", builtSurface: "", terrainSurface: "", floors: "",
  bedrooms: "", bathrooms: "", kitchens: "", livingRooms: "", garages: "",
  hasGarden: false, hasPool: false, hasTerrace: false, hasBalcony: false,
  hasElevator: false, hasParking: false, hasAC: false, hasHeating: false, hasSolar: false,
  yearBuilt: "", generalState: "bon_etat",
};

const STEPS = [
  { title: "Localisation", sub: "Où se trouve votre bien ?", icon: MapPin },
  { title: "Type & Surface", sub: "Décrivez les dimensions", icon: Ruler },
  { title: "Pièces", sub: "Nombre de pièces", icon: BedDouble },
  { title: "Équipements", sub: "Photos et équipements", icon: Sparkles },
  { title: "État", sub: "Année et état général", icon: Paintbrush },
];

type ProgressStepId = "photos" | "creation" | "calculation" | "report";

/* ─────────── ANIMATION VARIANTS ─────────── */

const stepAnim = {
  initial: { opacity: 0, y: 16, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -12, scale: 0.98 },
};

/* ─────────── COMPONENT ─────────── */

export default function NewEstimation() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [need, setNeed] = useState<"vendre" | "acheter">("vendre");
  const [f, setF] = useState<FD>(INIT);
  const remaining = useQuery(api.plans.remainingEstimations);
  const quotaBlocked = !!remaining && !remaining.canEstimate;
  const create = useMutation(api.properties.createProperty);
  const estimate = useMutation(api.estimation.estimateProperty);
  const seed = useMutation(api.partners.seedPartners);
  const incrementUsage = useMutation(api.plans.incrementEstimationUsage);

  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [govSheetOpen, setGovSheetOpen] = useState(false);
  const [villeSheetOpen, setVilleSheetOpen] = useState(false);
  const [quartierSheetOpen, setQuartierSheetOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [ap, setAp] = useState<AnalysisProgress>({ status: "idle" });
  const [ar, setAr] = useState<any>(null);
  const [progressStep, setProgressStep] = useState<ProgressStepId>("photos");
  const [progressPct, setProgressPct] = useState(0);

  const villes = f.gouvernorat ? VILLES_BY_GOUVERNORAT[f.gouvernorat] || [] : [];
  const quartiers = f.ville ? QUARTIERS_BY_VILLE[f.ville] || [] : [];

  /* ── Compteurs pour LocationSheet ── */
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

  /* ── Helpers ── */

  /** Auto-fill governate/city from reverse geocoded address */
  const matchLoc = useCallback((loc: LocationResult) => {
    const up: Partial<FD> = {};
    const stateName = loc.state?.trim() || "";
    const cityName = loc.city?.trim() || "";

    if (stateName) {
      const g = GOVERNORATS.find(
        (x) => x.toLowerCase() === stateName.toLowerCase()
          || stateName.toLowerCase().includes(x.toLowerCase())
          || x.toLowerCase().includes(stateName.toLowerCase())
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
      // Try to find the city across all governorates
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

  const upd = (field: keyof FD, value: string | boolean) => {
    setF((p) => {
      const n = { ...p, [field]: value };
      if (field === "gouvernorat") { n.ville = ""; n.quartier = ""; }
      else if (field === "ville") n.quartier = "";
      return n;
    });
  };

  const go = (s: number) => setStep(s);
  const valid = () => {
    // When the quota is exhausted, the final "Estimer" button stays locked
    if (quotaBlocked && step === STEPS.length - 1) return false;
    switch (step) {
      case 0: return !!f.gouvernorat && !!f.ville;
      case 1: {
        if (!f.propertyType) return false;
        const sf = getSurfaceFields(f.propertyType);
        if (sf.builtRequired && !f.builtSurface) return false;
        if (sf.terrainRequired && !f.terrainSurface) return false;
        return true;
      }
      case 2: return true;
      case 3: return true;
      case 4: return !!f.generalState;
      default: return true;
    }
  };

  const handlePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
    setPhotos((p) => [...p, ...files]);
    files.forEach((file) => {
      setPreviews((p) => [...p, URL.createObjectURL(file)]);
    });
  };

  const removePhoto = (i: number) => {
    setPhotos((p) => p.filter((_, j) => j !== i));
    setPreviews((p) => { URL.revokeObjectURL(p[i]); return p.filter((_, j) => j !== i); });
  };

  /* ── Submit ── */

  const submit = async () => {
    // Check estimation limits before proceeding
    if (remaining && !remaining.canEstimate) {
      setLoading(false);
      toast.error(
        remaining.reason === "essai_termine"
          ? "Essai gratuit terminé"
          : remaining.reason === "abonnement_expire"
            ? "Abonnement expiré"
            : remaining.reason === "paiement_en_attente"
              ? "Paiement en attente de confirmation"
              : "Limite d'estimations atteinte",
        {
          description: remaining.reason === "paiement_en_attente"
            ? "Confirmez votre virement ou D17 pour activer votre forfait."
            : "Passez à un forfait supérieur pour débloquer plus d'estimations.",
        },
      );
      return;
    }

    setLoading(true);
    setProgressPct(0);
    const vision = getPropertyVisionService();

    const goStep = (id: ProgressStepId, pct: number) => {
      setProgressStep(id);
      setProgressPct(pct);
    };

    const animatePct = (target: number, duration = 600) => {
      return new Promise<void>((r) => {
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
    };

    try {
      let img = null;

      goStep("photos", 8);
      if (photos.length > 0) {
        setAp({ status: "loading_model" });
        await animatePct(20);
        const urls = await Promise.all(photos.map((file) => new Promise<string>((r) => { const reader = new FileReader(); reader.onload = () => r(reader.result as string); reader.readAsDataURL(file); })));
        await animatePct(35);
        const res = await vision.analyze(urls, (p) => setAp(p));
        if (res) { img = res.aggregated; setAr(res); }
        await animatePct(50);
      } else {
        await animatePct(40);
      }

      goStep("creation", 45);
      await animatePct(55);
      const p = {
        address: f.address || undefined, gouvernorat: f.gouvernorat, ville: f.ville, quartier: f.quartier,
        latitude: f.latitude ?? undefined, longitude: f.longitude ?? undefined,
        propertyType: f.propertyType, builtSurface: parseFloat(f.builtSurface),
        terrainSurface: f.terrainSurface ? parseFloat(f.terrainSurface) : undefined,
        floors: f.floors ? parseInt(f.floors) : undefined,
        bedrooms: f.bedrooms ? parseInt(f.bedrooms) : undefined,
        bathrooms: f.bathrooms ? parseInt(f.bathrooms) : undefined,
        kitchens: f.kitchens ? parseInt(f.kitchens) : undefined,
        livingRooms: f.livingRooms ? parseInt(f.livingRooms) : undefined,
        garages: f.garages ? parseInt(f.garages) : undefined,
        hasGarden: f.hasGarden, hasPool: f.hasPool, hasTerrace: f.hasTerrace, hasBalcony: f.hasBalcony,
        hasElevator: f.hasElevator, hasParking: f.hasParking, hasAC: f.hasAC, hasHeating: f.hasHeating, hasSolar: f.hasSolar,
        yearBuilt: f.yearBuilt ? parseInt(f.yearBuilt) : undefined, generalState: f.generalState,
      };
      const enhanced = computeEnhancedEstimation(p);
      await animatePct(65);
      const id = await create(p);
      await animatePct(72);

      goStep("calculation", 70);
      await animatePct(78);
      const { estimationId } = await estimate({ propertyId: id });
      await seed();
      await incrementUsage();
      vision.terminate();
      await animatePct(90);

      goStep("report", 88);
      sessionStorage.setItem(`enhanced_${estimationId}`, JSON.stringify(enhanced));
      // Personnalisation : profil vendeur / acheteur sélectionné dans le formulaire
      sessionStorage.setItem(`intent_${estimationId}`, need);
      await animatePct(98);

      setProgressPct(100);
      await new Promise((r) => setTimeout(r, 400));
      toast.success("Estimation créée !", { description: "Redirection vers les résultats..." });
      setTimeout(() => nav(`/estimate/${estimationId}`), 400);
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Une erreur est survenue";
      toast.error("Erreur", { description: msg });
      setLoading(false);
    }
  };

  /* ── AI Status helper ── */

  const statD = (() => {
    switch (ap.status) {
      case "loading_model": return { t: "Téléchargement du modèle IA...", i: Loader2, c: "text-blue-600", s: true };
      case "analyzing": return { t: "Analyse des photos...", i: Brain, c: "text-violet-600", s: true };
      case "complete": return { t: `${ar?.aggregated?.imageCount || 0} photos analysées`, i: CheckCircle2, c: "text-emerald-600", s: false };
      case "error": return { t: "Mode estimation standard", i: Sparkles, c: "text-amber-600", s: false };
      default: return null;
    }
  })();

  /* ── RENDER ── */

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* ═══ HEADER ═══ */}
      <header className="sticky top-0 z-40 border-b border-slate-200/60 dark:border-gray-800/60 bg-white/70 dark:bg-gray-950/70 backdrop-blur-2xl shadow-xs">
        <div className="mx-auto max-w-3xl px-3 sm:px-4">
          <div className="flex items-center justify-between h-12 sm:h-14">
            <button onClick={() => nav("/dashboard")}
              className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors">
              <ArrowLeft className="size-3.5 sm:size-4" />
              <span>Retour</span>
            </button>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/50">
                <span className="text-[10px] sm:text-xs font-semibold text-blue-700 dark:text-blue-400">{step + 1}</span>
                <span className="text-[10px] text-slate-300 dark:text-slate-600">/</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">{STEPS.length}</span>
              </div>
            </div>
          </div>

          {/* Stepper with labels */}
          <div className="flex items-start justify-between pb-2.5 sm:pb-3 overflow-x-auto scrollbar-none gap-0">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === step;
              const isDone = i < step;
              return (
                <button
                  key={i}
                  onClick={() => { if (i <= step) go(i); }}
                  className={cn(
                    "flex flex-col items-center gap-1 transition-all duration-300 min-w-0 flex-1 px-0.5",
                    i <= step ? "cursor-pointer" : "cursor-default",
                  )}
                  aria-label={`Étape ${i + 1} : ${s.title}`}
                >
                  {/* Connector line */}
                  {i > 0 && (
                    <div className={cn(
                      "absolute -left-1/2 top-3 h-0.5 w-full -translate-y-1/2 hidden sm:block",
                      i <= step ? "bg-blue-400 dark:bg-blue-500" : "bg-slate-200 dark:bg-slate-800"
                    )} style={{ zIndex: 0 }} />
                  )}
                  <div className={cn(
                    "relative z-10 flex items-center justify-center rounded-full transition-all duration-300",
                    isActive ? "size-7 sm:size-8 bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-md shadow-blue-200/50 dark:shadow-blue-900/50" :
                    isDone ? "size-6 sm:size-7 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400" :
                    "size-6 sm:size-7 bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600"
                  )}>
                    {isDone ? (
                      <Check className="size-3 sm:size-3.5" strokeWidth={2.5} />
                    ) : (
                      <Icon className={cn("size-3 sm:size-3.5", isActive && "animate-bounce-sm")} />
                    )}
                  </div>
                  <span className={cn(
                    "text-[10px] sm:text-xs sm:text-[10px] sm:text-xs font-semibold whitespace-nowrap tracking-tight leading-tight transition-colors text-center",
                    isActive ? "text-blue-700 dark:text-blue-400" :
                    isDone ? "text-blue-500 dark:text-blue-500" :
                    "text-slate-300 dark:text-slate-600"
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

        {/* Booster banner when the estimation limit is reached */}
        {remaining && !remaining.canEstimate && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mb-3 sm:mb-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 px-3.5 py-3 sm:px-4 shadow-sm">
              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-amber-800 dark:text-amber-300 leading-tight">
                    {remaining.reason === "limite_atteinte"
                      ? "Quota d'estimations atteint"
                      : remaining.reason === "essai_termine"
                        ? "Essai gratuit terminé"
                        : remaining.reason === "abonnement_expire"
                          ? "Abonnement expiré"
                          : remaining.reason === "paiement_en_attente"
                            ? "Paiement en attente de confirmation"
                            : "Aucun forfait actif"}
                  </p>
                  <p className="text-[10px] sm:text-xs text-amber-700/80 dark:text-amber-400/80 leading-tight mt-0.5">
                    {remaining.estimationsLimit > 0 && (
                      <span className="font-semibold">
                        {Math.max(remaining.remaining, 0)}/{remaining.estimationsLimit} restantes ce mois · réinit. dans {daysUntilNextReset()} j
                      </span>
                    )}{" "}
                    Passez à un forfait supérieur pour débloquer plus d'estimations.
                  </p>
                  {remaining.reason === "limite_atteinte" && remaining.estimationsLimit > 0 && (
                    <div className="mt-2 h-1.5 w-full max-w-[240px] rounded-full bg-amber-100 dark:bg-amber-900/40 overflow-hidden" aria-hidden="true">
                      <div
                        className={`h-full rounded-full ${quotaBarColor(Math.max(remaining.remaining, 0) / remaining.estimationsLimit)}`}
                        style={{ width: `${(remaining.estimationsLimit - Math.max(remaining.remaining, 0)) / remaining.estimationsLimit * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
              <Button
                onClick={() => nav("/pricing")}
                className={`shrink-0 h-9 rounded-lg text-xs sm:text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:brightness-110 ${
                  remaining.planType === "start"
                    ? "bg-gradient-to-r from-blue-600 to-blue-500 shadow-blue-200/50 dark:shadow-blue-900/40"
                    : remaining.planType === "pro"
                      ? "bg-gradient-to-r from-violet-600 to-purple-600 shadow-violet-200/50 dark:shadow-violet-900/40"
                      : "bg-gradient-to-r from-amber-600 to-orange-500 shadow-amber-200/50 dark:shadow-amber-900/40"
                }`}
              >
                <Rocket className="size-3.5 mr-1" />
                {remaining.planType === "start"
                  ? "Booster à Pro"
                  : remaining.planType === "pro"
                    ? "Booster à Expert"
                    : "Voir les forfaits"}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step header */}
        <motion.div
          key={`h-${step}`}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="mb-3 sm:mb-4"
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex size-9 sm:size-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 shadow-md shadow-blue-200/40 dark:shadow-blue-900/40">
              {(() => { const Icon = STEPS[step].icon; return <Icon className="size-4 sm:size-5 text-white" />; })()}
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">{STEPS[step].title}</h1>
              <p className="text-[10px] sm:text-xs sm:text-xs text-slate-500 dark:text-slate-400">{
                step === 1
                  ? (() => {
                      if (!f.propertyType) return "Sélectionnez un type et renseignez les dimensions";
                      const sf = getSurfaceFields(f.propertyType);
                      const parts = [];
                      if (sf.builtSurface) parts.push("surface bâtie");
                      if (sf.terrainSurface) parts.push("surface terrain");
                      if (sf.floors) parts.push("étages");
                      return parts.length > 0
                        ? `Renseignez la ${parts.join(", ")}`
                        : "Aucune dimension à renseigner";
                    })()
                  : step === 2
                    ? (() => {
                        const r = getVisibleRooms(f.propertyType);
                        if (!f.propertyType) return "Sélectionnez d'abord un type de bien";
                        if (r.length === 0) return "Sans objet pour ce type de bien";
                        return `${r.length} type${r.length > 1 ? 's' : ''} de pièce${r.length > 1 ? 's' : ''}`;
                      })()
                  : step === 3
                    ? (() => {
                        const e = getVisibleEquipment(f.propertyType);
                        if (!f.propertyType) return "Sélectionnez d'abord un type de bien";
                        if (e.length === 0) return "Sans objet pour ce type de bien";
                        return `Photos et ${e.length} équipement${e.length > 1 ? 's' : ''}`;
                      })()
                    : step === 4
                      ? (() => {
                          if (!f.propertyType || !getYearBuiltVisible(f.propertyType)) {
                            return "État général du bien";
                          }
                          return "Année et état général";
                        })()
                      : STEPS[step].sub
              }</p>
            </div>
          </div>
        </motion.div>

        {/* AI Status banner */}
        {(ap.status === "loading_model" || ap.status === "analyzing") && statD && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 sm:mb-4 rounded-xl border border-blue-100 dark:border-blue-900/50 bg-gradient-to-r from-blue-50 via-violet-50 to-blue-50 dark:from-blue-950/50 dark:via-violet-950/50 dark:to-blue-950/50 p-3 shadow-sm"
          >
            <div className="flex items-center gap-2.5">
              {(() => { const Ic = statD.i; return <Ic className={`size-4 sm:size-5 ${statD.c} ${statD.s ? "animate-spin" : ""}`} />; })()}
              <div className="flex-1 min-w-0">
                <p className={`text-xs sm:text-sm font-medium ${statD.c}`}>{statD.t}</p>
                {ap.status === "loading_model" && ap.progress?.progress && (
                  <div className="mt-1.5 w-full bg-white/60 dark:bg-slate-800/60 rounded-full h-1.5 overflow-hidden">
                    <motion.div
                      className="bg-gradient-to-r from-blue-500 to-violet-500 h-full rounded-full"
                      animate={{ width: `${ap.progress.progress * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                )}
              </div>
              {ap.status === "loading_model" && ap.progress?.progress && (
                <span className="text-[10px] sm:text-xs font-semibold text-blue-600 shrink-0">{Math.round(ap.progress.progress * 100)}%</span>
              )}
            </div>
          </motion.div>
        )}

        {/* Progress Overlay */}
        {loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.35, type: "spring", stiffness: 200, damping: 22 }}
          >
            <Card className="border-0 bg-gradient-to-br from-blue-700 via-blue-800 to-slate-900 text-white shadow-2xl rounded-2xl overflow-hidden relative">
              <div className="absolute inset-0 opacity-[0.03]"
                style={{ backgroundImage: `radial-gradient(circle at 30px 30px, white 1.5px, transparent 0)`, backgroundSize: '60px 60px' }} />
              <CardContent className="p-6 sm:p-8 text-center relative">
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1, rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 0.5, type: "spring" }}
                  className="mx-auto flex size-16 sm:size-20 items-center justify-center rounded-2xl sm:rounded-3xl bg-white/10 backdrop-blur-md mb-4 ring-1 ring-white/20"
                >
                  <Brain className="size-8 sm:size-10 text-white" />
                </motion.div>
                <h2 className="text-base sm:text-lg font-bold tracking-tight">Estimation en cours</h2>
                <p className="text-xs sm:text-sm text-blue-200/70 mt-1">Notre IA analyse et calcule la valeur de votre bien...</p>

                <div className="max-w-xs mx-auto mt-5 sm:mt-6 mb-6">
                  <div className="flex items-center justify-between text-[10px] sm:text-xs text-blue-200/70 mb-2">
                    <span>Progression</span>
                    <span className="font-bold text-emerald-300">{Math.round(progressPct)}%</span>
                  </div>
                  <div className="h-2.5 sm:h-3 bg-white/15 rounded-full overflow-hidden shadow-inner">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-400"
                      style={{ width: `${progressPct}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>

                <div className="max-w-xs mx-auto space-y-1.5 sm:space-y-2">
                  {[
                    { id: "photos" as const, label: "Analyse des photos", ic: Camera },
                    { id: "creation" as const, label: "Création du bien", ic: Building2 },
                    { id: "calculation" as const, label: "Calcul de l'estimation", ic: Brain },
                    { id: "report" as const, label: "Génération du rapport", ic: FileText },
                  ].map((s, i) => {
                    const threshold = [45, 70, 88, 96][i];
                    const isDone = progressPct >= threshold;
                    const isCurrent = s.id === progressStep;
                    const Icon = s.ic;
                    return (
                      <motion.div
                        key={s.id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + i * 0.06 }}
                        className={cn(
                          "flex items-center gap-2.5 sm:gap-3 rounded-xl p-2.5 sm:p-3 transition-all duration-500",
                          isCurrent ? "bg-white/15 backdrop-blur-sm ring-1 ring-white/10" :
                          isDone ? "bg-white/5" : "bg-white/5 opacity-40"
                        )}
                      >
                        <div className={cn(
                          "flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-lg transition-all duration-500",
                          isDone ? "bg-emerald-400/30 text-emerald-300" :
                          isCurrent ? "bg-white/20 text-white" : "bg-white/10 text-white/50"
                        )}>
                          {isDone ? (
                            <Check className="size-3.5 sm:size-4" strokeWidth={3} />
                          ) : isCurrent ? (
                            <RefreshCw className="size-3.5 sm:size-4 animate-spin" />
                          ) : (
                            <Icon className="size-3.5 sm:size-4" />
                          )}
                        </div>
                        <span className={cn(
                          "text-xs sm:text-sm font-medium transition-all",
                          isDone ? "text-emerald-200" : isCurrent ? "text-white" : "text-white/50"
                        )}>{s.label}</span>
                        <div className="ml-auto">
                          {isDone ? (
                            <span className="text-[10px] sm:text-xs sm:text-[10px] font-medium text-emerald-300/70">✓ Terminé</span>
                          ) : isCurrent ? (
                            <motion.div
                              animate={{ opacity: [1, 0.3, 1] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                              className="size-2 rounded-full bg-emerald-400"
                            />
                          ) : null}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                <div className="mt-5 sm:mt-6 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                <motion.p
                  animate={{ opacity: [0.4, 0.8, 0.4] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                  className="mt-3 text-[10px] sm:text-xs text-blue-200/50"
                >
                  Veuillez patienter pendant le traitement...
                </motion.p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ═══ FORM CARD ═══ */}
        <Card className={cn(
          "border-slate-200/70 dark:border-slate-800/70 shadow-sm dark:shadow-slate-900/20 rounded-xl sm:rounded-2xl overflow-hidden transition-all duration-300",
          loading && "hidden"
        )}>
          <CardContent className="p-4 sm:p-6">
            {/* ── Personnalisation : vendeur ou acheteur ── */}
            <div className="mb-5 sm:mb-6 rounded-xl border border-blue-100 dark:border-blue-900/50 bg-gradient-to-br from-blue-50/70 via-white to-sky-50/50 dark:from-blue-950/30 dark:via-slate-900/50 dark:to-sky-950/20 p-3.5 sm:p-4">
              <div className="flex items-start gap-2.5 mb-3">
                <div className="flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 text-white">
                  <Target className="size-4" />
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
                  { value: "vendre", label: "Je veux vendre mon bien", emoji: "🏠" },
                  { value: "acheter", label: "Je veux acheter un bien", emoji: "🔎" },
                ]}
                value={need}
                onChange={(v) => setNeed(v as "vendre" | "acheter")}
                accent="blue"
                size="lg"
                ariaLabel="Votre besoin pour cette estimation"
              />
              <p className="mt-2.5 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                {need === "vendre" ? (
                  <>👨‍💼 <span className="font-semibold text-blue-700 dark:text-blue-300">Profil vendeur</span> — interprétation du prix de vente, fixation du prix, mise en valeur et conseils pour vendre vite.</>
                ) : (
                  <>🕵️ <span className="font-semibold text-blue-700 dark:text-blue-300">Profil acheteur</span> — référence d'achat, analyse du positionnement, négociation et points à vérifier avant d'acheter.</>
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
                {/* ═══════════ STEP 0 — Localisation ═══════════ */}
                {step === 0 && (
                  <div className="space-y-3 sm:space-y-4">
                    {/* Address with map */}
                    <div className="space-y-1.5">
                      <Label className={cn(
                        "text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all duration-300",
                        f.latitude
                          ? "text-emerald-700 dark:text-emerald-300"
                          : "text-slate-700 dark:text-slate-300"
                      )}>
                        <div className={cn(
                          "flex size-5 sm:size-6 items-center justify-center rounded-lg transition-all duration-300",
                          f.latitude
                            ? "bg-emerald-100 dark:bg-emerald-900/40"
                            : "bg-blue-100 dark:bg-blue-900/40"
                        )}>
                          {f.latitude ? (
                            <Check className="size-3 sm:size-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={3} />
                          ) : (
                            <MapPin className="size-3 sm:size-3.5 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        {f.latitude ? "Position récupérée" : "Adresse du bien"}
                      </Label>
                      <p className={cn(
                        "text-[10px] sm:text-xs -mt-0.5 transition-all duration-300",
                        f.latitude
                          ? "text-emerald-500 dark:text-emerald-400 font-medium"
                          : "text-slate-400 dark:text-slate-500"
                      )}>
                        {f.latitude
                          ? "✓ Coordonnées GPS enregistrées"
                          : "Activer la localisation pour afficher ma position"
                        }
                      </p>
                      <Suspense fallback={
                        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4">
                          <div className="flex items-center gap-2">
                            <div className="size-5 rounded-full border-2 border-blue-200 border-t-blue-500 animate-spin" />
                            <p className="text-xs text-slate-400 dark:text-slate-500">Chargement...</p>
                          </div>
                        </div>
                      }>
                        <LocationPicker
                          onLocationChange={handleLoc}
                          autoLocate
                        />
                      </Suspense>
                    </div>

                    <Separator className="dark:bg-slate-800" />

                    {/* Administrative location */}
                    <div>
                      <div className="flex items-center gap-2 mb-2 sm:mb-3">
                        <div className="h-px flex-1 bg-gradient-to-r from-slate-100 to-transparent dark:from-slate-800" />
                        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Localisation</span>
                        <div className="h-px flex-1 bg-gradient-to-l from-slate-100 to-transparent dark:from-slate-800" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                        <div className="space-y-1">
                          <Label className="text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400">
                            Gouvernorat <span className="text-red-400">*</span>
                          </Label>
                          <button
                            type="button"
                            onClick={() => setGovSheetOpen(true)}
                            className={cn(
                              "flex items-center justify-between w-full rounded-xl border h-10 sm:h-11 px-3 sm:px-4 text-xs sm:text-sm transition-all",
                              f.gouvernorat
                                ? "border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-300 font-semibold"
                                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500"
                            )}
                          >
                            <span className={cn(f.gouvernorat ? "text-blue-700 dark:text-blue-300" : "text-slate-400 dark:text-slate-500")}>
                              {f.gouvernorat || "Sélectionner"}
                            </span>
                            <ChevronRight className="size-3.5 sm:size-4 shrink-0 opacity-50" />
                          </button>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400">
                            Ville <span className="text-red-400">*</span>
                          </Label>
                          <button
                            type="button"
                            onClick={() => f.gouvernorat && setVilleSheetOpen(true)}
                            disabled={!f.gouvernorat}
                            className={cn(
                              "flex items-center justify-between w-full rounded-xl border h-10 sm:h-11 px-3 sm:px-4 text-xs sm:text-sm transition-all",
                              f.ville
                                ? "border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-300 font-semibold"
                                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500",
                              !f.gouvernorat && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <span>{f.ville || (f.gouvernorat ? "Sélectionner" : "—")}</span>
                            <ChevronRight className="size-3.5 sm:size-4 shrink-0 opacity-50" />
                          </button>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400">Quartier</Label>
                          <button
                            type="button"
                            onClick={() => f.ville && setQuartierSheetOpen(true)}
                            disabled={!f.ville}
                            className={cn(
                              "flex items-center justify-between w-full rounded-xl border h-10 sm:h-11 px-3 sm:px-4 text-xs sm:text-sm transition-all",
                              f.quartier
                                ? "border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-300 font-semibold"
                                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500",
                              !f.ville && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <span>{f.quartier || (f.ville ? "Sélectionner" : "—")}</span>
                            <ChevronRight className="size-3.5 sm:size-4 shrink-0 opacity-50" />
                          </button>
                        </div>
                      </div>

                      {/* Location sheets */}
                      <LocationSheet
                        open={govSheetOpen}
                        onOpenChange={setGovSheetOpen}
                        title="Gouvernorat"
                        description="Sélectionnez le gouvernorat de votre bien"
                        items={GOVERNORATS}
                        selected={f.gouvernorat}
                        onSelect={(v) => upd("gouvernorat", v)}
                        extraInfo={villeCountByGov}
                      />
                      <LocationSheet
                        open={villeSheetOpen}
                        onOpenChange={setVilleSheetOpen}
                        title="Ville"
                        description={f.gouvernorat ? `Sélectionnez une ville dans le gouvernorat de ${f.gouvernorat}` : "Sélectionnez d'abord un gouvernorat"}
                        items={villes}
                        selected={f.ville}
                        onSelect={(v) => upd("ville", v)}
                        extraInfo={quartierCountByVille}
                      />
                      <LocationSheet
                        open={quartierSheetOpen}
                        onOpenChange={setQuartierSheetOpen}
                        title="Quartier"
                        description={f.ville ? `Sélectionnez un quartier à ${f.ville}` : "Sélectionnez d'abord une ville"}
                        items={quartiers}
                        selected={f.quartier}
                        onSelect={(v) => upd("quartier", v)}
                      />
                    </div>

                    {/* Price indicator card */}
                    {f.gouvernorat && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl border border-blue-200/60 dark:border-blue-800/50 bg-gradient-to-br from-blue-50 via-white to-blue-50/80 dark:from-blue-950/30 dark:via-slate-900/50 dark:to-blue-950/20 overflow-hidden shadow-sm"
                      >
                        <div className="h-1 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600" />
                        <div className="p-3 sm:p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm">
                                <Brain className="size-4 sm:size-4.5 text-white" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                                  📍 {f.ville || f.gouvernorat}{f.quartier ? ` — ${f.quartier}` : ""}
                                </p>
                                <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500">
                                  Marché tunisien · Appartement
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm sm:text-base font-bold bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-400 dark:to-blue-300 bg-clip-text text-transparent">
                                {getBasePrice(f.gouvernorat, "appartement").toLocaleString("fr-FR")} TND
                              </p>
                              <p className="text-[10px] sm:text-xs sm:text-[10px] text-slate-400 dark:text-slate-500">/ m² indicatif</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* ═══════════ STEP 1 — Type & Surface ═══════════ */}
                {step === 1 && (
                  <div className="space-y-3 sm:space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <div className="flex size-5 sm:size-6 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
                          <Building2 className="size-3 sm:size-3.5 text-blue-600 dark:text-blue-400" />
                        </div>
                        Type de bien <span className="text-red-400">*</span>
                      </Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2 max-h-52 sm:max-h-60 overflow-y-auto pr-0.5 scrollbar-thin">
                        {TYPES.map((t) => {
                          const selected = f.propertyType === t.v;
                          const Icon = TYPE_ICONS[t.v] || Building2;
                          return (
                            <button key={t.v} type="button" onClick={() => upd("propertyType", t.v)}
                              aria-pressed={f.propertyType === t.v}
                              className={cn(
                                "group relative flex items-center gap-2 sm:gap-2.5 rounded-xl border-2 px-3 sm:px-3.5 py-2.5 sm:py-3 text-left text-xs sm:text-sm transition-all duration-200",
                                selected
                                  ? "border-blue-400 dark:border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/30 dark:to-blue-800/20 text-blue-700 dark:text-blue-300 shadow-sm"
                                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:shadow-sm"
                              )}
                            >
                              <div className={cn(
                                "flex size-7 sm:size-8 items-center justify-center rounded-lg transition-all duration-200",
                                selected
                                  ? "bg-blue-500 text-white shadow-xs"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 group-hover:bg-slate-200 dark:group-hover:bg-slate-700"
                              )}>
                                <Icon className="size-3.5 sm:size-4" />
                              </div>
                              <span className="font-semibold leading-tight">{t.l}</span>
                              {selected && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                                  className="absolute -top-1.5 -right-1.5 sm:static sm:ml-auto"
                                >
                                  <div className="flex size-4 sm:size-5 items-center justify-center rounded-full bg-blue-500 text-white shadow-xs">
                                    <Check className="size-2.5 sm:size-3" strokeWidth={3} />
                                  </div>
                                </motion.div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <Separator className="dark:bg-slate-800" />

                    {!f.propertyType ? (
                      <div className="rounded-xl border-2 border-dashed border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/10 p-4 sm:p-6 text-center">
                        <p className="text-xs sm:text-sm font-medium text-amber-700 dark:text-amber-400">
                          Sélectionnez d'abord un type de bien ci-dessus
                        </p>
                      </div>
                    ) : (() => {
                      const sf = getSurfaceFields(f.propertyType);
                      return (
                        <>
                          <div>
                            <div className="flex items-center gap-2 mb-2 sm:mb-3">
                              <div className="flex size-5 sm:size-6 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
                                <Ruler className="size-3 sm:size-3.5 text-blue-600 dark:text-blue-400" />
                              </div>
                              <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                                {sf.terrainSurface && !sf.builtSurface
                                  ? "Surface du terrain"
                                  : "Surfaces"}
                              </span>
                            </div>
                            <div className={cn(
                              "grid gap-2.5 sm:gap-3",
                              sf.builtSurface && sf.terrainSurface
                                ? "grid-cols-1 sm:grid-cols-2"
                                : "grid-cols-1 max-w-xs"
                            )}>
                              {sf.builtSurface && (
                                <div className="space-y-1">
                                  <Label htmlFor="bs" className="text-[10px] sm:text-xs sm:text-xs font-medium text-slate-600 dark:text-slate-400">
                                    Surface bâtie (m²) <span className="text-red-400">*</span>
                                  </Label>
                                  <div className="relative">
                                    <Ruler className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 size-3.5 sm:size-4 text-slate-400 pointer-events-none" />
                                    <Input id="bs" type="number" placeholder="ex: 120" value={f.builtSurface} onChange={(e) => upd("builtSurface", e.target.value)}
                                      className={cn(
                                        "rounded-xl border-slate-200 dark:border-slate-700 h-10 sm:h-11 pl-9 sm:pl-10 text-xs sm:text-sm font-semibold transition-all [&::-webkit-inner-spin-button]:appearance-none",
                                        f.builtSurface && "border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10"
                                      )} />
                                  </div>
                                </div>
                              )}
                              {sf.terrainSurface && (
                                <div className="space-y-1">
                                  <Label htmlFor="ts" className="text-[10px] sm:text-xs sm:text-xs font-medium text-slate-600 dark:text-slate-400">
                                    Terrain (m²) <span className="text-red-400">*</span>
                                  </Label>
                                  <div className="relative">
                                    <LandPlot className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 size-3.5 sm:size-4 text-slate-400 pointer-events-none" />
                                    <Input id="ts" type="number" placeholder="ex: 500" value={f.terrainSurface} onChange={(e) => upd("terrainSurface", e.target.value)}
                                      className={cn(
                                        "rounded-xl border-slate-200 dark:border-slate-700 h-10 sm:h-11 pl-9 sm:pl-10 text-xs sm:text-sm font-semibold transition-all [&::-webkit-inner-spin-button]:appearance-none",
                                        f.terrainSurface && "border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10"
                                      )} />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {sf.floors && (
                            <div className="space-y-1">
                              <Label htmlFor="fl" className="text-[10px] sm:text-xs sm:text-xs font-medium text-slate-600 dark:text-slate-400">Nombre d'étages</Label>
                              <NumericStepper value={f.floors} onChange={(v) => upd("floors", v)} min={0} max={50} placeholder="2" />
                            </div>
                          )}

                          {/* Info badge for non-residential */}
                          {!sf.floors && (
                            <div className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5">
                              <EyeOff className="size-4 text-slate-400 shrink-0" />
                              <p className="text-[10px] sm:text-xs text-slate-400">
                                Nombre d'étages non applicable pour ce type de bien
                              </p>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* ═══════════ STEP 2 — Pièces (adaptées au type) ═══════════ */}
                {step === 2 && (
                  <div className="space-y-3 sm:space-y-4">
                    {!f.propertyType ? (
                      <div className="rounded-xl border-2 border-dashed border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/10 p-4 sm:p-6 text-center">
                        <p className="text-xs sm:text-sm font-medium text-amber-700 dark:text-amber-400">
                          Veuillez d'abord sélectionner un type de bien à l'étape précédente
                        </p>
                      </div>
                    ) : (() => {
                      const rooms = getVisibleRooms(f.propertyType);
                      if (rooms.length === 0) {
                        return (
                          <div className="rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 p-4 sm:p-6 text-center">
                            <div className="flex items-center justify-center gap-2 mb-1">
                              <BedDouble className="size-4 sm:size-5 text-slate-300" />
                              <span className="text-xs sm:text-sm font-semibold text-slate-400">Pièces</span>
                            </div>
                            <p className="text-[10px] sm:text-xs text-slate-400">
                              Aucune pièce à renseigner pour ce type de bien
                            </p>
                            <Button
                              type="button"
                              onClick={() => go(3)}
                              className="mt-3 h-8 sm:h-9 text-xs rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              Passer aux équipements
                              <ChevronRight className="size-3 ml-1" />
                            </Button>
                          </div>
                        );
                      }
                      return (
                        <>
                          <Label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <div className="flex size-5 sm:size-6 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
                              <BedDouble className="size-3 sm:size-3.5 text-blue-600 dark:text-blue-400" />
                            </div>
                            {(() => {
                              const residential = ["maison", "villa", "appartement", "studio", "duplex", "immeuble", "mixte", "ferme"];
                              return residential.includes(f.propertyType) ? "Nombre de pièces" : "Équipements du local";
                            })()}
                          </Label>
                          <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 -mt-2 sm:-mt-3 leading-relaxed">
                            Recommandé pour une estimation plus précise — laissez vide si non applicable.
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                            {rooms.map((rm) => (
                              <div key={rm.k} className="p-2.5 sm:p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                                <div className="flex items-center gap-1.5 mb-1.5 sm:mb-2">
                                  <rm.ic className="size-3 sm:size-3.5 text-slate-400" />
                                  <Label htmlFor={rm.k} className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">{rm.l}</Label>
                                </div>
                                <NumericStepper value={f[rm.k]} onChange={(v) => upd(rm.k, v)} min={0} max={50} placeholder="0" />
                              </div>
                            ))}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* ═══════════ STEP 3 — Équipements & Photos (adaptés au type) ═══════════ */}
                {step === 3 && (
                  <div className="space-y-3 sm:space-y-4">
                    {!f.propertyType ? (
                      <div className="rounded-xl border-2 border-dashed border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/10 p-4 sm:p-6 text-center">
                        <p className="text-xs sm:text-sm font-medium text-amber-700 dark:text-amber-400">
                          Veuillez d'abord sélectionner un type de bien à l'étape précédente
                        </p>
                      </div>
                    ) : (() => {
                      const equipment = getVisibleEquipment(f.propertyType);
                      if (equipment.length === 0) {
                        return (
                          <div className="rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 p-4 sm:p-6 text-center">
                            <div className="flex items-center justify-center gap-2 mb-1">
                              <Sparkles className="size-4 sm:size-5 text-slate-300" />
                              <span className="text-xs sm:text-sm font-semibold text-slate-400">Équipements</span>
                            </div>
                            <p className="text-[10px] sm:text-xs text-slate-400">
                              Aucun équipement à renseigner pour ce type de bien
                            </p>
                          </div>
                        );
                      }
                      return (
                        <div>
                          <Label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-2 sm:mb-3">
                            <div className="flex size-5 sm:size-6 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
                              <Sparkles className="size-3 sm:size-3.5 text-blue-600 dark:text-blue-400" />
                            </div>
                            Équipements
                          </Label>
                          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                            {equipment.map((fe) => {
                              const active = f[fe.k];
                              return (
                                <button key={fe.k} type="button" onClick={() => upd(fe.k, !active)}
                                  aria-pressed={active}
                                  className={cn(
                                    "group relative flex flex-col items-center justify-center gap-1 sm:gap-1.5 rounded-xl border-2 px-1.5 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-all duration-200",
                                    active
                                      ? "border-blue-400 dark:border-blue-500 bg-gradient-to-b from-blue-50 to-blue-100/50 dark:from-blue-900/30 dark:to-blue-800/20 text-blue-700 dark:text-blue-300 shadow-xs"
                                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
                                  )}
                                >
                                  <span className="text-base sm:text-lg leading-none">{fe.e}</span>
                                  <span className="text-[10px] sm:text-xs sm:text-[10px] sm:text-xs font-semibold">{fe.l}</span>
                                  {active && (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      transition={{ type: "spring", stiffness: 400, damping: 15 }}
                                      className="absolute -top-1.5 -right-1.5 flex size-4 sm:size-5 items-center justify-center rounded-full bg-blue-500 text-white shadow-xs"
                                    >
                                      <Check className="size-2.5 sm:size-3" strokeWidth={3} />
                                    </motion.div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    <Separator className="dark:bg-slate-800" />

                    <div>
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                        <div className="flex size-6 sm:size-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 shadow-xs">
                          <Brain className="size-3 sm:size-3.5 text-white" />
                        </div>
                        <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">Analyse IA des photos</span>
                        <Badge className="rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border-0 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 font-semibold">+ PRÉCIS</Badge>
                      </div>
                      <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mb-2 sm:mb-3 leading-relaxed">
                        Ajoutez des photos — l'IA analyse la qualité des finitions et l'état général.
                      </p>

                      {/* Photo previews */}
                      {previews.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                          {previews.map((preview, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, scale: 0.85 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ type: "spring", stiffness: 300, damping: 20 }}
                              className="relative group"
                            >
                              <img src={preview} alt={`Photo ${i + 1}`}
                                className="size-16 sm:size-20 rounded-xl object-cover border-2 border-slate-200 dark:border-slate-700 shadow-xs group-hover:shadow-sm transition-shadow" />
                              <button onClick={() => removePhoto(i)}
                                className="absolute -top-1.5 sm:-top-2 -right-1.5 sm:-right-2 flex size-4 sm:size-5 items-center justify-center rounded-full bg-red-500 text-white shadow-md opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110">
                                <X className="size-2.5 sm:size-3" />
                              </button>
                              {ap.status === "complete" && (
                                <div className="absolute bottom-1 right-1 size-4 sm:size-5 rounded-full bg-emerald-500 flex items-center justify-center shadow-xs">
                                  <Check className="size-2.5 sm:size-3 text-white" strokeWidth={3} />
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      )}

                      {/* Upload zone */}
                      <label className={cn(
                        "group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 sm:p-6 cursor-pointer transition-all duration-200 overflow-hidden",
                        previews.length > 0
                          ? "border-violet-300 dark:border-violet-700 bg-violet-50/30 dark:bg-violet-900/10 hover:bg-violet-50/50 dark:hover:bg-violet-900/20"
                          : "border-violet-200 dark:border-violet-800 bg-violet-50/20 dark:bg-violet-900/5 hover:border-violet-300 dark:hover:border-violet-600 hover:bg-violet-50/40 dark:hover:bg-violet-900/15"
                      )}>
                        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
                          style={{ backgroundImage: `radial-gradient(circle at 25px 25px, currentColor 1px, transparent 0)`, backgroundSize: '50px 50px' }} />
                        <div className={cn(
                          "flex size-10 sm:size-12 items-center justify-center rounded-2xl transition-all duration-200 mb-1.5 sm:mb-2",
                          previews.length > 0
                            ? "bg-violet-100 dark:bg-violet-900/40 group-hover:scale-110"
                            : "bg-violet-100 dark:bg-violet-900/40 group-hover:bg-violet-200 dark:group-hover:bg-violet-800/50 group-hover:scale-110"
                        )}>
                          <Camera className={cn(
                            "size-5 sm:size-6 transition-colors",
                            previews.length > 0 ? "text-violet-600 dark:text-violet-400" : "text-violet-400 dark:text-violet-500"
                          )} />
                        </div>
                        <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors">
                          {photos.length > 0 ? "Ajouter plus de photos" : "Sélectionner des photos"}
                        </p>
                        <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          Photos du bien, pièces, façade, extérieur
                        </p>
                        <input ref={inputRef} type="file" accept="image/*" multiple onChange={handlePhotos} className="hidden" />
                        {photos.length > 0 && (
                          <motion.p
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400"
                          >
                            ✓ {photos.length} photo{photos.length > 1 ? "s" : ""} ajoutée{photos.length > 1 ? "s" : ""}
                          </motion.p>
                        )}
                      </label>
                    </div>
                  </div>
                )}

                {/* ═══════════ STEP 4 — État général ═══════════ */}
                {step === 4 && (
                  <div className="space-y-3 sm:space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <div className="flex size-5 sm:size-6 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
                          <Paintbrush className="size-3 sm:size-3.5 text-blue-600 dark:text-blue-400" />
                        </div>
                        État général <span className="text-red-400">*</span>
                      </Label>
                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        {STATES.map((s) => {
                          const sel = f.generalState === s.v;
                          const Icon = s.ic;
                          return (
                            <button key={s.v} type="button" onClick={() => upd("generalState", s.v)}
                              className={cn(
                                "group rounded-xl border-2 p-3 sm:p-4 text-left transition-all duration-200",
                                sel
                                  ? s.c + " shadow-sm border-current"
                                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 hover:shadow-sm"
                              )}
                            >
                              <div className="flex items-center gap-2 sm:gap-2.5 mb-1">
                                <div className={cn(
                                  "flex size-7 sm:size-8 items-center justify-center rounded-lg transition-all duration-200",
                                  sel ? "bg-white/80 dark:bg-white/10" : "bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-200 dark:group-hover:bg-slate-700"
                                )}>
                                  <Icon className={cn("size-3.5 sm:size-4", sel ? "text-current" : "text-slate-400")} />
                                </div>
                                <p className="font-bold text-xs sm:text-sm">{s.l}</p>
                                {sel && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                                    className="ml-auto"
                                  >
                                    <Check className="size-3.5 sm:size-4" strokeWidth={3} />
                                  </motion.div>
                                )}
                              </div>
                              <p className="text-[10px] sm:text-xs opacity-65 ml-9 sm:ml-10">{s.d}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {f.propertyType && getYearBuiltVisible(f.propertyType) && (
                      <>
                        <Separator className="dark:bg-slate-800" />
                        <div className="space-y-1">
                          <Label htmlFor="yb" className="text-[10px] sm:text-xs sm:text-xs font-medium text-slate-600 dark:text-slate-400">Année de construction</Label>
                          <div className="relative">
                            <CalendarDays className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 size-3.5 sm:size-4 text-slate-400 pointer-events-none" />
                            <Input id="yb" type="number" placeholder="ex: 2010" value={f.yearBuilt} onChange={(e) => upd("yearBuilt", e.target.value)}
                              className={cn(
                                "rounded-xl border-slate-200 dark:border-slate-700 h-10 sm:h-11 pl-9 sm:pl-10 text-xs sm:text-sm transition-all [&::-webkit-inner-spin-button]:appearance-none",
                                f.yearBuilt && "border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10"
                              )} />
                          </div>
                        </div>
                      </>
                    )}

                    {f.propertyType && !getYearBuiltVisible(f.propertyType) && (
                      <div className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5">
                        <EyeOff className="size-4 text-slate-400 shrink-0" />
                        <p className="text-[10px] sm:text-xs text-slate-400">
                          Année de construction non applicable pour ce type de bien
                        </p>
                      </div>
                    )}

                    {ar && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl bg-gradient-to-r from-violet-50 to-blue-50 dark:from-violet-950/50 dark:to-blue-950/50 border border-violet-200/60 dark:border-violet-900/50 p-3 sm:p-4 overflow-hidden relative"
                      >
                        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-violet-400 via-blue-400 to-violet-400" />
                        <div className="flex items-start gap-2.5 sm:gap-3">
                          <div className="flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/40">
                            <Sparkles className="size-3.5 sm:size-4 text-violet-600 dark:text-violet-400" />
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">Analyse IA de vos photos</p>
                            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1 leading-relaxed">
                              Qualité estimée : <strong>{Math.round(ar.aggregated.qualityScore * 100)}%</strong>
                              {' · '}
                              <span className="font-semibold text-violet-700 dark:text-violet-400">
                                {ar.aggregated.imageBasedState === "luxe" ? "Luxe" :
                                 ar.aggregated.imageBasedState === "excellent_etat" ? "Excellent" :
                                 ar.aggregated.imageBasedState === "bon_etat" ? "Bon état" : "À rénover"}
                              </span>
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>

      {/* ═══ BOTTOM BAR ═══ */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/70 dark:border-slate-800/70 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl shadow-lg shadow-slate-200/20 dark:shadow-slate-900/20 px-3 sm:px-4 py-2.5 sm:py-3 safe-area-bottom">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 sm:gap-3">
          <button onClick={() => { if (step === 0) nav("/dashboard"); else go(step - 1); }}
            className="flex items-center gap-1 sm:gap-1.5 rounded-xl h-9 sm:h-11 px-3 sm:px-4 text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
            aria-label={step === 0 ? "Annuler" : "Retour"}>
            <ChevronLeft className="size-3.5 sm:size-4" />
            <span>{step === 0 ? "Annuler" : "Retour"}</span>
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-400 dark:text-slate-500">
              <span className="font-medium text-slate-500 dark:text-slate-400">{step + 1}</span>
              <span>/</span>
              <span>{STEPS.length}</span>
            </div>

            {step < STEPS.length - 1 ? (
              <motion.button
                whileTap={valid() ? { scale: 0.97 } : undefined}
                onClick={() => go(step + 1)}
                disabled={!valid()}
                className={cn(
                  "flex items-center gap-1 sm:gap-1.5 rounded-xl h-9 sm:h-11 px-4 sm:px-6 text-xs sm:text-sm font-semibold transition-all duration-200",
                  valid()
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-sm shadow-blue-200/50 dark:shadow-blue-900/30 hover:shadow-md hover:from-blue-700 hover:to-blue-800 active:shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed"
                )}
              >
                Suivant
                <ChevronRight className="size-3.5 sm:size-4" />
              </motion.button>
            ) : (
              <motion.button
                whileTap={!loading && valid() ? { scale: 0.97 } : undefined}
                onClick={submit}
                disabled={loading || !valid()}
                className={cn(
                  "flex items-center gap-1.5 sm:gap-2 rounded-xl h-9 sm:h-11 px-4 sm:px-6 text-xs sm:text-sm font-semibold transition-all duration-200",
                  loading
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-wait"
                    : valid()
                      ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-200/50 dark:shadow-emerald-900/30 hover:shadow-lg hover:from-emerald-600 hover:to-emerald-700 active:shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed"
                )}
              >
                {loading ? (
                  <><RefreshCw className="size-3.5 sm:size-4 animate-spin" /> Traitement...</>
                ) : (
                  <><Brain className="size-3.5 sm:size-4" /> {step === STEPS.length - 1 ? "Estimer mon bien" : "Estimer"}</>
                )}
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
