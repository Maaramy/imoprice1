import { useState, useMemo, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Check, X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface LocationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  items: readonly string[] | string[];
  selected: string;
  onSelect: (value: string) => void;
  /** Optional extra info to show per item (e.g. property count) */
  extraInfo?: Record<string, string>;
}

export default function LocationSheet({
  open,
  onOpenChange,
  title,
  description,
  items,
  selected,
  onSelect,
  extraInfo,
}: LocationSheetProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const sorted = [...items].sort((a, b) => a.localeCompare(b, "fr"));
    if (!search.trim()) return sorted;
    const q = search.toLowerCase().trim();
    return sorted.filter((item) => item.toLowerCase().includes(q));
  }, [items, search]);

  const handleSelect = useCallback(
    (value: string) => {
      onSelect(value);
      onOpenChange(false);
      setSearch("");
    },
    [onSelect, onOpenChange]
  );

  return (
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setSearch(""); }}>
      <SheetContent
        side="bottom"
        className="h-[85dvh] rounded-t-2xl p-0 flex flex-col"
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
        </div>

        <SheetHeader className="px-4 pb-2 shrink-0">
          <SheetTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {title}
          </SheetTitle>
          {description && (
            <SheetDescription className="text-xs text-slate-500 dark:text-slate-400">
              {description}
            </SheetDescription>
          )}
        </SheetHeader>

        {/* Search */}
        <div className="px-4 pb-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            <Input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="rounded-xl border-slate-200 dark:border-slate-700 h-10 pl-9 pr-9 text-sm bg-slate-50 dark:bg-slate-800/50"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 size-5 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          <AnimatePresence mode="wait">
            {filtered.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <MapPin className="size-8 text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Aucun résultat
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Essayez un autre terme de recherche
                </p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-0.5"
              >
                {filtered.map((item, i) => {
                  const isSelected = item === selected;
                  return (
                    <motion.button
                      key={item}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.015, 0.15) }}
                      type="button"
                      onClick={() => handleSelect(item)}
                      className={cn(
                        "flex items-center gap-3 w-full rounded-xl px-3.5 py-3 text-left text-sm transition-all duration-150",
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-800"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 active:bg-slate-100 dark:active:bg-slate-800"
                      )}
                    >
                      <div
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-lg transition-all",
                          isSelected
                            ? "bg-blue-500 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
                        )}
                      >
                        {isSelected ? (
                          <Check className="size-3.5" strokeWidth={3} />
                        ) : (
                          <ChevronRight className="size-3.5" />
                        )}
                      </div>
                      <span className="font-medium flex-1">{item}</span>
                      {extraInfo?.[item] && (
                        <Badge className="rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-0 text-[10px] font-normal shrink-0">
                          {extraInfo[item]}
                        </Badge>
                      )}
                    </motion.button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SheetContent>
    </Sheet>
  );
}
