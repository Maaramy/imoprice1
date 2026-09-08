import { useParams, useNavigate } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Building, MapPin, Phone, Mail, Globe, Star, ArrowLeft, ExternalLink,
  CheckCircle2, Sparkles, Loader2,
} from "lucide-react";
import { motion } from "framer-motion";

export default function AgencyPublic() {
  const { id } = useParams();
  const navigate = useNavigate();
  const agency = useQuery(api.agencies.getAgencyPublicProfile, {
    agencyId: id as any,
  });

  // Loading state
  if (agency === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-gray-950 dark:to-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-6 text-amber-500 animate-spin" />
          <p className="text-sm text-slate-400 dark:text-slate-500">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  // Not found
  if (!agency) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-gray-950 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center max-w-sm mx-auto px-4">
          <Building className="size-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">Agence introuvable</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Cette agence n'existe pas ou n'est pas encore abonnée.
          </p>
          <Button onClick={() => navigate("/")} className="rounded-xl text-xs h-9">
            <ArrowLeft className="mr-1.5 size-3.5" /> Retour à l'accueil
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors mb-4"
        >
          <ArrowLeft className="size-3.5" /> Retour
        </button>

        {/* Agency Profile Card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-0 bg-white/95 dark:bg-slate-900/95 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)] rounded-2xl overflow-hidden relative">
            {/* Accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-orange-400 opacity-60" />

            <CardContent className="p-5 sm:p-8">
              {/* Header with logo */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 mb-6 text-center sm:text-left">
                {agency.logoUrl ? (
                  <div className="flex size-20 sm:size-24 shrink-0 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800 overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700">
                    <img src={agency.logoUrl} alt={agency.name} className="size-full object-cover" />
                  </div>
                ) : (
                  <div className="flex size-20 sm:size-24 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 shadow-sm">
                    <Building className="size-10 text-amber-600 dark:text-amber-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                    {agency.name}
                  </h1>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-sm text-slate-500 dark:text-slate-400 mb-2">
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3.5" /> {(agency.regions || []).join(", ")}
                    </span>
                    {agency.specialties && agency.specialties.length > 0 && (
                      <>
                        <span className="opacity-30">|</span>
                        {agency.specialties.map((s) => (
                          <Badge key={s} className="rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-0 text-[10px] font-medium capitalize">
                            {s}
                          </Badge>
                        ))}
                      </>
                    )}
                  </div>
                  {agency.rating && (
                    <div className="flex items-center justify-center sm:justify-start gap-1">
                      <Star className="size-4 fill-amber-400 text-amber-400" />
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{agency.rating}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">/ 5</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {agency.description && (
                <div className="mb-6">
                  <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">À propos</h2>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{agency.description}</p>
                </div>
              )}

              {/* Contact Info */}
              <div className="grid gap-3 sm:grid-cols-2 mb-6">
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 p-3.5 flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                    <Phone className="size-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Téléphone</p>
                    <a href={`tel:${agency.phone}`} className="text-sm font-medium text-slate-900 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                      {agency.phone}
                    </a>
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 p-3.5 flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <Mail className="size-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Email</p>
                    <a href={`mailto:${agency.email}`} className="text-sm font-medium text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate block">
                      {agency.email}
                    </a>
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 p-3.5 flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
                    <MapPin className="size-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Adresse</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{agency.address}</p>
                  </div>
                </div>
                {agency.website && (
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 p-3.5 flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                      <Globe className="size-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">Site web</p>
                      <a href={agency.website} target="_blank" rel="noopener noreferrer"
                        className="text-sm font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors truncate block flex items-center gap-1"
                      >
                        Visiter le site <ExternalLink className="size-3 shrink-0" />
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Trust indicators */}
              <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-100 dark:border-amber-900/30 p-4 flex items-center gap-3">
                <Sparkles className="size-5 text-amber-500 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Agence partenaire imoprice AI</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Cette agence est abonnée et vérifiée sur notre plateforme.
                  </p>
                </div>
                <CheckCircle2 className="size-6 text-emerald-500 shrink-0 ml-auto" />
              </div>

              {/* CTA */}
              <div className="mt-6 flex flex-col sm:flex-row gap-2">
                <a href={`tel:${agency.phone}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 text-sm h-10 font-semibold shadow-sm transition-all"
                >
                  <Phone className="size-4" /> Appeler l'agence
                </a>
                <a href={`mailto:${agency.email}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm h-10 font-medium transition-all"
                >
                  <Mail className="size-4" /> Envoyer un email
                </a>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
