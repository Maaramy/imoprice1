import { Link, useParams } from "react-router";
import { useQuery } from "convex/react";
import { Loader2, Lock } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { ResultsView } from "@/components/investment/results-view";
import {
  exportCsv,
  generatePdf,
  type AnalysisRun,
  type AnalysisResults,
  type InvestmentInput,
  type ZoneRow,
} from "@/components/investment/shared";
import { usePageSEO } from "@/lib/seo";
import logo from "@/assets/logo.svg";

export default function ShareInvestment() {
  usePageSEO({
    title: "Rapport d'investissement partagé — baticost AI",
    description: "Rapport d'analyse de rentabilité immobilière partagé en lecture seule.",
  });

  const { token } = useParams<{ token: string }>();
  const analysis = useQuery(api.investments.getSharedAnalysis, token ? { token } : "skip");
  const zones = (useQuery(api.investments.getInvestmentZones) ?? []) as ZoneRow[];

  if (analysis === undefined) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-indigo-600" />
      </main>
    );
  }

  if (analysis === null) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/50">
          <Lock className="size-6 text-muted-foreground" />
        </span>
        <p className="text-sm font-semibold">Lien invalide ou expiré</p>
        <p className="text-xs text-muted-foreground">
          Ce rapport partagé n'est plus disponible. Demandez un nouveau lien à son auteur.
        </p>
        <Button asChild>
          <Link to="/">Découvrir baticost AI</Link>
        </Button>
      </main>
    );
  }

  const run: AnalysisRun = {
    _id: analysis._id,
    input: analysis.input as InvestmentInput,
    results: analysis.results as AnalysisResults,
    aiInsights: analysis.aiInsights,
    isFavorite: analysis.isFavorite,
    createdAt: analysis.createdAt,
    updatedAt: analysis.updatedAt,
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/40 bg-card/80 px-4 py-3 shadow-soft">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="baticost AI" width={32} height={32} className="size-8 rounded-xl" />
          <span className="text-sm font-bold tracking-tight">
            <span className="text-indigo-600">bati</span>cost <span className="text-indigo-500">AI</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-muted/40 px-3 py-1 text-[10px] font-medium text-muted-foreground">
            Rapport partagé — lecture seule
          </span>
          <Button variant="outline" size="sm" onClick={() => generatePdf(run)}>
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportCsv(run)}>
            CSV
          </Button>
        </div>
      </header>

      <ResultsView run={run} zones={zones} />
    </main>
  );
}
