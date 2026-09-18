import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Brain,
  Building2,
  Calculator,
  CalendarClock,
  CheckCircle2,
  Compass,
  FileText,
  Gauge,
  GraduationCap,
  Landmark,
  LineChart,
  MapPinned,
  Percent,
  Repeat,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { INVESTMENT_TYPE_LABELS } from "@/lib/investment-analysis";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.5 },
};

const INDICATORS = [
  { icon: Wallet, label: "Coût total de l'investissement" },
  { icon: TrendingUp, label: "Revenus locatifs annuels" },
  { icon: Repeat, label: "Cash-flow mensuel & annuel" },
  { icon: Percent, label: "Rentabilité brute & nette" },
  { icon: LineChart, label: "ROI annuel, 5 ans, 10 ans" },
  { icon: Calculator, label: "Retour sur investissement" },
  { icon: CalendarClock, label: "Durée de récupération du capital" },
  { icon: BarChart3, label: "Revenu net annuel" },
];

const FEATURES = [
  {
    icon: Brain,
    title: "Moteur IA d'analyse financière",
    text: "Calcule automatiquement la rentabilité, le cash-flow, le ROI et la durée d'amortissement à partir du marché tunisien 2026.",
    accent: "indigo",
  },
  {
    icon: Gauge,
    title: "Score IA d'investissement /100",
    text: "Note pondérée sur la rentabilité, l'emplacement, la demande locative, le risque, l'appréciation et la liquidité.",
    accent: "emerald",
  },
  {
    icon: LineChart,
    title: "Prévisions à 1, 3, 5 et 10 ans",
    text: "Inflation, indexation des loyers, appréciation du bien, maintenance et fiscalité intégrées aux projections.",
    accent: "violet",
  },
  {
    icon: Compass,
    title: "Scénarios optimiste / réaliste / prudent",
    text: "Trois trajectoires chiffrées avec valeur future, revenus, ROI, rentabilité nette et risques associés.",
    accent: "amber",
  },
  {
    icon: BarChart3,
    title: "Comparaison multi-actifs",
    text: "Appartement, villa, local commercial, bureau, terrain : rendement, risque, potentiel et liquidité comparés.",
    accent: "blue",
  },
  {
    icon: Bot,
    title: "Assistant IA investisseur",
    text: "Posez vos questions : rentabilité, meilleur rendement, gains à 10 ans, meilleur quartier, niveau de risque.",
    accent: "indigo",
  },
  {
    icon: MapPinned,
    title: "Carte des meilleures zones",
    text: "Classement des zones les plus rentables de Tunisie à partir de 144 zones de référence.",
    accent: "emerald",
  },
  {
    icon: FileText,
    title: "Rapport PDF professionnel",
    text: "Résumé, analyse financière, ROI, amortissement, prévisions, risques, comparaison et recommandations.",
    accent: "violet",
  },
];

const ACCENTS: Record<string, string> = {
  indigo: "from-indigo-500 to-violet-600 shadow-indigo-200/50 dark:shadow-indigo-950/40",
  emerald: "from-emerald-500 to-teal-600 shadow-emerald-200/50 dark:shadow-emerald-950/40",
  violet: "from-violet-500 to-fuchsia-600 shadow-violet-200/50 dark:shadow-violet-950/40",
  amber: "from-amber-500 to-orange-600 shadow-amber-200/50 dark:shadow-amber-950/40",
  blue: "from-blue-500 to-indigo-600 shadow-blue-200/50 dark:shadow-blue-950/40",
};

const PERSONAS = [
  { icon: Users, label: "Investisseurs", text: "Arbitrez entre plusieurs opportunités avec des indicateurs comparables." },
  { icon: Building2, label: "Particuliers", text: "Vérifiez qu'un achat locatif est réellement rentable avant de vous engager." },
  { icon: Landmark, label: "Agences immobilières", text: "Présentez des dossiers chiffrés et crédibles à vos clients investisseurs." },
  { icon: Compass, label: "Promoteurs", text: "Dimensionnez un programme neuf et estimez sa rentabilité locative." },
  { icon: GraduationCap, label: "Institutions financières", text: "Analysez la capacité de remboursement et le rendement d'un financement." },
];

