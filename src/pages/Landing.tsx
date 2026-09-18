import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, Building2, Calculator, Camera, FileText, Handshake,
  Home, MapPin, Star, TrendingUp, CheckCircle2, ChevronRight, ChevronDown,
  Menu, X, Sparkles, Quote, Mail, Heart, Zap, Clock, Search,
  BedDouble, Megaphone, Wallet, CalendarDays, ShieldCheck, Activity,
  QrCode, Bell, Scale, HardHat, Eye, BadgeCheck,
} from "lucide-react";
import {
  motion, useScroll, useMotionValueEvent, AnimatePresence,
} from "framer-motion";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useRef, useState, type ReactNode } from "react";

import logo from "@/assets/logo.svg";

/* ── Animations ── */
const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
};
const staggerContainer = {
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport: { once: true },
  transition: { staggerChildren: 0.07 },
};
const staggerItem = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
};

/* ── Counter ── */
function Counter({ end, suffix = "", label }: { end: number; suffix?: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [display, setDisplay] = useState("0");
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (!ref.current || hasAnimated) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          let step = 0;
          const t = setInterval(() => {
            step++;
            const ease = 1 - Math.pow(1 - step / 35, 3);
            setDisplay(`${Math.round(end * ease).toLocaleString("fr-FR")}${suffix}`);
            if (step >= 35) clearInterval(t);
          }, 40);
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, suffix, hasAnimated]);

  return (
    <div ref={ref} className="text-center">
      <p className="gradient-text font-display text-3xl font-black tracking-tight tabular-nums sm:text-4xl">{display}</p>
      <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

/* ── Section label ── */
const pillColors: Record<string, string> = {
  emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  violet: "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  indigo: "border-indigo-500/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  amber: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  rose: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  sky: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  teal: "border-teal-500/20 bg-teal-500/10 text-teal-700 dark:text-teal-300",
};

function SectionPill({ children, color = "emerald" }: { children: ReactNode; color?: string }) {
  return (
    <span className={`mb-5 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] ${pillColors[color] ?? pillColors.emerald}`}>
      <Sparkles className="size-3" />{children}
    </span>
  );
}

/* ── FAQ Data ── */
const faqs = [
  {
    q: "Comment fonctionne l'estimation ?",
    a: "Notre IA croise les caractéristiques de votre bien (surface, type, état, équipements), les photos importées et les données du marché tunisien par gouvernorat, ville et quartier. Elle produit une valeur estimée avec une fourchette de prix et un indice de confiance.",
  },
  {
    q: "Est-ce vraiment gratuit ?",
    a: "Oui : l'estimation de vente est offerte, sans carte bancaire, avec analyse IA des photos et rapport détaillé.",
  },
  {
    q: "Puis-je estimer un loyer ou seulement une vente ?",
    a: "Les deux. Estimez la valeur de vente/achat de plus de 20 types de biens, ou le loyer de votre bien : loyer mensuel longue durée, ou location saisonnière par nuitée avec tarifs par saison, rendement annuel et prévisions sur 6, 12 et 24 mois.",
  },
  {
    q: "Puis-je partager mon estimation ?",
    a: "Oui. Chaque estimation génère un rapport professionnel PDF avec graphiques d'évolution, carte de localisation, comparaison avec des biens similaires et un QR code permettant de consulter le rapport en ligne.",
  },
  {
    q: "Que se passe-t-il après l'estimation ?",
    a: "Vous pouvez être mis en relation avec des agences immobilières, notaires, experts, géomètres et artisans partenaires de votre région, et publier directement une annonce préremplie par l'IA avec le prix conseillé.",
  },
];

const navLinks = [
  { href: "#features", label: "Solutions" },
  { href: "#how-it-works", label: "Fonctionnement" },
  { href: "#invest", label: "Location" },
];

const featuresData = [
  { icon: Activity, title: "IA prédictive", desc: "Prix moyens au m², transactions comparables et tendances du marché tunisien 2026 : une estimation fiable avec indice de confiance.", color: "from-emerald-500 to-teal-600", chip: "Vente & achat", tint: "emerald" },
  { icon: Camera, title: "Analyse visuelle", desc: "Importez vos photos : l'IA détecte la qualité des finitions, l'état général et les équipements visibles du bien.", color: "from-sky-500 to-cyan-600", chip: "Import & IA", tint: "sky" },
  { icon: Wallet, title: "Estimation de loyer", desc: "Loyer mensuel recommandé, fourchette, rendement annuel et tarif par nuitée pour la location saisonnière.", color: "from-teal-500 to-emerald-600", chip: "Mensuel & nuitée", tint: "teal", cta: "/estimate/loyer/new", ctaLabel: "Estimer un loyer" },
  { icon: FileText, title: "Rapports professionnels", desc: "Rapport PDF complet avec graphiques d'évolution, carte de localisation et QR code consultable en ligne.", color: "from-rose-500 to-pink-600", chip: "PDF + QR code", tint: "rose" },
  { icon: Handshake, title: "Mise en relation", desc: "Agences, notaires, experts et géomètres partenaires recommandés selon la région de votre bien.", color: "from-amber-500 to-orange-600", chip: "Professionnels", tint: "amber" },
  { icon: Megaphone, title: "Publication d'annonce", desc: "Publiez votre bien directement : annonce préremplie, description générée par l'IA et prix conseillé.", color: "from-sky-500 to-blue-600", chip: "Optionnel", tint: "sky" },
  { icon: Scale, title: "Comparaison de biens", desc: "Comparez plusieurs biens côte à côte : prix au m², équipements, quartier — pour décider en toute connaissance.", color: "from-indigo-500 to-violet-600", chip: "Comparaison", tint: "indigo" },
  { icon: Bell, title: "Alertes de prix", desc: "Créez une alerte sur un quartier ou un type de bien : soyez prévenu dès qu'une opportunité apparaît.", color: "from-amber-500 to-yellow-600", chip: "Suivi du marché", tint: "amber" },
  { icon: TrendingUp, title: "Moteur BIM 2026", desc: "24 gouvernorats, 264 délégations, 2 073 quartiers calibrés : neuf vs ancien, décote de négociation et prime de meublé.", color: "from-violet-500 to-purple-600", chip: "IA", tint: "violet" },
];

const steps = [
  { icon: Search, title: "Décrivez", desc: "Adresse, type de bien, surfaces et équipements — en 2 minutes, sans saisie obligatoire des pièces.", color: "from-emerald-500 to-teal-600", tint: "emerald" },
  { icon: Camera, title: "Importez", desc: "Photos et documents : l'IA analyse finitions, état général et équipements visibles.", color: "from-sky-500 to-cyan-600", tint: "sky" },
  { icon: Calculator, title: "Estimez & valorisez", desc: "Valeur, fourchette, prix conseillés, rapport pro, mise en relation et annonce publiée.", color: "from-indigo-500 to-violet-600", tint: "indigo" },
];


const categories = [
  { label: "Maison", active: true, tint: "emerald" },
  { label: "Villa", tint: "teal" },
  { label: "Appartement", tint: "sky" },
  { label: "Terrain", tint: "amber" },
  { label: "Local commercial", tint: "indigo" },
  { label: "Bureau", tint: "rose" },
];

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [activeCat, setActiveCat] = useState(0);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 24));

  useEffect(() => {
    const h = () => { if (window.innerWidth >= 768) setMenuOpen(false); };
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setActiveStep((p) => (p + 1) % steps.length), 3800);
    return () => clearInterval(t);
  }, []);

  const goEstimate = (path: string) => {
    navigate(isAuthenticated ? path : `/auth?returnTo=${encodeURIComponent(path)}`);
  };

  return (
    <div className="min-h-screen bg-transparent font-sans text-slate-900 antialiased dark:text-slate-100">
      {/* ═══════════ HEADER ═══════════ */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled ? "glass-strong shadow-soft" : "border-b border-transparent bg-transparent"}`}
      >
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 lg:px-8">
          <button onClick={() => navigate("/")} className="group flex items-center gap-2.5" aria-label="baticost AI — accueil">
            <img src={logo} alt="baticost AI" width={36} height={36} className="size-9 rounded-xl shadow-soft transition-transform duration-200 group-hover:scale-105" />
            <span className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-50">
              <span className="gradient-text">bati</span>cost <span className="text-emerald-600 dark:text-emerald-400">AI</span>
            </span>
          </button>

          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href}
                className="rounded-lg px-3.5 py-2 text-[13px] font-medium text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >{l.label}</a>
            ))}
            <a href="#faq"
              className="rounded-lg px-3.5 py-2 text-[13px] font-medium text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >FAQ</a>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            {isAuthenticated ? (
              <Button onClick={() => navigate("/dashboard")}
                className="h-9 rounded-md bg-emerald-600 px-4 text-xs font-semibold text-white shadow-soft transition-all hover:bg-emerald-700"
              >Mon espace</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/auth")}
                  className="h-9 rounded-md px-3.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >Connexion</Button>
                <Button onClick={() => navigate("/auth")}
                  className="h-9 rounded-md bg-emerald-600 px-4 text-xs font-semibold text-white shadow-soft shadow-emerald-600/20 transition-all hover:bg-emerald-700"
                >S'inscrire</Button>
              </>
            )}
          </div>

          <button className="relative z-50 flex md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            <div className="flex size-9 items-center justify-center rounded-xl bg-slate-100 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700">
              {menuOpen ? <X className="size-5 text-slate-700 dark:text-slate-200" /> : <Menu className="size-5 text-slate-700 dark:text-slate-200" />}
            </div>
          </button>
        </nav>
      </motion.header>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="absolute right-0 top-0 h-full w-80 max-w-[85vw] border-l border-slate-200 bg-white/95 shadow-2xl backdrop-blur-2xl dark:border-slate-800 dark:bg-slate-950/95"
            >
              <div className="flex flex-col gap-1 px-6 pt-24">
                {[...navLinks, { href: "#faq", label: "FAQ" }].map((l, i) => (
                  <motion.a key={l.href} href={l.href}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.04 * i }}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-between rounded-xl px-4 py-3.5 text-sm font-medium text-slate-600 transition-all hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-300 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300"
                  >{l.label}<ChevronRight className="size-4 text-slate-400" /></motion.a>
                ))}
              </div>
              <div className="mt-8 space-y-3 border-t border-slate-200/70 px-6 pt-6 dark:border-slate-800">
                <Button onClick={() => { setMenuOpen(false); goEstimate("/estimate/new"); }}
                  className="h-11 w-full rounded-md bg-emerald-600 text-sm font-semibold text-white shadow-soft transition-all hover:bg-emerald-700"
                >Estimer mon bien <ArrowRight className="ml-2 size-4" /></Button>
                <Button variant="outline" onClick={() => { setMenuOpen(false); navigate("/auth"); }}
                  className="h-11 w-full rounded-md border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >Se connecter</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-44 right-[-12%] h-[640px] w-[640px] rounded-full bg-emerald-400/10 blur-3xl dark:bg-emerald-500/10" />
          <div className="absolute -bottom-48 left-[-12%] h-[560px] w-[560px] rounded-full bg-sky-400/10 blur-3xl dark:bg-sky-500/10" />
          <div className="absolute left-1/2 top-1/3 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-violet-400/5 blur-3xl dark:bg-violet-500/10" />
        </div>

        <div className="relative mx-auto w-full max-w-7xl px-5 pb-16 pt-32 text-center lg:px-8 lg:pt-40">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="flex justify-center"
          >
            <SectionPill color="violet">Moteur IA immobilier · Tunisie</SectionPill>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto max-w-4xl text-4xl font-black leading-[1.08] tracking-tight text-slate-900 dark:text-slate-50 sm:text-5xl lg:text-6xl"
          >
            Connaissez la <span className="gradient-text">vraie valeur</span> de votre bien,{" "}
            <span className="relative whitespace-nowrap">
              avant de vendre
              <svg className="absolute -bottom-2 left-0 h-3 w-full text-emerald-400/70" viewBox="0 0 200 12" fill="none" preserveAspectRatio="none" aria-hidden="true">
                <path d="M2 9C50 3 150 3 198 8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </span>
          </motion.h1>

          {/* Pills de verbes colorés */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-7 flex flex-wrap items-center justify-center gap-2"
          >
            {[
              { label: "Vendre", cls: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
              { label: "Acheter", cls: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300" },
              { label: "Louer", cls: "border-teal-500/25 bg-teal-500/10 text-teal-700 dark:text-teal-300" },
            ].map((v) => (
              <span key={v.label} className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold ${v.cls}`}>{v.label}</span>
            ))}
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.28 }}
            className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-500 dark:text-slate-400 sm:text-lg"
          >
            Estimez la valeur de vente ou le loyer de votre bien en quelques minutes.
            L'IA analyse le marché tunisien — gouvernorat par gouvernorat — et vous livre
            une estimation fiable avec fourchette de prix, indice de confiance et prix conseillés.
          </motion.p>

          {/* 3 CTA */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.36 }}
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Button onClick={() => goEstimate("/estimate/new")}
              className="group h-12 w-full overflow-hidden rounded-md bg-gradient-to-r from-emerald-600 to-emerald-500 px-7 text-sm font-bold text-white shadow-[0_8px_20px_-8px_rgba(16,185,129,0.55)] transition-all duration-200 hover:brightness-110 hover:shadow-[0_10px_26px_-8px_rgba(16,185,129,0.7)] sm:w-auto"
            >
              <span className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-[100%]" />
              <Home className="mr-2 inline size-4" /> Estimer mon bien à vendre
            </Button>
            <Button variant="outline" onClick={() => goEstimate("/estimate/loyer/new")}
              className="h-12 w-full rounded-md border-slate-300 bg-white/70 px-6 text-sm font-semibold text-slate-700 shadow-soft backdrop-blur transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 sm:w-auto"
            >
              <Wallet className="mr-2 inline size-4" /> Estimer un loyer
            </Button>
            <button onClick={() => goEstimate("/estimate/demo")}
              className="group inline-flex items-center gap-1.5 px-2 py-2 text-sm font-semibold text-slate-600 transition-colors hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-300"
            >
              <Eye className="size-4" /> Voir un exemple <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.44 }}
            className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2"
          >
            <span className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />3 estimations offertes / mois</span>
            <span className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />Rapport PDF + QR code</span>
            <span className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />24 gouvernorats couverts</span>
          </motion.div>

          {/* Mockup glass */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative mx-auto mt-14 max-w-3xl"
          >
            <div className="absolute -inset-8 rounded-[2.5rem] bg-gradient-to-b from-emerald-300/20 via-sky-200/10 to-violet-300/20 blur-2xl dark:from-emerald-500/10 dark:via-sky-500/10 dark:to-violet-500/10" />

            {/* Floating chips */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.85 }}
              className="absolute -top-5 right-6 z-20 flex items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-white/95 px-3.5 py-2.5 shadow-soft-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95"
            >
              <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-600">
                <QrCode className="size-4 text-white" />
              </div>
              <div className="text-left">
                <p className="text-[11px] font-bold text-slate-800 dark:text-slate-100">Rapport PDF prêt</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Partage par QR code</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="absolute -bottom-5 left-6 z-20 flex items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-white/95 px-3.5 py-2.5 shadow-soft-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95"
            >
              <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500">
                <Handshake className="size-4 text-white" />
              </div>
              <div className="text-left">
                <p className="text-[11px] font-bold text-slate-800 dark:text-slate-100">3 partenaires recommandés</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Agences · Sousse</p>
              </div>
            </motion.div>

            {/* Fenêtre navigateur */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80 shadow-soft-lg backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/80">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/60">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="size-2.5 rounded-full bg-red-400" />
                    <span className="size-2.5 rounded-full bg-amber-400" />
                    <span className="size-2.5 rounded-full bg-emerald-400" />
                  </div>
                </div>
                <div className="mx-auto flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/80 px-3.5 py-1 text-[10px] font-medium text-slate-400 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-400">
                  <ShieldCheck className="size-3 text-emerald-500" /> baticost.tn/estimation
                </div>
                <div className="flex size-5 items-center justify-center">
                  <HardHat className="size-3.5 text-emerald-500" />
                </div>
              </div>

              <div className="space-y-5 p-5 text-left sm:p-6">
                {/* Vente block */}
                <div>
                  <div className="flex items-center justify-between">
                    <p className="micro-label text-emerald-600 dark:text-emerald-400">Vente · Villa moderne</p>
                    <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                      <TrendingUp className="size-3" /> +12% vs marché
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-end justify-between gap-3">
                    <div>
                      <p className="font-display text-3xl font-black tracking-tight text-slate-900 tabular-nums dark:text-slate-50 sm:text-4xl">
                        520 000 <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">TND</span>
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <MapPin className="size-3" /> Sousse · 180 m² · 92% confiance
                      </p>
                    </div>
                    <div className="flex h-14 items-end gap-1.5" aria-hidden="true">
                      {[35, 48, 42, 60, 55, 72, 68, 88, 100].map((h, i) => (
                        <div key={i} className={`w-2 rounded-t ${i === 8 ? "bg-gradient-to-t from-emerald-600 to-emerald-400" : "bg-slate-200 dark:bg-slate-700"}`} style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {["Fourchette 495k – 545k", "Vente rapide : 480k", "Rendement : 5,8%"].map((t) => (
                      <span key={t} className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">{t}</span>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-700" />

                {/* Location block */}
                <div>
                  <div className="flex items-center justify-between">
                    <p className="micro-label text-teal-600 dark:text-teal-400">Location · Maison meublée</p>
                    <span className="flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-[10px] font-semibold text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
                      <CalendarDays className="size-3" /> Mensuel + nuitée
                    </span>
                  </div>
                  <div className="mt-1.5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100 dark:bg-slate-800/60 dark:ring-slate-700/60">
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Loyer mensuel</p>
                      <p className="font-display text-xl font-black tracking-tight text-slate-900 tabular-nums dark:text-slate-50">1 560 <span className="text-xs font-bold text-teal-600 dark:text-teal-400">TND/mois</span></p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100 dark:bg-slate-800/60 dark:ring-slate-700/60">
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Nuitée saisonnière</p>
                      <p className="font-display text-xl font-black tracking-tight text-slate-900 tabular-nums dark:text-slate-50">210 <span className="text-xs font-bold text-teal-600 dark:text-teal-400">TND/nuit</span></p>
                    </div>
                  </div>
                  <p className="mt-2.5 text-[11px] text-slate-500 dark:text-slate-400">
                    Nabeul · 120 m² · proche plage — revenu annuel estimé <span className="font-bold text-emerald-600 dark:text-emerald-400">28 400 TND</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Chips de catégories */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 }}
              className="mt-6 flex flex-wrap items-center justify-center gap-2"
            >
              {categories.map((c, i) => (
                <button
                  key={c.label}
                  onClick={() => setActiveCat(i)}
                  className={`rounded-full border px-3.5 py-1.5 text-[11px] font-semibold transition-all duration-200 ${
                    i === activeCat
                      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "border-slate-200 bg-white/60 text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  <BadgeCheck className={`mr-1 inline size-3 ${i === activeCat ? "text-emerald-600 dark:text-emerald-400" : "text-slate-300 dark:text-slate-600"}`} />
                  {c.label}
                </button>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════ STATS ═══════════ */}
      <section id="stats" className="relative border-y border-slate-200/70 bg-white/70 py-12 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/50">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <motion.div
            variants={staggerContainer} initial="initial" whileInView="whileInView" viewport={{ once: true }}
            className="grid grid-cols-2 gap-8 md:grid-cols-4"
          >
            {[
              { end: 24, label: "Gouvernorats couverts" },
              { end: 15000, suffix: "+", label: "Biens estimés" },
              { end: 95, suffix: "%", label: "Estimations jugées fiables" },
              { end: 5, suffix: " min", label: "Estimation express" },
            ].map((s) => (
              <motion.div key={s.label} variants={staggerItem}>
                <Counter end={s.end} suffix={s.suffix || ""} label={s.label} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════ HOW IT WORKS — 3 étapes auto-rotatives ═══════════ */}
      <section id="how-it-works" className="relative py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <motion.div {...fadeUp} className="text-center">
            <SectionPill color="emerald">Fonctionnement</SectionPill>
            <h2 className="mx-auto max-w-2xl text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
              3 étapes, <span className="gradient-text">5 minutes</span>
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-base text-slate-500 dark:text-slate-400">
              Un processus simple et rapide, de la saisie du bien jusqu'à la mise en valeur.
            </p>
          </motion.div>

          <div className="relative mt-14 grid gap-5 md:grid-cols-3">
            <div className="absolute left-1/2 top-10 hidden h-0.5 w-[calc(100%-10rem)] -translate-x-1/2 bg-gradient-to-r from-transparent via-emerald-300/60 to-transparent md:block" aria-hidden="true" />
            {steps.map((s, i) => {
              const active = i === activeStep;
              return (
                <motion.button
                  key={s.title}
                  onClick={() => setActiveStep(i)}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className={`relative rounded-2xl border p-6 text-left transition-all duration-300 ${
                    active
                      ? "border-emerald-300/70 bg-emerald-50/70 shadow-soft-lg dark:border-emerald-700/60 dark:bg-emerald-950/40"
                      : "border-slate-200 bg-white/80 hover:border-slate-300 hover:shadow-soft dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`relative z-10 flex size-14 items-center justify-center rounded-xl bg-gradient-to-br ${s.color} shadow-soft transition-transform duration-300 ${active ? "scale-105" : ""}`}>
                      <s.icon className="size-6 text-white" />
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${active ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>
                      Étape {i + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-slate-50">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{s.desc}</p>
                  {active && (
                    <div className="mt-4 h-1 overflow-hidden rounded-full bg-emerald-200/60 dark:bg-emerald-900/60" aria-hidden="true">
                      <motion.div
                        key={activeStep}
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 3.8, ease: "linear" }}
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                      />
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════ FEATURES — 9 modules ═══════════ */}
      <section id="features" className="relative border-y border-slate-200/70 bg-white/70 py-20 backdrop-blur-sm lg:py-28 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-40 top-1/4 h-[420px] w-[420px] rounded-full bg-emerald-300/10 blur-3xl dark:bg-emerald-500/10" />
          <div className="absolute -right-40 bottom-1/4 h-[420px] w-[420px] rounded-full bg-sky-300/10 blur-3xl dark:bg-sky-500/10" />
        </div>
        <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
          <motion.div {...fadeUp} className="text-center">
            <SectionPill color="emerald">Solutions</SectionPill>
            <h2 className="mx-auto max-w-2xl text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
              Tout pour estimer, vendre, acheter et <span className="gradient-text">louer</span>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-slate-500 dark:text-slate-400">
              Une plateforme unique qui accompagne votre bien de l'estimation à la mise en vente
              ou en location — propulsée par l'intelligence artificielle.
            </p>
          </motion.div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {featuresData.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (i % 3) * 0.1, duration: 0.5 }}
                onClick={f.cta ? () => goEstimate(f.cta) : undefined}
                className={`group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-soft backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/5 dark:border-slate-800 dark:bg-slate-900/80 ${f.cta ? "cursor-pointer" : ""}`}
              >
                <div className={`absolute -inset-1 bg-gradient-to-r ${f.color} opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-[0.07]`} />
                <div className="relative">
                  <div className="flex items-start justify-between">
                    <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${f.color} shadow-soft transition-transform duration-200 group-hover:scale-105`}>
                      <f.icon className="size-5 text-white" />
                    </div>
                    <Badge variant="outline" className={`rounded-full border px-2.5 py-0.5 text-[9px] font-semibold ${pillColors[f.tint] ?? pillColors.emerald}`}>
                      {f.chip}
                    </Badge>
                  </div>
                  <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-slate-50">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{f.desc}</p>
                  {f.cta && (
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-600 opacity-70 transition-all group-hover:translate-x-0.5 group-hover:opacity-100 dark:text-emerald-400">
                      {f.ctaLabel || "En savoir plus"} <ArrowRight className="size-3" />
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ LOYER & LOCATION SAISONNIÈRE ═══════════ */}
      <section id="invest" className="relative overflow-hidden py-20 lg:py-28">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-40 top-1/3 h-[480px] w-[480px] rounded-full bg-indigo-300/10 blur-3xl dark:bg-indigo-500/10" />
          <div className="absolute -left-40 bottom-0 h-[400px] w-[400px] rounded-full bg-teal-300/10 blur-3xl dark:bg-teal-500/10" />
        </div>
        <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <motion.div {...fadeUp}>
              <SectionPill color="indigo">Loyers & location</SectionPill>
              <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
                Loyer mensuel ou location saisonnière, <span className="gradient-text">l'IA fixe le bon prix</span>
              </h2>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-500 dark:text-slate-400">
                Optimisez votre revenu locatif en Tunisie : prix du loyer mensuel, tarif par nuitée
                selon les saisons, taux d'occupation et rendement annuel brut — avec des prévisions
                de marché sur 6, 12 et 24 mois.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Loyer mensuel longue durée avec fourchette conseillée",
                  "Nuitée saisonnière : haute, moyenne et basse saison",
                  "Rendement annuel et revenu estimé par saison",
                  "Détection automatique des zones touristiques (Djerba, Hammamet, Nabeul…)",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                    <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/60">
                      <CheckCircle2 className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    {t}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button onClick={() => goEstimate("/estimate/loyer/new")}
                  className="h-12 rounded-md bg-gradient-to-r from-emerald-600 to-teal-600 px-6 text-sm font-bold text-white shadow-[0_8px_20px_-8px_rgba(16,185,129,0.55)] transition-all duration-200 hover:brightness-110"
                >
                  <BedDouble className="mr-2 inline size-4" /> Estimer mon loyer
                </Button>
                <Button variant="ghost" onClick={() => goEstimate("/estimate/loyer/demo")}
                  className="h-12 rounded-md px-4 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
                >
                  Voir un exemple <ArrowRight className="ml-2 size-4" />
                </Button>
              </div>
            </motion.div>

            {/* Carte de prix saisonniers */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="relative"
            >
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-b from-indigo-300/20 to-emerald-200/10 blur-2xl dark:from-indigo-500/10 dark:to-emerald-500/10" />
              <div className="relative rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-soft-lg backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-50">Maison meublée · Nabeul</p>
                    <p className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400"><MapPin className="size-3" /> Zone touristique · 120 m²</p>
                  </div>
                  <div className="rounded-xl bg-indigo-50 px-3 py-1.5 text-right dark:bg-indigo-950/60">
                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400">Revenu annuel</p>
                    <p className="font-display text-lg font-black tracking-tight text-indigo-800 tabular-nums dark:text-indigo-300">28 400 TND</p>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  {[
                    { season: "Haute saison", months: "Juin – Sept.", nights: 122, price: 240, occupancy: 78, best: true },
                    { season: "Moyenne saison", months: "Avr. – Mai · Oct.", nights: 122, price: 150, occupancy: 55, best: false },
                    { season: "Basse saison", months: "Nov. – Mars", nights: 121, price: 110, occupancy: 40, best: false },
                  ].map((s) => (
                    <div key={s.season} className={`rounded-xl border p-3.5 transition-colors ${s.best ? "border-indigo-200 bg-indigo-50/60 dark:border-indigo-800/60 dark:bg-indigo-950/40" : "border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/40"}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{s.season}</p>
                          {s.best && (
                            <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[9px] font-bold text-white">LA PLUS RENTABLE</span>
                          )}
                        </div>
                        <p className="font-display text-base font-black tracking-tight text-slate-900 tabular-nums dark:text-slate-50">{s.price} <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">TND/nuit</span></p>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                        <span>{s.months}</span>
                        <span>·</span>
                        <span>Occup. {s.occupancy}%</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                        <div className={`h-full rounded-full ${s.best ? "bg-gradient-to-r from-indigo-500 to-emerald-500" : "bg-slate-400/60"}`} style={{ width: `${s.occupancy}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <Zap className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" /> L'IA détecte automatiquement le potentiel touristique de votre zone.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════ TESTIMONIALS ═══════════ */}
      <section id="testimonials" className="relative py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <motion.div {...fadeUp} className="text-center">
            <SectionPill color="rose">Témoignages</SectionPill>
            <h2 className="mx-auto max-w-2xl text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
              Ils nous font <span className="gradient-text">confiance</span>
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-base text-slate-500 dark:text-slate-400">Des milliers de Tunisiens utilisent déjà baticost AI.</p>
          </motion.div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              { name: "Ahmed Ben Salem", role: "Propriétaire · Tunis", text: "J'ai estimé ma villa en 2 minutes et l'ai vendue en 2 semaines, au juste prix. La fourchette m'a évité de brader mon bien.", rating: 5 },
              { name: "Sonia Meherzi", role: "Agent immobilier · Sousse", text: "Les rapports PDF avec QR code impressionnent mes clients. C'est devenu notre argument de vente numéro un.", rating: 5 },
              { name: "Karim Trabelsi", role: "Investisseur locatif · Djerba", text: "L'estimation par nuitée m'a permis d'optimiser ma location saisonnière : +40% de revenus la première année.", rating: 5 },
            ].map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className="group rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-soft transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/5 dark:border-slate-800 dark:bg-slate-900/80"
              >
                <Quote className="mb-3 size-6 text-emerald-200 dark:text-emerald-800" />
                <div className="mb-3 flex gap-0.5">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="size-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">"{t.text}"</p>
                <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <div className="flex size-9 items-center justify-center rounded-full bg-emerald-600/10 text-xs font-bold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-50">{t.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ FAQ ═══════════ */}
      <section id="faq" className="relative border-t border-slate-200/70 bg-white/70 py-20 backdrop-blur-sm lg:py-28 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="mx-auto max-w-3xl px-5 lg:px-8">
          <motion.div {...fadeUp} className="text-center">
            <SectionPill color="sky">FAQ</SectionPill>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">Questions fréquentes</h2>
          </motion.div>
          <div className="mt-10 space-y-3">
            {faqs.map((faq, i) => <FaqItem key={i} {...faq} index={i} />)}
          </div>
        </div>
      </section>

      {/* ═══════════ CTA sombre ═══════════ */}
      <section id="contact" className="relative px-5 py-20 lg:px-8 lg:py-28">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-700 via-emerald-800 to-green-900 px-6 py-16 text-center shadow-soft-lg sm:px-12"
        >
          <div className="pointer-events-none absolute inset-0 dotted-watermark opacity-40" />
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-24 left-0 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          </div>
          <div className="relative">
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              <Zap className="size-3 text-emerald-300" /> Commencez maintenant — c'est gratuit
            </span>
            <h2 className="mx-auto max-w-2xl text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
              Prêt à connaître la valeur de votre bien ?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base text-emerald-100/80">
              Rejoignez les milliers de Tunisiens qui estiment, vendent et louent avec baticost AI.
              Vos 3 premières estimations sont offertes.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button onClick={() => goEstimate("/estimate/new")}
                className="group relative h-12 w-full overflow-hidden rounded-md bg-white px-8 text-sm font-bold text-emerald-700 shadow-soft-lg transition-all duration-200 hover:brightness-105 sm:w-auto"
              >
                <span className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-emerald-100/60 to-transparent transition-transform duration-700 group-hover:translate-x-[100%]" />
                <Calculator className="mr-2 inline size-4" /> Estimer mon bien <ArrowRight className="ml-2 inline size-4 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button variant="ghost" onClick={() => navigate(isAuthenticated ? "/dashboard" : "/auth")}
                className="h-12 w-full rounded-md px-6 text-sm font-semibold text-white/90 hover:bg-white/10 sm:w-auto"
              >Mon tableau de bord</Button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="border-t border-slate-200/70 bg-slate-50 py-12 dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2.5">
                <img src={logo} alt="baticost AI" width={32} height={32} className="size-8 rounded-lg shadow-soft" />
                <span className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-50">
                  <span className="gradient-text">bati</span>cost <span className="text-emerald-600 dark:text-emerald-400">AI</span>
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                Estimation immobilière pour la Tunisie : vente, achat et location.
              </p>
              <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500">
                <HardHat className="size-3.5 text-emerald-600 dark:text-emerald-400" /> Moteur BIM · 24 gouvernorats · 2 073 quartiers
              </p>
            </div>
            <div>
              <h4 className="micro-label text-slate-400 dark:text-slate-500">Plateforme</h4>
              <ul className="mt-3 space-y-2.5">
                {[
                  { label: "Solutions", href: "#features" },
                  { label: "Fonctionnement", href: "#how-it-works" },
                  { label: "Investissement locatif", href: "#invest" },
                ].map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="text-sm text-slate-500 transition-colors hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400"
                    >{l.label}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="micro-label text-slate-400 dark:text-slate-500">Professionnels</h4>
              <ul className="mt-3 space-y-2.5">
                <li>
                  <a href="/providers" onClick={(e) => { e.preventDefault(); navigate("/providers"); }}
                    className="text-sm text-slate-500 transition-colors hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400"
                  >Annuaire des agences</a>
                </li>
                <li>
                  <a href="/agencies" onClick={(e) => { e.preventDefault(); navigate("/agencies"); }}
                    className="text-sm text-slate-500 transition-colors hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400"
                  >Espace agence</a>
                </li>
                <li>
                  <a href="/agencies" onClick={(e) => { e.preventDefault(); navigate("/agencies"); }}
                    className="text-sm text-slate-500 transition-colors hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400"
                  >Devenir partenaire</a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="micro-label text-slate-400 dark:text-slate-500">Contact</h4>
              <ul className="mt-3 space-y-2.5">
                <li><a href="mailto:contact@baticost.tn" className="flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400"><Mail className="size-4" /> contact@baticost.tn</a></li>
                <li className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><MapPin className="size-4" /> Tunis, Tunisie</li>
                <li className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><Clock className="size-4" /> Support 7j/7</li>
              </ul>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-200/70 pt-6 sm:flex-row dark:border-slate-800">
            <p className="text-xs text-slate-400 dark:text-slate-500">&copy; {new Date().getFullYear()} baticost AI. Tous droits réservés.</p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-xs text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">Mentions légales</a>
              <a href="#" className="text-xs text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">Confidentialité</a>
              <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500"><Heart className="size-3 text-emerald-500 dark:text-emerald-400" /> Tunisia</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── FAQ Accordion ── */
function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      className="group rounded-xl border border-slate-200/80 bg-white/90 transition-all hover:border-emerald-200 hover:shadow-soft dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-emerald-800"
    >
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-5 py-4 text-left" aria-expanded={open}>
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{q}</span>
        <ChevronDown className={`size-4 shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180 text-emerald-600" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <p className="px-5 pb-4 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}