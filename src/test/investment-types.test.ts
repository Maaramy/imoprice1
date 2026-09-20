import { describe, expect, it } from "vitest";
import {
  ALL_CITIES,
  DEFAULT_ZONE,
  FORECAST_HORIZONS,
  INVESTMENT_TYPE_META,
  INVESTMENT_TYPES,
  INVESTMENT_ZONES,
  INVESTMENT_ZONE_MAP,
  REGION_CASCADE,
  REGION_LABELS,
  SCENARIO_DEFAULTS,
  estimateOccupancyRate,
  forcedRentModeFor,
  resolveZoneUtility,
} from "@/convex/investmentTypes";

describe("investmentTypes — contrat", () => {
  it("expose exactement 12 types d'investissement", () => {
    expect(INVESTMENT_TYPES).toHaveLength(12);
    expect(INVESTMENT_TYPES).toContain("residence_touristique");
    expect(INVESTMENT_TYPES).toContain("projet_neuf");
  });

  it("décrit chaque type dans INVESTMENT_TYPE_META", () => {
    for (const type of INVESTMENT_TYPES) {
      const meta = INVESTMENT_TYPE_META[type];
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.icon.length).toBeGreaterThan(0);
      expect(meta.yieldBenchmark).toBeGreaterThan(0);
      expect(["faible", "moyen", "eleve"]).toContain(meta.riskLevel);
    }
  });

  it("définit les 24 zones (une par gouvernorat)", () => {
    expect(INVESTMENT_ZONES).toHaveLength(24);
    const ranks = INVESTMENT_ZONES.map((z) => z.rank);
    expect(new Set(ranks).size).toBeGreaterThan(20);
    for (const zone of INVESTMENT_ZONES) {
      expect(zone.pricePerM2).toBeGreaterThan(0);
      expect(zone.rentPerM2).toBeGreaterThan(0);
      expect(zone.highlights.length).toBeGreaterThan(0);
    }
    expect(INVESTMENT_ZONE_MAP[DEFAULT_ZONE]).toBeDefined();
    expect(REGION_LABELS[DEFAULT_ZONE]).toBe("Tunis");
  });

  it("fournit une cascade régions/villes non vide et cohérente", () => {
    const regions = Object.keys(REGION_CASCADE);
    expect(regions.length).toBe(24);
    expect(ALL_CITIES.length).toBeGreaterThan(50);
    for (const region of regions) {
      expect(REGION_CASCADE[region].length).toBeGreaterThan(0);
    }
  });

  it("impose le mode nuitée aux résidences touristiques uniquement", () => {
    expect(forcedRentModeFor("residence_touristique")).toBe("nuit");
    expect(forcedRentModeFor("appartement")).toBeNull();
  });

  it("estime un taux d'occupation plausible", () => {
    const mensuel = estimateOccupancyRate({
      region: "Tunis",
      city: "La Marsa",
      quartier: "Gammarth",
      rentMode: "mensuel",
    });
    const nuit = estimateOccupancyRate({
      region: "Tunis",
      city: "La Marsa",
      quartier: "Gammarth",
      rentMode: "nuit",
    });
    expect(mensuel).toBeGreaterThan(60);
    expect(mensuel).toBeLessThanOrEqual(100);
    expect(nuit).toBeGreaterThan(0);
    expect(nuit).toBeLessThan(mensuel);
  });

  it("résout les utilités de zone par mots-clés", () => {
    const plage = resolveZoneUtility("Hammamet", "Corniche");
    expect(plage.mer).toBeGreaterThan(plage.zoneIndustrielle);
    const centre = resolveZoneUtility("Tunis Centre", "Centre-ville");
    expect(centre.centreVille).toBeGreaterThan(60);
  });

  it("déclare les scénarios par défaut et les horizons", () => {
    expect(Object.keys(SCENARIO_DEFAULTS)).toEqual(["optimiste", "realiste", "prudent"]);
    expect(FORECAST_HORIZONS).toEqual([1, 3, 5, 10]);
  });
});
