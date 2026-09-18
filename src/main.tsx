import '@vly-ai/integrations';
import { Toaster } from "@/components/ui/sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/lib/i18n";
import PageTransition from "@/components/PageTransition";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import React, { StrictMode, useEffect, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import "./index.css";

/**
 * Hard reload that busts the browser's module cache.
 * `window.location.reload()` can re-serve the same stale module graph, so we
 * append a unique query param to force the dev server + browser to fetch
 * every module fresh.
 */
function hardReload() {
  const url = new URL(window.location.href);
  url.searchParams.set("fresh", String(Date.now()));
  window.location.replace(url.toString());
}

/**
 * Lazy import with automatic retry.
 *
 * React.lazy caches a rejected import promise for the whole session: after a
 * single "Failed to fetch dynamically imported module" (usually the dev server
 * re-transpiling the file mid-request), the route stays broken even after
 * `window.location.reload()`. This wrapper:
 *
 * 1. Retries the import a few times (the dev server may still be recompiling).
 * 2. On final failure, performs ONE cache-busting hard reload, guarded by
 *    sessionStorage so it can never loop — if the reload itself fails again,
 *    the error is rethrown so the RouteErrorBoundary shows the friendly UI
 *    instead of the page reloading forever ("convulsing").
 */
function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  retries = 3,
  delayMs = 1000,
) {
  return lazy(async () => {
    for (let attempt = 0; ; attempt++) {
      try {
        return await factory();
      } catch (error) {
        console.warn(
          `[lazyWithRetry] import failed (attempt ${attempt + 1}/${retries + 1}):`,
          error,
        );
        if (attempt >= retries) {
          // Guard against reload loops: only auto-reload once per route+session.
          let alreadyReloaded = false;
          try {
            const key = "lazy-retry:" + new URL(window.location.href).pathname;
            alreadyReloaded = sessionStorage.getItem(key) === "1";
            if (!alreadyReloaded) sessionStorage.setItem(key, "1");
          } catch {
            // sessionStorage may be unavailable in sandboxed iframes.
          }
          if (!alreadyReloaded) {
            hardReload();
            // Never resolve: keep the Suspense fallback while the reload happens.
            return await new Promise<{ default: T }>(() => {});
          }
          // Already tried a reload for this route: surface the error to the
          // RouteErrorBoundary instead of looping forever.
          throw error;
        }
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  });
}

// Lazy load route components for better code splitting.
// lazyWithRetry auto-recovers from transient dev-server module fetch failures.
const Landing = lazyWithRetry(() => import("./pages/Landing.tsx"));
const AuthPage = lazyWithRetry(() => import("./pages/Auth.tsx"));
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard.tsx"));
const EstimationHub = lazyWithRetry(() => import("./pages/EstimationHub.tsx"));
const NewEstimation = lazyWithRetry(() => import("./pages/NewEstimation.tsx"));
const EstimationResult = lazyWithRetry(() => import("./pages/EstimationResult.tsx"));
const Compare = lazyWithRetry(() => import("./pages/Compare.tsx"));
const NewRentEstimation = lazyWithRetry(() => import("./pages/NewRentEstimation.tsx"));
const RentEstimationResult = lazyWithRetry(() => import("./pages/RentEstimationResult.tsx"));
const ReportView = lazyWithRetry(() => import("./pages/ReportView.tsx"));
const Settings = lazyWithRetry(() => import("./pages/Settings.tsx"));
const Agencies = lazyWithRetry(() => import("./pages/Agencies.tsx"));
const AgencyPublic = lazyWithRetry(() => import("./pages/AgencyPublic.tsx"));
const Providers = lazyWithRetry(() => import("./pages/Providers.tsx"));
const Admin = lazyWithRetry(() => import("./pages/Admin.tsx"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound.tsx"));

// Simple loading fallback for route transitions
function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" aria-hidden="true" />
        <p className="text-sm text-gray-400 dark:text-gray-500">Chargement...</p>
      </div>
    </div>
  );
}

/** Silent error boundary — if VlyToolbar crashes it renders nothing instead of
 *  crashing the whole app (e.g. hook errors in WebContainer environment). */
class ToolbarErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: Error) {
    console.warn("[VlyToolbar] Caught error, toolbar disabled:", err.message);
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

/** Hard guard so runtime errors never leave the preview as a blank page. */
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string; stack: string }
> {
  state = { hasError: false, message: "", stack: "" };
  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      message: error.message || "Unknown runtime error",
      stack: error.stack || "",
    };
  }
  componentDidCatch(err: Error) {
    console.error("[WebContainer preview] Root crash:", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
          <div className="max-w-lg text-center">
            <p className="text-sm font-semibold">Preview runtime error</p>
            <p className="mt-2 text-xs text-muted-foreground break-words">
              {this.state.message}
            </p>
            {this.state.stack && (
              <pre className="mt-3 text-left text-[10px] leading-4 text-muted-foreground/80 max-h-40 overflow-auto rounded border border-border/60 p-2">
                {this.state.stack}
              </pre>
            )}              <button
                type="button"
                onClick={hardReload}
                className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                Recharger la page
              </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);



function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootErrorBoundary>
      <ToolbarErrorBoundary>
        <VlyToolbar />
      </ToolbarErrorBoundary>
      <ConvexAuthProvider client={convex}>
        <ThemeProvider>
          <LanguageProvider>
          <BrowserRouter>
            <RouteSyncer />
            <RouteErrorBoundary>
              <Suspense fallback={<RouteLoading />}>
                <AnimatePresence mode="wait">
                  <Routes>
                  <Route path="/" element={
                    <PageTransition pageKey="landing">
                      <Landing />
                    </PageTransition>
                  } />
                  <Route
                    path="/auth"
                    element={
                      <PageTransition pageKey="auth">
                        <AuthPage redirectAfterAuth="/dashboard" />
                      </PageTransition>
                    }
                  />
                  <Route
                    path="/dashboard"
                    element={
                      <RequireAuth>
                        <PageTransition pageKey="dashboard">
                          <Dashboard />
                        </PageTransition>
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/estimate"
                    element={
                      <RequireAuth>
                        <PageTransition pageKey="estimate-hub">
                          <EstimationHub />
                        </PageTransition>
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/estimate/new"
                    element={
                      <RequireAuth>
                        <PageTransition pageKey="estimate-new">
                          <NewEstimation />
                        </PageTransition>
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/estimate/loyer/new"
                    element={
                      <RequireAuth>
                        <PageTransition pageKey="estimate-loyer-new">
                          <NewRentEstimation />
                        </PageTransition>
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/estimate/loyer/:id"
                    element={
                      <RequireAuth>
                        <PageTransition pageKey="estimate-loyer-result">
                          <RentEstimationResult />
                        </PageTransition>
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/estimate/:id"
                    element={
                      <RequireAuth>
                        <PageTransition pageKey="estimate-result">
                          <EstimationResult />
                        </PageTransition>
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/compare"
                    element={
                      <RequireAuth>
                        <PageTransition pageKey="compare">
                          <Compare />
                        </PageTransition>
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <RequireAuth>
                        <PageTransition pageKey="settings">
                          <Settings />
                        </PageTransition>
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/agencies"
                    element={
                      <RequireAuth>
                        <PageTransition pageKey="agencies">
                          <Agencies />
                        </PageTransition>
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/admin"
                    element={
                      <RequireAuth>
                        <PageTransition pageKey="admin">
                          <Admin />
                        </PageTransition>
                      </RequireAuth>
                    }
                  />


                  <Route path="/agency/:id" element={
                    <PageTransition pageKey="agency-public">
                      <AgencyPublic />
                    </PageTransition>
                  } />
                  <Route path="/providers" element={
                    <PageTransition pageKey="providers">
                      <Providers />
                    </PageTransition>
                  } />
                  <Route path="/report/:token" element={
                    <PageTransition pageKey="report">
                      <ReportView />
                    </PageTransition>
                  } />
                  <Route path="*" element={
                    <PageTransition pageKey="not-found">
                      <NotFound />
                    </PageTransition>
                  } />
                </Routes>
                </AnimatePresence>
              </Suspense>
            </RouteErrorBoundary>
            <Toaster />
          </BrowserRouter>
          </LanguageProvider>
        </ThemeProvider>
      </ConvexAuthProvider>
    </RootErrorBoundary>
  </StrictMode>,
);
