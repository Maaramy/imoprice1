import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PLANS, PAYMENT_METHODS, DEFAULT_BANK_DETAILS as BANK_DETAILS, DEFAULT_D17_DETAILS as D17_DETAILS } from "@/convex/defaults";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  CheckCircle2, ArrowLeft, Sparkles, Shield, Zap,
  Loader2, ArrowRight, Home, CreditCard, Building2,
  Landmark, Send, Copy, Check, ChevronLeft, X,
} from "lucide-react";

const PLAN_ICONS: Record<string, React.ReactNode> = {
  start: <Shield className="size-5 sm:size-6" />,
  pro: <Zap className="size-5 sm:size-6" />,
  expert: <Sparkles className="size-5 sm:size-6" />,
  agence: <Building2 className="size-5 sm:size-6" />,
};

const PLAN_GRADIENTS: Record<string, string> = {
  start: "from-emerald-500 to-teal-500",
  pro: "from-blue-600 to-blue-500",
  expert: "from-violet-600 to-purple-600",
  agence: "from-amber-500 to-orange-500",
};

const PLAN_BGS: Record<string, string> = {
  start: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400",
  pro: "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400",
  expert: "bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400",
  agence: "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400",
};

const CARD_CLS = "border-0 bg-white/95 dark:bg-slate-900/95 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)] rounded-2xl overflow-hidden relative";

type CheckoutPlan = {
  id: "pro" | "expert";
  name: string;
  price: number;
  currency: string;
};

