import { motion } from "framer-motion";
import type { ReactNode } from "react";

/** Page transition wrapper for smooth AnimatePresence routing */
export default function PageTransition({
  children,
  pageKey,
}: {
  children: ReactNode;
  pageKey: string;
}) {
  return (
    <motion.div
      key={pageKey}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );
}
