import { cn } from "@/lib/utils";

export type SegmentedOption = { value: string; label: string; emoji?: string };

export function SegmentedToggle({
  options,
  value,
  onChange,
  accent = "blue",
  size = "md",
  className,
  ariaLabel,
}: {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  accent?: "blue" | "emerald";
  size?: "md" | "lg";
  className?: string;
  ariaLabel?: string;
}) {
  const activeCls =
    accent === "emerald"
      ? "bg-gradient-to-r from-emerald-600 to-teal-600 border-transparent text-white"
      : "bg-gradient-to-r from-blue-600 to-blue-500 border-transparent text-white";
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel || "Votre besoin"}
      className={cn("grid w-full grid-cols-1 sm:grid-cols-2 gap-2", className)}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl border text-left transition-all duration-200",
              size === "lg" ? "px-4 py-3 sm:py-3.5" : "px-3 py-2.5",
              active
                ? activeCls
                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-950/30",
            )}
          >
            {opt.emoji && (
              <span
                className={cn("shrink-0", size === "lg" ? "text-lg sm:text-xl" : "text-base sm:text-lg")}
                aria-hidden="true"
              >
                {opt.emoji}
              </span>
            )}
            <span className={cn("font-semibold", size === "lg" ? "text-xs sm:text-sm" : "text-[11px] sm:text-sm")}>
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}