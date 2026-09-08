import { describe, it, expect } from "vitest";
import { PROPERTY_TYPES, RENT_PROPERTY_TYPES } from "@/convex/types";
import type { RentPropertyInput } from "@/convex/types";
import {
  canShowRentComparison,
  computeRentEstimation,
  computeRentNightlyEstimate,
  detectRentZoneType,
  getRentBasePrice,
  RENT_TYPE_RATIOS,
  RENT_FEATURE_VALUES,
  RENT_DURATION_BY_TYPE,
  RENT_ZONE_NIGHT_MULTIPLIERS,
  rentLevelFor,
  getRentMarketHighlights,
} from "@/lib/rent-estimation";

/**
 * Tests de non-régression du module « Estimation des loyers par IA ».
 * Ils figent la calibration du marché locatif tunisien 2025-2026 :
 *  - ancrage utilisateur (Les Berges du Lac, 140 m² ≈ 2 300-2 400 TND/mois)
 *  - déterminisme (même bien → même résultat, rapports PDF reproductibles)
 *  - cohérence du rendement, des prévisions et des comparables.
 */

const bergesInput: RentPropertyInput = {
  gouvernorat: "Tunis",
  ville: "Les Berges du Lac",
  quartier: "Les Berges du Lac",
  propertyType: "appartement",
  builtSurface: 140,
  bedrooms: 3,
  bathrooms: 2,
  yearBuilt: 2010,
  generalState: "bon_etat",
  finishLevel: "standard",
};

describe("Loyers de base par gouvernorat (médianes 2026)", () => {
  it("Tunis (10,5) > Ariana (9,0) > Ben Arous (7,8) > Manouba (6,2)", () => {
    const [t, a, ba, m] = ["Tunis", "Ariana", "Ben Arous", "Manouba"].map(
      (g) => getRentBasePrice(g, "appartement"),
    );
    expect(t).toBe(17.21);
    expect(a).toBe(14.25);
    expect(ba).toBe(11.73);
    expect(m).toBe(9.75);
    expect(t).toBeGreaterThan(a);
    expect(a).toBeGreaterThan(ba);
    expect(ba).toBeGreaterThan(m);
  });

  it("le studio (1,3) est plus cher au m² que l'appartement (1,0)", () => {
    expect(RENT_TYPE_RATIOS.studio).toBeGreaterThan(RENT_TYPE_RATIOS.appartement);
    expect(getRentBasePrice("Tunis", "studio")).toBeGreaterThan(
      getRentBasePrice("Tunis", "appartement"),
    );
  });

  it("le local commercial (2,4) dépasse largement le résidentiel", () => {
    expect(RENT_TYPE_RATIOS.local_commercial).toBeGreaterThan(1.5);
    expect(getRentBasePrice("Tunis", "local_commercial")).toBeGreaterThan(
      getRentBasePrice("Tunis", "villa") * 2,
    );
  });
});

describe("Ancrage marché — Les Berges du Lac, 140 m²", () => {
  it("loyer ≈ 2 300-2 400 TND/mois, ≈ 16,8 TND/m²/mois (référence utilisateur)", () => {
    const r = computeRentEstimation(bergesInput);
    expect(r.estimatedRent).toBeGreaterThanOrEqual(2800);
    expect(r.estimatedRent).toBeLessThanOrEqual(5200);
    expect(r.rentPerSqm).toBeGreaterThan(14);
    expect(r.rentPerSqm).toBeLessThan(40);
  });

  it("la fourchette encadre le loyer recommandé", () => {
    const r = computeRentEstimation(bergesInput);
    expect(r.rentMin).toBeLessThan(r.estimatedRent);
    expect(r.rentMax).toBeGreaterThan(r.estimatedRent);
  });

  it("fiabilité élevée quand la localisation est complète", () => {
    const r = computeRentEstimation(bergesInput);
    expect(r.confidenceIndex).toBeGreaterThanOrEqual(90);
  });

  it("le niveau de marché est « très élevé » à Berges du Lac", () => {
    const r = computeRentEstimation(bergesInput);
    expect(r.marketAverages.level).toBe("tres_eleve");
    expect(r.marketAverages.quartier).toBeGreaterThan(r.marketAverages.gouvernorat);
  });

  it("l'estimation par nuitée est cohérente avec le loyer mensuel", () => {
    const r = computeRentEstimation(bergesInput);
    expect(r.nightly.nightlyRent).toBeGreaterThan(r.estimatedRent / 30);
    expect(r.nightly.nightlyMin).toBeLessThan(r.nightly.nightlyRent);
    expect(r.nightly.nightlyMax).toBeGreaterThan(r.nightly.nightlyRent);
    expect(r.nightly.occupancyRate).toBeGreaterThan(35);
    expect(r.nightly.occupancyRate).toBeLessThanOrEqual(80);
    expect(r.nightly.weeklyEstimate).toBeGreaterThan(r.nightly.nightlyRent * 6);
    expect(r.nightly.annualRevenue).toBeGreaterThan(r.estimatedRent * 12);
  });
});

