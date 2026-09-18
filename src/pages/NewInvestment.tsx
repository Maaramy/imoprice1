import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { ThemeToggle } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Building2,
  Calculator,
  Coins,
  Landmark,
  Loader2,
  MapPinned,
  Percent,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  GOVERNORATS,
  QUARTIERS_BY_VILLE,
  VILLES_BY_GOUVERNORAT,
} from "@/convex/types";
import {
  INVESTMENT_DEFAULTS,
  INVESTMENT_TYPES,
  INVESTMENT_TYPE_LABELS,
  type InvestmentInput,
  type InvestmentType,
} from "@/lib/investment-analysis";

type FormState = Record<string, string>;

const INITIAL: FormState = {
  investmentType: "appartement",
  designation: "",
  gouvernorat: "",
  ville: "",
  quartier: "",
  builtSurface: "",
  purchasePrice: "",
  worksCost: "",
  feesCost: "",
  furnitureCost: "",
  downPayment: "",
  loanAmount: "",
  loanRate: "7",
  loanYears: "15",
  monthlyRent: "",
  otherMonthlyIncome: "",
  occupancyRate: String(INVESTMENT_DEFAULTS.occupancyRate),
  monthlyCharges: "",
  managementFeeRate: String(INVESTMENT_DEFAULTS.managementFeeRate),
  rentIndexationRate: String(INVESTMENT_DEFAULTS.rentIndexationRate),
  inflationRate: String(INVESTMENT_DEFAULTS.inflationRate),
  marketGrowthRate: String(INVESTMENT_DEFAULTS.marketGrowthRate),
};

