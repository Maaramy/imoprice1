import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Building, CheckCircle2, Loader2, Settings, MessageSquare, Send,
  ArrowLeft, LogOut, Sparkles, User, CheckCircle, AlertCircle, Camera,
  Trash2, AlertTriangle, Phone, MapPin, Ruler, Home, Layers, BedDouble,
  Bath, CookingPot, Sofa, Car, CalendarDays, KeyRound, TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";
import { PROPERTY_TYPES_LABELS, PROPERTY_STATES_LABELS, RENT_PROPERTY_TYPES_LABELS } from "@/convex/types";

/** Accent colour used on every card */
const CARD_CLS = "border-0 bg-white/95 dark:bg-slate-900/95 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)] rounded-2xl overflow-hidden relative";

function CardAccent({ color = "from-amber-500 via-amber-400 to-orange-400" }: { color?: string }) {
  return <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${color} opacity-60`} />;
}

// Tunisia regions (governorates) — agencies can cover multiple regions
const REGION_OPTIONS = [
  "Tunis", "Ariana", "Ben Arous", "Manouba", "Nabeul", "Zaghouan",
  "Bizerte", "Béja", "Jendouba", "Kef", "Siliana", "Sousse",
  "Monastir", "Mahdia", "Sfax", "Kairouan", "Kasserine", "Sidi Bouzid",
  "Gabès", "Médenine", "Tataouine", "Gafsa", "Tozeur", "Kébili",
];
const SPECIALTY_OPTIONS = ["résidentiel", "commercial", "terrain", "luxe", "location", "investissement"];

/** Multi-select chip picker for regions / specialties */
function MultiChipSelect({ label, options, selected, onToggle }: {
  label: string;
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-slate-500">{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              aria-pressed={active}
              className={`rounded-lg px-2.5 py-1 text-[10px] font-medium border transition-all ${
                active
                  ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                  : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-amber-300 dark:hover:border-amber-600"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Agencies() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const myAgencyProfile = useQuery(api.agencies.getMyAgencyProfile);
  const agencyRequests = useQuery(api.agencies.getMyAgencyRequests);
  const registerAgency = useMutation(api.agencies.registerAgencyProfile);
  const subscribeToPlan = useMutation(api.plans.subscribeToPlan);
  const updateRequestStatus = useMutation(api.agencies.updateRequestStatus);
  const deleteAgencyRequest = useMutation(api.agencies.deleteAgencyRequest);
  const suggestPrice = useMutation(api.agencies.suggestPrice);
  const sendAgencyMessage = useMutation(api.agencies.sendAgencyMessage);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [suggestDialog, setSuggestDialog] = useState<{ open: boolean; requestId: string; name: string }>({ open: false, requestId: "", name: "" });
  const [suggestedPrice, setSuggestedPrice] = useState("");
  const [agencyReplyMessage, setAgencyReplyMessage] = useState("");
  const [sendingSuggest, setSendingSuggest] = useState(false);
  const [messageDraft, setMessageDraft] = useState<Record<string, string>>({});
  const [sendingMsgId, setSendingMsgId] = useState<string | null>(null);
  const mySub = useQuery(api.plans.mySubscription);

  const [agencyForm, setAgencyForm] = useState({
    name: "", regions: [] as string[], address: "",
    phone: "", email: "", description: "", specialties: [] as string[], website: "",
  });
  const [savingAgency, setSavingAgency] = useState(false);
  const [subscribingAgency, setSubscribingAgency] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "", regions: [] as string[], address: "",
    phone: "", email: "", description: "", specialties: [] as string[], website: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [agencyLogo, setAgencyLogo] = useState<string | null>(null);
  const [editLogo, setEditLogo] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const editLogoInputRef = useRef<HTMLInputElement>(null);

  // Sync agency form when profile loads
  useEffect(() => {
    if (myAgencyProfile) {
      setAgencyLogo(myAgencyProfile.logoUrl || null);
      setAgencyForm({
        name: myAgencyProfile.name || "",
        regions: myAgencyProfile.regions || [],
        address: myAgencyProfile.address || "",
        phone: myAgencyProfile.phone || "",
        email: myAgencyProfile.email || "",
        description: myAgencyProfile.description || "",
        specialties: myAgencyProfile.specialties || [],
        website: myAgencyProfile.website || "",
      });
      setEditLogo(myAgencyProfile.logoUrl || null);
      setEditForm({
        name: myAgencyProfile.name || "",
        regions: myAgencyProfile.regions || [],
        address: myAgencyProfile.address || "",
        phone: myAgencyProfile.phone || "",
        email: myAgencyProfile.email || "",
        description: myAgencyProfile.description || "",
        specialties: myAgencyProfile.specialties || [],
        website: myAgencyProfile.website || "",
      });
    }
  }, [myAgencyProfile]);

  const handleLogoPick = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (isEdit) setEditLogo(dataUrl);
      else setAgencyLogo(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = (isEdit: boolean) => {
    if (isEdit) setEditLogo("");
    else setAgencyLogo("");
  };

  const handleEditProfile = async () => {
    if (!editForm.name || !editForm.phone || !editForm.email || editForm.regions.length === 0) {
      toast.error("Champs obligatoires", { description: "Nom, téléphone, email et au moins une région sont requis" });
      return;
    }
    setSavingEdit(true);
    try {
      await registerAgency({
        name: editForm.name,
        regions: editForm.regions,
        address: editForm.address,
        phone: editForm.phone,
        email: editForm.email,
        description: editForm.description,
        specialties: editForm.specialties,
        website: editForm.website || undefined,
        logoUrl: editLogo || undefined,
      });
      toast.success("Profil mis à jour !", { description: "Les modifications ont été enregistrées." });
      setEditDialogOpen(false);
    } catch (e: any) {
      toast.error("Erreur", { description: e?.data?.message || "Impossible de modifier le profil" });
    }
    setSavingEdit(false);
  };

  const handleSignOut = async () => { await signOut(); navigate("/"); };

  const waitingCount = Array.isArray(agencyRequests)
    ? agencyRequests.filter((r: any) => r.status === "pending").length
    : 0;

  // ── Real-time notification ──
  const prevWaitingRef = useRef(waitingCount);
  useEffect(() => {
    if (prevWaitingRef.current > 0 && waitingCount > prevWaitingRef.current) {
      const newCount = waitingCount - prevWaitingRef.current;
      toast.success(`${newCount} nouvelle${newCount > 1 ? "s" : ""} demande${newCount > 1 ? "s" : ""} reçue${newCount > 1 ? "s" : ""}!`, {
        description: "Consultez votre tableau de bord pour les détails.",
      });
    }
    prevWaitingRef.current = waitingCount;
  }, [waitingCount]);

  // Update document title with badge
  useEffect(() => {
    if (waitingCount > 0) {
      document.title = `(${waitingCount}) Espace Agences - imoprice AI`;
    } else {
      document.title = "Espace Agences - imoprice AI";
    }
    return () => { document.title = "imoprice AI"; };
  }, [waitingCount]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="mx-auto max-w-5xl px-3 sm:px-6 py-3 sm:py-6 pb-6 sm:pb-10">
        {/* ═══ HEADER ═══ */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                onClick={() => navigate("/dashboard")}
                className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                aria-label="Retour au tableau de bord"
              >
                <ArrowLeft className="size-3.5 sm:size-4" />
              </button>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-slate-100 truncate leading-tight flex items-center gap-2">
                  <Building className="size-4 sm:size-5 text-amber-500 shrink-0" />
                  Espace Agences
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 truncate leading-tight">
                  {myAgencyProfile ? `${myAgencyProfile.name} · ${(myAgencyProfile.regions || []).join(", ")}` : "Gérez votre profil et vos demandes"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <ThemeToggle />
              <button onClick={handleSignOut}
                className="flex size-9 sm:size-10 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                aria-label="Se déconnecter"
              >
                <LogOut className="size-3.5 sm:size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ═══ AGENCY CONTENT ═══ */}
        {!myAgencyProfile ? (
          /* ── Register agency form ── */
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Card className={CARD_CLS}>
                <CardAccent color="from-amber-500 via-amber-400 to-orange-400" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Building className="size-4 text-amber-500" /> Inscription agence
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                    Créez votre profil d'agence immobilière pour recevoir des demandes de clients
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0 space-y-2.5">
                  {/* Logo upload */}
                  <div className="flex items-center gap-3">
                    <div
                      onClick={() => logoInputRef.current?.click()}
                      className="relative flex size-16 shrink-0 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-amber-300 dark:hover:border-amber-600 transition-all overflow-hidden group"
                    >
                      {agencyLogo ? (
                        <>
                          <img src={agencyLogo} alt="Logo" className="size-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Camera className="size-5 text-white" />
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-0.5 text-slate-400">
                          <Camera className="size-4" />
                          <span className="text-[8px] font-medium">Logo</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Logo de l'agence</p>
                      <div className="flex gap-1.5">
                        <button onClick={() => logoInputRef.current?.click()}
                          className="rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 text-[9px] hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                        >
                          {agencyLogo ? "Changer" : "Ajouter"}
                        </button>
                        {agencyLogo && (
                          <button onClick={() => handleRemoveLogo(false)}
                            className="rounded-lg bg-red-50 dark:bg-red-950/30 text-red-500 px-2 py-1 text-[9px] hover:bg-red-100 dark:hover:bg-red-950/50 transition-all"
                          >
                            Supprimer
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoPick(e, false)} />
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Nom de l'agence</Label>
                    <Input value={agencyForm.name} onChange={(e) => setAgencyForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Nom" className="rounded-xl text-xs h-9" />
                  </div>
                  <MultiChipSelect
                    label="Régions couvertes · multi-sélection"
                    options={REGION_OPTIONS}
                    selected={agencyForm.regions}
                    onToggle={(r) => setAgencyForm(f => ({
                      ...f,
                      regions: f.regions.includes(r) ? f.regions.filter(x => x !== r) : [...f.regions, r],
                    }))}
                  />
                  <MultiChipSelect
                    label="Spécialités · multi-sélection"
                    options={SPECIALTY_OPTIONS}
                    selected={agencyForm.specialties}
                    onToggle={(s) => setAgencyForm(f => ({
                      ...f,
                      specialties: f.specialties.includes(s) ? f.specialties.filter(x => x !== s) : [...f.specialties, s],
                    }))}
                  />
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-500">Téléphone</Label>
                      <Input value={agencyForm.phone} onChange={(e) => setAgencyForm(f => ({ ...f, phone: e.target.value }))}
                        placeholder="+216 XX XXX XXX" className="rounded-xl text-xs h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-500">Email</Label>
                      <Input value={agencyForm.email} onChange={(e) => setAgencyForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="contact@agence.tn" type="email" className="rounded-xl text-xs h-9" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Site web</Label>
                    <Input value={agencyForm.website} onChange={(e) => setAgencyForm(f => ({ ...f, website: e.target.value }))}
                      placeholder="https://..." className="rounded-xl text-xs h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Adresse</Label>
                    <Input value={agencyForm.address} onChange={(e) => setAgencyForm(f => ({ ...f, address: e.target.value }))}
                      placeholder="Adresse complète" className="rounded-xl text-xs h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Description</Label>
                    <Textarea value={agencyForm.description} onChange={(e) => setAgencyForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Présentez votre agence..." className="rounded-xl text-xs resize-none min-h-[60px]" />
                  </div>
                  <Button onClick={async () => {
                    if (!agencyForm.name || !agencyForm.phone || !agencyForm.email || agencyForm.regions.length === 0) {
                      toast.error("Champs obligatoires", { description: "Nom, téléphone, email et au moins une région sont requis" });
                      return;
                    }
                    setSavingAgency(true);
                    try {
                      await registerAgency({
                        name: agencyForm.name,
                        regions: agencyForm.regions,
                        address: agencyForm.address,
                        phone: agencyForm.phone,
                        email: agencyForm.email,
                        description: agencyForm.description,
                        specialties: agencyForm.specialties,
                        website: agencyForm.website || undefined,
                        logoUrl: agencyLogo || undefined,
                      });
                      toast.success("Profil créé !", { description: "Votre agence est enregistrée. Souscrivez pour apparaître dans les résultats." });
                    } catch (e: any) {
                      toast.error("Erreur", { description: e?.data?.message || "Impossible d'enregistrer" });
                    }
                    setSavingAgency(false);
                  }} disabled={savingAgency}
                    className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 h-9 text-xs font-semibold"
                  >
                    {savingAgency ? <><Loader2 className="mr-1.5 size-3.5 animate-spin" /> Enregistrement...</> : <><CheckCircle className="mr-1.5 size-3.5" /> Enregistrer mon agence</>}
                  </Button>
                </CardContent>
              </Card>

              {/* Info card */}
              <div className="space-y-3">
                <Card className={CARD_CLS}>
                  <CardAccent color="from-amber-500 via-amber-400 to-orange-400" />
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Sparkles className="size-4 text-amber-500" /> Devenir partenaire
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-100 dark:border-amber-900/40 p-3">
                      <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1">Forfait Agence</p>
                      <p className="text-lg font-bold text-amber-900 dark:text-amber-200">120 TND <span className="text-xs font-normal text-amber-600 dark:text-amber-400">/mois</span></p>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">2 mois d'essai gratuit</p>
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                      {[
                        "Profil d'agence personnalisé",
                        "Apparaître dans les résultats d'estimation",
                        "Recevoir des demandes de clients",
                        "Coordonnées et spécialités visibles",
                        "Tableau de bord des leads",
                        "2 mois d'essai gratuit",
                      ].map((f, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <CheckCircle2 className="size-3 text-emerald-500 shrink-0" /> {f}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                <Card className={CARD_CLS}>
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                      Après avoir créé votre profil, souscrivez au forfait Agence pour être visible auprès des propriétaires.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </motion.div>
        ) : (
          /* ── Agency dashboard ── */
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Agency Profile Card */}
              <Card className={CARD_CLS}>
                <CardAccent color="from-amber-500 via-amber-400 to-orange-400" />
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    {myAgencyProfile.logoUrl ? (
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 overflow-hidden">
                        <img src={myAgencyProfile.logoUrl} alt="Logo" className="size-full object-cover" />
                      </div>
                    ) : (
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30">
                        <Building className="size-5 text-amber-600 dark:text-amber-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <CardTitle className="text-sm text-slate-900 dark:text-slate-100 truncate">
                        {myAgencyProfile.name}
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500 truncate">
                        {(myAgencyProfile.regions || []).join(", ")}
                        {myAgencyProfile.specialties?.length ? <span> · {myAgencyProfile.specialties.join(", ")}</span> : null}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400">Coordonnées</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{myAgencyProfile.phone} · {myAgencyProfile.email}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400">Adresse</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{myAgencyProfile.address}</p>
                  </div>

                  {/* Subscription status */}
                  {(mySub?.planType === "agence" || mySub?.planType === "expert") && mySub.status === "active" && (
                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 p-2.5 mt-2">
                      <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 flex-wrap">
                        <CheckCircle2 className="size-3.5 shrink-0" />
                        {mySub.planType === "expert" ? (
                          <>Espace agence inclus avec votre forfait Expert — Visible dans les résultats</>
                        ) : (
                          <>Abonnement actif — Visible dans les résultats</>
                        )}
                        {mySub.trialEndDate && new Date(mySub.trialEndDate) > new Date() && (
                          <span className="text-emerald-500">(Essai gratuit jusqu'au {new Date(mySub.trialEndDate).toLocaleDateString("fr-FR")})</span>
                        )}
                      </div>
                    </div>
                  )}
                  {(!mySub || (mySub.planType !== "agence" && mySub.planType !== "expert") || mySub.status !== "active") && (
                    <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 p-2.5 mt-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          {mySub?.planType === "expert" ? "Activation en cours..." : "Abonnez-vous pour être visible"}
                        </p>
                        {mySub?.planType === "expert" ? (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                         Inclus avec Expert
                          </span>
                        ) : (
                          <Button onClick={async () => {
                          setSubscribingAgency(true);
                          try {
                            const result = await subscribeToPlan({ planType: "agence" });
                            toast.success("Abonnement agence activé !", { description: result.message });
                          } catch (e: any) {
                            toast.error("Erreur", { description: e?.data?.message || "Impossible de souscrire" });
                          }
                          setSubscribingAgency(false);
                        }} disabled={subscribingAgency}
                          className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs h-7 px-3 shrink-0 hover:from-amber-600 hover:to-orange-600"
                        >
                          {subscribingAgency ? <Loader2 className="size-3 animate-spin" /> : "120 TND/mois"}
                        </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Edit profile button — opens dialog */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditForm({
                        name: myAgencyProfile.name || "",
                        regions: myAgencyProfile.regions || [],
                        address: myAgencyProfile.address || "",
                        phone: myAgencyProfile.phone || "",
                        email: myAgencyProfile.email || "",
                        description: myAgencyProfile.description || "",
                        specialties: myAgencyProfile.specialties || [],
                        website: myAgencyProfile.website || "",
                      });
                      setEditDialogOpen(true);
                    }}
                    className="w-full rounded-xl text-xs h-8 mt-2 dark:border-slate-700 dark:text-slate-300"
                  >
                    <Settings className="mr-1.5 size-3.5" /> Modifier le profil
                  </Button>
                </CardContent>
              </Card>

              {/* Agency Requests Card */}
              <Card className={CARD_CLS}>
                <CardAccent color="from-blue-500 via-blue-400 to-emerald-400" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <MessageSquare className="size-4 text-blue-500" /> Demandes reçues
                    {waitingCount > 0 && (
                      <Badge className="ml-auto rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-0 text-[10px] px-1.5">
                        {waitingCount} nouvelle{waitingCount > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Propriétaires intéressés par vos services
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  {agencyRequests === undefined ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="size-4 text-slate-400 animate-spin" />
                    </div>
                  ) : agencyRequests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <Send className="size-8 text-slate-300 dark:text-slate-600 mb-1.5" />
                      <p className="text-xs text-slate-500 dark:text-slate-400">Aucune demande pour le moment</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        Les demandes apparaîtront quand des utilisateurs vous enverront leur estimation.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5 scrollbar-thin">
                      {agencyRequests.map((req: any) => (
                        <div key={req._id}
                          className={`rounded-xl border p-2.5 transition-all ${
                            req.status === "pending"
                              ? "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20"
                              : req.status === "contacted"
                              ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20"
                              : req.status === "suggested"
                              ? "border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/20"
                              : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{req.userName}</p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400">{req.userEmail}</p>
                            </div>
                            <Badge className={`rounded-full border-0 text-[9px] px-1.5 py-0 ${
                              req.status === "pending"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                : req.status === "contacted"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                : req.status === "suggested"
                                ? "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            }`}>
                              {req.status === "pending" ? "Nouveau" : req.status === "contacted" ? "Contacté" : req.status === "suggested" ? "Prix envoyé" : "Lu"}
                            </Badge>
                            {confirmDeleteId === req._id ? (
                              <button
                                onClick={async () => {
                                  setDeletingId(req._id);
                                  try {
                                    await deleteAgencyRequest({ requestId: req._id });
                                    toast.success("Demande supprimée");
                                    setConfirmDeleteId(null);
                                  } catch (e: any) {
                                    toast.error("Erreur", { description: e?.data?.message || "Impossible de supprimer" });
                                  }
                                  setDeletingId(null);
                                }}
                                disabled={deletingId === req._id}
                                className="flex items-center gap-0.5 rounded-lg bg-red-500 px-1.5 py-0.5 text-[9px] font-semibold text-white hover:bg-red-600 transition-all"
                                title="Confirmer la suppression"
                              >
                                {deletingId === req._id ? <Loader2 className="size-2.5 animate-spin" /> : <AlertTriangle className="size-2.5" />}
                                Oui
                              </button>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteId(req._id)}
                                className="flex size-5 shrink-0 items-center justify-center rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 dark:text-slate-600 dark:hover:bg-red-950/40 transition-all"
                                title="Supprimer la demande"
                                aria-label="Supprimer la demande"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            )}
                          </div>
                          {/* Contact buttons — call the client */}
                          {req.userPhone && (
                            <div className="mb-1.5 flex items-center gap-1">
                              <a
                                href={`tel:${req.userPhone}`}
                                className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 text-[10px] h-7 transition-all font-semibold"
                                title={`Appeler ${req.userName} au ${req.userPhone}`}
                              >
                                <Phone className="size-3" />
                                Contacter
                              </a>
                              <a
                                href={`tel:${req.userPhone}`}
                                className="text-[9px] text-slate-500 dark:text-slate-400 font-medium truncate"
                              >
                                {req.userPhone}
                              </a>
                            </div>
                          )}
                          {req.message && (
                            <p className="text-[10px] text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-slate-900/50 rounded-lg px-2 py-1 mb-1.5">{req.message}</p>
                          )}
                          {/* Detailed property summary */}
                          {req.property && (
                            <div className="mb-1.5 rounded-lg border border-slate-200/70 dark:border-slate-700/70 bg-white/60 dark:bg-slate-900/40 px-2 py-1.5">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="flex items-center gap-1 text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate">
                                  <Home className="size-3 text-blue-500 shrink-0" />
                                  {PROPERTY_TYPES_LABELS[req.property.propertyType as keyof typeof PROPERTY_TYPES_LABELS] ?? req.property.propertyType ?? "Bien"}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-[9px] text-slate-500 dark:text-slate-400 mb-1 flex-wrap">
                                <MapPin className="size-2.5 shrink-0" />
                                <span className="truncate">
                                  {[req.property.address, req.property.quartier, req.property.ville, req.property.gouvernorat].filter(Boolean).join(" · ") || "Localisation non renseignée"}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px] text-slate-500 dark:text-slate-400">
                                {req.property.terrainSurface != null && (
                                  <span className="flex items-center gap-1"><Ruler className="size-2.5 text-slate-400 shrink-0" />Terrain {req.property.terrainSurface} m²</span>
                                )}
                                {req.property.builtSurface != null && (
                                  <span className="flex items-center gap-1"><Ruler className="size-2.5 text-slate-400 shrink-0" />Bâti {req.property.builtSurface} m²</span>
                                )}
                                {req.property.floors != null && (
                                  <span className="flex items-center gap-1"><Layers className="size-2.5 text-slate-400 shrink-0" />{req.property.floors} étage{req.property.floors > 1 ? "s" : ""}</span>
                                )}
                                {req.property.yearBuilt != null && (
                                  <span className="flex items-center gap-1"><CalendarDays className="size-2.5 text-slate-400 shrink-0" />{req.property.yearBuilt}</span>
                                )}
                                {req.property.bedrooms != null && (
                                  <span className="flex items-center gap-1"><BedDouble className="size-2.5 text-slate-400 shrink-0" />{req.property.bedrooms} ch.</span>
                                )}
                                {req.property.bathrooms != null && (
                                  <span className="flex items-center gap-1"><Bath className="size-2.5 text-slate-400 shrink-0" />{req.property.bathrooms} sdb</span>
                                )}
                                {req.property.kitchens != null && (
                                  <span className="flex items-center gap-1"><CookingPot className="size-2.5 text-slate-400 shrink-0" />{req.property.kitchens} cui.</span>
                                )}
                                {req.property.livingRooms != null && (
                                  <span className="flex items-center gap-1"><Sofa className="size-2.5 text-slate-400 shrink-0" />{req.property.livingRooms} salon</span>
                                )}
                                {req.property.garages != null && (
                                  <span className="flex items-center gap-1"><Car className="size-2.5 text-slate-400 shrink-0" />{req.property.garages} gar.</span>
                                )}
                                {req.property.generalState && (
                                  <span className="flex items-center gap-1"><CheckCircle2 className="size-2.5 text-emerald-500 shrink-0" />{PROPERTY_STATES_LABELS[req.property.generalState] ?? req.property.generalState}</span>
                                )}
                              </div>
                              {/* Equipment chips */}
                              {(() => {
                                const eq: { key: string; label: string }[] = [];
                                const p = req.property;
                                if (p.hasGarden) eq.push({ key: "jardin", label: "Jardin" });
                                if (p.hasPool) eq.push({ key: "piscine", label: "Piscine" });
                                if (p.hasTerrace) eq.push({ key: "terrasse", label: "Terrasse" });
                                if (p.hasBalcony) eq.push({ key: "balcon", label: "Balcon" });
                                if (p.hasElevator) eq.push({ key: "ascenseur", label: "Ascenseur" });
                                if (p.hasParking) eq.push({ key: "parking", label: "Parking" });
                                if (p.hasAC) eq.push({ key: "clim", label: "Climatisation" });
                                if (p.hasHeating) eq.push({ key: "chauffage", label: "Chauffage" });
                                if (p.hasSolar) eq.push({ key: "solaire", label: "Solaire" });
                                return eq.length > 0 ? (
                                  <div className="mt-1 flex flex-wrap gap-0.5">
                                    {eq.map((e) => (
                                      <span key={e.key} className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 text-[8px] font-medium text-emerald-700 dark:text-emerald-300">
                                        <CheckCircle2 className="size-2" />{e.label}
                                      </span>
                                    ))}
                                  </div>
                                ) : null;
                              })()}
                              {req.estimation?.confidenceIndex != null && (
                                <div className="mt-1 flex items-center gap-1 text-[9px] text-slate-400 dark:text-slate-500">
                                  <Sparkles className="size-2.5" />
                                  Confiance {req.estimation.confidenceIndex}% ·
                                  {req.estimation.priceMin != null && <span>{req.estimation.priceMin.toLocaleString()} – {req.estimation.priceMax?.toLocaleString()} TND</span>}
                                </div>
                              )}
                            </div>
                          )}
                          {/* Detailed rent estimation summary (location mensuelle / nuitée) */}
                          {req.rentEstimation && (
                            <div className="mb-1.5 rounded-lg border border-emerald-200/70 dark:border-emerald-700/70 bg-emerald-50/40 dark:bg-emerald-950/20 px-2 py-1.5">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="flex items-center gap-1 text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate">
                                  <KeyRound className="size-3 text-emerald-500 shrink-0" />
                                  {RENT_PROPERTY_TYPES_LABELS[req.rentEstimation.property?.propertyType] ?? req.rentEstimation.property?.propertyType ?? "Bien à louer"}
                                  <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-1.5 py-px text-[8px] font-semibold text-emerald-700 dark:text-emerald-300">Location</span>
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-[9px] text-slate-500 dark:text-slate-400 mb-1 flex-wrap">
                                <MapPin className="size-2.5 shrink-0" />
                                <span className="truncate">
                                  {[req.rentEstimation.property?.address, req.rentEstimation.property?.quartier, req.rentEstimation.property?.ville, req.rentEstimation.property?.gouvernorat].filter(Boolean).join(" · ") || "Localisation non renseignée"}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px] text-slate-500 dark:text-slate-400">
                                {req.rentEstimation.property?.builtSurface != null && (
                                  <span className="flex items-center gap-1"><Ruler className="size-2.5 text-slate-400 shrink-0" />Bâti {req.rentEstimation.property.builtSurface} m²</span>
                                )}
                                {req.rentEstimation.property?.bedrooms != null && (
                                  <span className="flex items-center gap-1"><BedDouble className="size-2.5 text-slate-400 shrink-0" />{req.rentEstimation.property.bedrooms} ch.</span>
                                )}
                                {req.rentEstimation.property?.isFurnished != null && (
                                  <span className="flex items-center gap-1"><CheckCircle2 className="size-2.5 text-emerald-500 shrink-0" />{req.rentEstimation.property.isFurnished ? "Meublé" : "Non meublé"}</span>
                                )}
                                {req.rentEstimation.grossYield != null && (
                                  <span className="flex items-center gap-1"><TrendingUp className="size-2.5 text-emerald-500 shrink-0" />Rendement {req.rentEstimation.grossYield.toFixed(1)}% / an</span>
                                )}
                              </div>
                              <div className="mt-1 rounded-lg bg-white/60 dark:bg-slate-900/40 px-2 py-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300">Loyer estimé</span>
                                  <span className="text-[10px] font-bold text-slate-900 dark:text-slate-100">
                                    {req.rentEstimation.estimatedRent?.toLocaleString() ?? "—"} TND/mois
                                  </span>
                                </div>
                                <div className="mt-0.5 flex items-center justify-between gap-2 text-[8px] text-slate-400 dark:text-slate-500">
                                  <span>Prudent {req.rentEstimation.rentMin?.toLocaleString() ?? "—"} · Réaliste {req.rentEstimation.estimatedRent?.toLocaleString() ?? "—"} · Optimiste {req.rentEstimation.rentMax?.toLocaleString() ?? "—"}</span>
                                </div>
                                {req.rentEstimation.confidenceIndex != null && (
                                  <div className="mt-0.5 flex items-center gap-1 text-[8px] text-slate-400 dark:text-slate-500">
                                    <Sparkles className="size-2.5" /> Confiance {req.rentEstimation.confidenceIndex}%
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          {/* Price scenario the user chose */}
                          {req.priceScenario && (
                            <div className="mb-1.5 rounded-lg bg-slate-100/70 dark:bg-slate-800/70 px-2 py-1.5">
                              <p className="text-[9px] uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-0.5">
                                Scénario partagé par le client
                              </p>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                                  {req.priceScenario === "optimiste" ? "Optimiste" : req.priceScenario === "vente_rapide" ? "Vente rapide" : "Réaliste"}
                                </span>
                                <span className="text-[10px] font-bold text-slate-900 dark:text-slate-100">
                                  {req.priceScenario === "optimiste"
                                    ? (req.estimation?.maxProfitPrice ?? 0).toLocaleString()
                                    : req.priceScenario === "vente_rapide"
                                      ? (req.estimation?.fastSalePrice ?? 0).toLocaleString()
                                      : (req.estimation?.estimatedValue ?? 0).toLocaleString()}
                                  {" "}TND
                                </span>
                              </div>
                              <div className="mt-1 flex items-center gap-1.5 text-[9px] text-slate-400 dark:text-slate-500">
                                <span>Optimiste {(req.estimation?.maxProfitPrice ?? 0).toLocaleString()}</span>
                                <span>·</span>
                                <span>Réaliste {(req.estimation?.estimatedValue ?? 0).toLocaleString()}</span>
                                <span>·</span>
                                <span>Rapide {(req.estimation?.fastSalePrice ?? 0).toLocaleString()}</span>
                              </div>
                            </div>
                          )}
                          {/* Rent price scenario the user chose (location) */}
                          {req.rentPriceScenario && (
                            <div className="mb-1.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 px-2 py-1.5">
                              <p className="text-[9px] uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-0.5">
                                Scénario de loyer partagé par le client
                              </p>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                                  {req.rentPriceScenario === "optimiste" ? "Optimiste" : req.rentPriceScenario === "prudent" ? "Prudent" : "Réaliste"}
                                </span>
                                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                                  {req.rentPriceScenario === "optimiste"
                                    ? (req.rentEstimation?.rentMax ?? 0).toLocaleString()
                                    : req.rentPriceScenario === "prudent"
                                      ? (req.rentEstimation?.rentMin ?? 0).toLocaleString()
                                      : (req.rentEstimation?.estimatedRent ?? 0).toLocaleString()}
                                  {" "}TND/mois
                                </span>
                              </div>
                              <div className="mt-1 flex items-center gap-1.5 text-[9px] text-slate-400 dark:text-slate-500">
                                <span>Prudent {(req.rentEstimation?.rentMin ?? 0).toLocaleString()}</span>
                                <span>·</span>
                                <span>Réaliste {(req.rentEstimation?.estimatedRent ?? 0).toLocaleString()}</span>
                                <span>·</span>
                                <span>Optimiste {(req.rentEstimation?.rentMax ?? 0).toLocaleString()}</span>
                              </div>
                            </div>
                          )}
                          {/* Agency's suggested price already sent */}
                          {req.suggestedPrice ? (
                            <div className="mb-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/30 px-2 py-1.5">
                              <p className="text-[9px] uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-0.5">
                                Votre prix suggéré (envoyé au client)
                              </p>
                              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                                {req.suggestedPrice.toLocaleString()} TND
                              </p>
                              {req.agencyMessage && (
                                <p className="mt-1 text-[10px] text-slate-600 dark:text-slate-300">{req.agencyMessage}</p>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setSuggestDialog({ open: true, requestId: req._id, name: req.userName });
                                setSuggestedPrice("");
                                setAgencyReplyMessage("");
                              }}
                              className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 text-[10px] h-7 mb-1.5 transition-all font-medium"
                            >
                              Suggérer un prix
                            </button>
                          )}
                          {/* Conversation thread with the client */}
                          {req.thread && req.thread.length > 0 && (
                            <div className="mb-1.5 space-y-1">
                              {req.thread.map((m: any) => (
                                <div
                                  key={m._id}
                                  className={`flex ${m.direction === "out" ? "justify-start" : "justify-end"}`}
                                >
                                  <div className={`max-w-[85%] rounded-xl px-2 py-1 text-[10px] leading-relaxed ${
                                    m.direction === "out"
                                      ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-bl-sm"
                                      : "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-br-sm"
                                  }`}>
                                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                                    <p className="mt-0.5 text-[8px] opacity-60">
                                      {m.direction === "out" ? req.userName.split(" ")[0] : "Vous"} · {new Date(m.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {/* Reply to the client */}
                          <div className="mb-1.5 flex items-end gap-1">
                            <Textarea
                              value={messageDraft[req._id] || ""}
                              onChange={(e) => setMessageDraft((d) => ({ ...d, [req._id]: e.target.value }))}
                              placeholder="Répondre au client..."
                              className="min-h-[30px] h-8 flex-1 rounded-lg text-[10px] resize-none px-2 py-1"
                            />
                            <button
                              onClick={async () => {
                                const content = (messageDraft[req._id] || "").trim();
                                if (!content) return;
                                setSendingMsgId(req._id);
                                try {
                                  await sendAgencyMessage({ requestId: req._id, content });
                                  setMessageDraft((d) => ({ ...d, [req._id]: "" }));
                                  toast.success("Message envoyé au client");
                                } catch (e: any) {
                                  toast.error("Erreur", { description: e?.data?.message || "Impossible d'envoyer" });
                                }
                                setSendingMsgId(null);
                              }}
                              disabled={sendingMsgId === req._id || !(messageDraft[req._id] || "").trim()}
                              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600 transition-all disabled:opacity-50"
                              title="Envoyer au client"
                              aria-label="Envoyer au client"
                            >
                              {sendingMsgId === req._id ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                            </button>
                          </div>
                          {req.status !== "contacted" && req.status !== "suggested" && (
                            <div className="flex gap-1">
                              <button onClick={async () => {
                                try {
                                  await updateRequestStatus({ requestId: req._id, status: "read" });
                                  toast.success("Marqué comme lu");
                                } catch {}
                              }}
                                className="flex-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[9px] h-6 transition-all"
                              >
                                Marquer lu
                              </button>
                              <button onClick={async () => {
                                try {
                                  await updateRequestStatus({ requestId: req._id, status: "contacted" });
                                  toast.success("Marqué comme contacté");
                                } catch {}
                              }}
                                className="flex-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 text-[9px] h-6 transition-all"
                              >
                                ✓ Contacté
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}
      </div>

      {/* ═══ SUGGEST PRICE DIALOG ═══ */}
      <Dialog open={suggestDialog.open} onOpenChange={(open) => setSuggestDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-[calc(100%-1rem)] gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-sm">
          <DialogHeader className="border-b border-slate-100 px-4 pt-7 pb-3 text-left dark:border-slate-800 sm:px-6 sm:pt-6">
            <DialogTitle className="text-sm flex items-center gap-2">
              <Send className="size-4 text-emerald-500" /> Suggérer un prix
            </DialogTitle>
            <DialogDescription className="text-xs">
              Proposez un prix au client {suggestDialog.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 px-4 py-4 sm:px-6">
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 p-3">
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-1">
                Contre-offre personnalisée
              </p>
              <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 leading-relaxed">
                Le client recevra votre prix suggéré avec votre message. Il pourra comparer avec son estimation.
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Prix suggéré (TND)</Label>
              <Input
                value={suggestedPrice}
                onChange={(e) => setSuggestedPrice(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="250000"
                inputMode="numeric"
                type="number"
                className="rounded-xl text-sm h-10"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Message au client (optionnel)</Label>
              <Textarea
                value={agencyReplyMessage}
                onChange={(e) => setAgencyReplyMessage(e.target.value)}
                placeholder="Bonjour, nous proposons un prix de ..."
                className="rounded-xl text-xs resize-none min-h-[70px]"
              />
            </div>
          </div>
          <DialogFooter className="border-t border-slate-100 bg-slate-50/80 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/60 sm:px-6">
            <Button variant="outline" onClick={() => setSuggestDialog(prev => ({ ...prev, open: false }))}
              className="h-9 w-full rounded-xl text-xs dark:border-slate-700 sm:w-auto">
              Annuler
            </Button>
            <Button
              onClick={async () => {
                const price = Number(suggestedPrice);
                if (!price || price <= 0) {
                  toast.error("Prix invalide", { description: "Entrez un prix supérieur à 0" });
                  return;
                }
                setSendingSuggest(true);
                try {
                  await suggestPrice({
                    requestId: suggestDialog.requestId as any,
                    suggestedPrice: price,
                    agencyMessage: agencyReplyMessage || undefined,
                  });
                  toast.success("Prix suggéré envoyé !", {
                    description: `Le client ${suggestDialog.name} recevra votre contre-offre.`,
                  });
                  setSuggestDialog({ open: false, requestId: "", name: "" });
                } catch (e: any) {
                  toast.error("Erreur", { description: e?.data?.message || e?.message || "Impossible d'envoyer" });
                }
                setSendingSuggest(false);
              }}
              disabled={sendingSuggest}
              className="h-9 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 text-xs sm:w-auto"
            >
              {sendingSuggest ? <><Loader2 className="mr-1.5 size-3.5 animate-spin" /> Envoi...</> : "Envoyer la contre-offre"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ EDIT PROFILE DIALOG ═══ */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-[calc(100%-1rem)] gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-lg">
          <DialogHeader className="border-b border-slate-100 px-4 pt-7 pb-3 text-left dark:border-slate-800 sm:px-6 sm:pt-6">
            <DialogTitle className="text-sm">Modifier le profil agence</DialogTitle>
            <DialogDescription className="text-xs">
              Mettez à jour les informations de votre agence immobilière
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[55dvh] space-y-3 overflow-y-auto overscroll-contain px-4 py-4 sm:max-h-[62vh] sm:px-6">
            {/* Logo upload in edit */}
            <div className="flex items-center gap-3">
              <div
                onClick={() => editLogoInputRef.current?.click()}
                className="relative flex size-16 shrink-0 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-amber-300 dark:hover:border-amber-600 transition-all overflow-hidden group"
              >
                {editLogo ? (
                  <>
                    <img src={editLogo} alt="Logo" className="size-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="size-5 text-white" />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-0.5 text-slate-400">
                    <Camera className="size-4" />
                    <span className="text-[8px] font-medium">Logo</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Logo de l'agence</p>
                <div className="flex gap-1.5">
                  <button onClick={() => editLogoInputRef.current?.click()}
                    className="rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 text-[9px] hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                  >
                    {editLogo ? "Changer" : "Ajouter"}
                  </button>
                  {editLogo && (
                    <button onClick={() => handleRemoveLogo(true)}
                      className="rounded-lg bg-red-50 dark:bg-red-950/30 text-red-500 px-2 py-1 text-[9px] hover:bg-red-100 dark:hover:bg-red-950/50 transition-all"
                    >
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            </div>
            <input ref={editLogoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoPick(e, true)} />
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Nom de l'agence</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Nom" className="rounded-xl text-xs h-9" />
            </div>
            <MultiChipSelect
              label="Régions couvertes · multi-sélection"
              options={REGION_OPTIONS}
              selected={editForm.regions}
              onToggle={(r) => setEditForm(f => ({
                ...f,
                regions: f.regions.includes(r) ? f.regions.filter(x => x !== r) : [...f.regions, r],
              }))}
            />
            <MultiChipSelect
              label="Spécialités · multi-sélection"
              options={SPECIALTY_OPTIONS}
              selected={editForm.specialties}
              onToggle={(s) => setEditForm(f => ({
                ...f,
                specialties: f.specialties.includes(s) ? f.specialties.filter(x => x !== s) : [...f.specialties, s],
              }))}
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Téléphone</Label>
                <Input value={editForm.phone} onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+216 XX XXX XXX" className="rounded-xl text-xs h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Email</Label>
                <Input value={editForm.email} onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="contact@agence.tn" type="email" className="rounded-xl text-xs h-9" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Site web</Label>
              <Input value={editForm.website} onChange={(e) => setEditForm(f => ({ ...f, website: e.target.value }))}
                placeholder="https://..." className="rounded-xl text-xs h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Adresse</Label>
              <Input value={editForm.address} onChange={(e) => setEditForm(f => ({ ...f, address: e.target.value }))}
                placeholder="Adresse complète" className="rounded-xl text-xs h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Description</Label>
              <Textarea value={editForm.description} onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Présentez votre agence..." className="rounded-xl text-xs resize-none min-h-[60px]" />
            </div>
          </div>
          <DialogFooter className="border-t border-slate-100 bg-slate-50/80 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/60 sm:px-6">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}
              className="h-9 w-full rounded-xl text-xs dark:border-slate-700 sm:w-auto">
              Annuler
            </Button>
            <Button onClick={handleEditProfile} disabled={savingEdit}
              className="h-9 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 text-xs sm:w-auto"
            >
              {savingEdit ? <><Loader2 className="mr-1.5 size-3.5 animate-spin" /> Enregistrement...</> : "Enregistrer les modifications"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
