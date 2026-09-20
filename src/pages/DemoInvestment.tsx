import { Link } from "react-router";
import { useQuery } from "convex/react";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { ResultsView } from "@/components/investment/results-view";
import {
  type AnalysisRun,
  type AnalysisResults,
  type InvestmentInput,
  type ZoneRow,
} from "@/components/investment/shared";
import { usePageSEO } from "@/lib/seo";

export default function DemoInvestment() {
  usePageSEO({
    title: "Démo — Analyse de rentabilité immobilière | baticost AI",
    description:
      "Exemple d'analyse de rentabilité d'investissement immobilier en Tunisie : ROI, cashflow, scénarios et score IA.",
  });

  const demo = useQuery(api.investments.getDemoAnalysis, {});
  const zones = (useQuery(api.investments.getInvestmentZones) ?? []) as ZoneRow[];

  if (demo === undefined) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-indigo-600" />
      </main>
    );
  }

  const run: AnalysisRun = {
    _id: String(demo._id),
    input: demo.input as InvestmentInput,
    results: demo.results as AnalysisResults,
    aiInsights: demo.aiInsights,
    isFavorite: false,
    createdAt: demo.createdAt,
    updatedAt: demo.updatedAt,
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-500/5 to-background">
      <section className="mx-auto w-full max-w-6xl px-4 pb-4 pt-10 text-center sm:px-6">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white">
          <Sparkles className="size-6" />
        </span>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
          Démo — Analyse de rentabilité d'investissement
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
          Exemple réel : villa à Gammarth (Tunis), location longue durée. ROI, cashflow, scénarios,
          comparaison des classes d'actifs et score IA — données de démonstration, sans compte.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Button asChild className="gap-2 bg-gradient-to-r from-indigo-600 to-blue-600">
            <Link to="/dashboard/investments">
              Analyser mon bien
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/">Retour à l'accueil</Link>
          </Button>
        </div>
      </section>
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <ResultsView run={run} zones={zones} />
      </div>
    </main>
  );
}
