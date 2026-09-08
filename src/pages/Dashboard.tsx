import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PAYMENT_METHODS } from "@/convex/defaults";

import { useAuth } from "@/hooks/use-auth";
import { daysUntilNextReset } from "@/lib/utils";
import { RENT_PROPERTY_TYPES_LABELS, GOVERNORATS, PROPERTY_TYPES, PROPERTY_TYPES_LABELS } from "@/convex/types";
import { ThemeToggle } from "@/components/ThemeProvider";
import { AnnouncementSection } from "@/components/announcements/AnnouncementSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  LayoutDashboard, LogOut, Plus, Home, TrendingUp, FileText,
  Clock, BarChart3, Download, Share2, Trash2,
  Building2, MapPin, ChevronRight, Search, Settings,
  User, Wallet, History, PieChart, Eye, List, Grid3X3,
  ArrowUpDown, Filter, X, CalendarDays, Navigation, Crosshair,
  Globe, Maximize2, Minimize2, Sparkles, Brain, CheckCircle2,
  ArrowRight, Star, Ruler, AtSign, Loader2, Phone, Camera,
  Send, Building, CheckCircle, AlertCircle, MessageSquare, Shield, ShieldCheck, Zap,
  Inbox, Reply, CheckCheck, Mail, KeyRound, Percent, Bell, Scale, CheckSquare,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { saveCompareSelection, typeLabel as compareTypeLabel } from "./Compare";
import type { CompareEntry } from "./Compare";
import { motion } from "framer-motion";
import {
  LineChart as RechartsLineChart,
  Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import MapResizer from "@/components/MapResizer";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet marker icons
// @ts-ignore
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function createColoredIcon(color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28"><path fill="${color}" d="M12 0C7.8 0 4 3.8 4 8c0 5.4 8 16 8 16s8-10.6 8-16c0-4.2-3.8-8-8-8zm0 11c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z"/></svg>`;
  return L.divIcon({ html: svg, className: "", iconSize: [28, 28], iconAnchor: [14, 28], popupAnchor: [0, -28] });
}

const MARKER_COLORS: Record<string, string> = {
  appartement: "#3b82f6", maison: "#10b981", villa: "#f59e0b", studio: "#8b5cf6",
  duplex: "#06b6d4", immeuble: "#6366f1", local_commercial: "#f97316", bureau: "#64748b",
  magasin: "#f43f5e", terrain_constructible: "#84cc16", terrain_agricole: "#22c55e",
  ferme: "#d97706", garage: "#6b7280", parking: "#a855f7", depot: "#78716c",
};

function getMarkerIcon(type?: string) {
  return createColoredIcon(MARKER_COLORS[type || ""] || "#3b82f6");
}

function MapBounds({ markers }: { markers: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length === 1) map.setView(markers[0], 13);
    else if (markers.length > 1) {
      const bounds = L.latLngBounds(markers);
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [markers, map]);
  return null;
}

/** Shared price formatter — also used by EstimationResult, Auth page, etc. */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", maximumFractionDigits: 0 }).format(price);
}

/** Format a large price in thousands (K) — used by the "Valeur totale" stat */
export function formatPriceK(price: number): string {
  if (price >= 1_000_000) {
    return (price / 1_000_000).toFixed(1).replace(".0", "") + "M TND";
  }
  if (price >= 1_000) {
    return (price / 1_000).toFixed(0) + "K TND";
  }
  return formatPrice(price);
}

type ViewMode = "list" | "grid";
type SortKey = "date" | "value" | "confidence";

/** Accent colour used on every card */
const CARD_CLS = "border-0 bg-white/95 dark:bg-slate-900/95 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)] rounded-2xl overflow-hidden relative";

