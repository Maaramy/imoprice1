import { Lock, Sparkles } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";

export const CLIENT_PRO_MARKER = "CLIENT_PRO_ACCESS:";

/** Vrai si un message d'erreur signale un besoin d'accès Client Pro. */
export function isClientProError(message: string | null | undefined): boolean {
  return typeof message === "string" && message.includes(CLIENT_PRO_MARKER);
}

/**
 * Paywall affiché lorsque le backend renvoie le marqueur `CLIENT_PRO_ACCESS:`.
 * L'accès Client Pro débloque les analyses de rentabilité d'investissement.
 */
export function ClientProPaywall({ message }: { message?: string | null }) {
  const detail = message?.replace(CLIENT_PRO_MARKER, "").trim();
  return (
    <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-indigo-500/5 to-blue-500/5 p-6 text-center shadow-soft">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
        <Lock className="size-6" />
      </span>
      <h2 className="mt-3 text-base font-bold tracking-tight">Service Client Pro</h2>
      <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
        {detail ||
          "L'analyse de rentabilité des investissements immobiliers fait partie de l'offre Client Pro."}
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <Button asChild className="gap-2">
          <Link to="/settings">
            <Sparkles className="size-4" />
            Voir les abonnements
          </Link>
        </Button>
      </div>
    </div>
  );
}