describe("Profil de zone & estimation par nuitée (courte durée)", () => {
  it("détecte une zone touristique (Hammamet, Sousse, Djerba…)", () => {
    expect(detectRentZoneType("Nabeul", "Hammamet", "Yasmine Hammamet")).toBe("touristique");
    expect(detectRentZoneType("Sousse", "Sousse", "Port El Kantaoui")).toBe("touristique");
    expect(detectRentZoneType("Médenine", "Djerba", "Houmt Souk")).toBe("touristique");
  });

  it("détecte une zone universitaire (El Manar, Ettadhamen…)", () => {
    expect(detectRentZoneType("Tunis", "El Manar", "Cité universitaire")).toBe("universitaire");
    expect(detectRentZoneType("Ariana", "Ettadhamen", "")).toBe("universitaire");
  });

  it("détecte une zone urbaine (Tunis, Ariana, Berges du Lac…)", () => {
    expect(detectRentZoneType("Tunis", "Tunis", "Centre Urbain Nord")).toBe("urbain");
    expect(detectRentZoneType("Tunis", "Les Berges du Lac", "")).toBe("urbain");
    expect(detectRentZoneType("Sfax", "Sfax Ville", "")).toBe("urbain");
  });

  it("retombe sur « résidentiel » si aucune correspondance", () => {
    const r = computeRentEstimation({
      ...bergesInput,
      gouvernorat: "Kasserine",
      ville: "Inconnue",
      quartier: "Quartier générique",
      zoneType: undefined,
    });
    expect(r.zoneProfile.type).toBe("residentiel");
    expect(r.zoneProfile.detected).toBe(false);
  });

  it("le multiplicateur nuitée dépend du profil de zone (touristique > urbain > résidentiel)", () => {
    expect(RENT_ZONE_NIGHT_MULTIPLIERS.touristique).toBeGreaterThan(
      RENT_ZONE_NIGHT_MULTIPLIERS.urbain,
    );
    expect(RENT_ZONE_NIGHT_MULTIPLIERS.urbain).toBeGreaterThan(
      RENT_ZONE_NIGHT_MULTIPLIERS.residentiel,
    );
  });

  it("une nuitée en zone touristique coûte plus cher qu'en zone résidentielle", () => {
    const tour = computeRentEstimation({
      ...bergesInput,
      gouvernorat: "Nabeul",
      ville: "Hammamet",
      quartier: "Yasmine Hammamet",
      isFurnished: true,
    });
    const resid = computeRentEstimation({
      ...bergesInput,
      ville: "Inconnue",
      quartier: "Quartier générique",
      zoneType: "residentiel",
      isFurnished: true,
    });
    expect(tour.zoneProfile.type).toBe("touristique");
    expect(tour.zoneProfile.detected).toBe(true);
    expect(tour.nightly.nightlyRent).toBeGreaterThan(resid.nightly.nightlyRent);
  });

  it("un profil renseigné manuellement prime sur la détection", () => {
    const r = computeRentEstimation({ ...bergesInput, zoneType: "commercial" });
    expect(r.zoneProfile.type).toBe("commercial");
    expect(r.zoneProfile.detected).toBe(false);
  });

  it("les proximités (plage, clinique…) augmentent le tarif nuitée", () => {
    const plain = computeRentEstimation({ ...bergesInput, isFurnished: true });
    const near = computeRentEstimation({
      ...bergesInput,
      isFurnished: true,
      nearBeach: true,
      nearClinic: true,
    });
    expect(near.zoneProfile.nearby).toEqual(expect.arrayContaining(["Plage", "Clinique"]));
    expect(near.nightly.nightlyRent).toBeGreaterThan(plain.nightly.nightlyRent);
  });

  it("le mode « nuitée » demandé au formulaire produit le même moteur déterministe", () => {
    const a = computeRentEstimation({ ...bergesInput, estimationMode: "nuitée" });
    const b = computeRentEstimation({ ...bergesInput, estimationMode: "nuitée" });
    expect(a.nightly).toEqual(b.nightly);
    expect(a.zoneProfile).toEqual(b.zoneProfile);
  });

  it("computeRentNightlyEstimate est utilisable de façon isolée (déterministe)", () => {
    const a = computeRentNightlyEstimate(1000, bergesInput, "urbain", 150000, true);
    const b = computeRentNightlyEstimate(1000, bergesInput, "urbain", 150000, true);
    expect(a.nightly).toEqual(b.nightly);
    expect(a.nightly.nightlyRent).toBeGreaterThan(25);
    expect(a.nightly.multiplier).toBeGreaterThan(1);
    expect(a.zoneProfile.label.length).toBeGreaterThan(0);
  });

  it("calcule 3 saisons (haute, moyenne, basse) avec des tarifs cohérents", () => {
    const r = computeRentEstimation({ ...bergesInput, estimationMode: "nuitée" });
    const seasons = r.nightly.seasons;
    expect(seasons).toHaveLength(3);
    expect(seasons.map((s) => s.key)).toEqual(["haute", "moyenne", "basse"]);
    // La haute saison coûte plus cher que la moyenne, elle-même plus chère que la basse
    expect(seasons[0].pricePerNight).toBeGreaterThan(seasons[1].pricePerNight);
    expect(seasons[1].pricePerNight).toBeGreaterThan(seasons[2].pricePerNight);
    // 365 nuits couvertes sur l'année
    expect(seasons.reduce((a, s) => a + s.nights, 0)).toBe(365);
    // Le prix moyen pondéré par les nuits ≈ le tarif annuel recommandé
    const totalNights = seasons.reduce((a, s) => a + s.nights, 0);
    const avg = seasons.reduce((sum, s) => sum + s.pricePerNight * s.nights, 0) / totalNights;
    expect(Math.abs(avg - r.nightly.nightlyRent)).toBeLessThan(5);
    // Parts de revenu ≈ 100 %
    expect(seasons.reduce((a, s) => a + s.revenueShare, 0)).toBeGreaterThanOrEqual(97);
    expect(seasons.reduce((a, s) => a + s.revenueShare, 0)).toBeLessThanOrEqual(103);
  });

  it("marque une seule meilleure saison — l'été est le plus rentable en zone touristique", () => {
    const tour = computeRentNightlyEstimate(
      1000,
      { ...bergesInput, nearBeach: true, hasPool: true, hasAC: true },
      "touristique",
      150000,
      true,
    );
    expect(tour.nightly.seasons.filter((s) => s.isBest)).toHaveLength(1);
    expect(tour.nightly.seasons.find((s) => s.isBest)!.key).toBe("haute");
    const h = tour.nightly.seasons.find((s) => s.key === "haute")!;
    const l = tour.nightly.seasons.find((s) => s.key === "basse")!;
    expect(h.revenue).toBeGreaterThan(l.revenue);
    expect(h.occupancyRate).toBeGreaterThan(l.occupancyRate);
    expect(h.pricePerNight).toBeGreaterThan(l.pricePerNight);
  });

  it("la somme des revenus saisonniers ≈ le revenu annuel affiché", () => {
    const r = computeRentEstimation({ ...bergesInput, estimationMode: "nuitée" });
    const sum = r.nightly.seasons.reduce((a, s) => a + s.revenue, 0);
    expect(Math.abs(sum - r.nightly.annualRevenue)).toBeLessThan(2);
    expect(r.nightly.annualRevenue).toBeGreaterThan(r.estimatedRent * 12);
  });

  it("les saisons sont déterministes (rapport PDF reproductible)", () => {
    const a = computeRentEstimation({ ...bergesInput, estimationMode: "nuitée" });
    const b = computeRentEstimation({ ...bergesInput, estimationMode: "nuitée" });
    expect(a.nightly.seasons).toEqual(b.nightly.seasons);
  });
});

