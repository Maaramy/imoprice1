import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { PLANS } from "@/convex/defaults";

export type PlanEditTarget = {
  userId: string;
  userName: string;
  subscription: {
    subscriptionId: string;
    planType: string;
    status: string;
    paymentStatus: string;
    paymentMethod: string | null;
    endDate: number | null;
    estimationsUsed: number;
    estimationsLimit: number;
  } | null;
};

const PLAN_LABELS: Record<string, string> = {
  start: "Free",
  pro: "Pro",
  expert: "Expert",
  agence: "Agence",
};

/**
 * Admin modal: edit (or create) a user's subscription — plan, monthly quota,
 * used counter, end date, payment status and subscription status.
 */
export function PlanEditDialog({
  target,
  onClose,
}: {
  target: PlanEditTarget | null;
  onClose: () => void;
}) {
  const adjust = useMutation(api.admin.adminAdjustSubscription);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    planType: "start",
    estimationsLimit: 3,
    estimationsUsed: 0,
    endDate: "",
    paymentStatus: "free",
    status: "active",
  });

  // Sync the form when the dialog opens for a different target
  useEffect(() => {
    if (!target) return;
    const s = target.subscription;
    setForm({
      planType: s?.planType ?? "start",
      estimationsLimit: s?.estimationsLimit ?? PLANS.start.estimations,
      estimationsUsed: s?.estimationsUsed ?? 0,
      endDate: s?.endDate ? new Date(s.endDate).toISOString().slice(0, 10) : "",
      paymentStatus: s?.paymentStatus ?? "free",
      status: s?.status ?? "active",
    });
  }, [target]);

  const set = (k: keyof typeof form, v: string | number) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!target) return;
    setSaving(true);
    try {
      await adjust({
        // Target the existing subscription, or create one for the user
        subscriptionId: (target.subscription?.subscriptionId ?? undefined) as any,
        userId: (target.subscription ? undefined : target.userId) as any,
        planType: form.planType as any,
        estimationsLimit: Number(form.estimationsLimit) || undefined,
        estimationsUsed: Number(form.estimationsUsed) || 0,
        endDate: form.endDate ? new Date(form.endDate + "T00:00:00").getTime() : undefined,
        paymentStatus: form.paymentStatus as any,
        status: form.status as any,
      });
      toast.success("Forfait mis à jour", { description: target.userName });
      onClose();
    } catch (e: any) {
      toast.error("Erreur", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Modifier le forfait</DialogTitle>
          <DialogDescription className="text-xs">
            {target?.userName} —{" "}
            {target?.subscription
              ? "ajustez le plan et le quota"
              : "aucun abonnement : un forfait Free sera créé"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                Forfait
              </Label>
              <select
                value={form.planType}
                onChange={(e) => set("planType", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold px-2.5 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                aria-label="Forfait"
              >
                {(Object.keys(PLANS) as Array<"start" | "pro" | "expert" | "agence">).map((pid) => (
                  <option key={pid} value={pid}>
                    {PLAN_LABELS[pid]} — {PLANS[pid].price} TND/mois
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                Quota mensuel
              </Label>
              <Input
                type="number"
                min={0}
                value={form.estimationsLimit}
                onChange={(e) => set("estimationsLimit", e.target.value === "" ? 0 : Number(e.target.value))}
                className="mt-1 h-9 rounded-lg text-xs"
                aria-label="Quota mensuel"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                Estimations utilisées
              </Label>
              <Input
                type="number"
                min={0}
                value={form.estimationsUsed}
                onChange={(e) => set("estimationsUsed", e.target.value === "" ? 0 : Number(e.target.value))}
                className="mt-1 h-9 rounded-lg text-xs"
                aria-label="Estimations utilisées"
              />
              <button
                onClick={() => set("estimationsUsed", 0)}
                className="mt-1 text-[10px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                ↺ Réinitialiser le compteur
              </button>
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                Date de fin (optionnel)
              </Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => set("endDate", e.target.value)}
                className="mt-1 h-9 rounded-lg text-xs"
                aria-label="Date de fin"
              />
              <p className="mt-1 text-[10px] text-slate-400">Laisser vide = jamais expiré</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                Statut paiement
              </Label>
              <select
                value={form.paymentStatus}
                onChange={(e) => set("paymentStatus", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold px-2.5 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                aria-label="Statut paiement"
              >
                <option value="free">Gratuit</option>
                <option value="paid">Payé</option>
                <option value="pending">En attente</option>
              </select>
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                Statut abonnement
              </Label>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold px-2.5 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                aria-label="Statut abonnement"
              >
                <option value="active">Actif</option>
                <option value="expired">Expiré</option>
                <option value="cancelled">Annulé</option>
              </select>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-1">
          <Button variant="outline" onClick={onClose} className="rounded-xl h-9 text-xs font-semibold">
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl h-9 text-xs font-semibold bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md"
          >
            {saving ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Save className="mr-1.5 size-3.5" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
