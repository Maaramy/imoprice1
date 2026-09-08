import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Days remaining until the next monthly quota reset (1st of next month, UTC) */
export function daysUntilNextReset(now: Date = new Date()): number {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return Math.max(1, Math.ceil((next.getTime() - now.getTime()) / 86_400_000));
}

/** Quota bar color from the remaining fraction (1 = full quota left, 0 = exhausted) */
export function quotaBarColor(remainingRatio: number): string {
  if (remainingRatio > 0.66) return "bg-emerald-500";
  if (remainingRatio > 0.33) return "bg-amber-500";
  return "bg-red-500";
}