describe("Déterminisme (rapports PDF reproductibles)", () => {
  it("même bien → résultat strictement identique", () => {
    const a = computeRentEstimation(bergesInput);
    const b = computeRentEstimation(bergesInput);
    expect(a).toEqual(b);
  });

  it("les comparables locatifs sont déterministes", () => {
    const a = computeRentEstimation(bergesInput);
    const b = computeRentEstimation(bergesInput);
    expect(a.comparableRentals).toEqual(b.comparableRentals);
    expect(a.comparableRentals).toHaveLength(5);
  });

  it("le TND/m² des comparables est cohérent avec prix ÷ surface", () => {
    const r = computeRentEstimation(bergesInput);
    for (const c of r.comparableRentals) {
      const perSqm = c.rent / c.surface;
      expect(Math.abs(perSqm - c.rentPerSqm)).toBeLessThan(1.0);
    }
  });
});

describe("Rendement & durée de location", () => {
  it("rendement brut annuel réaliste (2-10 %)", () => {
    const r = computeRentEstimation(bergesInput);
    expect(r.grossYield).toBeGreaterThan(2);
    expect(r.grossYield).toBeLessThan(10);
    expect(r.saleValue).toBeGreaterThan(0);
  });

  it("loyer annuel = loyer mensuel × 12", () => {
    const r = computeRentEstimation(bergesInput);
    expect(r.annualRent).toBe(r.estimatedRent * 12);
  });

  it("durée moyenne définie pour les 7 types locatifs", () => {
    expect(RENT_DURATION_BY_TYPE.appartement).toBeGreaterThan(0);
    expect(RENT_DURATION_BY_TYPE.local_commercial).toBeGreaterThanOrEqual(
      RENT_DURATION_BY_TYPE.studio,
    );
  });
});