const METHOD_META = {
  virement: {
    icon: <Landmark className="size-5" />,
    accent: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50",
  },
  d17: {
    icon: <Send className="size-5" />,
    accent: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50",
  },
  simulation: {
    icon: <Zap className="size-5" />,
    accent: "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/50",
  },
} as const;

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const mySub = useQuery(api.plans.mySubscription);
  const publicSettings = useQuery(api.settings.getPublicSettings);
  const subscribe = useMutation(api.plans.subscribeToPlan);
  const confirmPayment = useMutation(api.plans.confirmManualPayment);
  const ensureDefaultPlan = useMutation(api.plans.ensureDefaultPlan);

  // Effective (admin-configurable) catalog & bank coordinates
  const plans = (publicSettings?.plans ?? PLANS) as typeof PLANS;
  const bank = publicSettings?.bankDetails ?? BANK_DETAILS;
  const d17 = publicSettings?.d17Details ?? D17_DETAILS;

  // Payment section state (inline, at the bottom of the page)
  const [checkoutPlan, setCheckoutPlan] = useState<CheckoutPlan | null>(null);
  const [method, setMethod] = useState<"virement" | "d17" | "simulation" | null>(null);
  const [paymentRef, setPaymentRef] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const paymentSectionRef = useRef<HTMLDivElement>(null);

  // Give signed-in users the free plan automatically
  useEffect(() => {
    if (user && mySub === null) {
      ensureDefaultPlan();
    }
  }, [user, mySub, ensureDefaultPlan]);

  const doSubscribe = async (
    planType: "start" | "pro" | "expert" | "agence",
    paymentMethod: "simulation" | "virement" | "d17",
    ref?: string,
  ) => {
    setSubmitting(true);
    try {
      const result = await subscribe({ planType, paymentMethod, paymentRef: ref });

      // For manual methods, confirm the payment right after (simulated confirmation)
      if (result.paymentStatus === "pending" && paymentMethod !== "simulation" && result.subscriptionId) {
        await confirmPayment({ subscriptionId: result.subscriptionId });
      }

      toast.success("Forfait activé !", {
        description: result.message,
      });

      navigate("/estimate/new");
    } catch (e: any) {
      toast.error("Erreur", {
        description: e.message || "Impossible de souscrire au forfait.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubscribe = async (planId: "start" | "pro" | "expert" | "agence") => {
    if (!user) {
      navigate("/auth?returnTo=/pricing");
      return;
    }

    // If already has this plan, show a message
    if (mySub && mySub.status === "active" && mySub.planType === planId) {
      toast.info("Forfait déjà actif", {
        description: "Vous avez déjà ce forfait.",
      });
      return;
    }

    const plan = plans[planId];

    // Paid plans without trial → scroll to the inline payment section
    if ((planId === "pro" || planId === "expert") && plan.price > 0 && plan.trialDays === 0) {
      setCheckoutPlan({ id: planId, name: plan.name, price: plan.price, currency: plan.currency });
      setMethod(null);
      setPaymentRef("");
      setTimeout(() => {
        paymentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
      return;
    }

    // Free / trial plans → subscribe directly (simulation)
    await doSubscribe(planId, "simulation");
  };

  const handleConfirmPayment = async () => {
    if (!checkoutPlan) return;
    await doSubscribe(checkoutPlan.id, method ?? "simulation", paymentRef.trim() || undefined);
  };

  const copyField = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // clipboard unavailable — ignore
    }
  };

  const CopyBtn = ({ field, value }: { field: string; value: string }) => (
    <button
      type="button"
      onClick={() => copyField(field, value)}
      className="ml-2 inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-400 dark:hover:text-blue-400 dark:hover:bg-blue-950/40 transition-colors"
      aria-label={`Copier ${field}`}
    >
      {copied === field ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
      {copied === field ? "Copié" : "Copier"}
    </button>
  );

  const currentPlanName = mySub
    ? (mySub.planType === "start" ? "Free" : mySub.planType === "pro" ? "Pro" : mySub.planType === "agence" ? "Agence" : "Expert")
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="mx-auto max-w-6xl px-3 sm:px-6 py-4 sm:py-10">
        {/* Header */}
        <div className="mb-6 sm:mb-10">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              <ArrowLeft className="size-3.5 sm:size-4" />
              <span>Retour</span>
            </button>
            {user ? (
              <button
                onClick={() => navigate("/dashboard")}
                className="flex items-center gap-1.5 text-xs sm:text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors"
              >
                <Home className="size-3.5 sm:size-4" />
                <span>Dashboard</span>
              </button>
            ) : (
              <button
                onClick={() => navigate("/auth?returnTo=/pricing")}
                className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
              >
                Se connecter
              </button>
            )}
          </div>

          <div className="text-center max-w-2xl mx-auto">
            <div className="flex justify-center mb-3">
              <div className="flex size-12 sm:size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-500 shadow-lg shadow-blue-200/50 dark:shadow-blue-900/50">
                <CreditCard className="size-6 sm:size-7 text-white" />
              </div>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
              Choisissez votre forfait
            </h1>
            <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Obtenez des estimations précises de vos biens immobiliers avec notre moteur BIM intelligent
            </p>
            {currentPlanName && (
              <Badge className="mt-2 sm:mt-3 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-0 text-xs sm:text-sm font-medium px-3 py-1">
                Forfait actuel : {currentPlanName}
              </Badge>
            )}
          </div>
        </div>

        {/* Plans */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-3 items-start">
          {(Object.values(plans) as unknown as Array<{
            id: "start" | "pro" | "expert" | "agence";
            name: string;
            description: string;
            price: number;
            currency: string;
            period: "one_time" | "monthly";
            estimations: number;
            trialDays: number;
            features: string[];
            popular: boolean;
          }>).map((plan, i) => {
            const isActive = mySub?.status === "active" && mySub?.planType === plan.id;
            const planId = plan.id;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.35 }}
                className="relative"
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <Badge className="rounded-full bg-gradient-to-r from-blue-600 to-blue-500 text-white border-0 text-xs font-semibold px-3 sm:px-4 py-1 shadow-lg shadow-blue-200/50 dark:shadow-blue-900/50">
                      <Sparkles className="size-3 mr-1" /> Populaire
                    </Badge>
                  </div>
                )}

                <Card className={`${CARD_CLS} h-full ${
                  plan.popular
                    ? "ring-2 ring-blue-500/20 dark:ring-blue-400/20 shadow-[0_4px_20px_rgba(59,130,246,0.08)] dark:shadow-[0_4px_20px_rgba(59,130,246,0.12)]"
                    : ""
                } ${isActive ? "ring-2 ring-emerald-500/30" : ""}`}>
                  <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${PLAN_GRADIENTS[plan.id]} opacity-60`} />

                  <CardContent className="p-5 sm:p-7">
                    {/* Icon & Name */}
                    <div className="flex items-center gap-3 mb-4 sm:mb-5">
                      <div className={`flex size-10 sm:size-12 items-center justify-center rounded-xl ${PLAN_BGS[plan.id]}`}>
                        {PLAN_ICONS[plan.id]}
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">{plan.name}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{plan.description}</p>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="mb-4 sm:mb-6">
                      <div className="flex items-baseline gap-0.5">
                        {plan.price === 0 ? (
                          <span className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                            Gratuit
                          </span>
                        ) : (
                          <>
                            <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
                              {plan.price}
                            </span>
                            <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium ml-1">
                              {plan.currency}
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        {plan.price === 0 ? "Pour toujours" : plan.period === "monthly" ? "par mois" : "une seule fois"}
                        {plan.trialDays > 0 && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium ml-1">
                            · {plan.trialDays} jours gratuits
                          </span>
                        )}
                      </p>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">
                        <span className="text-slate-900 dark:text-slate-100 font-bold">{plan.estimations}</span> estimation{plan.estimations > 1 ? "s" : ""} incluse{plan.estimations > 1 ? "s" : ""}
                      </p>
                    </div>

                    {/* Features */}
                    <ul className="space-y-2 sm:space-y-2.5 mb-5 sm:mb-7">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <CheckCircle2 className="size-4 sm:size-4.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <Button
                      onClick={() => handleSubscribe(planId)}
                      disabled={isActive}
                      className={`w-full h-11 sm:h-12 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                        plan.popular
                          ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-200/50 dark:shadow-blue-900/50 hover:shadow-lg hover:from-blue-700 hover:to-blue-600"
                          : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border bg-transparent"
                      } ${isActive ? "opacity-60 cursor-default" : "hover:scale-[1.02] active:scale-[0.98]"}`}
                    >
                      {isActive ? (
                        <><CheckCircle2 className="mr-1.5 size-4" /> Actif</>
                      ) : (
                        <><ArrowRight className="mr-1.5 size-4" /> {plan.price === 0 ? "Commencer gratuitement" : plan.trialDays > 0 ? "Commencer l'essai" : "Choisir ce forfait"}</>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* ── Inline payment section (bottom of the page) ── */}
        {checkoutPlan && (
          <div ref={paymentSectionRef} className="mt-6 sm:mt-10 scroll-mt-6">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="mx-auto max-w-xl"
            >
              <div className="rounded-2xl border-0 bg-white/95 dark:bg-slate-900/95 shadow-[0_4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.25)] overflow-hidden">
                {/* Section header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-white text-base font-bold leading-tight">
                      Payer le forfait {checkoutPlan.name}
                    </p>
                    <p className="text-blue-100 text-xs mt-0.5">
                      {checkoutPlan.price} {checkoutPlan.currency} / mois — activation immédiate après paiement
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCheckoutPlan(null)}
                    aria-label="Fermer la section de paiement"
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white hover:bg-white/25 transition-colors"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="p-5">
                  {/* Step 1: choose method */}
                  {!method && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">
                        Choisissez votre moyen de paiement
                      </p>
                      {(["virement", "d17", "simulation"] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setMethod(m)}
                          className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 ${
                            method === m ? "border-blue-500 ring-2 ring-blue-500/20" : "border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${METHOD_META[m].accent}`}>
                            {METHOD_META[m].icon}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
                              {PAYMENT_METHODS[m].label}
                            </span>
                            <span className="block text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                              {PAYMENT_METHODS[m].description}
                            </span>
                          </span>
                          <ChevronLeft className="size-4 rotate-180 text-slate-300 dark:text-slate-600 shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Step 2: virement instructions */}
                  {method === "virement" && (
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => setMethod(null)}
                        className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 transition-colors"
                      >
                        <ChevronLeft className="size-3.5" /> Changer de moyen de paiement
                      </button>

                      <div className="rounded-xl border border-blue-100 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/30 p-3.5 space-y-2">
                        <p className="text-xs font-bold text-blue-800 dark:text-blue-300">
                          Coordonnées bancaires — virement
                        </p>
                        {[
                          { label: "Bénéficiaire", value: bank.beneficiary },
                          { label: "Banque", value: `${bank.bank} · ${bank.agency}` },
                          { label: "RIB", value: bank.rib },
                          { label: "SWIFT/BIC", value: bank.swift },
                        ].map((row) => (
                          <div key={row.label} className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[10px] uppercase tracking-wide text-blue-500/80 dark:text-blue-400/70 font-semibold">
                                {row.label}
                              </p>
                              <p className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-100 truncate">
                                {row.value}
                              </p>
                            </div>
                            <CopyBtn field={row.label} value={row.value} />
                          </div>
                        ))}
                        <div className="flex items-center justify-between gap-2 border-t border-blue-100 dark:border-blue-900/50 pt-2 mt-1">
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-wide text-blue-500/80 dark:text-blue-400/70 font-semibold">
                              Objet du virement
                            </p>
                            <p className="text-xs text-slate-700 dark:text-slate-200">{bank.reason}</p>
                          </div>
                          <CopyBtn field="objet" value={bank.reason} />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="pay-ref" className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                          Référence du virement (facultatif)
                        </Label>
                        <Input
                          id="pay-ref"
                          value={paymentRef}
                          onChange={(e) => setPaymentRef(e.target.value)}
                          placeholder="N° de référence / reçu de transfert"
                          className="mt-1 h-9 rounded-lg text-xs"
                        />
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Effectuez le virement puis confirmez ci-dessous. Votre forfait sera activé
                        immédiatement après vérification (1-3 jours ouvrés).
                      </p>

                      <Button
                        onClick={handleConfirmPayment}
                        disabled={submitting}
                        className="w-full h-10 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md hover:from-blue-700 hover:to-blue-600"
                      >
                        {submitting ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 size-4" />}
                        J'ai effectué le virement
                      </Button>
                    </div>
                  )}

                  {/* Step 2: D17 instructions */}
                  {method === "d17" && (
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => setMethod(null)}
                        className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-emerald-600 dark:text-slate-400 transition-colors"
                      >
                        <ChevronLeft className="size-3.5" /> Changer de moyen de paiement
                      </button>

                      <div className="rounded-xl border border-emerald-100 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-950/30 p-3.5 space-y-2">
                        <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                          Mandat D17 — Poste Tunisie
                        </p>
                        {[
                          { label: "Bénéficiaire", value: d17.beneficiary },
                          { label: "N° CCP", value: d17.ccp },
                          { label: "Centre", value: d17.center },
                        ].map((row) => (
                          <div key={row.label} className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[10px] uppercase tracking-wide text-emerald-500/80 dark:text-emerald-400/70 font-semibold">
                                {row.label}
                              </p>
                              <p className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-100 truncate">
                                {row.value}
                              </p>
                            </div>
                            <CopyBtn field={row.label} value={row.value} />
                          </div>
                        ))}
                        <div className="flex items-center justify-between gap-2 border-t border-emerald-100 dark:border-emerald-900/50 pt-2 mt-1">
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-wide text-emerald-500/80 dark:text-emerald-400/70 font-semibold">
                              Motif du versement
                            </p>
                            <p className="text-xs text-slate-700 dark:text-slate-200">{d17.reason}</p>
                          </div>
                          <CopyBtn field="motif" value={d17.reason} />
                        </div>
                      </div>

                      <ol className="space-y-1.5 list-decimal list-inside text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                        <li>Rendez-vous dans votre bureau de poste le plus proche</li>
                        <li>Remplissez le formulaire <b>D17</b> (mandat de versement) avec les coordonnées ci-dessus</li>
                        <li>Déposez le montant {checkoutPlan?.price} {checkoutPlan?.currency} et récupérez votre reçu</li>
                        <li>Saisissez le numéro du reçu puis confirmez ci-dessous</li>
                      </ol>

                      <div>
                        <Label htmlFor="d17-ref" className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                          N° du reçu D17 (facultatif)
                        </Label>
                        <Input
                          id="d17-ref"
                          value={paymentRef}
                          onChange={(e) => setPaymentRef(e.target.value)}
                          placeholder="N° de versement D17"
                          className="mt-1 h-9 rounded-lg text-xs"
                        />
                      </div>

                      <Button
                        onClick={handleConfirmPayment}
                        disabled={submitting}
                        className="w-full h-10 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md hover:from-emerald-700 hover:to-teal-600"
                      >
                        {submitting ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 size-4" />}
                        J'ai effectué le versement
                      </Button>
                    </div>
                  )}

                  {/* Step 2: simulation */}
                  {method === "simulation" && (
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => setMethod(null)}
                        className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-violet-600 dark:text-slate-400 transition-colors"
                      >
                        <ChevronLeft className="size-3.5" /> Changer de moyen de paiement
                      </button>

                      <div className="rounded-xl border border-violet-100 dark:border-violet-900/50 bg-violet-50/60 dark:bg-violet-950/30 p-3.5">
                        <p className="text-xs font-bold text-violet-800 dark:text-violet-300">
                          Mode démo — aucun prélèvement
                        </p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                          Le paiement est simulé pour tester la plateforme. Votre forfait
                          {checkoutPlan?.name} sera activé immédiatement sans carte bancaire.
                        </p>
                      </div>

                      <Button
                        onClick={handleConfirmPayment}
                        disabled={submitting}
                        className="w-full h-10 rounded-xl text-xs font-semibold bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md hover:from-violet-700 hover:to-purple-700"
                      >
                        {submitting ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Zap className="mr-1.5 size-4" />}
                        Activer immédiatement (démo)
                      </Button>
                    </div>
                  )}
                </div>

                {method && (
                  <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-3">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      <Shield className="inline size-3 mr-1" />
                      Paiement sécurisé · {checkoutPlan.price} {checkoutPlan.currency} TND par mois · Annulable à tout moment
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Footer note */}
        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6 sm:mt-10">
          Paiement 100% sécurisé · Virement bancaire &amp; D17 Poste Tunisie · Annulation à tout moment
        </p>
      </div>
    </div>
  );
}
