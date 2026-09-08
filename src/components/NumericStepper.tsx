import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Minus, Plus } from "lucide-react";

interface NumericStepperProps {
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function NumericStepper({
  value,
  onChange,
  min = 0,
  max = 99999,
  step = 1,
  placeholder = "0",
  className,
  disabled = false,
}: NumericStepperProps) {
  const numValue = value === "" ? 0 : parseInt(value, 10);
  const isAtMin = isNaN(numValue) || numValue <= min;
  const isAtMax = !isNaN(numValue) && numValue >= max;

  const handleDecrement = () => {
    if (isAtMin || disabled) return;
    const newVal = Math.max(min, numValue - step);
    onChange(newVal.toString());
  };

  const handleIncrement = () => {
    if (isAtMax || disabled) return;
    const newVal = Math.min(max, numValue + step);
    onChange(newVal.toString());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow empty string for clearing
    if (raw === "") {
      onChange("");
      return;
    }
    // Only allow digits
    if (!/^\d*$/.test(raw)) return;
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed)) {
      onChange(Math.min(max, Math.max(min, parsed)).toString());
    } else {
      onChange(raw);
    }
  };

  return (
    <div className={cn("flex items-center rounded-xl border border-gray-200 bg-white overflow-hidden focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 transition-all", className)}>
      <button
        type="button"
        onClick={handleDecrement}
        disabled={isAtMin || disabled}
        className={cn(
          "flex size-11 items-center justify-center shrink-0 transition-colors duration-150",
          "border-r border-gray-200",
          "text-gray-400 hover:text-gray-700 hover:bg-gray-50 active:bg-gray-100",
          "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent",
          "touch-manipulation"
        )}
        aria-label="Diminuer"
      >
        <Minus className="size-4" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "flex-1 min-w-0 h-11 text-center text-sm font-semibold text-gray-900",
          "bg-transparent",
          "focus:outline-none",
          "placeholder:text-gray-300",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "[-moz-appearance:_textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        )}
      />
      <button
        type="button"
        onClick={handleIncrement}
        disabled={isAtMax || disabled}
        className={cn(
          "flex size-11 items-center justify-center shrink-0 transition-colors duration-150",
          "border-l border-gray-200",
          "text-gray-400 hover:text-gray-700 hover:bg-gray-50 active:bg-gray-100",
          "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent",
          "touch-manipulation"
        )}
        aria-label="Augmenter"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
