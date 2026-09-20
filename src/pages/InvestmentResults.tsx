import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useAction, useMutation, useQuery } from "convex/react";
import { ArrowLeft, Download, Heart, Loader2, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { ResultsView } from "@/components/investment/results-view";
import {
  exportCsv,
  generatePdf,
  type AnalysisRun,
  type AnalysisResults,
  type ChatMsg,
  type InvestmentInput,
  type ZoneRow,
} from "@/components/investment/shared";
import { usePageSEO } from "@/lib/seo";

export default function InvestmentResults() {
  usePageSEO({
    title: "Résultat d'investissement — baticost AI",
    description: "Résultats détaillés de l'analyse de rentabilité : ROI, cashflow, scénarios et score IA.",
  });

  const { analysisId } = useParams<{ analysisId: string }>();
  const navigate = useNavigate();
  const analysis = useQuery(
    api.investments.getAnalysis,
    analysisId ? { analysisId: analysisId as Id<"investmentAnalyses"> } : "skip",
  );
  const zones = (useQuery(api.investments.getInvestmentZones) ?? []) as ZoneRow[];

  const toggleFavorite = useMutation(api.investments.toggleFavorite);
  const shareAnalysis = useMutation(api.investments.shareAnalysis);
  const deleteAnalysis = useMutation(api.investments.deleteAnalysis);
  const ask = useAction(api.investmentAi.askInvestorAssistant);

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [busy, setBusy] = useState(false);

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
        <p className="text-sm font-semibold">Analyse introuvable</p>
        <p className="text-xs text-muted-foreground">
          Cette analyse n'existe pas ou n'appartient pas à votre compte.
        </p>
        <Button asChild>
          <Link to="/dashboard/investments">Nouvelle analyse</Link>
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
    shareToken: analysis.shareToken,
  };

  const onAsk = async (question: string) => {
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setBusy(true);
    try {
      const { answer } = await ask({
        analysisId: analysis._id as Id<"investmentAnalyses">,
        question,
      });
      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Désolé, une erreur est survenue. Réessayez." },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const onShare = async () => {
    try {
      const { token } = await shareAnalysis({ analysisId: analysis._id as Id<"investmentAnalyses"> });
      const url = `${window.location.origin}/share/investment/${token}`;
      await navigator.clipboard?.writeText(url);
      toast.success("Lien de partage copié dans le presse-papiers.");
    } catch {
      toast.error("Partage impossible pour le moment.");
    }
  };

  const onDelete = async () => {
    try {
      await deleteAnalysis({ analysisId: analysis._id as Id<"investmentAnalyses"> });
      toast.success("Analyse supprimée.");
      navigate("/dashboard");
    } catch {
      toast.error("Suppression impossible.");
    }
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild className="gap-2">
          <Link to="/dashboard">
            <ArrowLeft className="size-4" />
            Tableau de bord
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => generatePdf(run)}>
            <Download className="size-4" />
            PDF
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => exportCsv(run)}>
            <Download className="size-4" />
            CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={onShare}>
            <Share2 className="size-4" />
            Partager
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => void toggleFavorite({ analysisId: analysis._id as Id<"investmentAnalyses"> })}
          >
            <Heart className={run.isFavorite ? "size-4 fill-rose-500 text-rose-500" : "size-4"} />
            Favori
          </Button>
          <Button variant="outline" size="sm" className="gap-2 text-rose-600" onClick={onDelete}>
            <Trash2 className="size-4" />
            Supprimer
          </Button>
        </div>
      </div>

      <ResultsView run={run} zones={zones} assistant={{ messages, busy, onAsk }} />
    </main>
  );
}