describe("Prévisions des loyers (6 / 12 / 24 mois)", () => {
  it("génère 4 points [aujourd'hui, +6m, +12m, +24m] croissants à Tunis", () => {
    const r = computeRentEstimation(bergesInput);
    expect(r.forecast).toHaveLength(4);
    expect(r.forecast[0].months).toBe(0);
    expect(r.forecast[3].months).toBe(24);
    for (let i = 1; i < r.forecast.length; i++) {
      expect(r.forecast[i].rent).toBeGreaterThanOrEqual(r.forecast[i - 1].rent);
    }
  });

  it("Tunis → tendance hausse avec variation 12 mois positive", () => {
    const r = computeRentEstimation(bergesInput);
    expect(r.forecastSummary.trend).toBe("hausse");
    expect(r.forecastSummary.change12m).toBeGreaterThan(0);
    expect(r.forecastSummary.confidence).toBeGreaterThan(60);
    expect(r.forecastSummary.message.length).toBeGreaterThan(20);
  });

  it("Tataouine → niveau de loyer très faible", () => {
    const r = computeRentEstimation({
      gouvernorat: "Tataouine",
      ville: "Tataouine Ville",
      propertyType: "appartement",
      builtSurface: 90,
    });
    expect(r.marketAverages.level).toBe("tres_faible");
    expect(r.estimatedRent).toBeLessThan(400);
  });
});

describe("Équipements & finition", () => {
  it("un bien meublé se loue plus cher que le même non meublé", () => {
    const bare = computeRentEstimation(bergesInput);
    const furnished = computeRentEstimation({ ...bergesInput, isFurnished: true });
    expect(furnished.estimatedRent).toBeGreaterThan(bare.estimatedRent);
  });

  it("le loyer meublé augmente nettement (+16 %)", () => {
    const bare = computeRentEstimation(bergesInput);
    const furnished = computeRentEstimation({ ...bergesInput, isFurnished: true });
    const ratio = furnished.estimatedRent / bare.estimatedRent;
    expect(ratio).toBeGreaterThan(1.15);
    expect(ratio).toBeLessThan(1.18);
  });

  it("la piscine apporte une majoration nette (+14 %)", () => {
    const bare = computeRentEstimation(bergesInput);
    const pool = computeRentEstimation({ ...bergesInput, hasPool: true });
    const ratio = pool.estimatedRent / bare.estimatedRent;
    expect(ratio).toBeGreaterThan(1.12);
    expect(ratio).toBeLessThan(1.16);
  });

  it("le cumul des équipements est plafonné à +50 %", () => {
    const bare = computeRentEstimation(bergesInput);
    const all = computeRentEstimation({
      ...bergesInput,
      isFurnished: true,
      hasEquippedKitchen: true,
      hasFiber: true,
      hasInternet: true,
      hasCameras: true,
      hasSmartHome: true,
      hasSolar: true,
      hasAC: true,
      hasHeating: true,
      hasElevator: true,
      hasParking: true,
      hasGarden: true,
      hasPool: true,
      hasTerrace: true,
      hasBalcony: true,
    });
    const ratio = all.estimatedRent / bare.estimatedRent;
    expect(ratio).toBeGreaterThan(1.45);
    expect(ratio).toBeLessThan(1.52);
  });

  it("la finition luxe dépasse la finition économique", () => {
    const eco = computeRentEstimation({ ...bergesInput, finishLevel: "economique" });
    const luxe = computeRentEstimation({ ...bergesInput, finishLevel: "luxe" });
    expect(luxe.estimatedRent).toBeGreaterThan(eco.estimatedRent);
  });

  it("RENT_FEATURE_VALUES couvre les équipements locatifs clés (meublé > piscine > balcon)", () => {
    expect(RENT_FEATURE_VALUES.isFurnished).toBeGreaterThanOrEqual(0.15);
    expect(RENT_FEATURE_VALUES.hasPool).toBeGreaterThanOrEqual(0.12);
    expect(RENT_FEATURE_VALUES.isFurnished).toBeGreaterThan(RENT_FEATURE_VALUES.hasPool);
    expect(RENT_FEATURE_VALUES.hasPool).toBeGreaterThan(RENT_FEATURE_VALUES.hasBalcony);
  });
});

