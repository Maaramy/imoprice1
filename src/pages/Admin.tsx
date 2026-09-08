import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { PlanEditDialog, type PlanEditTarget } from "@/components/PlanEditDialog";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Users, CreditCard, Building2, Home, Settings,
  ArrowLeft, ShieldCheck, Search, Trash2, Loader2, CheckCircle2,
  Ban, RotateCcw, Landmark, Send, Wallet, RefreshCw, TrendingUp,
  FileSearch, EyeOff, Save, Sparkles, ChevronRight, UserCog, Pencil, Github,
  ExternalLink, CheckCircle2 as CheckCircle2Icon, Megaphone,
} from "lucide-react";
import { AnnouncementEditor } from "@/components/admin/announcements/AnnouncementEditor";
import { IconsticaIcon } from "@/components/icons/IconsticaIcon";
import { PLANS } from "@/convex/defaults";
import { GOVERNORATS as TUNISIAN_GOUVERNORATS, PROPERTY_TYPES_LABELS } from "@/convex/types";

const PLAN_META: Record<string, { label: string; cls: string }> = {
  start: { label: "Free", cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" },
  pro: { label: "Pro", cls: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300" },
  expert: { label: "Expert", cls: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300" },
  agence: { label: "Agence", cls: "bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300" },
};

const fmtPrice = (v: number | null | undefined) =>
  v == null ? "—" : v.toLocaleString("fr-FR") + " TND";

const fmtDate = (ts: number | null | undefined) =>
  ts ? new Date(ts).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—";

const fmtMoney = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(".", ",") + "M";
  if (n >= 1000) return (n / 1000).toFixed(0) + "k";
  return String(n);
};

const CardStat = ({ icon, label, value, sub, tone }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; tone: string;
}) => (
  <Card className="border-0 bg-white/95 dark:bg-slate-900/95 shadow-[0_1px_3px_rgba(0,0,0,0.05)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] rounded-2xl overflow-hidden">
    <CardContent className="p-4 flex items-start gap-3">
      <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${tone}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">{label}</p>
        <p className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight mt-0.5">{value}</p>
        {sub && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">{sub}</p>}
      </div>
    </CardContent>
  </Card>
);

export default function Admin() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const isAdmin = useQuery(api.admin.isAdmin);
  const hasAdmin = useQuery(api.admin.adminExists);
  const bootstrap = useMutation(api.admin.bootstrapAdmin);
  const claimAdmin = useMutation(api.admin.claimAdminByEmail);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);

  if (authLoading || isAdmin === undefined || hasAdmin === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white dark:from-gray-950 dark:to-gray-900">
        <Loader2 className="size-6 animate-spin text-blue-600" aria-hidden="true" />
        <span className="sr-only">Chargement</span>
      </div>
    );
  }

  if (!isAdmin) {
    const handleBootstrap = async () => {
      setBootstrapping(true);
      try {
        await bootstrap();
        toast.success("Vous êtes maintenant administrateur", {
          description: "Vous pouvez configurer la plateforme.",
        });
      } catch (e: any) {
        toast.error("Impossible", { description: e.message });
      } finally {
        setBootstrapping(false);
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white dark:from-gray-950 dark:to-gray-900 px-4">
        <Card className="border-0 shadow-xl dark:shadow-slate-900/40 rounded-2xl max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/50 mb-4">
              <ShieldCheck className="size-7 text-red-500 dark:text-red-400" />
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Accès refusé</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Cette page est réservée aux administrateurs de la plateforme.
            </p>
            <Button onClick={() => navigate("/dashboard")} className="mt-6 rounded-xl h-10 text-xs font-semibold w-full">
              <ArrowLeft className="mr-1.5 size-4" /> Retour au dashboard
            </Button>
            {hasAdmin === false ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleBootstrap}
                  disabled={bootstrapping}
                  className="mt-2 rounded-xl h-10 text-xs font-semibold w-full"
                >
                  {bootstrapping ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <ShieldCheck className="mr-1.5 size-4" />}
                  Devenir le premier administrateur
                </Button>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-3">
                  Aucun administrateur n'existe encore — vous pouvez créer le compte admin.
                </p>
              </>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-3 text-left">
                  <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                    Un administrateur existe déjà sur la plateforme
                  </p>
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">
                    Demandez à l'administrateur actuel de vous promouvoir : il doit aller dans
                    l'onglet <strong>Utilisateurs</strong> de son espace admin et passer votre rôle
                    sur <strong>Admin</strong>.
                  </p>
                </div>

                {/* ── Récupération admin (ADMIN_EMAIL) ── */}
                <button
                  onClick={() => setShowRecovery((s) => !s)}
                  className="w-full rounded-xl border border-dashed border-slate-300 dark:border-slate-700 px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                    🔑 Compte admin perdu ? Récupérer l'accès
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    Nécessite la variable d'environnement <code className="font-mono">ADMIN_EMAIL</code> configurée dans les clés du projet
                  </p>
                </button>
                {showRecovery && (
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 p-3 text-left">
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      L'e-mail de secours est défini dans la variable d'environnement{" "}
                      <code className="font-mono text-[9px]">ADMIN_EMAIL</code>. Connectez-vous avec
                      le compte correspondant, puis cliquez ci-dessous : l'administrateur existant
                      sera conservé et votre compte passera <strong>Admin</strong>.
                    </p>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        setRecovering(true);
                        try {
                          await claimAdmin();
                          toast.success("Accès admin récupéré", {
                            description: "Vous pouvez maintenant configurer la plateforme.",
                          });
                        } catch (e: any) {
                          toast.error("Récupération impossible", {
                            description: e.message,
                          });
                        } finally {
                          setRecovering(false);
                        }
                      }}
                      disabled={recovering}
                      className="mt-2.5 rounded-xl h-9 text-[11px] font-semibold w-full"
                    >
                      {recovering ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <ShieldCheck className="mr-1.5 size-3.5" />}
                      Récupérer l'accès admin
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return <AdminShell userName={user?.name ?? ""} />;
}

function AdminShell({ userName }: { userName: string }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 py-4 sm:py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6 gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="size-3.5 sm:size-4" /> Dashboard
          </button>
          <Badge className="rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-0 text-[10px] px-2.5 py-1 font-semibold">
            <ShieldCheck className="size-3 mr-1" /> ADMIN
          </Badge>
        </div>

        <div className="flex items-center gap-3 mb-5 sm:mb-7">
          <div className="flex size-11 sm:size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-500 shadow-lg shadow-blue-200/50 dark:shadow-blue-900/50">
            <Settings className="size-5 sm:size-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">Administration</h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Gérez la plateforme : utilisateurs, abonnements, agences et paramètres
            </p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="space-y-4 sm:space-y-6">
          <TabsList className="w-full sm:w-auto h-auto flex-wrap justify-start gap-1 rounded-xl bg-slate-100/80 dark:bg-slate-900/60 p-1">
            <TabBtn value="overview" tab={tab} icon={<LayoutDashboard className="size-3.5" />} label="Aperçu" />
            <TabBtn value="users" tab={tab} icon={<Users className="size-3.5" />} label="Utilisateurs" />
            <TabBtn value="subscriptions" tab={tab} icon={<CreditCard className="size-3.5" />} label="Abonnements" />
            <TabBtn value="agencies" tab={tab} icon={<Building2 className="size-3.5" />} label="Agences" />
            <TabBtn value="estimations" tab={tab} icon={<FileSearch className="size-3.5" />} label="Estimations" />
            <TabBtn
              value="announcements"
              tab={tab}
              icon={
                <IconsticaIcon
                  name="megaphone"
                  className="size-3.5"
                  fallback={<Megaphone className="size-3.5" />}
                />
              }
              label="Annonces"
            />
            <TabBtn value="settings" tab={tab} icon={<Settings className="size-3.5" />} label="Paramètres" />
            <TabBtn value="github" tab={tab} icon={<Github className="size-3.5" />} label="GitHub" />
          </TabsList>

          <TabsContent value="overview" className="mt-0">
            <OverviewTab />
          </TabsContent>
          <TabsContent value="users" className="mt-0">
            <UsersTab />
          </TabsContent>
          <TabsContent value="subscriptions" className="mt-0">
            <SubscriptionsTab />
          </TabsContent>
          <TabsContent value="agencies" className="mt-0">
            <AgenciesTab />
          </TabsContent>
          <TabsContent value="estimations" className="mt-0">
            <EstimationsTab />
          </TabsContent>
          <TabsContent value="announcements" className="mt-0">
            <AnnouncementsTab />
          </TabsContent>
          <TabsContent value="settings" className="mt-0">
            <SettingsTab />
          </TabsContent>
          <TabsContent value="github" className="mt-0">
            <GitHubTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function TabBtn({ value, tab, icon, label }: { value: string; tab: string; icon: React.ReactNode; label: string }) {
  return (
    <TabsTrigger
      value={value}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm ${
        tab === value ? "" : ""
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{label.slice(0, 6)}</span>
    </TabsTrigger>
  );
}

/* ═══════════════ APERÇU ═══════════════ */
function OverviewTab() {
  const stats = useQuery(api.admin.getAdminStats);
  const estimations = useQuery(api.admin.listEstimations, { limit: 8 });

  if (!stats) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-5 animate-spin text-blue-600" aria-hidden="true" />
      </div>
    );
  }

  const recent = estimations ?? [];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <CardStat icon={<Users className="size-4 text-blue-600" />} tone="bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400" label="Utilisateurs" value={stats.users} sub={`+${stats.newUsersThisMonth} ce mois`} />
        <CardStat icon={<FileSearch className="size-4 text-violet-600" />} tone="bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400" label="Estimations" value={stats.estimations} sub={`+${stats.estimationsThisMonth} ce mois`} />
        <CardStat icon={<Home className="size-4 text-teal-600" />} tone="bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400" label="Biens" value={stats.properties} />
        <CardStat icon={<CreditCard className="size-4 text-emerald-600" />} tone="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400" label="Abonnements actifs" value={stats.activeSubs} sub={`${stats.subscriptions} au total`} />
        <CardStat icon={<Wallet className="size-4 text-amber-600" />} tone="bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400" label="Revenus payés" value={fmtMoney(stats.revenue) + " TND"} sub={`${stats.paidSubs} paiements`} />
        <CardStat icon={<Building2 className="size-4 text-rose-600" />} tone="bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400" label="Agences" value={stats.agencies} sub={`${stats.agencyRequests} demandes`} />
      </div>

      {stats.pendingPayments > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-amber-200/70 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/40 px-4 py-3 flex items-center gap-3"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400">
            <Wallet className="size-4" />
          </div>
          <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-200 font-medium">
            <strong>{stats.pendingPayments}</strong> paiement{stats.pendingPayments > 1 ? "s" : ""} manuel{stats.pendingPayments > 1 ? "s" : ""} en attente de confirmation (virement/D17)
          </p>
        </motion.div>
      )}

      {/* Recent estimations */}
      <Card className="border-0 bg-white/95 dark:bg-slate-900/95 shadow-[0_1px_3px_rgba(0,0,0,0.05)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] rounded-2xl overflow-hidden">
        <CardHeader className="px-4 sm:px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <TrendingUp className="size-4 text-blue-600" /> Dernières estimations
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recent.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 p-6 text-center">Aucune estimation pour le moment.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recent.map((e) => (
                <div key={e._id} className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {PROPERTY_TYPES_LABELS[e.propertyType as keyof typeof PROPERTY_TYPES_LABELS] ?? e.propertyType ?? "Bien"}
                      <span className="text-slate-400 font-normal"> · {e.gouvernorat ?? "—"}</span>
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                      {e.userName || e.userEmail} · {fmtDate(e.createdAt)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{fmtPrice(e.estimatedValue)}</p>
                    <Badge className={`mt-0.5 rounded-full border-0 text-[9px] px-1.5 py-0 font-semibold ${
                      (e.confidenceIndex ?? 0) >= 80 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : (e.confidenceIndex ?? 0) >= 60 ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}>
                      Confiance {e.confidenceIndex ?? "—"}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════════ UTILISATEURS ═══════════════ */
function UsersTab() {
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<PlanEditTarget | null>(null);
  const users = useQuery(api.admin.listUsers, { search });
  const setRole = useMutation(api.admin.setUserRole);
  const deleteUser = useMutation(api.admin.deleteUser);
  const [busy, setBusy] = useState<string | null>(null);

  const changeRole = async (userId: string, role: string) => {
    setBusy(userId);
    try {
      await setRole({ userId: userId as any, role: role as any });
      toast.success("Rôle mis à jour");
    } catch (e: any) {
      toast.error("Erreur", { description: e.message });
    } finally {
      setBusy(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setBusy(deleteId);
    try {
      await deleteUser({ userId: deleteId as any });
      toast.success("Utilisateur supprimé");
      setDeleteId(null);
    } catch (e: any) {
      toast.error("Erreur", { description: e.message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="border-0 bg-white/95 dark:bg-slate-900/95 shadow-[0_1px_3px_rgba(0,0,0,0.05)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] rounded-2xl overflow-hidden">
      <CardHeader className="px-4 sm:px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Users className="size-4 text-blue-600" /> Utilisateurs
          </CardTitle>
          <CardDescription className="text-[11px] mt-0.5">{users?.length ?? "…"} comptes</CardDescription>
        </div>
        <div className="relative w-full max-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="h-8 pl-8 rounded-lg text-xs"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500 h-9 px-4">Utilisateur</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500 h-9">Forfait</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500 h-9">Estim.</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500 h-9">Rôle</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500 h-9 text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!users ? (
                <TableRow><TableCell colSpan={5} className="py-8 text-center"><Loader2 className="mx-auto size-4 animate-spin text-blue-600" /></TableCell></TableRow>
              ) : users.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="py-8 text-center text-xs text-slate-400">Aucun utilisateur trouvé</TableCell></TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <TableCell className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-white text-[10px] font-bold">
                          {(u.name || u.email || "?").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{u.name || "—"}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{u.email || u.phone || "—"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {u.subscription ? (
                        <Badge className={`rounded-full border-0 text-[9px] px-2 py-0.5 font-semibold ${PLAN_META[u.subscription.planType]?.cls ?? "bg-slate-100 text-slate-600"}`}>
                          {PLAN_META[u.subscription.planType]?.label ?? u.subscription.planType}
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{u.estimationsCount}</span>
                    </TableCell>
                    <TableCell>
                      <select
                        value={u.role}
                        disabled={busy === u._id}
                        onChange={(e) => changeRole(u._id, e.target.value)}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-semibold px-2 py-1 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50"
                        aria-label={`Rôle de ${u.name || u.email}`}
                      >
                        <option value="user">Utilisateur</option>
                        <option value="member">Membre</option>
                        <option value="admin">Admin</option>
                      </select>
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setEditTarget({
                              userId: u._id,
                              userName: u.name || u.email || "Utilisateur",
                              subscription: u.subscription
                                ? {
                                    subscriptionId: u.subscription.subscriptionId,
                                    planType: u.subscription.planType,
                                    status: u.subscription.status,
                                    paymentStatus: u.subscription.paymentStatus,
                                    paymentMethod: u.subscription.paymentMethod,
                                    endDate: u.subscription.endDate,
                                    estimationsUsed: u.subscription.estimationsUsed,
                                    estimationsLimit: u.subscription.estimationsLimit,
                                  }
                                : null,
                            })
                          }
                          className="size-7 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                          aria-label={`Modifier le forfait de ${u.name || u.email || "utilisateur"}`}
                          title="Modifier le forfait"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(u._id)}
                          className="size-7 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50"
                          aria-label={`Supprimer ${u.name || u.email}`}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Supprimer l'utilisateur ?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Toutes ses données seront définitivement supprimées : biens, estimations, abonnements, demandes d'agence et profil agence. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-xs h-9">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="rounded-xl text-xs h-9 bg-red-500 hover:bg-red-600 text-white">
              {busy ? <Loader2 className="size-3.5 animate-spin mr-1" /> : <Trash2 className="size-3.5 mr-1" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PlanEditDialog
        target={editTarget}
        onClose={() => setEditTarget(null)}
      />
    </Card>
  );
}

/* ═══════════════ ABONNEMENTS ═══════════════ */
function SubscriptionsTab() {
  const subs = useQuery(api.admin.listSubscriptions, {});
  const confirmPay = useMutation(api.admin.adminConfirmPayment);
  const adjust = useMutation(api.admin.adminAdjustSubscription);
  const [busy, setBusy] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<PlanEditTarget | null>(null);

  const handleConfirm = async (id: string) => {
    setBusy(id);
    try {
      await confirmPay({ subscriptionId: id as any });
      toast.success("Paiement confirmé — abonnement activé");
    } catch (e: any) {
      toast.error("Erreur", { description: e.message });
    } finally {
      setBusy(null);
    }
  };

  const handleExtend = async (id: string) => {
    setBusy(id);
    try {
      await adjust({ subscriptionId: id as any, endDate: Date.now() + 30 * 24 * 3600 * 1000, paymentStatus: "paid" });
      toast.success("Abonnement prolongé de 30 jours");
    } catch (e: any) {
      toast.error("Erreur", { description: e.message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="border-0 bg-white/95 dark:bg-slate-900/95 shadow-[0_1px_3px_rgba(0,0,0,0.05)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] rounded-2xl overflow-hidden">
      <CardHeader className="px-4 sm:px-5 py-4 border-b border-slate-100 dark:border-slate-800">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <CreditCard className="size-4 text-emerald-600" /> Abonnements & paiements
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[10px] uppercase tracking-wide text-slate-400 h-9 px-4">Client</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wide text-slate-400 h-9">Forfait</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wide text-slate-400 h-9">Paiement</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wide text-slate-400 h-9">Période</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wide text-slate-400 h-9">Quota</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wide text-slate-400 h-9 text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!subs ? (
                <TableRow><TableCell colSpan={6} className="py-8 text-center"><Loader2 className="mx-auto size-4 animate-spin text-blue-600" /></TableCell></TableRow>
              ) : subs.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-xs text-slate-400">Aucun abonnement</TableCell></TableRow>
              ) : (
                subs.map((s) => {
                  const pending = s.paymentStatus === "pending" && s.paymentMethod !== "simulation";
                  return (
                    <TableRow key={s._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <TableCell className="px-4 py-2.5">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{s.userName}</p>
                        <p className="text-[10px] text-slate-400 truncate">{s.userEmail}</p>
                      </TableCell>
                      <TableCell>
                        <Badge className={`rounded-full border-0 text-[9px] px-2 py-0.5 font-semibold ${PLAN_META[s.planType]?.cls ?? ""}`}>
                          {s.planName} · {s.price} TND
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <Badge className={`rounded-full border-0 text-[9px] px-2 py-0 font-semibold ${
                            s.paymentStatus === "paid" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : pending ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                            : s.paymentStatus === "free" ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                          }`}>
                            {s.paymentStatus === "paid" ? "Payé" : s.paymentStatus === "free" ? "Gratuit" : pending ? "En attente" : s.paymentStatus}
                          </Badge>
                          <p className="text-[9px] text-slate-400">
                            {s.paymentMethod === "virement" ? "💳 Virement" : s.paymentMethod === "d17" ? "📮 D17" : "⚡ Démo"}
                            {s.paymentRef ? ` · ${s.paymentRef}` : ""}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">{fmtDate(s.startDate)}</p>
                        <p className="text-[10px] text-slate-400">→ {fmtDate(s.endDate)}</p>
                      </TableCell>
                      <TableCell>
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{s.estimationsUsed}/{s.estimationsLimit}</span>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setEditTarget({
                                userId: s.userId,
                                userName: s.userName || s.userEmail || "Client",
                                subscription: {
                                  subscriptionId: s._id,
                                  planType: s.planType,
                                  status: s.status,
                                  paymentStatus: s.paymentStatus,
                                  paymentMethod: s.paymentMethod,
                                  endDate: s.endDate,
                                  estimationsUsed: s.estimationsUsed,
                                  estimationsLimit: s.estimationsLimit,
                                },
                              })
                            }
                            className="size-7 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                            aria-label={`Modifier le forfait de ${s.userName || s.userEmail || "client"}`}
                            title="Modifier le forfait"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          {pending && (
                            <Button
                              variant="outline"
                              onClick={() => handleConfirm(s._id)}
                              disabled={busy === s._id}
                              className="h-7 rounded-lg text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 px-2"
                            >
                              {busy === s._id ? <Loader2 className="size-3 animate-spin mr-1" /> : <CheckCircle2 className="size-3 mr-1" />}
                              Confirmer
                            </Button>
                          )}
                          {s.status === "active" && s.planType !== "start" && (
                            <Button
                              variant="ghost"
                              onClick={() => handleExtend(s._id)}
                              disabled={busy === s._id}
                              className="h-7 rounded-lg text-[10px] font-semibold text-blue-600 dark:text-blue-400 px-2"
                            >
                              +30j
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <PlanEditDialog
        target={editTarget}
        onClose={() => setEditTarget(null)}
      />
    </Card>
  );
}

/* ═══════════════ AGENCES ═══════════════ */
function AgenciesTab() {
  const agencies = useQuery(api.admin.listAgencies);
  const toggle = useMutation(api.admin.toggleAgencyStatus);
  const remove = useMutation(api.admin.deleteAgency);
  const [busy, setBusy] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleToggle = async (id: string) => {
    setBusy(id);
    try {
      const r = await toggle({ partnerId: id as any });
      toast.success(r.isSubscribed ? "Agence activée — visible sur la plateforme" : "Agence désactivée — masquée");
    } catch (e: any) {
      toast.error("Erreur", { description: e.message });
    } finally {
      setBusy(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setBusy(deleteId);
    try {
      await remove({ partnerId: deleteId as any });
      toast.success("Agence supprimée");
      setDeleteId(null);
    } catch (e: any) {
      toast.error("Erreur", { description: e.message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="border-0 bg-white/95 dark:bg-slate-900/95 shadow-[0_1px_3px_rgba(0,0,0,0.05)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] rounded-2xl overflow-hidden">
      <CardHeader className="px-4 sm:px-5 py-4 border-b border-slate-100 dark:border-slate-800">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <Building2 className="size-4 text-violet-600" /> Agences inscrites
          <Badge className="ml-1 rounded-full bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-300 border-0 text-[9px] font-semibold">{agencies?.length ?? "…"}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[10px] uppercase tracking-wide text-slate-400 h-9 px-4">Agence</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wide text-slate-400 h-9">Régions</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wide text-slate-400 h-9">Spécialités</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wide text-slate-400 h-9">Statut</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wide text-slate-400 h-9 text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!agencies ? (
                <TableRow><TableCell colSpan={5} className="py-8 text-center"><Loader2 className="mx-auto size-4 animate-spin text-blue-600" /></TableCell></TableRow>
              ) : agencies.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="py-8 text-center text-xs text-slate-400">Aucune agence inscrite</TableCell></TableRow>
              ) : (
                agencies.map((a) => (
                  <TableRow key={a._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <TableCell className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {a.logoUrl ? (
                          <img src={a.logoUrl} alt="" className="size-8 shrink-0 rounded-lg object-cover" />
                        ) : (
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-300 font-bold text-[10px]">
                            {(a.name || "?").slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{a.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{a.email} · {a.phone}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {(a.regions ?? []).slice(0, 3).map((r) => (
                          <Badge key={r} className="rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-0 text-[9px] font-medium">{r}</Badge>
                        ))}
                        {(a.regions?.length ?? 0) > 3 && <span className="text-[9px] text-slate-400">+{(a.regions?.length ?? 0) - 3}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[160px]">
                        {(a.specialties ?? []).slice(0, 2).map((s) => (
                          <Badge key={s} className="rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-0 text-[9px] font-medium">{s}</Badge>
                        ))}
                        {(a.specialties?.length ?? 0) > 2 && <span className="text-[9px] text-slate-400">+{(a.specialties?.length ?? 0) - 2}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`rounded-full border-0 text-[9px] px-2 py-0.5 font-semibold ${
                        a.isSubscribed ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      }`}>
                        {a.isSubscribed ? "Active" : "Masquée"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          onClick={() => handleToggle(a._id)}
                          disabled={busy === a._id}
                          className="h-7 rounded-lg text-[10px] font-semibold px-2"
                        >
                          {busy === a._id ? <Loader2 className="size-3 animate-spin mr-1" /> : a.isSubscribed ? <EyeOff className="size-3 mr-1" /> : <CheckCircle2 className="size-3 mr-1" />}
                          {a.isSubscribed ? "Masquer" : "Activer"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(a._id)}
                          className="size-7 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50"
                          aria-label={`Supprimer ${a.name}`}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Supprimer cette agence ?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Le profil de l'agence et toutes ses demandes reçues seront supprimés définitivement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-xs h-9">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="rounded-xl text-xs h-9 bg-red-500 hover:bg-red-600 text-white">
              {busy ? <Loader2 className="size-3.5 animate-spin mr-1" /> : <Trash2 className="size-3.5 mr-1" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

/* ═══════════════ ESTIMATIONS ═══════════════ */
function EstimationsTab() {
  const estimations = useQuery(api.admin.listEstimations, { limit: 100 });
  const remove = useMutation(api.admin.deleteEstimation);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    if (!estimations) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return estimations;
    return estimations.filter((e) =>
      (e.userName ?? "").toLowerCase().includes(q) ||
      (e.userEmail ?? "").toLowerCase().includes(q) ||
      (e.gouvernorat ?? "").toLowerCase().includes(q) ||
      (e.propertyType ?? "").toLowerCase().includes(q),
    );
  }, [estimations, filter]);

  const handleDelete = async (id: string) => {
    setBusy(id);
    try {
      await remove({ estimationId: id as any });
      toast.success("Estimation supprimée");
    } catch (e: any) {
      toast.error("Erreur", { description: e.message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="border-0 bg-white/95 dark:bg-slate-900/95 shadow-[0_1px_3px_rgba(0,0,0,0.05)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] rounded-2xl overflow-hidden">
      <CardHeader className="px-4 sm:px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <FileSearch className="size-4 text-violet-600" /> Estimations
          <Badge className="ml-1 rounded-full bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-300 border-0 text-[9px] font-semibold">{filtered.length}</Badge>
        </CardTitle>
        <div className="relative w-full max-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
          <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filtrer…" className="h-8 pl-8 rounded-lg text-xs" />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[10px] uppercase tracking-wide text-slate-400 h-9 px-4">Bien</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wide text-slate-400 h-9">Client</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wide text-slate-400 h-9">Valeur estimée</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wide text-slate-400 h-9">Intervalle</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wide text-slate-400 h-9">Date</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wide text-slate-400 h-9 text-right pr-4">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!estimations ? (
                <TableRow><TableCell colSpan={6} className="py-8 text-center"><Loader2 className="mx-auto size-4 animate-spin text-blue-600" /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-xs text-slate-400">Aucune estimation</TableCell></TableRow>
              ) : (
                filtered.map((e) => (
                  <TableRow key={e._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <TableCell className="px-4 py-2.5">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {PROPERTY_TYPES_LABELS[e.propertyType as keyof typeof PROPERTY_TYPES_LABELS] ?? e.propertyType ?? "Bien"}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">{e.gouvernorat ?? "—"}{e.ville ? ` · ${e.ville}` : ""}{e.builtSurface ? ` · ${e.builtSurface} m²` : ""}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate">{e.userName || "—"}</p>
                      <p className="text-[10px] text-slate-400 truncate">{e.userEmail}</p>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{fmtPrice(e.estimatedValue)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">{fmtPrice(e.priceMin)} — {fmtPrice(e.priceMax)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-[10px] text-slate-400">{fmtDate(e.createdAt)}</span>
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(e._id)}
                        disabled={busy === e._id}
                        className="size-7 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50"
                        aria-label="Supprimer l'estimation"
                      >
                        {busy === e._id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ═══════════════ PARAMÈTRES ═══════════════ */
function SettingsTab() {
  const settings = useQuery(api.settings.getAdminSettings);
  const update = useMutation(api.settings.updateSettings);
  const reset = useMutation(api.settings.resetSettings);
  const [saving, setSaving] = useState(false);

  const [bank, setBank] = useState({
    beneficiary: "", bank: "", agency: "", rib: "", swift: "", reason: "",
  });
  const [d17, setD17] = useState({ beneficiary: "", ccp: "", center: "", reason: "" });
  const [plans, setPlans] = useState<Record<string, { price?: number; estimations?: number; trialDays?: number }>>({});
  const [market, setMarket] = useState<{
    regionBasePrices: Record<string, Record<string, number>>;
    stateMultipliers: Record<string, number>;
    featureValues: Record<string, number>;
  }>({ regionBasePrices: {}, stateMultipliers: {}, featureValues: {} });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (settings && !loaded) {
      setBank({
        beneficiary: settings.bankDetails.beneficiary ?? "",
        bank: settings.bankDetails.bank ?? "",
        agency: settings.bankDetails.agency ?? "",
        rib: settings.bankDetails.rib ?? "",
        swift: settings.bankDetails.swift ?? "",
        reason: settings.bankDetails.reason ?? "",
      });
      setD17({
        beneficiary: settings.d17Details.beneficiary ?? "",
        ccp: settings.d17Details.ccp ?? "",
        center: settings.d17Details.center ?? "",
        reason: settings.d17Details.reason ?? "",
      });
      setPlans(settings.planOverrides ?? {});
      const mc = settings.marketConfig ?? {};
      setMarket({
        regionBasePrices: mc.regionBasePrices ?? {},
        stateMultipliers: mc.stateMultipliers ?? {},
        featureValues: mc.featureValues ?? {},
      });
      setLoaded(true);
    }
  }, [settings, loaded]);

  const saveAll = async () => {
    setSaving(true);
    try {
      await update({
        bankDetails: {
          beneficiary: bank.beneficiary.trim(),
          bank: bank.bank.trim(),
          agency: bank.agency.trim(),
          rib: bank.rib.trim(),
          swift: bank.swift.trim(),
          reason: bank.reason.trim(),
        },
        d17Details: {
          beneficiary: d17.beneficiary.trim(),
          ccp: d17.ccp.trim(),
          center: d17.center.trim(),
          reason: d17.reason.trim(),
        },
        planOverrides: plans,
        marketConfig: market,
      });
      toast.success("Paramètres enregistrés", { description: "Les modifications sont appliquées immédiatement." });
    } catch (e: any) {
      toast.error("Erreur", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      await reset();
      setLoaded(false);
      toast.success("Paramètres réinitialisés", { description: "Valeurs par défaut restaurées." });
    } catch (e: any) {
      toast.error("Erreur", { description: e.message });
    }
  };

  const setRegionPrice = (region: string, type: string, val: string) => {
    setMarket((prev) => {
      const num = val === "" ? 0 : Number(val);
      return {
        ...prev,
        regionBasePrices: {
          ...prev.regionBasePrices,
          [region]: { ...(prev.regionBasePrices[region] ?? {}), [type]: num },
        },
      };
    });
  };

  const setStateMult = (key: string, val: string) => {
    setMarket((prev) => ({
      ...prev,
      stateMultipliers: { ...prev.stateMultipliers, [key]: val === "" ? 0 : Number(val) },
    }));
  };

  const setFeature = (key: string, val: string) => {
    setMarket((prev) => ({
      ...prev,
      featureValues: { ...prev.featureValues, [key]: val === "" ? 0 : Number(val) },
    }));
  };

  const setPlanField = (planId: string, field: "price" | "estimations" | "trialDays", val: string) => {
    setPlans((prev) => {
      const current = prev[planId] ?? {};
      return {
        ...prev,
        [planId]: { ...current, [field]: val === "" ? undefined : Number(val) },
      };
    });
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-5 animate-spin text-blue-600" aria-hidden="true" />
      </div>
    );
  }

  const MAIN_TYPES = ["appartement", "maison", "villa", "studio", "local_commercial", "bureau", "terrain_constructible", "terrain_agricole", "garage", "parking"];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── Coordonnées bancaires ── */}
      <Card className="border-0 bg-white/95 dark:bg-slate-900/95 shadow-[0_1px_3px_rgba(0,0,0,0.05)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] rounded-2xl overflow-hidden">
        <CardHeader className="px-4 sm:px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <Landmark className="size-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold">Virement bancaire</CardTitle>
            <CardDescription className="text-[11px]">Coordonnées affichées dans le flow de paiement</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 grid gap-3 sm:grid-cols-2">
          <Field label="Bénéficiaire" value={bank.beneficiary} onChange={(v) => setBank((p) => ({ ...p, beneficiary: v }))} />
          <Field label="Banque" value={bank.bank} onChange={(v) => setBank((p) => ({ ...p, bank: v }))} />
          <Field label="Agence" value={bank.agency} onChange={(v) => setBank((p) => ({ ...p, agency: v }))} />
          <Field label="RIB" value={bank.rib} onChange={(v) => setBank((p) => ({ ...p, rib: v }))} />
          <Field label="SWIFT / BIC" value={bank.swift} onChange={(v) => setBank((p) => ({ ...p, swift: v }))} />
          <Field label="Objet du virement" value={bank.reason} onChange={(v) => setBank((p) => ({ ...p, reason: v }))} />
        </CardContent>
      </Card>

      {/* ── D17 ── */}
      <Card className="border-0 bg-white/95 dark:bg-slate-900/95 shadow-[0_1px_3px_rgba(0,0,0,0.05)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] rounded-2xl overflow-hidden">
        <CardHeader className="px-4 sm:px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <Send className="size-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold">D17 — Poste Tunisie</CardTitle>
            <CardDescription className="text-[11px]">Coordonnées du mandat de versement</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 grid gap-3 sm:grid-cols-2">
          <Field label="Bénéficiaire" value={d17.beneficiary} onChange={(v) => setD17((p) => ({ ...p, beneficiary: v }))} />
          <Field label="N° CCP" value={d17.ccp} onChange={(v) => setD17((p) => ({ ...p, ccp: v }))} />
          <Field label="Centre" value={d17.center} onChange={(v) => setD17((p) => ({ ...p, center: v }))} />
          <Field label="Motif" value={d17.reason} onChange={(v) => setD17((p) => ({ ...p, reason: v }))} />
        </CardContent>
      </Card>

      {/* ── Plans ── */}
      <Card className="border-0 bg-white/95 dark:bg-slate-900/95 shadow-[0_1px_3px_rgba(0,0,0,0.05)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] rounded-2xl overflow-hidden">
        <CardHeader className="px-4 sm:px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
            <Wallet className="size-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold">Forfaits</CardTitle>
            <CardDescription className="text-[11px]">Prix, quota mensuel et essai — laisser vide pour garder la valeur par défaut</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {(Object.keys(PLANS) as Array<"start" | "pro" | "expert" | "agence">).map((pid) => {
              const ov = plans[pid] ?? {};
              return (
                <div key={pid} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className={`flex items-center gap-1.5 text-xs font-bold ${PLAN_META[pid].cls.split(" ").slice(0, 2).join(" ")} px-2 py-0.5 rounded-full`}>
                      {PLAN_META[pid].label}
                    </span>
                    <span className="text-[10px] text-slate-400">{PLANS[pid].price} TND par défaut</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <NumField label="Prix" value={ov.price} onChange={(v) => setPlanField(pid, "price", v)} />
                    <NumField label="Quota" value={ov.estimations} onChange={(v) => setPlanField(pid, "estimations", v)} />
                    <NumField label="Essai j" value={ov.trialDays} onChange={(v) => setPlanField(pid, "trialDays", v)} />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Moteur d'estimation ── */}
      <Card className="border-0 bg-white/95 dark:bg-slate-900/95 shadow-[0_1px_3px_rgba(0,0,0,0.05)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] rounded-2xl overflow-hidden">
        <CardHeader className="px-4 sm:px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400">
            <Sparkles className="size-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold">Moteur d'estimation (BIM)</CardTitle>
            <CardDescription className="text-[11px]">Prix de base du marché (TND/m²) par région et type — les champs vides utilisent les valeurs par défaut</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 space-y-5">
          {/* State multipliers */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Multiplicateurs par état</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(["a_renover", "bon_etat", "excellent_etat", "luxe"] as const).map((s) => (
                <div key={s} className="rounded-lg border border-slate-200 dark:border-slate-700 p-2.5">
                  <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                    {s === "a_renover" ? "À rénover" : s === "bon_etat" ? "Bon état" : s === "excellent_etat" ? "Excellent" : "Luxe"}
                  </p>
                  <Input
                    type="number"
                    step="0.01"
                    value={market.stateMultipliers[s] ?? ""}
                    onChange={(e) => setStateMult(s, e.target.value)}
                    placeholder="1.00"
                    className="h-8 rounded-lg text-xs [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Feature values */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Plus-value des équipements (% du prix de base)</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {Object.entries({
                hasGarden: "Jardin", hasPool: "Piscine", hasTerrace: "Terrasse", hasBalcony: "Balcon", hasElevator: "Ascenseur",
                hasParking: "Parking", hasAC: "Clim", hasHeating: "Chauffage", hasSolar: "Solaire",
              }).map(([key, label]) => (
                <div key={key} className="rounded-lg border border-slate-200 dark:border-slate-700 p-2.5">
                  <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</p>
                  <Input
                    type="number"
                    value={market.featureValues[key] ?? ""}
                    onChange={(e) => setFeature(key, e.target.value)}
                    placeholder="0"
                    className="h-8 rounded-lg text-xs [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Region × type matrix */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Prix de base par région (TND/m²)</p>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 dark:bg-slate-800/40 hover:bg-transparent">
                      <TableHead className="text-[10px] uppercase tracking-wide text-slate-400 h-9 px-3 min-w-[110px] sticky left-0 bg-slate-50 dark:bg-slate-900 z-10">Région</TableHead>
                      {MAIN_TYPES.map((t) => (
                        <TableHead key={t} className="text-[9px] uppercase tracking-wide text-slate-400 h-9 px-2 whitespace-nowrap">
                          {PROPERTY_TYPES_LABELS[t as keyof typeof PROPERTY_TYPES_LABELS]?.split(" ")[0]}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {TUNISIAN_GOUVERNORATS.map((region) => (
                      <TableRow key={region} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                        <TableCell className="px-3 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-900 z-10">{region}</TableCell>
                        {MAIN_TYPES.map((t) => (
                          <TableCell key={t} className="px-2 py-1.5">
                            <Input
                              type="number"
                              value={market.regionBasePrices[region]?.[t] ?? ""}
                              onChange={(e) => setRegionPrice(region, t, e.target.value)}
                              placeholder="—"
                              className="h-7 w-[74px] rounded-md text-[11px] px-1.5 [&::-webkit-inner-spin-button]:appearance-none"
                              aria-label={`${region} — ${t}`}
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save / reset */}
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={handleReset} className="rounded-xl h-10 text-xs font-semibold">
          <RotateCcw className="mr-1.5 size-3.5" /> Réinitialiser
        </Button>
        <Button onClick={saveAll} disabled={saving} className="rounded-xl h-10 text-xs font-semibold bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md">
          {saving ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Save className="mr-1.5 size-4" />}
          Enregistrer les paramètres
        </Button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 h-9 rounded-lg text-xs" />
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number | undefined; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{label}</Label>
      <Input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="—"
        className="mt-0.5 h-8 rounded-lg text-xs [&::-webkit-inner-spin-button]:appearance-none"
      />
    </div>
  );
}

/* ═══════════════ GITHUB ═══════════════ */
type GitHubResult =
  | { ok: true; created: boolean; fullName: string; url: string; private: boolean }
  | { ok: false; reason: string; message: string };

function GitHubTab() {
  const status = useQuery(api.github.repoStatus);
  const createRepo = useAction(api.github.createGitHubRepo);
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<GitHubResult | null>(null);

  const handleCreate = async () => {
    setCreating(true);
    setResult(null);
    try {
      const res = (await createRepo()) as GitHubResult;
      setResult(res);
      if (res.ok) {
        toast.success(res.created ? "Dépôt GitHub créé !" : "Dépôt déjà existant", {
          description: res.url,
        });
      } else {
        toast.error("Création impossible", { description: res.message });
      }
    } catch (e: any) {
      toast.error("Erreur", { description: e?.message ?? "Une erreur est survenue" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card className="border-0 bg-white/95 dark:bg-slate-900/95 shadow-[0_1px_3px_rgba(0,0,0,0.05)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] rounded-2xl overflow-hidden">
      <CardHeader className="px-4 sm:px-5 py-4 border-b border-slate-100 dark:border-slate-800">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <Github className="size-4 text-slate-700 dark:text-slate-300" /> Dépôt GitHub & synchronisation
        </CardTitle>
        <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
          Créez le dépôt « baticost-ai » et activez la synchronisation automatique (CI, Convex production, OTA mobile).
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Token availability */}
        {status === undefined ? (
          <div className="flex items-center gap-2 py-4 text-xs text-slate-500 dark:text-slate-400">
            <Loader2 className="size-4 animate-spin text-blue-600" aria-hidden="true" /> Vérification du token GitHub…
          </div>
        ) : status.tokenAvailable ? (
          <div className="rounded-xl border border-emerald-200/70 dark:border-emerald-900/50 bg-emerald-50/80 dark:bg-emerald-950/40 px-4 py-3 flex items-start gap-3">
            <CheckCircle2Icon className="size-4 mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="text-xs text-emerald-800 dark:text-emerald-200">
              <p className="font-semibold">Token GitHub disponible</p>
              <p className="mt-0.5 text-emerald-600/90 dark:text-emerald-300/80">
                Variable <code className="font-mono">GITHUB_TOKEN</code> détectée dans l'environnement.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200/70 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/40 px-4 py-3">
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">Token GitHub manquant</p>
            <p className="text-xs text-amber-700/90 dark:text-amber-300/80 mt-1 leading-relaxed">
              Ajoutez une clé nommée <code className="font-mono">GITHUB_TOKEN</code> dans l'onglet{" "}
              <strong>Keys / API keys</strong> de la plateforme (ou la variable d'environnement{" "}
              <code className="font-mono">GITHUB_TOKEN</code> dans le déploiement Convex), avec un token
              personnel GitHub possédant le scope <code className="font-mono">repo</code> (github.com →
              Settings → Developer settings → Personal access tokens).
            </p>
          </div>
        )}

        {/* Create button */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">baticost-ai</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Dépôt privé · contient le code web + mobile</p>
            </div>
            <Badge className="rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-0 text-[10px] px-2.5 py-1 font-semibold">
              {status?.tokenAvailable ? "Prêt" : "En attente de token"}
            </Badge>
          </div>
          <Button
            onClick={handleCreate}
            disabled={creating || !status?.tokenAvailable}
            className="w-full sm:w-auto rounded-xl h-10 text-xs font-semibold"
          >
            {creating ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" />
            ) : (
              <Github className="mr-1.5 size-4" />
            )}
            {creating ? "Création en cours…" : "Créer le dépôt baticost-ai"}
          </Button>
        </div>

        {/* Result */}
        {result && result.ok && (
          <div className="rounded-xl border border-emerald-200/70 dark:border-emerald-900/50 bg-emerald-50/80 dark:bg-emerald-950/40 px-4 py-3 space-y-2">
            <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
              <CheckCircle2Icon className="size-4 text-emerald-600 dark:text-emerald-400" />
              {result.created ? "Dépôt créé avec succès" : "Dépôt déjà existant sur votre compte"}
            </p>
            <a
              href={result.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              <ExternalLink className="size-3.5" /> {result.fullName} — {result.url}
            </a>
            <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/70">
              {result.private ? "Dépôt privé" : "Dépôt public"}. Ensuite : ajoutez les secrets{" "}
              <code className="font-mono">CONVEX_DEPLOY_KEY</code> et <code className="font-mono">EXPO_TOKEN</code>{" "}
              (voir GITHUB_SETUP.md) et poussez <code className="font-mono">main</code> pour activer la synchro automatique.
            </p>
          </div>
        )}
        {result && !result.ok && (
          <div className="rounded-xl border border-rose-200/70 dark:border-rose-900/50 bg-rose-50/80 dark:bg-rose-950/40 px-4 py-3">
            <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">Création impossible</p>
            <p className="text-xs text-rose-600/90 dark:text-rose-300/80 mt-1 leading-relaxed">{result.message}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AnnouncementsTab() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <IconsticaIcon
            name="megaphone"
            className="size-4 text-emerald-600 dark:text-emerald-400"
            fallback={<Megaphone className="size-4 text-emerald-600 dark:text-emerald-400" />}
          />
          Gestion des annonces
        </CardTitle>
        <CardDescription className="text-xs">
          Créez, programmez et ciblez les communications diffusées dans le
          Dashboard des utilisateurs. Publication, priorité, ordre d'affichage
          et activation en temps réel.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AnnouncementEditor />
      </CardContent>
    </Card>
  );
}
