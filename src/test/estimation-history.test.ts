import { describe, expect, it } from "vitest";
import {
  buildRentEstimationEntry,
  buildSaleEstimationEntry,
  iconKindFor,
  summarizeRentEstimations,
  summarizeSaleEstimations,
} from "@/lib/estimationHistory";

describe("estimationHistory", () => {
  const sale = buildSaleEstimationEntry({
    _id: "est1",
    _creationTime: 1_700_000_000_000,
    estimatedValue: 420000,
    priceMin: 357000,
    priceMax: 483000,
    avgPricePerSqm: 2800,
    confidenceIndex: 85,
    property: {
      propertyType: "villa",
      gouvernorat: "Tunis",
      ville: "La Marsa",
      quartier: "Gammarth",
      builtSurface: 150,
    },
  });

  const rent = buildRentEstimationEntry({
    _id: "rent1",
    _creationTime: 1_700_000_000_000,
    estimatedRent: 2400,
    rentMin: 2100,
    rentMax: 2700,
    rentPerSqm: 16,
    grossYield: 6.2,
    confidenceIndex: 72,
    property: {
      propertyType: "appartement",
      gouvernorat: "Tunis",
      ville: "Le Bardo",
      quartier: "Bardo",
      builtSurface: 110,
    },
  });

  it("construit une entrée de vente avec métriques et lien", () => {
    expect(sale.kind).toBe("vente");
    expect(sale.typeLabel).toBe("Villa");
    expect(sale.location).toBe("Gammarth, La Marsa, Tunis");
    expect(sale.estimatedValue).toBe(420000);
    expect(sale.priceMax).toBe(483000);
    expect(sale.surface).toBe(150);
    expect(sale.href).toBe("/estimate/est1");
  });

  it("construit une entrée de loyer avec mode et rendement", () => {
    expect(rent.kind).toBe("loyers");
    expect(rent.typeLabel).toBe("Appartement");
    expect(rent.rentMode).toBe("mensuel");
    expect(rent.estimatedRent).toBe(2400);
    expect(rent.grossYield).toBe(6.2);
    expect(rent.href).toBe("/estimate/loyer/rent1");
  });

  it("détecte le mode nuitée depuis l'estimation courte durée", () => {
    const nightly = buildRentEstimationEntry({
      _id: "rent2",
      _creationTime: 1,
      estimatedRent: 120,
      rentMin: 100,
      rentMax: 150,
      rentPerSqm: 8,
      grossYield: 9,
      confidenceIndex: 60,
      nightly: { nightlyRent: 120 },
      property: { propertyType: "villa" },
    });
    expect(nightly.rentMode).toBe("nuit");
  });

  it("traite une estimation mensuelle même si nightly est présent (régression)", () => {
    // Le moteur calcule `nightly` pour toutes les estimations, y compris mensuelles.
    // Sans estimationMode explicite dans le snapshot, le fallback historical garde
    // la détection nightly — mais avec le mode du formulaire, ça reste mensuel.
    const monthly = buildRentEstimationEntry({
      _id: "rent3",
      _creationTime: 1,
      estimatedRent: 1200,
      rentMin: 1100,
      rentMax: 1300,
      rentPerSqm: 12,
      grossYield: 5,
      confidenceIndex: 70,
      nightly: { nightlyRent: 95 },
      property: { propertyType: "appartement", estimationMode: "mensuel" },
    });
    expect(monthly.rentMode).toBe("mensuel");
  });

  it("détecte le mode nuitée via le snapshot property (estimationMode)", () => {
    const nightly = buildRentEstimationEntry({
      _id: "rent4",
      _creationTime: 1,
      estimatedRent: 90,
      rentMin: 80,
      rentMax: 100,
      rentPerSqm: 6,
      grossYield: 8,
      confidenceIndex: 65,
      property: { propertyType: "villa", estimationMode: "nuitée" },
    });
    expect(nightly.rentMode).toBe("nuit");
  });

  it("tolère les données manquantes", () => {
    const bare = buildSaleEstimationEntry({
      _id: "x",
      _creationTime: 1,
      estimatedValue: 0,
      priceMin: 0,
      priceMax: 0,
      avgPricePerSqm: 0,
      confidenceIndex: 0,
    });
    expect(bare.typeLabel).toBe("Bien immobilier");
    expect(bare.location).toBe("Localisation non renseignée");
    expect(bare.surface).toBeNull();
  });

  it("agrège les statistiques par segment", () => {
    const saleStats = summarizeSaleEstimations([sale]);
    expect(saleStats.count).toBe(1);
    expect(saleStats.totalValue).toBe(420000);
    expect(saleStats.avgConfidence).toBe(85);
    expect(saleStats.bestConfidence).toBe(85);

    const rentStats = summarizeRentEstimations([rent]);
    expect(rentStats.totalValue).toBe(2400);

    expect(summarizeSaleEstimations([])).toEqual({
      count: 0,
      totalValue: 0,
      avgConfidence: 0,
      bestConfidence: 0,
    });
  });

  it("associe le bon type d'icône au type de bien", () => {
    expect(iconKindFor("villa")).toBe("home");
    expect(iconKindFor("appartement")).toBe("building");
    expect(iconKindFor("local_commercial")).toBe("commerce");
    expect(iconKindFor("terrain_constructible")).toBe("land");
    expect(iconKindFor(null)).toBe("building");
  });
});
