import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useAction, useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Calculator,
  Coins,
  Loader2,
  MapPin,
  Sparkles,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClientProPaywall, isClientProError } from "@/components/ClientProPaywall";
import { LocationField } from "@/components/investment/location-field";
import {
  DEFAULT_FORM,
  NumField,
  SectionHeading,
  TYPE_META,
  TYPE_ORDER,
  estimateOccupancyRate,
  forcedRentModeFor,
  fmtTND,
  type FormState,
} from "@/components/investment/shared";
import { investmentPrefillFromProject } from "@/lib/investmentPrefill";
import { usePageSEO } from "@/lib/seo";
import { cn } from "@/lib/utils";

const STEPS = ["Le bien", "Loyer & charges", "Coûts & hypothèses"];

export default function InvestmentAnalysis() {
  usePageSEO({
    title: "Nouvelle analyse d'investissement — baticost AI",
    description:
      "Évaluez la rentabilité locative d'un bien immobilier en Tunisie : ROI, cashflow, rendement net et score IA.",
  });

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("project");
  const project = useQuery(
    api.investments.getProjectForPrefill,
    projectId ? { projectId } : "skip",
  );
  const runAnalysis = useAction(api.investmentAi.runAnalysis);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [paywall, setPaywall] = useState<string | null>(null);

  // Pré-remplissage depuis un projet de construction.
  useEffect(() => {
    if (!project) return;
    const prefill = investmentPrefillFromProject(project);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pré-remplissage asynchrone depuis un projet
    setForm((prev) => ({
      ...prev,
      type: prefill.type,
      purchasePrice: prefill.purchasePrice || prev.purchasePrice,
      surface: prefill.surface || prev.surface,
      region: prefill.region,
      city: prefill.city,
      quartier: prefill.quartier || prev.quartier,
    }));
  }, [project]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const selectType = (type: FormState["type"]) => {
    const forced = forcedRentModeFor(type);
    setForm((prev) => ({
      ...prev,
      type,
      rentMode: forced ?? prev.rentMode,
      occupancyRate:
        prev.occupancyRate ||
        estimateOccupancyRate({
          region: prev.region,
          city: prev.city,
          quartier: prev.quartier,
          rentMode: forced ?? prev.rentMode,
        }),
    }));
  };

  const forcedMode = forcedRentModeFor(form.type);

  const projectedCost = useMemo(() => {
    const acq = (form.purchasePrice * form.acquisitionFeePct) / 100;
    const ag = (form.purchasePrice * form.agencyFeesPct) / 100;
    return form.purchasePrice + acq + ag + form.financingFees + form.furnishingCost + form.renovationCost;
  }, [form]);

  const validateStep = (index: number): boolean => {
    if (index === 0) {
      if (form.purchasePrice <= 0) return fail("Renseignez le prix d'achat du bien.");
      if (form.surface <= 0) return fail("Renseignez la surface du bien.");
      if (!form.region || !form.city) return fail("Renseignez la localisation du bien.");
    }
    if (index === 1) {
      if (form.rentMode === "nuit" ? form.nightlyRent <= 0 : form.monthlyRent <= 0) {
        return fail("Renseignez le loyer attendu.");
      }
      if (form.occupancyRate <= 0) return fail("Renseignez un taux d'occupation estimé.");
    }
    if (index === 2) {
      if (form.horizonYears < 5) return fail("L'horizon d'analyse doit être d'au moins 5 ans.");
    }
    return true;
  };

  const fail = (message: string): boolean => {
    toast.error(message);
    return false;
  };

  const next = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const submit = async () => {
    for (let i = 0; i < STEPS.length; i++) {
      if (!validateStep(i)) {
        setStep(i);
        return;
      }
    }
    setLoading(true);
    setPaywall(null);
    try {
      const result = await runAnalysis({
        input: {
          type: form.type,
          purchasePrice: form.purchasePrice,
          surface: form.surface,
          region: form.region,
          city: form.city,
          quartier: form.quartier,
          rentMode: form.rentMode,
          monthlyRent: form.monthlyRent,
          nightlyRent: form.nightlyRent || undefined,
          occupancyRate: form.occupancyRate,
          renovationCost: form.renovationCost,
          acquisitionFeePct: form.acquisitionFeePct,
          financingFees: form.financingFees,
          agencyFeesPct: form.agencyFeesPct,
          furnishingCost: form.furnishingCost,
          annualCharges: form.annualCharges,
          insurance: form.insurance,
          managementFeePct: form.managementFeePct,
          taxationPct: form.taxationPct,
          appreciationPct: form.appreciationPct,
          rentGrowthPct: form.rentGrowthPct,
          inflationPct: form.inflationPct,
          horizonYears: form.horizonYears,
        },
        projectId: projectId ?? undefined,
      });
      toast.success("Analyse terminée.");
      navigate(`/dashboard/investments/result/${result.analysisId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isClientProError(message)) setPaywall(message);
      else toast.error("L'analyse a échoué. Vérifiez les données et réessayez.");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-indigo-500/20" />
          <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white">
            <Sparkles className="size-6" />
          </span>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold">Analyse de rentabilité en cours…</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Le moteur calcule ROI, cashflow, scénarios et score IA.
          </p>
        </div>
        <Loader2 className="size-5 animate-spin text-indigo-600" />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/dashboard">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Nouvelle analyse d'investissement</h1>
          <p className="text-xs text-muted-foreground">
            Rentabilité locative · ROI · cashflow · score IA — marché tunisien (TND)
          </p>
        </div>
      </div>

      {paywall ? (
        <div className="mt-6">
          <ClientProPaywall message={paywall} />
        </div>
      ) : null}

      {/* Stepper */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 items-center gap-2">
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                  i <= step ? "bg-gradient-to-br from-indigo-600 to-blue-600 text-white" : "bg-muted text-muted-foreground",
                )}
              >
                {i + 1}
              </span>
              <span className={cn("hidden text-xs font-medium sm:block", i <= step ? "text-foreground" : "text-muted-foreground")}>
                {label}
              </span>
            </div>
          ))}
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-blue-600"
            animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border/40 bg-card/80 p-5 shadow-soft">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25 }}
            className="space-y-5"
          >
            {step === 0 ? (
              <>
                <SectionHeading icon={Building2} title="Type de bien" subtitle="Choisissez le type d'actif à analyser" />
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {TYPE_ORDER.map((type) => {
                    const meta = TYPE_META[type];
                    const active = form.type === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => selectType(type)}
                        className={cn(
                          "flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-colors",
                          active
                            ? "border-indigo-500/60 bg-indigo-500/5"
                            : "border-border/50 hover:border-indigo-500/40 hover:bg-muted/30",
                        )}
                      >
                        <meta.icon className={cn("size-5", active ? "text-indigo-600 dark:text-indigo-400" : "text-muted-foreground")} />
                        <span className="text-xs font-semibold">{meta.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <NumField label="Prix d'achat" value={form.purchasePrice} onChange={(v) => update("purchasePrice", v)} suffix="TND" />
                  <NumField label="Surface" value={form.surface} onChange={(v) => update("surface", v)} suffix="m²" />
                </div>

                <LocationField
                  value={{ region: form.region, city: form.city, quartier: form.quartier }}
                  onChange={(loc) => setForm((prev) => ({ ...prev, ...loc }))}
                />
              </>
            ) : step === 1 ? (
              <>
                <SectionHeading icon={Wallet} title="Loyer & charges" subtitle="Revenus locatifs et coûts d'exploitation" />
                <div className="flex flex-wrap gap-2">
                  {(["mensuel", "nuit"] as const).map((mode) => {
                    const disabled = forcedMode != null && forcedMode !== mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        disabled={disabled}
                        onClick={() => update("rentMode", mode)}
                        className={cn(
                          "rounded-xl border px-3 py-2 text-xs font-medium transition-colors",
                          form.rentMode === mode
                            ? "border-indigo-500/60 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400"
                            : "border-border/50 text-muted-foreground",
                          disabled && "cursor-not-allowed opacity-40",
                        )}
                      >
                        {mode === "nuit" ? "Courte durée (nuitée)" : "Longue durée (mensuel)"}
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {form.rentMode === "nuit" ? (
                    <NumField label="Loyer par nuit" value={form.nightlyRent} onChange={(v) => update("nightlyRent", v)} suffix="TND / nuit" hint="Équivalent mensuel = prix × 30" />
                  ) : (
                    <NumField label="Loyer mensuel" value={form.monthlyRent} onChange={(v) => update("monthlyRent", v)} suffix="TND / mois" />
                  )}
                  <NumField label="Taux d'occupation" value={form.occupancyRate} onChange={(v) => update("occupancyRate", v)} suffix="%" max={100} />
                  <NumField label="Charges annuelles" value={form.annualCharges} onChange={(v) => update("annualCharges", v)} suffix="TND" />
                  <NumField label="Assurance" value={form.insurance} onChange={(v) => update("insurance", v)} suffix="TND / an" />
                  <NumField label="Frais de gestion" value={form.managementFeePct} onChange={(v) => update("managementFeePct", v)} suffix="% du loyer" max={30} />
                  <NumField label="Fiscalité" value={form.taxationPct} onChange={(v) => update("taxationPct", v)} suffix="% du loyer" max={40} />
                </div>
              </>
            ) : (
              <>
                <SectionHeading icon={Coins} title="Coûts & hypothèses" subtitle="Frais d'acquisition, financement et projections" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <NumField label="Aménagement" value={form.renovationCost} onChange={(v) => update("renovationCost", v)} suffix="TND" />
                  <NumField label="Frais d'acquisition" value={form.acquisitionFeePct} onChange={(v) => update("acquisitionFeePct", v)} suffix="% du prix" max={30} />
                  <NumField label="Frais de financement" value={form.financingFees} onChange={(v) => update("financingFees", v)} suffix="TND" />
                  <NumField label="Honoraires d'agence" value={form.agencyFeesPct} onChange={(v) => update("agencyFeesPct", v)} suffix="% du prix" max={20} />
                  <NumField label="Ameublement" value={form.furnishingCost} onChange={(v) => update("furnishingCost", v)} suffix="TND" />
                  <NumField label="Appréciation du bien" value={form.appreciationPct} onChange={(v) => update("appreciationPct", v)} suffix="% / an" min={-10} max={25} />
                  <NumField label="Croissance du loyer" value={form.rentGrowthPct} onChange={(v) => update("rentGrowthPct", v)} suffix="% / an" min={-10} max={25} />
                  <NumField label="Inflation" value={form.inflationPct} onChange={(v) => update("inflationPct", v)} suffix="% / an" max={20} />
                  <NumField label="Horizon d'analyse" value={form.horizonYears} onChange={(v) => update("horizonYears", v)} suffix="ans" min={5} />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-indigo-500/30 bg-indigo-500/5 px-4 py-3">
                  <span className="flex items-center gap-2 text-xs font-medium">
                    <Calculator className="size-4 text-indigo-600 dark:text-indigo-400" />
                    Coût total estimé de l'opération
                  </span>
                  <span className="text-sm font-bold tabular-nums">{fmtTND(projectedCost)}</span>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-6 flex items-center justify-between gap-2 border-t border-border/40 pt-4">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <ArrowLeft className="mr-2 size-4" />
            Précédent
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={next}>
              Suivant
              <ArrowRight className="ml-2 size-4" />
            </Button>
          ) : (
            <Button onClick={submit} className="gap-2 bg-gradient-to-r from-indigo-600 to-blue-600">
              <Sparkles className="size-4" />
              Lancer l'analyse
            </Button>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
        <MapPin className="size-3" />
        {form.quartier}, {form.city}, {form.region}
        <Badge variant="outline" className="text-[10px]">
          {TYPE_META[form.type].label}
        </Badge>
      </div>
    </main>
  );
}
