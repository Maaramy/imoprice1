import React from "react";
import { Link, useLocation } from "react-router";
import { AlertTriangle, Home, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BoundaryProps {
  children: React.ReactNode;
}

/**
 * Hard reload that busts the browser's module cache.
 * `window.location.reload()` can re-serve the same stale module graph, so we
 * append a unique query param to force a fresh fetch of every module.
 */
function hardReload() {
  const url = new URL(window.location.href);
  url.searchParams.set("fresh", String(Date.now()));
  window.location.replace(url.toString());
}

/**
 * Route-level error boundary.
 *
 * Catches runtime errors thrown while rendering a route — including failures
 * to dynamically import a lazy chunk (e.g. "Failed to fetch dynamically
 * imported module") — and renders a friendly fallback with a reload action
 * instead of leaving the preview as a blank page.
 *
 * The boundary remounts on every navigation (`key={pathname}`) so an error
 * on one route never blocks the rest of the app.
 */
class RouteErrorBoundaryClass extends React.Component<
  BoundaryProps,
  { hasError: boolean; message: string }
> {
  state = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      message: error?.message || "Erreur inconnue",
    };
  }

  componentDidCatch(error: Error) {
    console.error("[RouteErrorBoundary] Caught error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
          <div className="w-full max-w-md text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/40">
              <AlertTriangle className="size-6 text-red-500" aria-hidden="true" />
            </div>
            <h1 className="text-lg font-semibold">Une erreur est survenue</h1>
            <p className="mt-2 text-sm text-muted-foreground break-words">
              {this.state.message}
            </p>
            <div className="mt-6 flex flex-col gap-3 justify-center sm:flex-row">
              <Button onClick={hardReload}>
                <RotateCw className="size-4" aria-hidden="true" />
                Recharger la page
              </Button>
              <Button variant="outline" asChild>
                <Link to="/">
                  <Home className="size-4" aria-hidden="true" />
                  Retour à l'accueil
                </Link>
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function RouteErrorBoundary({ children }: BoundaryProps) {
  const location = useLocation();
  // Remount on navigation so a previous route's error never persists.
  return (
    <RouteErrorBoundaryClass key={location.pathname}>
      {children}
    </RouteErrorBoundaryClass>
  );
}
