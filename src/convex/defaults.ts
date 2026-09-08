/**
 * Default values for the platform: plan definitions, payment methods and
 * bank coordinates. These are the fallback values — the admin can override
 * them at runtime via the `siteSettings` document (see settings.ts).
 *
 * Kept in a separate module so that plans.ts (which imports settings.ts to
 * apply overrides) does not create a circular import with settings.ts.
 */

/** ── Plan definitions ── */
export const PLANS = {
  start: {
    id: "start" as const,
    name: "Free",
    description: "Pour découvrir imoprice AI gratuitement",
    price: 0,
    currency: "TND",
    period: "monthly" as const,
    estimations: 3,
    trialDays: 0,
    features: [
      "3 estimations/mois offertes",
      "Analyse IA des photos",
      "Rapport détaillé PDF",
      "Cartographie interactive",
    ],
    popular: false,
  },
  pro: {
    id: "pro" as const,
    name: "Pro",
    description: "Pour les professionnels de l'immobilier",
    price: 120,
    currency: "TND",
    period: "monthly" as const,
    estimations: 10,
    trialDays: 0,
    features: [
      "10 estimations/mois",
      "Analyse IA des photos",
      "Rapport détaillé PDF",
      "Cartographie interactive",
      "Partage par QR code",
      "Signature électronique",
      "Support prioritaire",
    ],
    popular: true,
  },
  expert: {
    id: "expert" as const,
    name: "Expert",
    description: "Pour les agences et experts",
    price: 320,
    currency: "TND",
    period: "monthly" as const,
    estimations: 30,
    trialDays: 0,
    features: [
      "30 estimations/mois",
      "Analyse IA des photos",
      "Rapport détaillé PDF",
      "Cartographie interactive",
      "Partage par QR code",
      "Signature électronique",
      "Support prioritaire",
      "API d'intégration",
      "Multi-utilisateurs",
    ],
    popular: false,
  },
  agence: {
    id: "agence" as const,
    name: "Agence",
    description: "Pour les agences immobilières — visibilité et leads",
    price: 120,
    currency: "TND",
    period: "monthly" as const,
    estimations: 0,
    trialDays: 60,
    features: [
      "Profil d'agence personnalisé",
      "Apparaître dans les résultats d'estimation",
      "Recevoir des demandes de clients",
      "Coordonnées et spécialité visibles",
      "2 mois d'essai gratuit",
      "Gestion des leads immobiliers",
      "Accès au tableau de bord agence",
    ],
    popular: false,
  },
} as const;

export type PlanId = keyof typeof PLANS;

export type PaymentMethod = "simulation" | "virement" | "d17";

/** ── Accepted payment methods with their display details ── */
export const PAYMENT_METHODS: Record<
  PaymentMethod,
  { label: string; description: string; shortLabel: string }
> = {
  simulation: {
    label: "Paiement simulé",
    description: "Activation immédiate en mode démo (aucun prélèvement)",
    shortLabel: "Simulation",
  },
  virement: {
    label: "Virement bancaire",
    description: "Transfert bancaire vers notre compte (1-3 jours ouvrés)",
    shortLabel: "Virement",
  },
  d17: {
    label: "D17 — Poste Tunisie",
    description: "Mandat de versement via le bureau de poste tunisien",
    shortLabel: "D17",
  },
};

/** ── Bank transfer details (virement bancaire) — default values ── */
export const DEFAULT_BANK_DETAILS = {
  beneficiary: "imoprice AI SARL",
  bank: "Banque de Tunisie",
  agency: "Agence Tunis Centre",
  rib: "08 123 4567890123456789 12",
  swift: "BTBKTNTTXXX",
  reason: "Votre adresse e-mail + forfait choisi",
} as const;

/** ── D17 (Poste Tunisie) details — default values ── */
export const DEFAULT_D17_DETAILS = {
  beneficiary: "imoprice AI SARL",
  ccp: "1234567 8 12",
  center: "Centre de chèques postaux de Tunis",
  reason: "Votre adresse e-mail + forfait choisi",
} as const;

/** ── UTC month key ("YYYY-MM") — identifies which month an estimation counter belongs to ── */
export const monthKey = (ts: number = Date.now()) => {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};