const SCENARIOS = [
  {
    label: "Optimiste",
    tone: "emerald",
    occupancy: "97%",
    growth: "+8,5 %/an",
    text: "Marché dynamique, forte demande locative, loyers indexés.",
  },
  {
    label: "Réaliste",
    tone: "blue",
    occupancy: "92%",
    growth: "+6,5 %/an",
    text: "Tendances actuelles du marché immobilier tunisien 2026.",
  },
  {
    label: "Prudent",
    tone: "amber",
    occupancy: "84%",
    growth: "+4,5 %/an",
    text: "Hypothèses conservatrices avec marge de sécurité.",
  },
];

const SCENARIO_TONE: Record<string, string> = {
  emerald: "border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/25 text-emerald-700 dark:text-emerald-300",
  blue: "border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/25 text-blue-700 dark:text-blue-300",
  amber: "border-amber-200 dark:border-amber-900 bg-amber-50/60 dark:bg-amber-950/25 text-amber-700 dark:text-amber-300",
};

export default function InvestLanding() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const goToProduct = () =>
    navigate(isAuthenticated ? "/invest/dashboard" : "/auth?returnTo=%2Finvest%2Fdashboard");

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* ═══ HEADER ═══ */}
      <header
        className={`sticky top-0 z-50 border-b transition-all duration-300 ${
          scrolled
            ? "border-slate-200/70 dark:border-gray-800/70 bg-white/80 dark:bg-gray-950/80 backdrop-blur-2xl"
            : "border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100"
          >
            <span className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-200/60 dark:shadow-indigo-950/50">
              <TrendingUp className="size-4" />
            </span>
            <span>
              <span className="text-indigo-600 dark:text-indigo-400">bati</span>cost AI
              <span className="ml-1.5 hidden sm:inline text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Invest
              </span>
            </span>
          </button>

          <nav className="hidden items-center gap-6 md:flex">
            {[
              { label: "Fonctionnalités", href: "#features" },
              { label: "Indicateurs", href: "#indicators" },
              { label: "Scénarios", href: "#scenarios" },
              { label: "Pour qui ?", href: "#personas" },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-xs font-medium text-slate-500 transition-colors hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="hidden text-xs font-semibold text-slate-500 hover:text-slate-900 sm:inline-flex"
            >
              Estimation immobilière
            </Button>
            <Button
              size="sm"
              onClick={goToProduct}
              disabled={isLoading}
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-200/50 hover:from-indigo-700 hover:to-violet-700"
            >
              {isAuthenticated ? "Tableau de bord" : "Se connecter"}
            </Button>
          </div>
        </div>
      </header>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-24 top-10 size-72 rounded-full bg-indigo-200/40 blur-3xl dark:bg-indigo-950/30" />
        <div className="pointer-events-none absolute -right-16 top-32 size-80 rounded-full bg-emerald-200/40 blur-3xl dark:bg-emerald-950/25" />

        <div className="relative mx-auto max-w-7xl px-4 pt-14 pb-16 sm:px-6 sm:pt-20 sm:pb-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200/70 dark:border-indigo-900/60 bg-indigo-50/80 dark:bg-indigo-950/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                <Sparkles className="size-3" />
                Analyse de rentabilité par intelligence artificielle
              </span>

              <h1 className="mt-5 text-3xl font-black leading-tight tracking-tight text-slate-900 dark:text-slate-50 sm:text-5xl">
                Sachez si un investissement{" "}
                <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-emerald-600 bg-clip-text text-transparent">
                  immobilier est rentable
                </span>{" "}
                avant d'y mettre un dinar.
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:text-base">
                Notre moteur d'intelligence artificielle analyse le marché tunisien, les coûts, les
                revenus locatifs et les prévisions économiques pour calculer le ROI, la rentabilité
                nette, la durée de récupération du capital et le score d'investissement sur 100.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Button
                  size="lg"
                  onClick={() =>
                    navigate(
                      isAuthenticated ? "/invest/new" : "/auth?returnTo=%2Finvest%2Fnew",
                    )
                  }
                  disabled={isLoading}
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200/60 hover:from-indigo-700 hover:to-violet-700 dark:shadow-indigo-950/50"
                >
                  Analyser mon investissement
                  <ArrowRight className="size-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={goToProduct}
                  disabled={isLoading}
                  className="rounded-xl border-slate-200 dark:border-slate-700"
                >
                  <BarChart3 className="size-4" />
                  Voir le tableau de bord
                </Button>
              </div>

              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
                {["12 types d'investissement", "144 zones de marché", "Rapport PDF inclus"].map((t) => (
                  <span key={t} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    <CheckCircle2 className="size-3.5 text-emerald-500" />
                    {t}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* KPI preview */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="relative"
            >
              <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/70 p-5 shadow-2xl shadow-slate-200/60 backdrop-blur-xl dark:shadow-black/40 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Résultat d'analyse
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                      Appartement locatif · Sousse
                    </p>
                  </div>
                  <div className="flex size-16 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
                    <span className="text-xl font-black leading-none">94</span>
                    <span className="text-[9px] font-semibold opacity-80">/ 100</span>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  {[
                    { label: "Rentabilité nette", value: "6,42%", icon: Percent, tone: "text-emerald-600 dark:text-emerald-400" },
                    { label: "Cash-flow / mois", value: "780 TND", icon: Wallet, tone: "text-indigo-600 dark:text-indigo-400" },
                    { label: "ROI à 10 ans", value: "82,4%", icon: LineChart, tone: "text-violet-600 dark:text-violet-400" },
                    { label: "Capital récupéré", value: "9,4 ans", icon: CalendarClock, tone: "text-blue-600 dark:text-blue-400" },
                  ].map((k) => (
                    <div
                      key={k.label}
                      className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 px-3 py-3"
                    >
                      <div className="flex items-center gap-1.5">
                        <k.icon className={`size-3.5 ${k.tone}`} />
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                          {k.label}
                        </span>
                      </div>
                      <p className="mt-1 text-base font-black text-slate-900 dark:text-slate-100">
                        {k.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-2xl border border-emerald-200/70 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/25 px-4 py-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                    <ShieldCheck className="size-3.5" /> Excellent investissement
                  </p>
                  <p className="mt-1 text-[10px] leading-relaxed text-emerald-700/80 dark:text-emerald-300/80">
                    Rendement supérieur à la cible de marché · cash-flow positif · appréciation
                    annuelle estimée à 6,5%.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
            Moteur d'analyse
          </span>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
            Un conseiller financier et immobilier intelligent
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Tous les indicateurs, prévisions et recommandations nécessaires pour décider en
            connaissance de cause.
          </p>
        </motion.div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              {...fadeUp}
              transition={{ duration: 0.45, delay: (i % 4) * 0.06 }}
              className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-indigo-300 dark:hover:border-indigo-800 hover:shadow-xl hover:shadow-indigo-100/50 dark:hover:shadow-indigo-950/30"
            >
              <div
                className={`flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg transition-transform duration-300 group-hover:scale-110 ${ACCENTS[f.accent]}`}
              >
                <f.icon className="size-5" />
              </div>
              <h3 className="mt-4 text-sm font-bold text-slate-900 dark:text-slate-100">
                {f.title}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {f.text}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══ INDICATORS ═══ */}
      <section
        id="indicators"
        className="border-y border-slate-200/70 dark:border-slate-800/70 bg-white/60 dark:bg-slate-900/40"
      >
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <motion.div {...fadeUp}>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
                Indicateurs financiers
              </span>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
                Calculé automatiquement, sans tableur
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                Le moteur déroule l'ensemble de la chaîne financière : coûts d'acquisition, revenus
                locatifs, charges, fiscalité, financement, puis en déduit la rentabilité et le ROI.
              </p>
              <ul className="mt-6 space-y-2.5">
                {INDICATORS.map((it) => (
                  <li key={it.label} className="flex items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                      <it.icon className="size-4 text-indigo-600 dark:text-indigo-400" />
                    </span>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {it.label}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.1 }}>
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-indigo-600 to-violet-700 p-6 text-white shadow-2xl shadow-indigo-200/50 dark:shadow-indigo-950/40 sm:p-8">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">
                  Exemple de calcul
                </p>
                <div className="mt-4 space-y-3">
                  {[
                    { label: "Investissement total", value: "420 000 TND" },
                    { label: "Revenu net annuel", value: "42 000 TND" },
                    { label: "Temps de récupération", value: "10 ans" },
                  ].map((r) => (
                    <div
                      key={r.label}
                      className="flex items-center justify-between border-b border-white/15 pb-3 last:border-0"
                    >
                      <span className="text-xs text-white/80">{r.label}</span>
                      <span className="text-sm font-black tabular-nums">{r.value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
                  <p className="text-[11px] leading-relaxed text-white/90">
                    ROI = (Bénéfice net / Investissement total) × 100 — calculé sur 1 an, 5 ans et
                    10 ans, appréciation du bien incluse.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══ TYPES & SCÉNARIOS ═══ */}
      <section id="scenarios" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
            12 types d'investissement, 3 scénarios
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Du studio au projet immobilier neuf, chaque actif est modélisé avec son propre profil de
            risque, de rendement et de valorisation.
          </p>
        </motion.div>

        <motion.div {...fadeUp} className="mt-8 flex flex-wrap justify-center gap-2">
          {Object.values(INVESTMENT_TYPE_LABELS).map((label) => (
            <Badge
              key={label}
              variant="outline"
              className="rounded-full border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300"
            >
              {label}
            </Badge>
          ))}
        </motion.div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {SCENARIOS.map((s, i) => (
            <motion.div
              key={s.label}
              {...fadeUp}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className={`rounded-2xl border p-5 ${SCENARIO_TONE[s.tone]}`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">
                Scénario {s.label}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] opacity-70">Occupation</p>
                  <p className="text-lg font-black">{s.occupancy}</p>
                </div>
                <div>
                  <p className="text-[10px] opacity-70">Croissance an.</p>
                  <p className="text-lg font-black">{s.growth}</p>
                </div>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed opacity-80">{s.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══ PERSONAS ═══ */}
      <section
        id="personas"
        className="border-y border-slate-200/70 dark:border-slate-800/70 bg-white/60 dark:bg-slate-900/40"
      >
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
              Conçu pour tous les profils
            </h2>
          </motion.div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {PERSONAS.map((p, i) => (
              <motion.div
                key={p.label}
                {...fadeUp}
                transition={{ duration: 0.45, delay: i * 0.05 }}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 text-center"
              >
                <span className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/40">
                  <p.icon className="size-5 text-indigo-600 dark:text-indigo-400" />
                </span>
                <h3 className="mt-3 text-xs font-bold text-slate-900 dark:text-slate-100">
                  {p.label}
                </h3>
                <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  {p.text}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
        <motion.div
          {...fadeUp}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700 px-6 py-12 text-center shadow-2xl shadow-indigo-200/50 dark:shadow-indigo-950/40 sm:px-12 sm:py-16"
        >
          <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-white/10 blur-3xl" />
          <h2 className="relative text-2xl font-black tracking-tight text-white sm:text-4xl">
            Votre prochain investissement mérite une analyse chiffrée
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/85">
            Créez votre analyse en 2 minutes et obtenez le ROI, le cash-flow, la durée
            d'amortissement et le score IA de votre projet.
          </p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Button
              size="lg"
              onClick={() =>
                navigate(isAuthenticated ? "/invest/new" : "/auth?returnTo=%2Finvest%2Fnew")
              }
              className="rounded-xl bg-white text-indigo-700 hover:bg-white/90"
            >
              <Sparkles className="size-4" />
              Lancer une analyse
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={goToProduct}
              className="rounded-xl border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              Explorer le tableau de bord
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </motion.div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-6">
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            © {new Date().getFullYear()} baticost AI — Module Investissement · Marché tunisien 2026
          </p>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="h-8 text-[11px] text-slate-400 hover:text-indigo-600">
              Estimation immobilière
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/providers")} className="h-8 text-[11px] text-slate-400 hover:text-indigo-600">
              Professionnels
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