/** Top accent bar (matches Auth page) */
function CardAccent({ color = "from-emerald-500 via-emerald-400 to-teal-400" }: { color?: string }) {
  return <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${color} opacity-60`} />;
}

/** Plan badge icon (matches Pricing page plan icons) */
function planIcon(type: string) {
  const cls = "size-3 sm:size-3.5 shrink-0";
  switch (type) {
    case "pro": return <Zap className={cls} />;
    case "expert": return <Sparkles className={cls} />;
    case "agence": return <Building2 className={cls} />;
    default: return <Shield className={cls} />;
  }
}

/** Plan badge color: Free = green, Pro = blue, Expert = gold, Agence = orange */
function planBadgeClass(type: string) {
  switch (type) {
    case "pro":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/50";
    case "expert":
      return "bg-amber-50 text-amber-700 ring-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/50";
    case "agence":
      return "bg-orange-50 text-orange-700 ring-orange-200/70 dark:bg-orange-950/40 dark:text-orange-300 dark:ring-orange-800/60 hover:bg-orange-100 dark:hover:bg-orange-900/50";
    default:
      return "bg-emerald-50 text-emerald-700 ring-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/50";
  }
}

const STAT_CARDS = [
  { label: "Estimations", key: "total", icon: BarChart3, gradient: "from-emerald-500 to-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400", accent: "from-emerald-500 to-emerald-400" },
  { label: "Confiance moy.", key: "confidence", icon: Brain, gradient: "from-teal-500 to-teal-600", bg: "bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400", accent: "from-teal-500 to-teal-400" },
  { label: "Valeur totale", key: "value", icon: Wallet, gradient: "from-amber-500 to-amber-600", bg: "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400", accent: "from-amber-500 to-amber-400" },
  { label: "Biens", key: "properties", icon: Building2, gradient: "from-violet-500 to-violet-600", bg: "bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400", accent: "from-violet-500 to-violet-400" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const estimations = useQuery(api.estimation.getUserEstimations) || [];
  const properties = useQuery(api.properties.getUserProperties) || [];
  const rentEstimations = useQuery(api.rent.getUserRentEstimations) || [];
  const seedPartners = useMutation(api.partners.seedPartners);

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [showFilters, setShowFilters] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const updateProfile = useMutation(api.users.updateUserProfile);
  const confirmPayment = useMutation(api.plans.confirmManualPayment);
  const handleSignOut = async () => { await signOut(); navigate("/"); };

  // Sync profile fields when user data loads
  useEffect(() => {
    if (user?.name) setProfileName(user.name);
    if (user?.phone) setProfilePhone(user.phone);
    if (user?.image) setProfileAvatar(user.image);
    else setProfileAvatar(null);
  }, [user?.name, user?.phone, user?.image]);

  const handleAvatarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setProfileAvatar(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await updateProfile({
        name: profileName.trim() || undefined,
        phone: profilePhone.trim() || undefined,
        image: profileAvatar || undefined,
      });
      toast.success("Profil mis à jour", { description: "Vos informations ont été enregistrées." });
      setProfileOpen(false);
    } catch (e) {
      toast.error("Erreur", { description: "Impossible de mettre à jour le profil." });
    }
    setSavingProfile(false);
  };

  useEffect(() => { seedPartners().catch(() => {}); }, [seedPartners]);

  const filteredEstimations = useMemo(() => {
    if (!search) return estimations;
    const q = search.toLowerCase();
    return estimations.filter((e: any) =>
      e.property?.gouvernorat?.toLowerCase().includes(q) ||
      e.property?.ville?.toLowerCase().includes(q) ||
      e.property?.propertyType?.toLowerCase().includes(q) ||
      e.property?.address?.toLowerCase().includes(q) ||
      formatPrice(e.estimatedValue).includes(q)
    );
  }, [estimations, search]);

  const sortedEstimations = useMemo(() => {
    const arr = [...filteredEstimations];
    switch (sortKey) {
      case "value": return arr.sort((a: any, b: any) => b.estimatedValue - a.estimatedValue);
      case "confidence": return arr.sort((a: any, b: any) => (b.confidenceIndex || 0) - (a.confidenceIndex || 0));
      default: return arr.sort((a: any, b: any) => b._creationTime - a._creationTime);
    }
  }, [filteredEstimations, sortKey]);

  const mySub = useQuery(api.plans.mySubscription);
  const quota = useQuery(api.plans.remainingEstimations);
  const quotaRemaining = quota?.remaining ?? (mySub ? Math.max(mySub.estimationsLimit - mySub.estimationsUsed, 0) : 0);
  const planLabel = mySub
    ? mySub.planType === "start" ? "Free" : mySub.planType === "pro" ? "Pro" : mySub.planType === "agence" ? "Agence" : "Expert"
    : "";
  const myAgencyProfile = useQuery(api.agencies.getMyAgencyProfile);
  const paymentHistory = useQuery(api.plans.getPaymentHistory);

  // ── Inbox (messagerie) ──
  const inbox = useQuery(api.messages.getMyInbox);
  const inboxMessages = inbox?.messages || [];
  const unreadCount = inbox?.unread || 0;
  const markMessagesRead = useMutation(api.messages.markMessagesRead);
  const markAllMessagesRead = useMutation(api.messages.markAllMessagesRead);
  const sendUserMessage = useMutation(api.messages.sendUserMessage);
  const [selectedMsg, setSelectedMsg] = useState<any | null>(null);
  const [msgOpen, setMsgOpen] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  // ── i18n + Comparateur ──
  const { t } = useI18n();
  const [compareSel, setCompareSel] = useState<string[]>([]);
  const toggleCompare = (id: string) => {
    setCompareSel((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const openCompare = () => {
    const entries: CompareEntry[] = [];
    for (const e of estimations) {
      if (!compareSel.includes(e._id)) continue;
      entries.push({
        kind: "vente",
        id: e._id,
        title: compareTypeLabel(e.property?.propertyType),
        location: e.property?.ville || e.property?.gouvernorat || "N/A",
        propertyType: e.property?.propertyType || "",
        builtSurface: e.property?.builtSurface,
        gouvernorat: e.property?.gouvernorat,
        estimatedValue: e.estimatedValue,
        priceMin: e.priceMin,
        priceMax: e.priceMax,
        fastSalePrice: e.fastSalePrice,
        maxProfitPrice: e.maxProfitPrice,
        avgPricePerSqm: e.avgPricePerSqm,
        confidenceIndex: e.confidenceIndex,
        valueYear1: e.valueYear1,
        valueYear3: e.valueYear3,
        valueYear5: e.valueYear5,
      });
    }
    for (const r of rentEstimations) {
      if (!compareSel.includes(r._id)) continue;
      entries.push({
        kind: "loyer",
        id: r._id,
        title: compareTypeLabel(r.property?.propertyType),
        location: r.property?.quartier || r.property?.ville || r.property?.gouvernorat || "N/A",
        propertyType: r.property?.propertyType || "",
        builtSurface: r.property?.builtSurface,
        gouvernorat: r.property?.gouvernorat,
        estimatedRent: r.estimatedRent,
        rentMin: r.rentMin,
        rentMax: r.rentMax,
        grossYield: r.grossYield,
        confidenceIndex: r.confidenceIndex,
      });
    }
    saveCompareSelection(entries);
    navigate("/compare");
  };

  // ── Alertes prix ──
  const priceAlerts = useQuery(api.alerts.getMyPriceAlerts) || [];
  const createAlert = useMutation(api.alerts.createPriceAlert);
  const deleteAlert = useMutation(api.alerts.deletePriceAlert);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertGov, setAlertGov] = useState("Tunis");
  const [alertType, setAlertType] = useState("appartement");
  const [alertDir, setAlertDir] = useState<"above" | "below">("above");
  const [alertTarget, setAlertTarget] = useState("");
  const [savingAlert, setSavingAlert] = useState(false);

  const totalEstimations = estimations.length;
  const avgConfidence = estimations.length > 0
    ? Math.round(estimations.reduce((sum, e: any) => sum + (e.confidenceIndex || 0), 0) / estimations.length) : 0;
  const totalValue = estimations.length > 0
    ? estimations.reduce((sum: number, e: any) => sum + (e.estimatedValue || 0), 0) : 0;

  const confidenceHigh = estimations.filter((e: any) => (e.confidenceIndex || 0) >= 80).length;
  const confidenceMid = estimations.filter((e: any) => (e.confidenceIndex || 0) >= 60 && (e.confidenceIndex || 0) < 80).length;
  const confidenceLow = estimations.filter((e: any) => (e.confidenceIndex || 0) < 60).length;

  const typeBadgeClass = (type: string) => {
    const map: Record<string, string> = {
      appartement: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
      maison: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
      villa: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
      studio: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
      local_commercial: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
      terrain_constructible: "bg-lime-50 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300",
    };
    return map[type] || "bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  };

  const mapMarkers = useMemo(() => {
    return properties.filter((p: any) => p.latitude && p.longitude).map((p: any) => ({
      id: p._id, coords: [p.latitude, p.longitude] as [number, number],
      name: p.propertyType
        ? (p.propertyType === "appartement" ? "Appartement" : p.propertyType === "maison" ? "Maison" : p.propertyType === "villa" ? "Villa" : p.propertyType) : "Bien",
      surface: p.builtSurface, gouvernorat: p.gouvernorat, ville: p.ville, address: p.address,
      price: p.estimatedValue, estimationId: estimations.find((e: any) => e.propertyId === p._id)?._id, type: p.propertyType,
    }));
  }, [properties, estimations]);

  const statValues = [totalEstimations.toString(), `${avgConfidence}%`, formatPriceK(totalValue), properties.length.toString()];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 py-3 sm:py-6 pb-6 sm:pb-10">
        {/* ═══ HEADER ═══ */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center justify-between gap-3">
            {/* Greeting */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex size-9 sm:size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-500 shadow-md shadow-emerald-600/25 dark:shadow-emerald-900/50 hover:from-emerald-700 hover:to-emerald-600 transition-all cursor-pointer overflow-hidden"
                  >
                    {user?.image ? (
                      <img src={user.image} alt="Photo de profil" className="size-full object-cover" />
                    ) : (
                      <User className="size-4 sm:size-5 text-white" />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 rounded-xl p-1.5">
                  <DropdownMenuLabel className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-2 py-1.5">
                    Navigation
                  </DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => navigate("/dashboard")}
                    className="rounded-lg text-sm cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/50">
                    <LayoutDashboard className="size-4 text-emerald-500" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                      setProfileName(user?.name || "");
                      setProfilePhone(user?.phone || "");
                      setProfileAvatar(user?.image || null);
                      setProfileOpen(true);
                    }}
                    className="rounded-lg text-sm cursor-pointer"
                  >
                    <User className="size-4 text-emerald-500" />
                    Profil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/estimate")}
                    className="rounded-lg text-sm cursor-pointer"
                  >
                    <Plus className="size-4 text-emerald-500" />
                    Estimer (vente / achat)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/estimate/loyer/new")}
                    className="rounded-lg text-sm cursor-pointer"
                  >
                    <KeyRound className="size-4 text-emerald-500" />
                    Estimer un loyer
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/pricing")}
                    className="rounded-lg text-sm cursor-pointer"
                  >
                    <Sparkles className="size-4 text-amber-500" />
                    Forfaits
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/agencies")}
                    className="rounded-lg text-sm cursor-pointer"
                  >
                    <Building className="size-4 text-orange-500" />
                    Espace Agence
                  </DropdownMenuItem>
                  {user?.role === "admin" && (
                    <DropdownMenuItem onClick={() => navigate("/admin")}
                      className="rounded-lg text-sm cursor-pointer"
                    >
                      <ShieldCheck className="size-4 text-violet-500" />
                      Administration
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/settings")}
                    className="rounded-lg text-sm cursor-pointer"
                  >
                    <Settings className="size-4 text-slate-500" />
                    Paramètres
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut}
                    className="rounded-lg text-sm cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                  >
                    <LogOut className="size-4" />
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-slate-100 truncate leading-tight">
                  {user === undefined ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="size-4 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse inline-block" />
                      <span className="w-24 h-3 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                    </span>
                  ) : (
                    <>Bonjour{user?.name ?                        <span className="text-emerald-600 dark:text-emerald-400">, {user.name}</span> : ""}</>
                  )}
                </h1>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {user?.email && (
                    <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 truncate leading-tight">
                      {user.email}
                    </p>
                  )}
                  {mySub && mySub.status === "active" && (
                    <Badge
                      onClick={() => navigate("/pricing")}
                      title={`${planLabel} · ${quotaRemaining} estimation(s) restante(s) ce mois · Réinitialisation dans ${daysUntilNextReset()} jour${daysUntilNextReset() > 1 ? "s" : ""}`}
                      className={`group cursor-pointer rounded-full border-0 text-[10px] sm:text-xs font-semibold px-2.5 py-1 gap-1 ring-1 transition-all ${planBadgeClass(mySub.planType)}`}
                    >
                      {planIcon(mySub.planType)}
                      {planLabel} · {quotaRemaining} rest.
                    </Badge>
                  )}
                  {mySub && mySub.status === "active" && mySub.estimationsLimit > 0 && quotaRemaining > 0 && quotaRemaining <= mySub.estimationsLimit * 0.2 && (
                    <span
                      title="Quota presque épuisé — passez à un forfait supérieur"
                      className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 ring-1 ring-amber-300/60 dark:ring-amber-700/50 px-2 py-1 text-[10px] sm:text-xs font-bold text-amber-700 dark:text-amber-300"
                    >
                      <span className="relative flex size-2" aria-hidden="true">
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
                      </span>
                      Quota bas
                    </span>
                  )}
                  {!mySub && user && (
                    <Badge
                      onClick={() => navigate("/pricing")}
                      className="cursor-pointer rounded-full border-0 text-[10px] sm:text-xs font-medium px-2 py-0.5 bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                    >
                      Aucun forfait
                    </Badge>
                  )}
                  {mySub && mySub.status === "active" && mySub.planType === "expert" && myAgencyProfile && (
                    <Badge
                      onClick={() => navigate("/agencies")}
                      className="cursor-pointer rounded-full border-0 text-[10px] sm:text-xs font-medium px-2 py-0.5 bg-gradient-to-r from-emerald-50 to-teal-100 text-emerald-700 dark:from-emerald-950/50 dark:to-teal-900/50 dark:text-emerald-300 hover:from-emerald-100 hover:to-teal-200 dark:hover:from-emerald-900/70 dark:hover:to-teal-800/70 transition-all"
                    >
                      <Building className="size-3 mr-0.5" />
                      Agence incluse
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            {/* Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <Button
                onClick={() => navigate("/estimate")}
                className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-md shadow-emerald-600/25 dark:shadow-emerald-900/50 hover:shadow-lg hover:from-emerald-700 hover:to-emerald-600 transition-all duration-200 h-9 sm:h-11 px-3 sm:px-5 text-xs sm:text-sm font-semibold"
              >
                <Plus className="mr-1 sm:mr-1.5 size-3.5 sm:size-4" />
                <span className="hidden sm:inline">{t("common.new")}</span>
                <span className="sm:hidden">{t("nav.estimate")}</span>
              </Button>

              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* ═══ ANNONCES ═══ */}
        <div className="mb-4 sm:mb-6">
          <AnnouncementSection />
        </div>

        {/* ═══ STATS ═══ */}
        <TooltipProvider delayDuration={200}>
          <div className="mb-4 sm:mb-6 grid gap-2 sm:gap-4 grid-cols-2 lg:grid-cols-4">
            {STAT_CARDS.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.35 }}
              >
                <Card className={CARD_CLS + " card-hover group"}>
                  <CardAccent color={stat.accent} />
                  <CardContent className="p-3 sm:p-5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors truncate">{stat.label}</p>
                        {stat.key === "confidence" ? (
                          <UiTooltip>
                            <TooltipTrigger asChild>
                              <p className="text-base sm:text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5 truncate cursor-help underline decoration-dotted decoration-emerald-300/50 dark:decoration-emerald-600/50 underline-offset-4">
                                {statValues[i]}
                              </p>
                            </TooltipTrigger>
                            <TooltipContent
                              side="bottom"
                              sideOffset={6}
                              align="start"
                              avoidCollisions={true}
                              collisionPadding={16}
                              className="rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg px-4 py-3 text-xs sm:text-sm max-w-[220px]"
                            >
                              <div className="flex flex-col gap-2">
                                <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                                  Répartition
                                </span>
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                                      <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                                      Haute (&ge;80%)
                                    </span>
                                    <span className="font-semibold text-slate-900 dark:text-slate-100">{confidenceHigh}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                                      <span className="size-2 rounded-full bg-amber-500 shrink-0" />
                                      Moyenne (60-79%)
                                    </span>
                                    <span className="font-semibold text-slate-900 dark:text-slate-100">{confidenceMid}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                                      <span className="size-2 rounded-full bg-red-500 shrink-0" />
                                      Faible (&lt;60%)
                                    </span>
                                    <span className="font-semibold text-slate-900 dark:text-slate-100">{confidenceLow}</span>
                                  </div>
                                </div>
                              </div>
                            </TooltipContent>
                          </UiTooltip>
                        ) : stat.key === "value" ? (
                          <UiTooltip>
                            <TooltipTrigger asChild>
                              <p className="text-base sm:text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5 truncate cursor-help underline decoration-dotted decoration-amber-300/50 dark:decoration-amber-600/50 underline-offset-4">
                                {statValues[i]}
                              </p>
                            </TooltipTrigger>
                            <TooltipContent
                              side="bottom"
                              sideOffset={6}
                              avoidCollisions={true}
                              collisionPadding={16}
                              className="rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg px-4 py-2.5 text-xs sm:text-sm"
                            >
                              <div className="flex flex-col gap-0.5">
                                <span className="font-semibold text-slate-900 dark:text-slate-100">
                                  {formatPrice(totalValue)}
                                </span>
                                <span className="text-slate-400 dark:text-slate-500 text-xs">Valeur totale exacte</span>
                              </div>
                            </TooltipContent>
                          </UiTooltip>
                        ) : (
                          <p className="text-base sm:text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5 truncate">{statValues[i]}</p>
                        )}
                      </div>
                      <div className={`flex size-9 sm:size-12 shrink-0 items-center justify-center rounded-xl ${stat.bg} transition-all duration-300 group-hover:scale-110 group-hover:shadow-sm`}>
                        <stat.icon className="size-4 sm:size-5" aria-hidden="true" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TooltipProvider>

        {/* ═══ CHART ═══ */}
        {estimations.length >= 2 && (
          <Card className={CARD_CLS + " mb-4 sm:mb-6"}>
            <CardAccent />
            <CardHeader className="pb-2 sm:pb-3 pt-3 sm:pt-5 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 sm:gap-2">
                <div className="flex size-6 sm:size-7 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/50">
                  <TrendingUp className="size-3.5 sm:size-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                Évolution des estimations
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 sm:px-6 pt-0 sm:pt-0 pb-3 sm:pb-5">
              <div className="h-36 sm:h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={estimations.slice().reverse().map((e: any) => ({
                    date: new Date(e._creationTime).toLocaleDateString("fr-FR", { month: "short", day: "numeric" }),
                    valeur: e.estimatedValue,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickMargin={4} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={40} />
                    <Tooltip formatter={(value: number) => [formatPrice(value), "Valeur"]}
                      contentStyle={{ borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }} />
                    <Line type="monotone" dataKey="valeur" stroke="#2563eb" strokeWidth={2.5} dot={{ fill: "#2563eb", r: 3 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ TABS ═══ */}
        <Tabs defaultValue="estimations" className="space-y-3 sm:space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <TabsList className={`${CARD_CLS} p-1 w-full sm:w-auto justify-start overflow-x-auto scrollbar-none`}>
              <TabsTrigger value="estimations"
                className="rounded-lg data-[state=active]:bg-emerald-50 dark:data-[state=active]:bg-emerald-950/50 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-300 data-[state=active]:shadow-xs text-xs sm:text-sm transition-all whitespace-nowrap px-3 sm:px-4 py-1.5 sm:py-2">
                <History className="mr-1 sm:mr-1.5 size-3.5 sm:size-4" />
                <span>Estimations</span>
                {estimations.length > 0 && (
                  <span className="ml-1 inline-flex size-4 sm:size-5 items-center justify-center rounded-full bg-emerald-500 text-white text-[9px] sm:text-[10px] font-bold leading-none" aria-label={`${estimations.length} estimation(s)`}>
                    {estimations.length > 9 ? "9+" : estimations.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="loyers"
                className="rounded-lg data-[state=active]:bg-emerald-50 dark:data-[state=active]:bg-emerald-950/50 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-300 data-[state=active]:shadow-xs text-xs sm:text-sm transition-all whitespace-nowrap px-3 sm:px-4 py-1.5 sm:py-2">
                <KeyRound className="mr-1 sm:mr-1.5 size-3.5 sm:size-4" />
                <span>Loyers</span>
                {rentEstimations.length > 0 && (
                  <span className="ml-1 inline-flex size-4 sm:size-5 items-center justify-center rounded-full bg-emerald-500 text-white text-[9px] sm:text-[10px] font-bold leading-none">
                    {rentEstimations.length > 9 ? "9+" : rentEstimations.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="messages"
                className="rounded-lg data-[state=active]:bg-emerald-50 dark:data-[state=active]:bg-emerald-950/50 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-300 data-[state=active]:shadow-xs text-xs sm:text-sm transition-all whitespace-nowrap px-3 sm:px-4 py-1.5 sm:py-2">
                <MessageSquare className="mr-1 sm:mr-1.5 size-3.5 sm:size-4" />
                <span>Messagerie</span>
                {unreadCount > 0 && (
                  <span className="ml-1 inline-flex size-4 sm:size-5 items-center justify-center rounded-full bg-red-500 text-white text-[9px] sm:text-[10px] font-bold leading-none" aria-label={`${unreadCount} message(s) non lu(s)`}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="map"
                className="rounded-lg data-[state=active]:bg-emerald-50 dark:data-[state=active]:bg-emerald-950/50 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-300 data-[state=active]:shadow-xs text-xs sm:text-sm transition-all whitespace-nowrap px-3 sm:px-4 py-1.5 sm:py-2">
                <MapPin className="mr-1 sm:mr-1.5 size-3.5 sm:size-4" />
                <span>Carte</span>
              </TabsTrigger>
              <TabsTrigger value="alerts"
                className="rounded-lg data-[state=active]:bg-amber-50 dark:data-[state=active]:bg-amber-950/50 data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-300 data-[state=active]:shadow-xs text-xs sm:text-sm transition-all whitespace-nowrap px-3 sm:px-4 py-1.5 sm:py-2">
                <Bell className="mr-1 sm:mr-1.5 size-3.5 sm:size-4" />
                <span>{t("dashboard.tab.alerts")}</span>
                {priceAlerts.filter((a) => !a.triggered).length > 0 && (
                  <span className="ml-1 inline-flex size-4 sm:size-5 items-center justify-center rounded-full bg-amber-500 text-white text-[9px] sm:text-[10px] font-bold leading-none">
                    {priceAlerts.filter((a) => !a.triggered).length > 9 ? "9+" : priceAlerts.filter((a) => !a.triggered).length}
                  </span>
                )}
              </TabsTrigger>

            </TabsList>

            {/* Search + controls */}
            <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial min-w-0">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 sm:size-4 text-slate-400 pointer-events-none" aria-hidden="true" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher..." aria-label="Rechercher une estimation ou un bien"
                  className="rounded-xl border-slate-200 dark:border-slate-700 h-9 sm:h-10 pl-9 sm:pl-10 pr-7 sm:pr-9 text-xs sm:text-sm w-full sm:w-48 lg:w-56 transition-all focus:border-emerald-300 dark:focus:border-emerald-700"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-0.5">
                    <X className="size-3.5 sm:size-4" />
                  </button>
                )}
              </div>
              <button onClick={() => setShowFilters(!showFilters)}
                className={`flex size-9 sm:size-10 items-center justify-center rounded-xl border transition-all shrink-0 ${
                  showFilters ? "bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950/50 dark:border-emerald-800" : "border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}>
                <Filter className="size-3.5 sm:size-4" />
              </button>
              <button onClick={() => setViewMode(viewMode === "list" ? "grid" : "list")}
                className="flex size-9 sm:size-10 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shrink-0"
                aria-label={viewMode === "list" ? "Vue grille" : "Vue liste"}>
                {viewMode === "list" ? <Grid3X3 className="size-3.5 sm:size-4" /> : <List className="size-3.5 sm:size-4" />}
              </button>
            </div>
          </div>

          {/* Filter bar */}
          {showFilters && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-xs sm:text-sm text-slate-500 font-medium shrink-0">Trier :</span>
              {([
                { k: "date" as SortKey, l: "Date" },
                { k: "value" as SortKey, l: "Valeur" },
                { k: "confidence" as SortKey, l: "Confiance" },
              ] as const).map((opt) => (
                <button key={opt.k} onClick={() => setSortKey(opt.k)}
                  className={`text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border transition-all shrink-0 ${
                    sortKey === opt.k
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-300 font-semibold"
                      : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}>
                  <ArrowUpDown className="size-3 sm:size-3.5 inline mr-1" />{opt.l}
                </button>
              ))}
              {search && (
                <span className="text-xs sm:text-sm text-slate-400 ml-auto whitespace-nowrap">{sortedEstimations.length} résultat{sortedEstimations.length > 1 ? "s" : ""}</span>
              )}
            </motion.div>
          )}

          {/* ═══ ESTIMATIONS TAB ═══ */}
          <TabsContent value="estimations" className="space-y-3 sm:space-y-4">
            {/* Exemple de résultat — accès direct à la page résultat (sans étapes de saisie) */}
            <button
              onClick={() => navigate("/estimate/demo")}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 px-4 py-3 text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 hover:border-emerald-400 dark:hover:border-emerald-700 transition-all active:scale-[0.99]"
            >
              <Eye className="size-4" />
              Voir un exemple de résultat d'estimation
              <ArrowRight className="size-3.5" />
            </button>

            {estimations.length === 0 ? (
              <EmptyState
                icon={Home}
                title="Aucune estimation"
                desc="Commencez par estimer votre premier bien immobilier."
                action="Nouvelle estimation"
                onClick={() => navigate("/estimate")}
              />
            ) : sortedEstimations.length === 0 ? (
              <EmptySearchResult search={search} />
            ) : viewMode === "list" ? (
              <div className="space-y-2 sm:space-y-3">
                {sortedEstimations.map((estimation: any, index: number) => (
                  <motion.div
                    key={estimation._id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02, duration: 0.25 }}
                  >
                    <Card
                      className={`${CARD_CLS} cursor-pointer hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_4px_12px_rgba(0,0,0,0.3)] hover:border-emerald-100 dark:hover:border-emerald-900 transition-all duration-200 group active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2`}
                      onClick={() => navigate(`/estimate/${estimation._id}`)}
                      role="button" tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/estimate/${estimation._id}`); } }}
                    >
                      <CardAccent />
                      <CardContent className="p-3 sm:p-5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 sm:gap-5 min-w-0 flex-1">
                            <div className="flex size-10 sm:size-13 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/50 dark:to-emerald-900/30 group-hover:from-emerald-100 group-hover:to-emerald-200 dark:group-hover:from-emerald-900/70 dark:group-hover:to-emerald-800/40 transition-all">
                              {(() => {
                                const type = estimation.property?.propertyType;
                                if (type === "appartement" || type === "studio" || type === "duplex") return <Building2 className="size-4 sm:size-6 text-emerald-600 dark:text-emerald-400" />;
                                if (type === "maison" || type === "villa") return <Home className="size-4 sm:size-6 text-emerald-600 dark:text-emerald-400" />;
                                return <Building2 className="size-4 sm:size-6 text-emerald-600 dark:text-emerald-400" />;
                              })()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-base font-semibold text-slate-900 dark:text-slate-100 truncate leading-tight">
                                {estimation.property?.propertyType
                                  ? (estimation.property.propertyType === "appartement" ? "Appartement"
                                    : estimation.property.propertyType === "maison" ? "Maison"
                                    : estimation.property.propertyType === "villa" ? "Villa"
                                    : estimation.property.propertyType) : "Bien immobilier"}
                                <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
                                <span className="text-emerald-600 dark:text-emerald-400">{formatPrice(estimation.estimatedValue)}</span>
                              </p>
                              <div className="flex items-center gap-2 sm:gap-4 mt-0.5 flex-wrap">
                                <span className="flex items-center gap-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                                  <MapPin className="size-3 sm:size-3.5" />
                                  {estimation.property?.ville || estimation.property?.gouvernorat || "N/A"}
                                </span>
                                <span className="flex items-center gap-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                                  <Clock className="size-3 sm:size-3.5" />
                                  {new Date(estimation._creationTime).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleCompare(estimation._id); }}
                              className={`flex size-7 sm:size-8 items-center justify-center rounded-lg border transition-all shrink-0 ${
                                compareSel.includes(estimation._id)
                                  ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                                  : "border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-emerald-50 dark:hover:bg-slate-800 hover:text-emerald-600"
                              }`}
                              aria-label={t("dashboard.compare.select")}
                              title={t("dashboard.compare.select")}
                            >
                              <CheckSquare className="size-3.5" />
                            </button>
                            <Badge className={`rounded-full text-xs sm:text-sm border-0 px-2 sm:px-3 py-0.5 font-semibold ${
                              (estimation.confidenceIndex ?? 0) >= 80 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" :
                              (estimation.confidenceIndex ?? 0) >= 60 ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" :
                              "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300"}`}>
                              {estimation.confidenceIndex ?? "—"}%
                            </Badge>
                            <ChevronRight className="size-4 sm:size-5 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              /* Grid view */
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {sortedEstimations.map((estimation: any, index: number) => (
                  <motion.div
                    key={estimation._id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02, duration: 0.25 }}
                  >
                    <Card
                      className={`${CARD_CLS} cursor-pointer hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_4px_12px_rgba(0,0,0,0.3)] hover:border-emerald-100 dark:hover:border-emerald-900 transition-all duration-200 group active:scale-[0.98] h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2`}
                      onClick={() => navigate(`/estimate/${estimation._id}`)}
                      role="button" tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/estimate/${estimation._id}`); } }}
                    >
                      <CardAccent />
                      <CardContent className="p-3 sm:p-5">
                        <div className="flex items-start justify-between mb-2 sm:mb-3 gap-1">
                          <div className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-xs sm:text-sm font-semibold leading-tight ${typeBadgeClass(estimation.property?.propertyType)}`}>
                            {estimation.property?.propertyType
                              ? (estimation.property.propertyType === "appartement" ? "Appartement"
                                : estimation.property.propertyType === "maison" ? "Maison"
                                : estimation.property.propertyType === "villa" ? "Villa"
                                : estimation.property.propertyType) : "Bien"}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleCompare(estimation._id); }}
                              className={`flex size-7 items-center justify-center rounded-lg border transition-all shrink-0 ${
                                compareSel.includes(estimation._id)
                                  ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                                  : "border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-emerald-50 dark:hover:bg-slate-800 hover:text-emerald-600"
                              }`}
                              aria-label={t("dashboard.compare.select")}
                              title={t("dashboard.compare.select")}
                            >
                              <CheckSquare className="size-3.5" />
                            </button>
                            <Badge className={`rounded-full text-xs sm:text-sm border-0 px-1.5 sm:px-2.5 font-semibold ${
                              (estimation.confidenceIndex ?? 0) >= 80 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" :
                              (estimation.confidenceIndex ?? 0) >= 60 ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" :
                              "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300"}`}>
                              {estimation.confidenceIndex ?? "—"}%
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm sm:text-lg font-bold text-slate-900 dark:text-slate-100 mb-1.5 sm:mb-3">{formatPrice(estimation.estimatedValue)}</p>
                        <div className="space-y-1 sm:space-y-1.5">
                          <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            <MapPin className="size-3 sm:size-3.5 shrink-0" />{estimation.property?.ville || estimation.property?.gouvernorat || "N/A"}
                          </div>
                          <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            <Clock className="size-3 sm:size-3.5 shrink-0" />{new Date(estimation._creationTime).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                          </div>
                          {estimation.property?.builtSurface && (
                            <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                              <Ruler className="size-3 sm:size-3.5 shrink-0" />{estimation.property.builtSurface} m²
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ═══ PROPERTIES TAB ═══ */}
          {/* ═══ LOYERS TAB ═══ */}
          <TabsContent value="loyers" className="space-y-3 sm:space-y-4">
            {/* Exemple de résultat — estimation de loyer (mensuel & nuitée) */}
            <button
              onClick={() => navigate("/estimate/loyer/demo")}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 px-4 py-3 text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 hover:border-emerald-400 dark:hover:border-emerald-700 transition-all active:scale-[0.99]"
            >
              <Eye className="size-4" />
              Voir un exemple de résultat d'estimation de loyer
              <ArrowRight className="size-3.5" />
            </button>

            {rentEstimations.length === 0 ? (
              <EmptyState
                icon={KeyRound}
                title="Aucune estimation de loyer"
                desc="Estimez le loyer mensuel recommandé pour votre bien avec le moteur de location IA."
                action="Estimer un loyer"
                onClick={() => navigate("/estimate/loyer/new")}
              />
            ) : (
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {rentEstimations.map((rent: any, index: number) => (
                  <motion.div
                    key={rent._id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                  >
                    <Card
                      className={`${CARD_CLS} cursor-pointer hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_4px_12px_rgba(0,0,0,0.3)] hover:border-emerald-100 dark:hover:border-emerald-900 transition-all duration-200 group active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2`}
                      onClick={() => navigate(`/estimate/loyer/${rent._id}`)}
                      role="button" tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          navigate(`/estimate/loyer/${rent._id}`);
                        }
                      }}
                    >
                      <CardAccent color="from-emerald-500 via-teal-500 to-cyan-400" />
                      <CardContent className="p-3 sm:p-5">
                        <div className="flex items-start justify-between mb-2 sm:mb-3 gap-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
                              <KeyRound className="size-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                                {RENT_PROPERTY_TYPES_LABELS[rent.property?.propertyType] || "Bien"}
                              </p>
                              <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 truncate flex items-center gap-1">
                                <MapPin className="size-3 shrink-0" />{rent.property?.quartier || rent.property?.ville || rent.property?.gouvernorat || "N/A"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleCompare(rent._id); }}
                              className={`flex size-7 items-center justify-center rounded-lg border transition-all shrink-0 ${
                                compareSel.includes(rent._id)
                                  ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                                  : "border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-emerald-50 dark:hover:bg-slate-800 hover:text-emerald-600"
                              }`}
                              aria-label={t("dashboard.compare.select")}
                              title={t("dashboard.compare.select")}
                            >
                              <CheckSquare className="size-3.5" />
                            </button>
                            <Badge className={`rounded-full text-xs sm:text-sm border-0 px-1.5 sm:px-2.5 font-semibold ${
                              (rent.confidenceIndex ?? 0) >= 80 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" :
                              (rent.confidenceIndex ?? 0) >= 60 ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" :
                              "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300"}`}>
                              {rent.confidenceIndex ?? "—"}%
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 mb-1.5 sm:mb-3">
                          {formatPrice(rent.estimatedRent)}
                          <span className="text-[10px] sm:text-xs font-medium text-slate-400 dark:text-slate-500"> / mois</span>
                        </p>
                        <div className="space-y-1 sm:space-y-1.5">
                          <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            <Percent className="size-3 sm:size-3.5 shrink-0" />Rendement {typeof rent.grossYield === "number" ? rent.grossYield.toFixed(1) : "—"}% / an
                          </div>
                          <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            <Clock className="size-3 sm:size-3.5 shrink-0" />{new Date(rent._creationTime).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                          </div>
                          {rent.property?.builtSurface && (
                            <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                              <Ruler className="size-3 sm:size-3.5 shrink-0" />{rent.property.builtSurface} m²
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ═══ AGENCIES TAB ═══ */}
          <TabsContent value="messages" className="space-y-3 sm:space-y-4">
            {inboxMessages.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="Boîte de réception vide"
                desc="Les messages de vos agences apparaîtront ici : contre-offres, notifications et conversations."
                action="Estimer un bien"
                onClick={() => navigate("/estimate")}
              />
            ) : (
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    {inboxMessages.length} message{inboxMessages.length > 1 ? "s" : ""}
                    {unreadCount > 0 && <span className="font-semibold text-red-500"> · {unreadCount} non lu{unreadCount > 1 ? "s" : ""}</span>}
                  </p>
                  {unreadCount > 0 && (
                    <button onClick={async () => { try { await markAllMessagesRead(); toast.success("Tout marqué comme lu"); } catch {} }}
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 px-2.5 py-1 text-[11px] font-medium hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all">
                      <CheckCheck className="size-3.5" /> Tout marquer lu
                    </button>
                  )}
                </div>
                {inboxMessages.map((msg: any, index: number) => {
                  const isUnread = msg.direction === "in" && !msg.readAt;
                  return (
                    <motion.div
                      key={msg._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02, duration: 0.2 }}
                    >
                      <Card
                        className={`${CARD_CLS} cursor-pointer hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_4px_12px_rgba(0,0,0,0.3)] transition-all duration-200 group active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 ${isUnread ? "bg-blue-50/60 dark:bg-blue-950/30" : ""}`}
                        onClick={() => { setSelectedMsg(msg); setMsgOpen(true); setReplyContent(""); }}
                        role="button" tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedMsg(msg); setMsgOpen(true); setReplyContent(""); } }}
                      >
                        <CardAccent color={isUnread ? "from-blue-500 to-blue-400" : msg.type === "suggest_price" ? "from-emerald-500 to-teal-400" : msg.type === "status" ? "from-amber-500 to-orange-400" : "from-slate-400 to-slate-300"} />
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative shrink-0">
                              <div className={`flex size-9 sm:size-11 items-center justify-center rounded-xl overflow-hidden ${msg.direction === "out" ? "bg-slate-100 dark:bg-slate-800" : "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30"}`}>
                                {msg.direction === "out" ? (
                                  <User className="size-4 sm:size-5 text-slate-500 dark:text-slate-400" />
                                ) : msg.agency?.logoUrl ? (
                                  <img src={msg.agency.logoUrl} alt={msg.agency?.name || "Agence"} className="size-full object-cover" />
                                ) : (
                                  <Building2 className="size-4 sm:size-5 text-blue-600 dark:text-blue-400" />
                                )}
                              </div>
                              {isUnread && <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900" aria-hidden="true" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate leading-tight">
                                  {msg.direction === "out" ? "Vous" : (msg.agency?.name || msg.senderName || "Agence")}
                                  {msg.type === "suggest_price" && msg.suggestedPrice && (
                                    <span className="ml-1.5 inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                                      {msg.suggestedPrice.toLocaleString()} TND
                                    </span>
                                  )}
                                </p>
                                <span className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 shrink-0">
                                  {new Date(msg.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                                </span>
                              </div>
                              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 leading-tight">
                                {msg.direction === "out" && <Reply className="inline size-2.5 sm:size-3 mr-1 text-slate-400" />}
                                {msg.content}
                              </p>
                              <div className="mt-1 flex items-center gap-1.5">
                                <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                                  msg.type === "suggest_price" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" :
                                  msg.type === "status" ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" :
                                  msg.type === "system" ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" :
                                  "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"}`}>
                                  {msg.type === "suggest_price" ? "Contre-offre" : msg.type === "status" ? "Notification" : msg.type === "system" ? "Confirmation" : msg.direction === "out" ? "Réponse envoyée" : "Message"}
                                </span>
                                {msg.estimation?.propertyType && (
                                  <span className="text-[9px] text-slate-400 dark:text-slate-500 truncate">
                                    {msg.estimation.propertyType} · {msg.estimation.ville || msg.estimation.gouvernorat || ""}
                                  </span>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="size-4 sm:size-5 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>
          <TabsContent value="map" className="space-y-3 sm:space-y-4">
            {mapMarkers.length === 0 ? (
              <EmptyState
                icon={MapPin}
                title="Aucune position GPS"
                desc="Les biens sans coordonnées GPS ne peuvent pas être affichés sur la carte."
                action="Nouvelle estimation avec carte"
                onClick={() => navigate("/estimate")}
              />
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {/* Info bar */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 min-w-0">
                    <Globe className="size-3 sm:size-4 shrink-0" />
                    <span className="truncate">
                      {mapMarkers.length} bien{mapMarkers.length > 1 ? "s" : ""} sur la carte
                    </span>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                    {[
                      { type: "appartement", label: "App", color: "#3b82f6" },
                      { type: "maison", label: "Maison", color: "#10b981" },
                      { type: "villa", label: "Villa", color: "#f59e0b" },
                    ].map((item) => (
                      <span key={item.type} className="flex items-center gap-1 text-xs sm:text-sm text-slate-400">
                        <span className="size-2 sm:size-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="hidden sm:inline">{item.label}</span>
                        <span className="sm:hidden">{item.label}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Map */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm"
                >
                  <MapContainer
                    center={mapMarkers.length === 1 ? mapMarkers[0].coords : [34.0, 9.5]}
                    zoom={mapMarkers.length === 1 ? 13 : 7}
                    className="h-[320px] sm:h-[480px] lg:h-[520px] w-full"
                    scrollWheelZoom={typeof window !== 'undefined' && 'ontouchstart' in window ? false : true}
                    zoomControl={true}
                  >
                    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapResizer />
                    <MapBounds markers={mapMarkers.map((m) => m.coords)} />
                    {mapMarkers.map((marker) => (
                      <Marker key={marker.id} position={marker.coords} icon={getMarkerIcon(marker.type)}>
                        <Popup>
                          <div className="min-w-[200px] font-sans">
                            <div className="flex items-center gap-2 mb-1.5">
                              <div className="size-3 rounded-full shrink-0" style={{ backgroundColor: MARKER_COLORS[marker.type || ""] || "#3b82f6" }} />
                              <span className="font-semibold text-sm text-slate-900">{marker.name}</span>
                            </div>
                            <div className="text-xs sm:text-sm text-slate-500 space-y-0.5 mb-2">
                              <p>{marker.surface ?? "—"} m² · {marker.ville || marker.gouvernorat}</p>
                              {marker.address && <p className="truncate max-w-[220px]">{marker.address}</p>}
                            </div>
                            {marker.price && <p className="text-sm font-bold text-blue-600 mb-2">{formatPrice(marker.price)}</p>}
                            {marker.estimationId && (
                              <button onClick={() => navigate(`/estimate/${marker.estimationId}`)}
                                className="w-full text-xs sm:text-sm rounded-lg bg-blue-50 text-blue-700 py-1.5 font-medium hover:bg-blue-100 transition-colors">
                                Voir l'estimation
                              </button>
                            )}
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </motion.div>

                {/* Mini cards below map */}
                {mapMarkers.length > 0 && (
                  <div className="grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                    {mapMarkers.slice(0, 8).map((marker) => (
                      <motion.div key={marker.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                        <Card
                          className={`${CARD_CLS} cursor-pointer hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all group active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 ${marker.estimationId ? "" : "opacity-60"}`}
                          onClick={() => { if (marker.estimationId) navigate(`/estimate/${marker.estimationId}`); }}
                          role="button" tabIndex={marker.estimationId ? 0 : -1}
                          onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && marker.estimationId) { e.preventDefault(); navigate(`/estimate/${marker.estimationId}`); } }}
                        >
                          <CardContent className="p-2.5 sm:p-4">
                            <div className="flex items-start gap-2 sm:gap-3">
                              <div className="size-2.5 sm:size-3.5 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: MARKER_COLORS[marker.type || ""] || "#3b82f6" }} />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate leading-tight">{marker.name}</p>
                                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">{marker.surface ?? "—"} m²</p>
                                {marker.price && <p className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5 truncate leading-tight">{formatPrice(marker.price)}</p>}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ═══ ALERTES PRIX TAB ═══ */}
          <TabsContent value="alerts" className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 min-w-0">
                <Bell className="size-3.5 sm:size-4 shrink-0" />
                <span className="truncate">{t("dashboard.alerts.title")}</span>
              </div>
              <Button
                onClick={() => setAlertOpen(true)}
                className="shrink-0 h-8 sm:h-9 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 text-xs font-semibold shadow-sm"
              >
                <Plus className="size-3.5 mr-1" />
                {t("dashboard.alerts.create")}
              </Button>
            </div>

            {priceAlerts.length === 0 ? (
              <Card className={CARD_CLS}>
                <CardContent className="flex flex-col items-center justify-center py-10 px-4 text-center">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 mb-3">
                    <Bell className="size-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("dashboard.alerts.title")}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm">{t("dashboard.alerts.empty")}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {priceAlerts.map((alert: any) => {
                  const delta = alert.currentPrice - alert.basePriceAtCreation;
                  const deltaPct = alert.basePriceAtCreation > 0 ? (delta / alert.basePriceAtCreation) * 100 : 0;
                  const reached = alert.direction === "above" ? alert.currentPrice >= alert.targetPrice : alert.currentPrice <= alert.targetPrice;
                  return (
                    <Card key={alert._id} className={CARD_CLS + " group"}>
                      <CardAccent color={alert.triggered ? "from-emerald-500 to-teal-400" : "from-amber-500 to-orange-400"} />
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                              {alert.gouvernorat} · {PROPERTY_TYPES_LABELS[alert.propertyType] || alert.propertyType}
                            </p>
                            <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                              {alert.direction === "above" ? t("dashboard.alerts.direction.above") : t("dashboard.alerts.direction.below")}{" "}
                              <strong className="text-amber-600 dark:text-amber-400">{alert.targetPrice.toLocaleString()} TND/m²</strong>
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge className={`rounded-full border-0 text-[9px] px-1.5 py-0 font-semibold ${
                              alert.triggered ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                            }`}>
                              {alert.triggered ? t("dashboard.alerts.status.triggered") : t("dashboard.alerts.status.active")}
                            </Badge>
                            <button
                              onClick={async () => {
                                try {
                                  await deleteAlert({ alertId: alert._id });
                                  toast.success("Alerte supprimée");
                                } catch { toast.error("Erreur"); }
                              }}
                              className="text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors"
                              aria-label={t("common.delete")}
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="mt-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 p-2.5">
                          <div className="flex items-center justify-between text-[10px] sm:text-xs">
                            <span className="text-slate-400 dark:text-slate-500">Marché actuel</span>
                            <span className={`font-bold ${reached ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-slate-200"}`}>
                              {alert.currentPrice.toLocaleString()} TND/m²
                            </span>
                          </div>
                          <div className="mt-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden" aria-hidden="true">
                            <div
                              className={`h-full rounded-full transition-all ${reached ? "bg-emerald-500" : "bg-amber-500"}`}
                              style={{ width: `${Math.min(Math.max((alert.currentPrice / Math.max(alert.targetPrice, 1)) * 100, 4), 100)}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                            {delta >= 0 ? "+" : ""}{delta.toLocaleString()} TND/m² ({deltaPct >= 0 ? "+" : ""}{deltaPct.toFixed(1)}%) depuis la création
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ═══ MESSAGERIE TAB ═══ */}

        </Tabs>
      </div>

      {/* ═══ CREATE PRICE ALERT DIALOG ═══ */}
      <Dialog open={alertOpen} onOpenChange={setAlertOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md overflow-hidden p-0">
          {/* Gradient header */}
          <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 px-6 pt-6 pb-8">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Bell className="size-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-white">
                  {t("dashboard.alerts.create")}
                </DialogTitle>
                <DialogDescription className="text-[11px] text-blue-100 mt-0.5">
                  Soyez informé des changements de prix
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="px-6 py-5 space-y-4">
            {/* Governorat + Type side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{t("estimate.result.governorat")}</Label>
                <select
                  value={alertGov}
                  onChange={(e) => setAlertGov(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 dark:focus:border-blue-500 transition-all outline-none"
                >
                  {GOVERNORATS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{t("estimate.result.type")}</Label>
                <select
                  value={alertType}
                  onChange={(e) => setAlertType(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 dark:focus:border-blue-500 transition-all outline-none"
                >
                  {PROPERTY_TYPES.map((p) => <option key={p} value={p}>{PROPERTY_TYPES_LABELS[p]}</option>)}
                </select>
              </div>
            </div>

            {/* Direction toggle */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Direction de l'alerte</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setAlertDir("above")}
                  className={`flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-2.5 text-xs font-semibold transition-all duration-200 ${
                    alertDir === "above"
                      ? "bg-blue-50 border-blue-400 text-blue-700 dark:bg-blue-950/50 dark:border-blue-600 dark:text-blue-300 shadow-sm shadow-blue-200/50 dark:shadow-blue-900/30"
                      : "border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <span className="text-base">↑</span>
                  <span>{t("dashboard.alerts.direction.above")}</span>
                </button>
                <button
                  onClick={() => setAlertDir("below")}
                  className={`flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-2.5 text-xs font-semibold transition-all duration-200 ${
                    alertDir === "below"
                      ? "bg-indigo-50 border-indigo-400 text-indigo-700 dark:bg-indigo-950/50 dark:border-indigo-600 dark:text-indigo-300 shadow-sm shadow-indigo-200/50 dark:shadow-indigo-900/30"
                      : "border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <span className="text-base">↓</span>
                  <span>{t("dashboard.alerts.direction.below")}</span>
                </button>
              </div>
            </div>

            {/* Target price */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{t("dashboard.alerts.target")}</Label>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  value={alertTarget}
                  onChange={(e) => setAlertTarget(e.target.value)}
                  placeholder="ex. 3000"
                  className="rounded-xl h-11 text-sm pr-16 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 dark:focus:border-blue-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-slate-400 dark:text-slate-500">TND/m²</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 px-3 py-2">
                <Crosshair className="size-3 text-blue-500 dark:text-blue-400 shrink-0" />
                <p className="text-[10px] text-blue-600 dark:text-blue-400">
                  Prix / m² actuel à <span className="font-semibold">{alertGov}</span> : <span className="font-bold">{priceAlerts[0]?.currentPrice?.toLocaleString() ?? "—"}</span> TND/m²
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 pb-5 flex items-center gap-2">
            <Button variant="outline" onClick={() => setAlertOpen(false)} className="rounded-xl text-xs h-10 flex-1 border-slate-200 dark:border-slate-700">
              {t("common.cancel")}
            </Button>
            <Button
              disabled={savingAlert || !alertTarget || Number(alertTarget) <= 0}
              onClick={async () => {
                setSavingAlert(true);
                try {
                  await createAlert({
                    gouvernorat: alertGov,
                    propertyType: alertType,
                    direction: alertDir,
                    targetPrice: Number(alertTarget),
                  });
                  toast.success(t("estimate.result.alert.created"), { description: `${alertGov} · ${alertTarget} TND/m²` });
                  setAlertOpen(false);
                  setAlertTarget("");
                } catch (e: any) {
                  toast.error("Erreur", { description: e?.data?.message || "Impossible de créer l'alerte" });
                }
                setSavingAlert(false);
              }}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs h-10 flex-1 shadow-md shadow-blue-200/50 dark:shadow-blue-900/50 hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
            >
              {savingAlert ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <Bell className="size-3.5 mr-1.5" />}
              {t("estimate.result.alert.create")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ PROFILE DIALOG ═══ */}

      {/* ═══ COMPARE BAR (fixed) ═══ */}
      {compareSel.length >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-16 sm:bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="flex items-center gap-2.5 rounded-2xl border border-blue-200 dark:border-blue-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-xl px-3 sm:px-4 py-2.5">
            <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
              {compareSel.length} {t("dashboard.compare.selected")}
            </span>
            <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" aria-hidden="true" />
            <button
              onClick={() => setCompareSel([])}
              className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              {t("common.cancel")}
            </button>
            <Button
              onClick={openCompare}
              className="h-8 sm:h-9 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600 text-xs font-semibold"
            >
              <Scale className="size-3.5 mr-1.5" />
              {t("nav.compare")} ({compareSel.length})
            </Button>
          </div>
        </motion.div>
      )}

      {/* ═══ BOTTOM NAV (mobile) ═══ */}

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200/70 dark:border-slate-800/70 bg-white/95 dark:bg-gray-950/95 backdrop-blur-2xl shadow-[0_-2px_10px_rgba(0,0,0,0.03)] sm:hidden">
        <div className="flex items-center justify-around px-2 py-1.5">
          {[
            { icon: LayoutDashboard, label: "Dashboard", active: true, onClick: () => {} },
            { icon: Plus, label: "Estimer", onClick: () => navigate("/estimate") },
            { icon: KeyRound, label: "Loyer", onClick: () => navigate("/estimate/loyer/new") },
            { icon: Building, label: "Agences", onClick: () => navigate("/agencies") },
            { icon: Sparkles, label: "Forfaits", onClick: () => navigate("/pricing") },
            { icon: User, label: "Profil", onClick: () => { setProfileName(user?.name || ""); setProfileOpen(true); } },
          ].map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200"
            >
              <item.icon className="size-5 text-blue-600 dark:text-blue-400" />
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Spacer for bottom nav on mobile */}
      <div className="h-16 sm:hidden" />

      {/* MESSAGE_DETAIL_DIALOG */}
      <Dialog open={msgOpen} onOpenChange={setMsgOpen}>
        <DialogContent className="max-w-[calc(100%-1rem)] gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-md">
          <DialogHeader className="border-b border-slate-100 px-4 pt-6 pb-3 text-left dark:border-slate-800 sm:px-6">
            {selectedMsg && (
              <div className="flex items-center gap-3">
                <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl overflow-hidden ${selectedMsg.direction === "out" ? "bg-slate-100 dark:bg-slate-800" : "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30"}`}>
                  {selectedMsg.direction === "out" ? (
                    <User className="size-5 text-slate-500 dark:text-slate-400" />
                  ) : selectedMsg.agency?.logoUrl ? (
                    <img src={selectedMsg.agency.logoUrl} alt={selectedMsg.agency?.name || "Agence"} className="size-full object-cover" />
                  ) : (
                    <Building2 className="size-5 text-blue-600 dark:text-blue-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-sm truncate">
                    {selectedMsg.direction === "out" ? "Votre réponse" : (selectedMsg.agency?.name || selectedMsg.senderName || "Agence")}
                  </DialogTitle>
                  <DialogDescription className="text-xs truncate">
                    {selectedMsg.subject} · {new Date(selectedMsg.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </DialogDescription>
                </div>
              </div>
            )}
          </DialogHeader>
          <div className="space-y-3 px-4 py-4 sm:px-6">
            {selectedMsg?.suggestedPrice && (
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/30 p-3">
                <p className="text-[10px] uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-0.5">Prix suggéré par l'agence</p>
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                  {selectedMsg.suggestedPrice.toLocaleString()} TND
                </p>
                {selectedMsg.estimation?.estimatedValue && (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Votre estimation : {selectedMsg.estimation.estimatedValue.toLocaleString()} TND
                    {" "}· Différence : {Math.round(((selectedMsg.suggestedPrice - selectedMsg.estimation.estimatedValue) / selectedMsg.estimation.estimatedValue) * 100)}%
                  </p>
                )}
              </div>
            )}
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">Message</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedMsg?.content}</p>
            </div>
            {selectedMsg?.estimation?.propertyType && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <MapPin className="size-3" />
                {selectedMsg.estimation.propertyType} · {selectedMsg.estimation.ville || selectedMsg.estimation.gouvernorat || ""}
                {selectedMsg.estimation.confidenceIndex != null && (
                  <span>· {selectedMsg.estimation.confidenceIndex}% conf.</span>
                )}
              </div>
            )}
            {selectedMsg?.direction === "in" && (
              <div className="space-y-1.5 pt-1">
                <Label className="text-xs text-slate-500">Répondre à l'agence</Label>
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Votre réponse..."
                  className="rounded-xl text-xs resize-none min-h-[70px]"
                />
                <Button
                  onClick={async () => {
                    if (!replyContent.trim() || !selectedMsg?.agencyPartnerId) return;
                    setSendingReply(true);
                    try {
                      await sendUserMessage({
                        agencyPartnerId: selectedMsg.agencyPartnerId as any,
                        requestId: selectedMsg.requestId as any,
                        content: replyContent.trim(),
                      });
                      toast.success("Réponse envoyée", { description: "L'agence recevra votre message." });
                      setReplyContent("");
                    } catch (e: any) {
                      toast.error("Erreur", { description: e?.data?.message || "Impossible d'envoyer" });
                    }
                    setSendingReply(false);
                  }}
                  disabled={sendingReply || !replyContent.trim()}
                  className="h-9 w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600 text-xs"
                >
                  {sendingReply ? <><Loader2 className="mr-1.5 size-3.5 animate-spin" /> Envoi...</> : <><Send className="mr-1.5 size-3.5" /> Envoyer la réponse</>}
                </Button>
              </div>
            )}
            {selectedMsg?.direction === "out" && (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center">
                Message envoyé à l'agence — elle répondra dans votre boîte de réception.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader className="text-center">
            <div className="flex justify-center mb-3">
              <button type="button" onClick={() => avatarInputRef.current?.click()}
                aria-label="Changer la photo de profil"
                className="group relative size-16 sm:size-20 overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-blue-500 shadow-lg shadow-blue-200/50 transition-all duration-200 hover:shadow-xl hover:scale-105 cursor-pointer">
                {profileAvatar ? (
                  <img src={profileAvatar} alt="Avatar" className="size-full object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <User className="size-7 sm:size-9 text-white" />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-all duration-200">
                  <div className="flex size-8 sm:size-10 items-center justify-center rounded-full bg-white/90 shadow-md opacity-0 group-hover:opacity-100 transition-all duration-200 scale-50 group-hover:scale-100">
                    <Camera className="size-4 sm:size-5 text-slate-600" />
                  </div>
                </div>
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" capture="environment"
                onChange={handleAvatarPick} className="hidden" />
            </div>
            <DialogTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">Mon profil</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Cliquez sur l'avatar pour le modifier
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 sm:space-y-4 px-2">
            {user?.email && (
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">Email</Label>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-3.5 py-2.5">
                  <AtSign className="size-4 text-slate-400 shrink-0" />
                  <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 truncate">{user.email}</span>
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">Nom complet</Label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <Input
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Votre nom"
                  className="pl-10 h-11 rounded-xl border-slate-200 dark:border-slate-700 text-xs sm:text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">Numéro de téléphone</Label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <Input
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  placeholder="+216 XX XXX XXX"
                  type="tel"
                  className="pl-10 h-11 rounded-xl border-slate-200 dark:border-slate-700 text-xs sm:text-sm"
                />
              </div>
            </div>
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-3">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                <CheckCircle2 className="size-3.5 sm:size-4 text-emerald-500" />
                {user?.isAnonymous ? "Compte invité" : "Compte vérifié"}
              </div>
            </div>

            {/* Payment history */}
            {paymentHistory && paymentHistory.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <History className="size-3.5 sm:size-4 text-slate-400" />
                  <span className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400">
                    Historique des paiements
                  </span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5 scrollbar-thin">
                  {paymentHistory.map((sub: any) => {
                    const methodLabel = PAYMENT_METHODS[sub.paymentMethod as keyof typeof PAYMENT_METHODS]?.shortLabel;
                    const isPendingManual = sub.paymentStatus === "pending" && sub.paymentMethod !== "simulation";
                    return (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/30 px-3.5 py-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                            Forfait {sub.planName}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                            {new Date(sub.startDate).toLocaleDateString("fr-FR", {
                              day: "numeric", month: "short", year: "numeric",
                            })}
                            {sub.endDate && ` → ${new Date(sub.endDate).toLocaleDateString("fr-FR", {
                              day: "numeric", month: "short", year: "numeric",
                            })}`}
                          </p>
                          {(methodLabel || sub.paymentRef) && (
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {methodLabel && <span className="font-medium">{methodLabel}</span>}
                              {sub.paymentRef && <span className="text-slate-400 dark:text-slate-500"> · {sub.paymentRef}</span>}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0 ml-2 flex flex-col items-end gap-1">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {sub.price} {sub.currency}
                          </span>
                          <Badge
                            className={`rounded-full border-0 text-[9px] px-1.5 py-0 font-semibold ${
                              sub.paymentStatus === "paid"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                                : sub.paymentStatus === "pending"
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                                : "bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                            }`}>
                            {sub.paymentStatus === "paid" ? "Payé" : sub.paymentStatus === "pending" ? "En attente" : "Expiré"}
                          </Badge>
                          {isPendingManual && (
                            <button
                              onClick={async () => {
                                try {
                                  await confirmPayment({ subscriptionId: sub.id });
                                  toast.success("Paiement confirmé !", {
                                    description: "Votre forfait est maintenant actif.",
                                  });
                                } catch (e: any) {
                                  toast.error("Erreur", {
                                    description: e?.data?.message || e?.message || "Impossible de confirmer le paiement.",
                                  });
                                }
                              }}
                              className="text-[10px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 underline underline-offset-2 transition-colors"
                            >
                              Confirmer le paiement
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-row gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setProfileOpen(false)}
              className="flex-1 rounded-xl h-10 sm:h-11 text-xs sm:text-sm"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSaveProfile}
              disabled={savingProfile || !profileName.trim()}
              className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white h-10 sm:h-11 text-xs sm:text-sm shadow-md"
            >
              {savingProfile ? (
                <><Loader2 className="mr-1.5 size-3.5 sm:size-4 animate-spin" /> Enregistrement...</>
              ) : (
                <><CheckCircle2 className="mr-1.5 size-3.5 sm:size-4" /> Enregistrer</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Shared sub-components ── */

function EmptyState({ icon: Icon, title, desc, action, onClick }: {
  icon: any; title: string; desc: string; action: string; onClick: () => void;
}) {
  return (
    <Card className={CARD_CLS}>
      <CardContent className="flex flex-col items-center justify-center py-8 sm:py-14 px-4 sm:px-8">
        <div className="flex size-14 sm:size-18 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30 mb-3 sm:mb-5">
          <Icon className="size-6 sm:size-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className="text-sm sm:text-lg font-semibold text-slate-900 dark:text-slate-100 text-center">{title}</h3>
        <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 text-center max-w-xs sm:max-w-sm">{desc}</p>
        <Button onClick={onClick} className="mt-4 sm:mt-7 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-200/50 dark:shadow-blue-900/50 hover:shadow-lg hover:from-blue-700 hover:to-blue-600 transition-all h-9 sm:h-11 text-xs sm:text-sm font-semibold">
          <Plus className="mr-1.5 size-3.5 sm:size-4" /> {action}
        </Button>
      </CardContent>
    </Card>
  );
}

function EmptySearchResult({ search }: { search: string }) {
  return (
    <Card className={CARD_CLS}>
      <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 px-4">
        <Search className="size-10 sm:size-14 text-slate-300 dark:text-slate-600 mb-2 sm:mb-4" />
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 text-center px-4">
          Aucun résultat pour "<strong>{search}</strong>"
        </p>
        <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 mt-0.5">Essayez d'autres termes de recherche</p>
      </CardContent>
    </Card>
  );
}
