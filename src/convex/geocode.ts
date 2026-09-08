import { v } from "convex/values";
import { action } from "./_generated/server";

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  class: string;
  address?: Record<string, string>;
}

export const searchAddress = action({
  args: {
    query: v.string(),
  },
  handler: async (_ctx, args): Promise<NominatimResult[]> => {
    const encoded = encodeURIComponent(args.query.trim() + ", Tunisie");
    const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=5&countrycodes=tn&accept-language=fr&addressdetails=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "imoprice-ai/1.0" },
    });
    if (!res.ok) return [];
    return (await res.json()) as NominatimResult[];
  },
});

export const reverseGeocode = action({
  args: {
    lat: v.number(),
    lng: v.number(),
  },
  handler: async (_ctx, args) => {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${args.lat}&lon=${args.lng}&format=json&accept-language=fr&addressdetails=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "imoprice-ai/1.0" },
    });
    if (!res.ok) return null;
    return (await res.json()) as {
      display_name: string;
      address?: Record<string, string>;
    };
  },
});
