import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import logo from "@/assets/logo.svg";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { motion } from "framer-motion";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center gap-5"
        >
          <img src={logo} alt="baticost AI" width={56} height={56} className="size-14 rounded-2xl shadow-lg shadow-blue-200" />
          <div className="text-center">
            <p className="text-xs font-bold text-gray-900">
              <span className="text-blue-600">bati</span>cost <span className="text-indigo-600">AI</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">Préparation de votre espace...</p>
          </div>
          <Loader2 className="size-5 animate-spin text-blue-600 mt-1" aria-hidden="true" />
        </motion.div>
      </main>
    );
  }

  if (!isAuthenticated) {
    const returnTo = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to={`/auth?returnTo=${encodeURIComponent(returnTo)}`}
        replace
      />
    );
  }

  return children;
}
