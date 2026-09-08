import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Crosshair, Check, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

export interface LocationResult {
  lat: number;
  lng: number;
  displayName: string;
  formattedAddress: string;
  road?: string;
  houseNumber?: string;
  city?: string;
  state?: string;
  country?: string;
}

interface LocationPickerProps {
  /** Called when a location is selected */
  onLocationChange: (location: LocationResult) => void;
  /** Auto-trigger geolocation on mount (once) */
  autoLocate?: boolean;
}

export default function LocationPicker({
  onLocationChange,
  autoLocate = false,
}: LocationPickerProps) {
  const [geolocating, setGeolocating] = useState(false);
  const [selected, setSelected] = useState(false);
  const doReverse = useAction(api.geocode.reverseGeocode);

  /** Reverse geocode and call onLocationChange with address */
  const handleLocationSelect = useCallback(
    async (lat: number, lng: number) => {
      setSelected(true);

      try {
        const data = await doReverse({ lat, lng });
        if (data) {
          const addr = data.address || {};
          const city = addr.city || addr.town || addr.village || addr.municipality || "";
          const road = addr.road || "";
          const number = addr.house_number || "";
          const state = addr.state || "";
          const country = addr.country || "";
          const displayName = data.display_name || "";
          const formatted = [number, road, city].filter(Boolean).join(" ") || displayName;

          onLocationChange({
            lat,
            lng,
            displayName,
            formattedAddress: formatted,
            road,
            houseNumber: addr.house_number,
            city,
            state,
            country,
          });
        } else {
          onLocationChange({
            lat,
            lng,
            displayName: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
            formattedAddress: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          });
        }
      } catch {
        onLocationChange({
          lat,
          lng,
          displayName: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          formattedAddress: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        });
      }
    },
    [onLocationChange, doReverse]
  );

  // Geolocation
  const handleGeolocate = useCallback(() => {
    if (!navigator.geolocation) return;
    setGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        await handleLocationSelect(latitude, longitude);
        setGeolocating(false);
      },
      () => {
        setGeolocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [handleLocationSelect]);

  // Auto-trigger geolocation on mount
  const autoLocated = useRef(false);
  useEffect(() => {
    if (autoLocate && !autoLocated.current && !selected) {
      autoLocated.current = true;
      handleGeolocate();
    }
  }, [autoLocate, handleGeolocate, selected]);

  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-3 sm:p-4">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl transition-all",
          selected
            ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
            : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
        )}>
          {selected ? (
            <Check className="size-4" strokeWidth={2.5} />
          ) : (
            <MapPin className="size-4" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">
            {selected ? "Localisation récupérée" : "Localisation"}
          </p>
          <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 truncate">
            {selected ? "Coordonnées GPS enregistrées" : "Utilisez le bouton pour vous localiser"}
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant={selected ? "outline" : "default"}
        size="sm"
        onClick={handleGeolocate}
        disabled={geolocating}
        className={cn(
          "rounded-xl h-9 text-xs gap-1.5 shrink-0",
          selected
            ? "border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
            : "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-sm"
        )}
      >
        {geolocating ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Crosshair className="size-3.5" />
        )}
        {geolocating ? "Géolocalisation..." : "Ma position"}
      </Button>
    </div>
  );
}