const n = (v: string): number | undefined => {
  if (v.trim() === "") return undefined;
  const parsed = Number(v.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
};

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
        {label}
      </Label>
      {children}
      {hint && <p className="text-[10px] text-slate-400">{hint}</p>}
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40">
          <Icon className="size-4 text-indigo-600 dark:text-indigo-400" />
        </span>
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h2>
          {subtitle && <p className="text-[10px] text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export default function NewInvestment() {
  const navigate = useNavigate();
  const createInvestment = useMutation(api.investments.createInvestment);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const villes = useMemo(
    () => (form.gouvernorat ? VILLES_BY_GOUVERNORAT[form.gouvernorat] ?? [] : []),
    [form.gouvernorat],
  );
  const quartiers = useMemo(
    () => (form.ville ? QUARTIERS_BY_VILLE[form.ville] ?? [] : []),
    [form.ville],
  );

  /* Aperçu rapide du coût total saisi */
  const preview = useMemo(() => {
    const price = n(form.purchasePrice) ?? 0;
    const fees = n(form.feesCost) ?? (price * INVESTMENT_DEFAULTS.acquisitionFeeRate) / 100;
    const total = price + (n(form.worksCost) ?? 0) + fees + (n(form.furnitureCost) ?? 0);
    const rent = (n(form.monthlyRent) ?? 0) * 12;
    const gross = total > 0 ? (rent / total) * 100 : 0;
    return { total, gross };
  }, [form]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.gouvernorat) return toast.error("Sélectionnez un gouvernorat");
    if (!n(form.purchasePrice)) return toast.error("Renseignez le prix d'achat");
    if (n(form.monthlyRent) === undefined) return toast.error("Renseignez le loyer mensuel attendu");

    const input: InvestmentInput = {
      investmentType: form.investmentType as InvestmentType,
      designation: form.designation.trim() || undefined,
      gouvernorat: form.gouvernorat,
      ville: form.ville || undefined,
      quartier: form.quartier || undefined,
      builtSurface: n(form.builtSurface),
      purchasePrice: n(form.purchasePrice)!,
      worksCost: n(form.worksCost),
      feesCost: n(form.feesCost),
      furnitureCost: n(form.furnitureCost),
      downPayment: n(form.downPayment),
      loanAmount: n(form.loanAmount),
      loanRate: n(form.loanRate),
      loanYears: n(form.loanYears),
      monthlyRent: n(form.monthlyRent)!,
      otherMonthlyIncome: n(form.otherMonthlyIncome),
      occupancyRate: n(form.occupancyRate),
      monthlyCharges: n(form.monthlyCharges),
      managementFeeRate: n(form.managementFeeRate),
      rentIndexationRate: n(form.rentIndexationRate),
      inflationRate: n(form.inflationRate),
      marketGrowthRate: n(form.marketGrowthRate),
    };

    setSubmitting(true);
    try {
      const { investmentId } = await createInvestment({ input });
      toast.success("Analyse de rentabilité générée");
      navigate(`/invest/${investmentId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analyse impossible");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <header className="sticky top-0 z-40 border-b border-slate-200/60 dark:border-gray-800/60 bg-white/75 dark:bg-gray-950/75 backdrop-blur-2xl">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:px-6">
          <button
            onClick={() => navigate("/invest/dashboard")}
            className="flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            <ArrowLeft className="size-3.5" />
            Investissement IA
          </button>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200/70 dark:border-indigo-900/60 bg-indigo-50/80 dark:bg-indigo-950/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
            <Sparkles className="size-3" /> Nouvelle analyse
          </span>
          <h1 className="mt-3 text-xl font-black tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl">
            Décrivez votre projet d'investissement
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
            Coûts, revenus locatifs, financement et hypothèses de marché — le moteur calcule
            rentabilité, ROI et durée de récupération.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ═══ BIEN & LOCALISATION ═══ */}
          <Section icon={Building2} title="Le bien" subtitle="Type, surface et localisation">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Type d'investissement">
                <Select value={form.investmentType} onValueChange={(v) => set("investmentType", v)}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVESTMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {INVESTMENT_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Désignation" hint="Nom du projet (optionnel)">
                <Input
                  value={form.designation}
                  onChange={(e) => set("designation", e.target.value)}
                  placeholder="Ex. Appartement S+2 Les Berges du Lac"
                  className="h-10 rounded-xl"
                />
              </Field>
              <Field label="Surface construite (m²)">
                <Input
                  inputMode="numeric"
                  value={form.builtSurface}
                  onChange={(e) => set("builtSurface", e.target.value)}
                  placeholder="Ex. 120"
                  className="h-10 rounded-xl"
                />
              </Field>
              <Field label="Gouvernorat">
                <Select
                  value={form.gouvernorat}
                  onValueChange={(v) => {
                    setForm((f) => ({ ...f, gouvernorat: v, ville: "", quartier: "" }));
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {GOVERNORATS.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Ville / délégation">
                <Select
                  value={form.ville}
                  onValueChange={(v) => setForm((f) => ({ ...f, ville: v, quartier: "" }))}
                  disabled={!form.gouvernorat}
                >
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder={form.gouvernorat ? "Sélectionner" : "—"} />
                  </SelectTrigger>
                  <SelectContent>
                    {villes.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Quartier / zone">
                <Select
                  value={form.quartier}
                  onValueChange={(v) => set("quartier", v)}
                  disabled={!form.ville}
                >
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder={form.ville ? "Sélectionner" : "—"} />
                  </SelectTrigger>
                  <SelectContent>
                    {quartiers.map((q) => (
                      <SelectItem key={q} value={q}>
                        {q}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Section>

          {/* ═══ COÛTS ═══ */}
          <Section
            icon={Coins}
            title="Coût de l'investissement"
            subtitle="Prix, travaux, frais et équipement (TND)"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Prix d'achat / coût de construction">
                <Input
                  inputMode="numeric"
                  value={form.purchasePrice}
                  onChange={(e) => set("purchasePrice", e.target.value)}
                  placeholder="Ex. 380 000"
                  className="h-10 rounded-xl"
                />
              </Field>
              <Field label="Travaux / rénovation">
                <Input
                  inputMode="numeric"
                  value={form.worksCost}
                  onChange={(e) => set("worksCost", e.target.value)}
                  placeholder="Ex. 40 000"
                  className="h-10 rounded-xl"
                />
              </Field>
              <Field
                label="Frais d'acquisition"
                hint={`Laisser vide : ${INVESTMENT_DEFAULTS.acquisitionFeeRate}% du prix (notaire, enregistrement, agence)`}
              >
                <Input
                  inputMode="numeric"
                  value={form.feesCost}
                  onChange={(e) => set("feesCost", e.target.value)}
                  placeholder="Calcul automatique"
                  className="h-10 rounded-xl"
                />
              </Field>
              <Field label="Équipement / mobilier">
                <Input
                  inputMode="numeric"
                  value={form.furnitureCost}
                  onChange={(e) => set("furnitureCost", e.target.value)}
                  placeholder="Ex. 15 000"
                  className="h-10 rounded-xl"
                />
              </Field>
            </div>
          </Section>

          {/* ═══ FINANCEMENT ═══ */}
          <Section
            icon={Landmark}
            title="Financement"
            subtitle="Apport et crédit bancaire (optionnel)"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Montant du crédit">
                <Input
                  inputMode="numeric"
                  value={form.loanAmount}
                  onChange={(e) => set("loanAmount", e.target.value)}
                  placeholder="Ex. 200 000"
                  className="h-10 rounded-xl"
                />
              </Field>
              <Field label="Apport personnel">
                <Input
                  inputMode="numeric"
                  value={form.downPayment}
                  onChange={(e) => set("downPayment", e.target.value)}
                  placeholder="Calcul automatique"
                  className="h-10 rounded-xl"
                />
              </Field>
              <Field label="Taux annuel du crédit (%)">
                <Input
                  inputMode="decimal"
                  value={form.loanRate}
                  onChange={(e) => set("loanRate", e.target.value)}
                  className="h-10 rounded-xl"
                />
              </Field>
              <Field label="Durée du crédit (années)">
                <Input
                  inputMode="numeric"
                  value={form.loanYears}
                  onChange={(e) => set("loanYears", e.target.value)}
                  className="h-10 rounded-xl"
                />
              </Field>
            </div>
          </Section>

          {/* ═══ REVENUS ═══ */}
          <Section icon={Wallet} title="Revenus locatifs" subtitle="Loyers et taux d'occupation">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Loyer mensuel attendu (TND)">
                <Input
                  inputMode="numeric"
                  value={form.monthlyRent}
                  onChange={(e) => set("monthlyRent", e.target.value)}
                  placeholder="Ex. 1 800"
                  className="h-10 rounded-xl"
                />
              </Field>
              <Field label="Autres revenus mensuels">
                <Input
                  inputMode="numeric"
                  value={form.otherMonthlyIncome}
                  onChange={(e) => set("otherMonthlyIncome", e.target.value)}
                  placeholder="Parking, cave…"
                  className="h-10 rounded-xl"
                />
              </Field>
              <Field label="Taux d'occupation (%)" hint="Part de l'année réellement louée">
                <Input
                  inputMode="numeric"
                  value={form.occupancyRate}
                  onChange={(e) => set("occupancyRate", e.target.value)}
                  className="h-10 rounded-xl"
                />
              </Field>
              <Field label="Honoraires de gestion (%)">
                <Input
                  inputMode="numeric"
                  value={form.managementFeeRate}
                  onChange={(e) => set("managementFeeRate", e.target.value)}
                  className="h-10 rounded-xl"
                />
              </Field>
              <Field label="Charges mensuelles">
                <Input
                  inputMode="numeric"
                  value={form.monthlyCharges}
                  onChange={(e) => set("monthlyCharges", e.target.value)}
                  placeholder="Syndic, gardiennage…"
                  className="h-10 rounded-xl"
                />
              </Field>
            </div>
          </Section>

          {/* ═══ HYPOTHÈSES ═══ */}
          <Section
            icon={TrendingUp}
            title="Hypothèses de marché"
            subtitle="Prévisions utilisées pour les projections à 10 ans"
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Indexation des loyers (%/an)">
                <Input
                  inputMode="decimal"
                  value={form.rentIndexationRate}
                  onChange={(e) => set("rentIndexationRate", e.target.value)}
                  className="h-10 rounded-xl"
                />
              </Field>
              <Field label="Inflation (%/an)">
                <Input
                  inputMode="decimal"
                  value={form.inflationRate}
                  onChange={(e) => set("inflationRate", e.target.value)}
                  className="h-10 rounded-xl"
                />
              </Field>
              <Field label="Appréciation du bien (%/an)">
                <Input
                  inputMode="decimal"
                  value={form.marketGrowthRate}
                  onChange={(e) => set("marketGrowthRate", e.target.value)}
                  className="h-10 rounded-xl"
                />
              </Field>
            </div>
          </Section>

          {/* ═══ APERÇU + SUBMIT ═══ */}
          <div className="flex flex-col gap-4 rounded-2xl border border-indigo-200/70 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/80 to-violet-50/60 dark:from-indigo-950/30 dark:to-violet-950/20 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
                <Calculator className="size-4" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600/80 dark:text-indigo-300/80">
                  Aperçu
                </p>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {preview.total > 0
                    ? `${preview.total.toLocaleString("fr-FR")} TND`
                    : "—"}{" "}
                  <span className="text-[11px] font-medium text-slate-400">
                    · rendement brut{" "}
                    {preview.gross > 0 ? `${preview.gross.toFixed(2).replace(".", ",")}%` : "—"}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate("/invest/dashboard")}
                className="rounded-xl text-xs"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-200/50"
              >
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Percent className="size-4" />
                )}
                Analyser la rentabilité
              </Button>
            </div>
          </div>
        </form>

        <p className="mt-4 flex items-center gap-1.5 text-[10px] text-slate-400">
          <MapPinned className="size-3" />
          Les indicateurs de marché (prix/m², loyer/m², rendement cible) proviennent de la base
          tunisienne 2026 — 144 zones de référence.
        </p>
      </main>
    </div>
  );
}
