import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      {/* Subtle background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 size-[600px] rounded-full bg-blue-100/30 dark:bg-blue-900/10 blur-3xl" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-md"
        >
          {/* Animated 404 graphic */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 150 }}
            className="flex justify-center mb-8"
          >
            <div className="relative">
              <div className="flex size-28 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border border-blue-200 dark:border-blue-800 shadow-sm dark:shadow-gray-900/50">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-0.5">
                    <motion.span
                      initial={{ y: -20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                      className="text-5xl font-bold bg-gradient-to-br from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent"
                    >
                      4
                    </motion.span>
                    <motion.span
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
                      className="text-5xl font-bold bg-gradient-to-br from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent"
                    >
                      0
                    </motion.span>
                    <motion.span
                      initial={{ y: -20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.7, type: "spring", stiffness: 200 }}
                      className="text-5xl font-bold bg-gradient-to-br from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent"
                    >
                      4
                    </motion.span>
                  </div>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 font-medium">Page introuvable</p>
                </div>
              </div>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-3 rounded-[40px] border-2 border-dashed border-blue-200/50 dark:border-blue-700/30 -z-10"
              />
            </div>
          </motion.div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Oups ! Page non trouvée
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-8">
            La page que vous cherchez n'existe pas ou a été déplacée.
            Vérifiez l'URL ou retournez à l'accueil.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              onClick={() => navigate("/")}
              className="h-12 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/50 hover:shadow-xl hover:from-blue-700 hover:to-blue-800 transition-all px-6 w-full sm:w-auto"
            >
              <Home className="mr-2 size-4" />
              Retour à l'accueil
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="h-12 rounded-xl border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 px-6 w-full sm:w-auto"
            >
              <ArrowLeft className="mr-2 size-4" />
              Page précédente
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="relative z-10 text-center py-8">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          © {new Date().getFullYear()} baticost AI — Estimation immobilière IA
        </p>
      </div>
    </div>
  );
}
