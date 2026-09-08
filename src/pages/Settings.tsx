import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/ThemeProvider";
import { daysUntilNextReset, quotaBarColor } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ArrowLeft, User, Lock, Bell, SlidersHorizontal,
  AtSign, Phone, Camera, Loader2, Save,
  Moon, Sun, Monitor, BarChart3, RefreshCw,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

/** Accent colour used on every card — matches Dashboard/Auth */
const CARD_CLS = "border-0 bg-white/95 dark:bg-slate-900/95 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)] rounded-2xl overflow-hidden relative";

function CardAccent({ color = "from-blue-500 via-blue-400 to-emerald-400" }: { color?: string }) {
  return <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${color} opacity-60`} />;
}

function SectionLabel({ icon: Icon, label, desc }: { icon: any; label: string; desc?: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-3 sm:mb-4">
      <div className="flex size-8 sm:size-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/50">
        <Icon className="size-4 sm:size-4.5 text-blue-600 dark:text-blue-400" />
      </div>
      <div>
        <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100">{label}</h3>
        {desc && <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">{desc}</p>}
      </div>
    </div>
  );
}

export default function Settings() {
  const { lang } = useI18n();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const updateProfile = useMutation(api.users.updateUserProfile);
  const usage = useQuery(api.plans.getMonthlyUsage);

  // ─── Profile state ───
  const [profileName, setProfileName] = useState(user?.name || "");
  const [profilePhone, setProfilePhone] = useState(user?.phone || "");
  const [profileAvatar, setProfileAvatar] = useState<string | null>(user?.image || null);
  const [savingProfile, setSavingProfile] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);



  // ─── Notifications state ───
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifEstimation, setNotifEstimation] = useState(true);
  const [notifPromo, setNotifPromo] = useState(false);
  const [notifWeekly, setNotifWeekly] = useState(true);

  // ─── Preferences state ───
  const [prefLocale, setPrefLocale] = useState("fr");
  const [prefCurrency, setPrefCurrency] = useState("TND");

  // ─── Handlers ───
  const handleAvatarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setProfileAvatar(ev.target?.result as string);
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
      toast.success("Profil mis à jour", {
        description: "Vos informations ont été enregistrées.",
      });
    } catch {
      toast.error("Erreur", { description: "Impossible de mettre à jour le profil." });
    }
    setSavingProfile(false);
  };

  const handleChangePassword = () => {
    navigate("/auth?reset=true");
  };

  const handleSaveNotif = () => {
    toast.success("Notifications mises à jour", {
      description: "Vos préférences de notification ont été enregistrées.",
    });
  };

  const handleSavePrefs = () => {
    toast.success("Préférences mises à jour", {
      description: "Vos préférences ont été enregistrées.",
    });
  };



  // ─── Tabs configuration ───
  const tabs = [
    { value: "profile", label: "Profil", icon: User },
    { value: "security", label: "Sécurité", icon: Lock },
    { value: "notifications", label: "Notifications", icon: Bell },
    { value: "preferences", label: "Préférences", icon: SlidersHorizontal },
    { value: "usage", label: "Usage", icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="mx-auto max-w-2xl px-3 sm:px-6 py-3 sm:py-6 pb-16 sm:pb-10">
        {/* ═══ HEADER ═══ */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex size-9 sm:size-10 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shrink-0"
              aria-label="Retour au tableau de bord"
            >
              <ArrowLeft className="size-4 sm:size-4.5" />
            </button>
            <div>
              <h1 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                Paramètres
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Gérez votre compte et vos préférences
              </p>
            </div>
          </div>
        </div>

        {/* ═══ TABS ═══ */}
        <Tabs defaultValue="profile" className="space-y-4 sm:space-y-5">
          <TabsList className={`${CARD_CLS} p-1 w-full justify-start overflow-x-auto scrollbar-none gap-0.5`}>
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-lg data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-950/50 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-300 data-[state=active]:shadow-xs text-xs sm:text-sm transition-all whitespace-nowrap px-2.5 sm:px-4 py-1.5 sm:py-2 flex-1 sm:flex-none"
              >
                <tab.icon className="mr-1 sm:mr-1.5 size-3.5 sm:size-4" />
                <span>{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ─── TAB: PROFIL ─── */}
          <TabsContent value="profile" className="space-y-4">
            <Card className={CARD_CLS}>
              <CardAccent />
              <CardContent className="p-4 sm:p-6">
                <SectionLabel icon={User} label="Informations personnelles" desc="Nom, téléphone et photo de profil" />

                <div className="flex justify-center mb-5 sm:mb-6">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    aria-label="Changer la photo de profil"
                    className="group relative size-20 sm:size-24 overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-blue-500 shadow-lg shadow-blue-200/50 dark:shadow-blue-900/50 transition-all duration-200 hover:shadow-xl hover:scale-105 cursor-pointer"
                  >
                    {profileAvatar ? (
                      <img src={profileAvatar} alt="Avatar" className="size-full object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center">
                        <User className="size-8 sm:size-10 text-white" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-all duration-200">
                      <div className="flex size-10 sm:size-11 items-center justify-center rounded-full bg-white/90 shadow-md opacity-0 group-hover:opacity-100 transition-all duration-200 scale-50 group-hover:scale-100">
                        <Camera className="size-4 sm:size-5 text-slate-600" />
                      </div>
                    </div>
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleAvatarPick}
                    className="hidden"
                  />
                </div>

                <div className="space-y-3 sm:space-y-4">
                  {user?.email && (
                    <div className="space-y-1.5">
                      <Label className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">Email</Label>
                      <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-3.5 py-2.5 sm:py-3">
                        <AtSign className="size-4 text-slate-400 shrink-0" />
                        <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 truncate">{user.email}</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="settings-name" className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">Nom complet</Label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                      <Input
                        id="settings-name"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        placeholder="Votre nom"
                        className="pl-10 h-11 sm:h-12 rounded-xl border-slate-200 dark:border-slate-700 text-xs sm:text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="settings-phone" className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">Numéro de téléphone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                      <Input
                        id="settings-phone"
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value)}
                        placeholder="+216 XX XXX XXX"
                        type="tel"
                        className="pl-10 h-11 sm:h-12 rounded-xl border-slate-200 dark:border-slate-700 text-xs sm:text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5 sm:mt-6 flex justify-end">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-200/50 dark:shadow-blue-900/50 hover:shadow-lg hover:from-blue-700 hover:to-blue-600 transition-all h-10 sm:h-11 px-5 sm:px-6 text-xs sm:text-sm font-semibold"
                  >
                    {savingProfile ? (
                      <><Loader2 className="mr-2 size-4 animate-spin" />Enregistrement...</>
                    ) : (
                      <><Save className="mr-2 size-4" />Enregistrer</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── TAB: SÉCURITÉ ─── */}
          <TabsContent value="security" className="space-y-4">
            <Card className={CARD_CLS}>
              <CardAccent color="from-emerald-500 via-emerald-400 to-blue-400" />
              <CardContent className="p-4 sm:p-6">
                <SectionLabel icon={Lock} label="Changer le mot de passe" desc="Mettez à jour votre mot de passe de connexion" />

                <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-4 sm:p-5">
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    Pour modifier votre mot de passe, utilisez la procédure de réinitialisation.
                    Un code de vérification à 6 chiffres vous sera envoyé par email.
                  </p>
                  <Button
                    onClick={handleChangePassword}
                    className="mt-3 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-md shadow-emerald-200/50 dark:shadow-emerald-900/50 hover:shadow-lg hover:from-emerald-700 hover:to-emerald-600 transition-all h-10 sm:h-11 px-5 sm:px-6 text-xs sm:text-sm font-semibold"
                  >
                    <Lock className="mr-2 size-4" />Réinitialiser le mot de passe
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── TAB: NOTIFICATIONS ─── */}
          <TabsContent value="notifications" className="space-y-4">
            <Card className={CARD_CLS}>
              <CardAccent color="from-violet-500 via-violet-400 to-blue-400" />
              <CardContent className="p-4 sm:p-6">
                <SectionLabel icon={Bell} label="Préférences de notification" desc="Choisissez quand et comment être notifié" />

                <div className="space-y-1">
                  {[
                    { id: "notif-email", label: "Notifications par email", desc: "Recevoir les notifications importantes par email", checked: notifEmail, set: setNotifEmail },
                    { id: "notif-estimation", label: "Fin d'estimation", desc: "Être notifié quand une estimation est terminée", checked: notifEstimation, set: setNotifEstimation },
                    { id: "notif-promo", label: "Offres et promotions", desc: "Recevoir les offres spéciales et réductions", checked: notifPromo, set: setNotifPromo },
                    { id: "notif-weekly", label: "Rapport hebdomadaire", desc: "Recevoir un résumé de votre activité chaque semaine", checked: notifWeekly, set: setNotifWeekly },
                  ].map((n) => (
                    <div
                      key={n.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/30 px-3.5 sm:px-4 py-3 sm:py-3.5 hover:border-slate-200 dark:hover:border-slate-700 transition-all"
                    >
                      <div className="min-w-0 flex-1">
                        <Label htmlFor={n.id} className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                          {n.label}
                        </Label>
                        {n.desc && (
                          <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 mt-0.5">{n.desc}</p>
                        )}
                      </div>
                      <Switch
                        id={n.id}
                        checked={n.checked}
                        onCheckedChange={n.set}
                        className="data-[state=checked]:bg-blue-500 shrink-0"
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-5 sm:mt-6 flex justify-end">
                  <Button
                    onClick={handleSaveNotif}
                    className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-200/50 dark:shadow-blue-900/50 hover:shadow-lg hover:from-blue-700 hover:to-blue-600 transition-all h-10 sm:h-11 px-5 sm:px-6 text-xs sm:text-sm font-semibold"
                  >
                    <Save className="mr-2 size-4" />Enregistrer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── TAB: PRÉFÉRENCES ─── */}
          <TabsContent value="preferences" className="space-y-4">
            <Card className={CARD_CLS}>
              <CardAccent color="from-amber-500 via-amber-400 to-orange-400" />
              <CardContent className="p-4 sm:p-6">
                <SectionLabel icon={SlidersHorizontal} label="Préférences" desc="Personnalisez votre expérience" />

                {/* Theme */}
                <div className="mb-5 sm:mb-6">
                  <Label className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mb-2.5 block">Thème d'affichage</Label>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {[
                      { id: "light", icon: Sun, label: "Clair" },
                      { id: "dark", icon: Moon, label: "Sombre" },
                      { id: "system", icon: Monitor, label: "Système" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTheme(t.id as any)}
                        className={`flex flex-col items-center gap-1.5 sm:gap-2 rounded-xl border-2 p-3 sm:p-4 transition-all ${
                          theme === t.id
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300"
                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        <t.icon className="size-5 sm:size-6" />
                        <span className="text-xs sm:text-sm font-semibold">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language */}
                <div className="mb-5 sm:mb-6">
                  <Label htmlFor="pref-locale" className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mb-2.5 block">Langue</Label>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    {[
                      { id: "fr", label: "Français", sub: "FR" },
                      
                      { id: "en", label: "English", sub: "EN" },
                    ].map((l) => (
                      <button
                        key={l.id}
                        onClick={() => setPrefLocale(l.id)}
                        className={`flex items-center gap-2.5 rounded-xl border-2 px-3.5 sm:px-4 py-3 sm:py-3.5 transition-all ${
                          prefLocale === l.id
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300"
                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        <span className="flex size-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold">{l.sub}</span>
                        <span className="text-xs sm:text-sm font-medium">{l.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Currency */}
                <div>
                  <Label htmlFor="pref-currency" className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mb-2.5 block">Devise</Label>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {[
                      { id: "TND", label: "Dinar tunisien", sub: "DT" },
                      { id: "EUR", label: "Euro", sub: "€" },
                      { id: "USD", label: "Dollar US", sub: "$" },
                    ].map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setPrefCurrency(c.id)}
                        className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 sm:p-4 transition-all ${
                          prefCurrency === c.id
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300"
                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        <span className="text-lg sm:text-xl font-bold">{c.sub}</span>
                        <span className="text-[10px] sm:text-xs font-medium">{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-5 sm:mt-6 flex justify-end">
                  <Button
                    onClick={handleSavePrefs}
                    className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-200/50 dark:shadow-blue-900/50 hover:shadow-lg hover:from-blue-700 hover:to-blue-600 transition-all h-10 sm:h-11 px-5 sm:px-6 text-xs sm:text-sm font-semibold"
                  >
                    <Save className="mr-2 size-4" />Enregistrer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── TAB: USAGE ─── */}
          <TabsContent value="usage" className="space-y-4">
            <Card className={CARD_CLS}>
              <CardAccent color="from-blue-500 via-sky-400 to-cyan-400" />
              <CardContent className="p-4 sm:p-6">
                <SectionLabel icon={BarChart3} label="Utilisation des estimations" desc="Quota mensuel et historique" />

                {usage ? (
                  <>
                    {/* Current month summary */}
                    <div className="mb-5 sm:mb-6 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3.5 sm:p-4">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                            {usage.planName ?? "—"} · {usage.usedThisMonth}/{usage.limit} utilisées ce mois
                          </p>
                          <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            <RefreshCw className="inline size-3 mr-1 -mt-0.5" />
                            Prochaine réinitialisation dans {daysUntilNextReset()} jour{daysUntilNextReset() > 1 ? "s" : ""}
                          </p>
                        </div>
                        <span className="rounded-full bg-blue-50 dark:bg-blue-950/50 px-2.5 py-1 text-[10px] sm:text-xs font-bold text-blue-600 dark:text-blue-300">
                          {Math.max(usage.remaining, 0)} restantes
                        </span>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${quotaBarColor(usage.limit > 0 ? Math.max(usage.remaining, 0) / usage.limit : 0)}`}
                          style={{ width: `${usage.limit > 0 ? Math.min(100, (usage.usedThisMonth / usage.limit) * 100) : 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Monthly history */}
                    <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2.5">Historique mensuel</p>
                    <div className="space-y-2.5">
                      {usage.months.map((m) => (
                        <div key={m.key} className="flex items-center gap-3">
                          <span className={`w-16 shrink-0 text-[10px] sm:text-xs font-medium ${m.isCurrent ? "text-blue-600 dark:text-blue-300 font-bold" : "text-slate-500 dark:text-slate-400"}`}>
                            {m.label}
                          </span>
                          <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${quotaBarColor(m.limit > 0 ? Math.max(m.limit - m.count, 0) / m.limit : 0)}`}
                              style={{ width: `${m.limit > 0 ? Math.min(100, (m.count / m.limit) * 100) : m.count > 0 ? 100 : 0}%` }}
                            />
                          </div>
                          <span className="w-14 shrink-0 text-right text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300">
                            {m.count}/{m.limit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center py-10">
                    <span className="size-5 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
