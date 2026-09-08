import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import {
  ArrowLeft, Building2, Home, KeyRound, TrendingUp, MapPin,
  Sparkles, Brain, FileText, BarChart3, CalendarClock, Wallet,
  Percent, Ruler, ChevronRight, ShieldCheck,
} from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
};

export default function EstimationHub() {
  const nav = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* ═══ HEADER ═══ */}
      <header className="sticky top-0 z-40 border-b border-slate-200/60 dark:border-gray-800/60 bg-white/70 dark:bg-gray-950/70 backdrop-blur-2xl shadow-xs">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <button onClick={() => nav("/dashboard")}
              className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors">
              <ArrowLeft className="size-3.5 sm:size-4" />
              <span>Tableau de bord</span>
            </button>
            <div className="flex items-center gap-2">
              <Badge className="rounded-full border-0 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 text-[10px] sm:text-xs font-semibold gap-1">
                <Brain className="size-3" /> BIM Engine
              </Badge>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* ═══ HERO ═══ */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 pt-8 sm:pt-12 pb-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/60 dark:border-blue-900/50 bg-blue-50/70 dark:bg-blue-950/30 px-3 py-1 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">
            <Sparkles className="size-3" /> Estimation par intelligence artificielle
          </span>
          <h1 className="mt-3 text-2xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Quelle opération <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 bg-clip-text text-transparent">immobilière</span> ?
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-xs sm:text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Choisissez votre module : estimez la valeur de vente de votre bien, ou
            calculez le loyer mensuel recommandé par notre expert immobilier virtuel.
          </p>
        </motion.div>
      </section>

      {/* ═══ CHOICE CARDS ═══ */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 pb-10">
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
          {/* ── VENTE / ACHAT ── */}
          <motion.button
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.4, delay: 0.05 }}
            onClick={() => nav("/estimate/new")}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 sm:p-7 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-200/40 dark:hover:shadow-blue-950/40 hover:border-blue-300 dark:hover:border-blue-800"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 opacity-70" />
            <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-gradient-to-br from-blue-100/70 to-indigo-100/40 dark:from-blue-900/20 dark:to-indigo-900/10 blur-2xl transition-all duration-500 group-hover:scale-125" />

            <div className="relative flex items-start justify-between gap-3">
              <div className="flex size-12 sm:size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-200/50 dark:shadow-blue-900/40 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                <Home className="size-6 sm:size-7 text-white" />
              </div>
              <Badge className="rounded-full border-0 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 text-[10px] font-semibold">
                Module 1
              </Badge>
            </div>

            <div className="relative mt-4 sm:mt-5">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                Estimation Vente / Achat
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                Connaissez la valeur marchande réelle de votre bien avant de le
                mettre en vente : prix au m², fourchette de prix, confiance IA et
                biens comparables.
              </p>
            </div>

            <ul className="relative mt-4 space-y-1.5">
              {["20 types de biens", "Analyse de photos par IA", "Rapport PDF professionnel"].map((f) => (
                <li key={f} className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-600 dark:text-slate-300">
                  <ShieldCheck className="size-3.5 text-blue-500 shrink-0" /> {f}
                </li>
              ))}
            </ul>

            <div className="relative mt-5 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400">
                Estimer ma valeur de vente
                <ChevronRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
              <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                <BarChart3 className="size-3.5" /> 24 gouvernorats
              </div>
            </div>
          </motion.button>

          {/* ── LOCATION ── */}
          <motion.button
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.4, delay: 0.12 }}
            onClick={() => nav("/estimate/loyer/new")}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 bg-gradient-to-b from-emerald-50/60 to-white dark:from-emerald-950/25 dark:to-slate-900/60 p-5 sm:p-7 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-200/50 dark:hover:shadow-emerald-950/40 hover:border-emerald-300 dark:hover:border-emerald-800"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 opacity-80" />
            <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-gradient-to-br from-emerald-100/80 to-teal-100/40 dark:from-emerald-900/25 dark:to-teal-900/10 blur-2xl transition-all duration-500 group-hover:scale-125" />

            <div className="relative flex items-start justify-between gap-3">
              <div className="flex size-12 sm:size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/40 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                <KeyRound className="size-6 sm:size-7 text-white" />
              </div>
              <Badge className="rounded-full border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-semibold">
                Nouveau · Module 2
              </Badge>
            </div>

            <div className="relative mt-4 sm:mt-5">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                Estimation de Location
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                Obtenez le loyer mensuel recommandé pour votre bien : fourchette
                locative, rendement annuel, prévisions 6/12/24 mois et conseils IA
                pour maximiser vos revenus.
              </p>
            </div>

            <ul className="relative mt-4 space-y-1.5">
              {["7 types de biens locatifs", "Prévisions d'évolution du loyer", "Rendement brut & comparables"].map((f) => (
                <li key={f} className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-600 dark:text-slate-300">
                  <TrendingUp className="size-3.5 text-emerald-500 shrink-0" /> {f}
                </li>
              ))}
            </ul>

            <div className="relative mt-5 flex items-center justify-between border-t border-emerald-100 dark:border-emerald-900/40 pt-4">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                Estimer mon loyer
                <ChevronRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
              <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                <Wallet className="size-3.5" /> TND / mois
              </div>
            </div>
          </motion.button>
        </div>

        {/* ── Module feature strip ── */}
        <motion.div
          variants={fadeUp}
          initial="initial"
          animate="animate"
          transition={{ duration: 0.4, delay: 0.24 }}
          className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {[
            { icon: Brain, label: "Moteur BIM Engine", sub: "Marché tunisien 2026" },
            { icon: Percent, label: "Rendement locatif", sub: "Calcul automatique" },
            { icon: CalendarClock, label: "Prévisions", sub: "6 · 12 · 24 mois" },
            { icon: FileText, label: "Rapport PDF", sub: "Expert virtuel" },
          ].map((s, i) => (
            <div key={s.label} className="flex items-start gap-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-900/40 px-3.5 py-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                <s.icon className="size-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">{s.label}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{s.sub}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 py-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 sm:flex-row sm:px-6">
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            © {new Date().getFullYear()} imoprice AI · {user?.email ?? ""}
          </p>
          <Button variant="ghost" size="sm" onClick={() => nav("/dashboard")}
            className="text-[11px] text-slate-400 hover:text-blue-600 h-8">
            <MapPin className="size-3 mr-1" /> Retour au tableau de bord
          </Button>
        </div>
      </footer>
    </div>
  );
}
