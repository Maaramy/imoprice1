import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AGENCY_SPECIALTIES, TUNISIA_REGIONS } from "@/convex/types";
import {
  Building, Building2, MapPin, Phone, Mail, Star, Search, Sparkles,
  ArrowRight, SlidersHorizontal, X, Loader2,
} from "lucide-react";
import logo from "@/assets/logo.svg";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router";
import { useMemo, useState } from "react";

export default function Providers() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const agencies = useQuery(api.agencies.getAllSubscribedAgencies);

  const [region, setRegion] = useState<string>("");
  const [specialty, setSpecialty] = useState<string>("");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const list = agencies || [];
    const q = query.trim().toLowerCase();
    return list.filter((a) => {
      if (region && !(a.regions || []).includes(region)) return false;
      if (specialty && !(a.specialties || []).includes(specialty)) return false;
      if (q) {
        const haystack = [a.name, a.address, ...(a.regions || []), ...(a.specialties || [])]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [agencies, region, specialty, query]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased">
      {/* ═══════════ HEADER ═══════════ */}
      <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/85 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 lg:px-8">
          <button onClick={() => navigate("/")} className="flex items-center gap-2.5 group">
            <img src={logo} alt="imoprice AI" width={36} height={36} className="size-9 rounded-xl shadow-lg shadow-blue-200/40" />
            <span className="text-base font-bold tracking-tight text-slate-800">
              <span className="text-blue-600">imo</span>price <span className="text-indigo-600">AI</span>
            </span>
          </button>

          <div className="hidden items-center gap-3 md:flex">
            <button
              onClick={() => navigate("/pricing")}
              className="rounded-lg px-3.5 py-2 text-[13px] font-medium text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-800"
            >
              Forfaits
            </button>
            {isAuthenticated ? (
              <Button onClick={() => navigate("/dashboard")}
                className="h-9 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 text-xs font-semibold text-white shadow-lg shadow-blue-200/40 transition-all hover:shadow-xl hover:from-blue-600 hover:to-indigo-700"
              >Dashboard</Button>
            ) : (
              <Button onClick={() => navigate("/auth")}
                className="h-9 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 text-xs font-semibold text-white shadow-lg shadow-blue-200/40 transition-all hover:shadow-xl hover:from-blue-600 hover:to-indigo-700"
              >Connexion</Button>
            )}
          </div>

          <Button onClick={() => navigate(isAuthenticated ? "/agencies" : "/auth")}
            className="h-9 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 text-xs font-semibold text-white shadow-lg shadow-amber-200/40 transition-all hover:shadow-xl hover:from-amber-600 hover:to-orange-600 md:hidden"
          >Espace agence</Button>
        </nav>
      </header>

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 right-0 h-[400px] w-[600px] rounded-full bg-gradient-to-br from-amber-100/60 via-orange-50/40 to-transparent blur-3xl" />
          <div className="absolute -bottom-40 -left-32 h-[400px] w-[500px] rounded-full bg-gradient-to-tr from-blue-100/50 to-indigo-50/30 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-5 py-12 sm:py-16 lg:px-8">
          <div className="max-w-2xl">
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-amber-200/60 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-700">
              <Sparkles className="size-3" /> Annuaire des professionnels
            </span>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              Les agences immobilières
              <br />
              <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-blue-600 bg-clip-text text-transparent">
                partenaires de imoprice AI
              </span>
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-slate-500 sm:text-base">
              Découvrez les agences vérifiées et abonnées sur notre plateforme,
              spécialisées dans votre région. Contactez-les directement pour
              vendre ou valoriser votre bien.
            </p>
          </div>

          {/* Search */}
          <div className="relative mt-8 max-w-xl">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une agence, une ville, une spécialité..."
              aria-label="Rechercher une agence"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-800 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          {/* Region chips */}
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={() => setRegion("")}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                !region
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Toutes régions
            </button>
            {TUNISIA_REGIONS.map((r) => (
              <button
                key={r}
                onClick={() => setRegion(region === r ? "" : r)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                  region === r
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Specialty chips */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-slate-400">
              <SlidersHorizontal className="size-3" /> Spécialité :
            </span>
            <button
              onClick={() => setSpecialty("")}
              className={`rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
                !specialty
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Toutes
            </button>
            {AGENCY_SPECIALTIES.map((s) => (
              <button
                key={s}
                onClick={() => setSpecialty(specialty === s ? "" : s)}
                className={`rounded-full px-3 py-1 text-[11px] font-medium capitalize transition-all ${
                  specialty === s
                    ? "bg-amber-500 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ LISTING ═══════════ */}
      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        {/* Result count */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            {agencies === undefined ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-3.5 animate-spin text-blue-500" />
                Chargement des agences...
              </span>
            ) : (
              <><span className="font-semibold text-slate-900">{filtered.length}</span> agence{filtered.length > 1 ? "s" : ""} trouvée{filtered.length > 1 ? "s" : ""}{region ? ` en ${region}` : ""}</>
            )}
          </p>
          {(region || specialty || query) && (
            <button
              onClick={() => { setRegion(""); setSpecialty(""); setQuery(""); }}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              <X className="size-3" /> Réinitialiser les filtres
            </button>
          )}
        </div>

        {agencies === undefined ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-6 animate-spin text-blue-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
            <Building2 className="size-12 text-slate-300 mb-3" />
            <p className="text-sm font-semibold text-slate-700">Aucune agence trouvée</p>
            <p className="mt-1 max-w-xs text-xs text-slate-500">
              Essayez de modifier vos filtres ou de choisir une autre région.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((agency) => (
              <article
                key={agency._id}
                onClick={() => navigate(`/agency/${agency._id}`)}
                className="group relative flex cursor-pointer flex-col rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-xl hover:shadow-amber-100/40"
              >
                {/* Accent bar on hover */}
                <div className="absolute left-0 right-0 top-0 h-0.5 rounded-t-2xl bg-gradient-to-r from-amber-500 to-orange-400 opacity-0 transition-opacity group-hover:opacity-100" />

                <div className="flex items-start gap-3.5">
                  {agency.logoUrl ? (
                    <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50 shadow-sm">
                      <img src={agency.logoUrl} alt={agency.name} className="size-full object-cover" />
                    </div>
                  ) : (
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-orange-100">
                      <Building className="size-5 text-amber-600" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                      {agency.name}
                    </h3>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">
                      {(agency.regions || []).join(" · ")}
                    </p>
                  </div>
                  {agency.rating && (
                    <div className="flex shrink-0 items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5">
                      <Star className="size-3 fill-amber-400 text-amber-400" />
                      <span className="text-[11px] font-semibold text-amber-700">{agency.rating}</span>
                    </div>
                  )}
                </div>

                {agency.description && (
                  <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-500">
                    {agency.description}
                  </p>
                )}

                {/* Specialties */}
                {agency.specialties && agency.specialties.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {agency.specialties.map((s) => (
                      <Badge key={s} className="rounded-full bg-slate-100 text-[10px] font-medium capitalize text-slate-600 border-0">
                        {s}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex items-end justify-between gap-2 border-t border-slate-100 pt-3.5">
                  <div className="flex flex-col gap-1 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1.5 truncate">
                      <MapPin className="size-3 shrink-0 text-slate-400" /> {agency.address}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Phone className="size-3 shrink-0 text-slate-400" /> {agency.phone}
                    </span>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-blue-600 transition-all group-hover:gap-2">
                    Voir le profil <ArrowRight className="size-3.5" />
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* CTA agency */}
        <div className="mt-10 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-700 to-indigo-900">
          <div className="flex flex-col items-start justify-between gap-5 px-6 py-8 sm:flex-row sm:items-center sm:px-10">
            <div className="max-w-md">
              <p className="flex items-center gap-2 text-sm font-bold text-white">
                <Building2 className="size-4" /> Vous êtes une agence immobilière ?
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-blue-200">
                Rejoignez l'annuaire imoprice AI : recevez des demandes d'estimation
                des propriétaires de votre région et développez votre clientèle.
              </p>
            </div>
            <Button
              onClick={() => navigate(isAuthenticated ? "/agencies" : "/auth")}
              className="shrink-0 rounded-xl bg-white px-6 text-xs font-bold text-indigo-700 shadow-xl transition-all hover:bg-blue-50"
            >
              <Sparkles className="mr-1.5 size-3.5" /> Devenir partenaire
            </Button>
          </div>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 sm:flex-row lg:px-8">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} imoprice AI. Annuaire des agences partenaires.
          </p>
          <div className="flex items-center gap-5">
            <button onClick={() => navigate("/pricing")} className="text-xs text-slate-400 transition-colors hover:text-blue-600">
              Forfaits
            </button>
            <button onClick={() => navigate("/")} className="text-xs text-slate-400 transition-colors hover:text-blue-600">
              Accueil
            </button>
            <a href="mailto:contact@imoprice.tn" className="flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-blue-600">
              <Mail className="size-3" /> Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