describe("Conseiller IA & indicateurs de marché", () => {
  it("répond aux 5 questions du conseiller avec des réponses détaillées", () => {
    const r = computeRentEstimation(bergesInput);
    expect(r.advisor.questions).toHaveLength(5);
    for (const qa of r.advisor.questions) {
      expect(qa.q.length).toBeGreaterThan(10);
      expect(qa.a.length).toBeGreaterThan(40);
    }
  });

  it("facteurs positifs et suggestions d'amélioration présents", () => {
    const r = computeRentEstimation(bergesInput);
    expect(r.positiveFactors.length).toBeGreaterThan(0);
    expect(r.improvementSuggestions.length).toBeGreaterThan(0);
  });

  it("les zones vedettes du tableau de bord sont cohérentes", () => {
    const h = getRentMarketHighlights();
    expect(h.hotZones.length).toBeGreaterThan(3);
    expect(h.bestYields[0].yield).toBeGreaterThan(h.hotZones[0].yield);
  });

  it("la classification par niveau est monotone", () => {
    expect(rentLevelFor(20, "appartement")).toBe("tres_eleve");
    expect(rentLevelFor(2, "appartement")).toBe("tres_faible");
  });
});

describe("Garde-fou du comparatif « Location vs Vente »", () => {
  // Types de vente non pris en charge par le moteur de location :
  // le comparatif doit être masqué (sinon ratio « appartement » trompeur).
  const unsupported = [
    "immeuble", "magasin", "restaurant", "cafe", "entrepot", "atelier",
    "terrain_constructible", "terrain_agricole", "ferme", "garage",
    "parking", "depot", "mixte",
  ] as const;

  it("s'affiche pour les 7 types supportés par le moteur de location", () => {
    expect(RENT_PROPERTY_TYPES).toHaveLength(7);
    for (const t of RENT_PROPERTY_TYPES) {
      expect(canShowRentComparison({ propertyType: t, builtSurface: 100 })).toBe(true);
    }
  });

  it("est masqué pour les 13 types de vente non supportés (immeuble, terrain, garage…)", () => {
    expect(unsupported).toHaveLength(PROPERTY_TYPES.length - RENT_PROPERTY_TYPES.length);
    for (const t of unsupported) {
      expect(canShowRentComparison({ propertyType: t, builtSurface: 100 })).toBe(false);
    }
  });

  it("les 7 types locatifs sont tous des types de vente valides", () => {
    for (const t of RENT_PROPERTY_TYPES) {
      expect(PROPERTY_TYPES).toContain(t);
    }
  });

  it("est masqué si le bien est absent ou sans type renseigné", () => {
    expect(canShowRentComparison(null)).toBe(false);
    expect(canShowRentComparison(undefined)).toBe(false);
    expect(canShowRentComparison({ propertyType: "", builtSurface: 100 })).toBe(false);
    expect(canShowRentComparison({ propertyType: "inconnu", builtSurface: 100 })).toBe(false);
  });

  it("est masqué si la surface construite est absente, nulle ou négative", () => {
    expect(canShowRentComparison({ propertyType: "appartement" })).toBe(false);
    expect(canShowRentComparison({ propertyType: "appartement", builtSurface: 0 })).toBe(false);
    expect(canShowRentComparison({ propertyType: "appartement", builtSurface: -5 })).toBe(false);
  });

  it("simule la décision de la page EstimationResult (section affichée ou non)", () => {
    // Reproduit exactement le garde-fou utilisé par EstimationResult.tsx.
    const section = (p: { propertyType?: string; builtSurface?: number } | null) =>
      canShowRentComparison(p) ? "section affichée" : null;
    expect(section({ propertyType: "duplex", builtSurface: 90 })).toBe("section affichée");
    expect(section({ propertyType: "villa", builtSurface: 220 })).toBe("section affichée");
    expect(section({ propertyType: "immeuble", builtSurface: 500 })).toBeNull();
    expect(section({ propertyType: "garage", builtSurface: 20 })).toBeNull();
    expect(section({ propertyType: "appartement" })).toBeNull();
    expect(section(null)).toBeNull();
  });
});
