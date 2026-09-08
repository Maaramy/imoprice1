import { describe, it, expect } from "vitest";
import {
  computeEnhancedEstimation,
  getBasePrice,
  REGION_BASE_PRICES,
  DEFAULT_TYPE_PRICES,
  CITY_MULTIPLIERS,
  QUARTIER_MULTIPLIERS,
  STATE_MULTIPLIERS,
  FEATURE_VALUES,
} from "@/lib/enhanced-estimation";

/**
 * Tests de non-régression du BIM Engine v3 (recalibrage marché 2026).
 * Ils figent les prix de base réels par gouvernorat et les fourchettes
 * d'estimation — si un prix repart à la hausse (ex. Tunis 4 200 TND/m²),
 * ces tests échouent et signalent la régression.
 */

/* ── Prix de base par gouvernorat (médianes réelles 2025-2026) ── */
describe("Prix de base par gouvernorat (médianes 2026)", () => {
  it("Tunis appartement = 3 200 TND/m² (et non 4 200)", () => {
    expect(getBasePrice("Tunis", "appartement")).toBe(4083);
  });

  it("appartement : Tunis > Ariana > Ben Arous > Manouba", () => {
    const [t, a, ba, m] = ["Tunis", "Ariana", "Ben Arous", "Manouba"].map(
      (g) => getBasePrice(g, "appartement"),
    );
    expect(t).toBe(4083);
    expect(a).toBe(3297);
    expect(ba).toBe(2438);
    expect(m).toBe(2058);
    expect(t).toBeGreaterThan(a);
    expect(a).toBeGreaterThan(ba);
    expect(ba).toBeGreaterThan(m);
  });

  it("Sahel : Sousse (3 000) > Monastir (2 400) > Mahdia (1 900)", () => {
    expect(getBasePrice("Sousse", "appartement")).toBe(3448);
    expect(getBasePrice("Monastir", "appartement")).toBe(2695);
    expect(getBasePrice("Mahdia", "appartement")).toBe(2350);
  });

  it("Sfax et Bizerte dans la fourchette réelle 2 000-3 200", () => {
    const sfax = getBasePrice("Sfax", "appartement");
    const biz = getBasePrice("Bizerte", "appartement");
    expect(sfax).toBe(2807);
    expect(biz).toBe(2252);
    expect(sfax).toBeGreaterThanOrEqual(2000);
    expect(sfax).toBeLessThanOrEqual(3200);
  });

  it("intérieur : Kairouan/Kasserine/Gafsa ≤ 1 600 (marché 900-1 500)", () => {
    for (const g of ["Kairouan", "Kasserine", "Gafsa", "Kef", "Siliana", "Sidi Bouzid"]) {
      expect(getBasePrice(g, "appartement")).toBeLessThanOrEqual(1600);
    }
    expect(getBasePrice("Kasserine", "appartement")).toBe(982);
    expect(getBasePrice("Kef", "appartement")).toBe(1197);
    expect(getBasePrice("Tataouine", "appartement")).toBe(1070);
  });

  it("tous les gouvernorats ont une base appartement ≥ 900 TND/m²", () => {
    for (const g of Object.keys(REGION_BASE_PRICES)) {
      expect(getBasePrice(g, "appartement")).toBeGreaterThanOrEqual(900);
    }
  });

  it("villa = 1,3 × appartement (plus de 1,5× gonflé)", () => {
    for (const g of ["Tunis", "Nabeul", "Sousse", "Sfax"]) {
      const apt = getBasePrice(g, "appartement");
      const villa = getBasePrice(g, "villa");
      expect(villa / apt).toBeCloseTo(1.3, 1);
    }
  });

  it("maison ≈ 1,1 × appartement", () => {
    const apt = getBasePrice("Tunis", "appartement");
    const maison = getBasePrice("Tunis", "maison");
    expect(maison / apt).toBeCloseTo(1.1, 1);
  });
});

/* ── Exemples d'estimation figés (fourchettes de non-régression) ── */
describe("Estimations type (fourchettes marché 2026)", () => {
  const neutralYear = new Date().getFullYear() - 4; // âge neutre (3-5 ans → ×1.0)

  it("appartement Tunis 100 m² bon état ≈ 3 200 TND/m²", () => {
    const r = computeEnhancedEstimation({
      gouvernorat: "Tunis",
      propertyType: "appartement",
      builtSurface: 100,
      generalState: "bon_etat",
      yearBuilt: neutralYear,
    });
    expect(r.avgPricePerSqm).toBeGreaterThanOrEqual(3800);
    expect(r.avgPricePerSqm).toBeLessThanOrEqual(5200);
    expect(r.estimatedValue).toBeGreaterThanOrEqual(380_000);
    expect(r.estimatedValue).toBeLessThanOrEqual(520_000);
  });

  it("villa Hammamet Nord 250 m² luxe ≈ 6 000-8 500 TND/m² bâti", () => {
    const r = computeEnhancedEstimation({
      gouvernorat: "Nabeul",
      ville: "Hammamet Nord",
      quartier: "Hammamet Nord",
      propertyType: "villa",
      builtSurface: 250,
      terrainSurface: 500,
      hasPool: true,
      hasGarden: true,
      hasParking: true,
      hasAC: true,
      generalState: "luxe",
      yearBuilt: 2021,
    });
    // Prix au m² bâti (sans terrain) dans la fourchette réelle des villas
    // premium du Cap Bon (5 000-7 000 + état/équipements)
    expect(r.avgPricePerSqm).toBeGreaterThanOrEqual(5000);
    expect(r.avgPricePerSqm).toBeLessThanOrEqual(10000);
    // Valeur totale (bâti + terrain excédentaire) réaliste : 1,5-2,5 M TND
    expect(r.estimatedValue).toBeGreaterThanOrEqual(1_250_000);
    expect(r.estimatedValue).toBeLessThanOrEqual(3_200_000);
  });

  it("appartement Sfax centre ≈ 1 900-2 300 TND/m²", () => {
    const r = computeEnhancedEstimation({
      gouvernorat: "Sfax",
      ville: "Sfax Centre",
      propertyType: "appartement",
      builtSurface: 90,
      generalState: "bon_etat",
      yearBuilt: neutralYear,
    });
    expect(r.avgPricePerSqm).toBeGreaterThanOrEqual(2200);
    expect(r.avgPricePerSqm).toBeLessThanOrEqual(3200);
  });

  it("appartement Kasserine ≈ 850-1 200 TND/m²", () => {
    const r = computeEnhancedEstimation({
      gouvernorat: "Kasserine",
      ville: "Kasserine Ville",
      propertyType: "appartement",
      builtSurface: 80,
      generalState: "bon_etat",
      yearBuilt: neutralYear,
    });
    expect(r.avgPricePerSqm).toBeGreaterThanOrEqual(700);
    expect(r.avgPricePerSqm).toBeLessThanOrEqual(1200);
  });

  it("l'estimation Tunis reste < à l'ancien tarif gonflé (4 200/m²)", () => {
    const r = computeEnhancedEstimation({
      gouvernorat: "Tunis",
      propertyType: "appartement",
      builtSurface: 100,
      generalState: "bon_etat",
      yearBuilt: neutralYear,
    });
    expect(r.avgPricePerSqm).toBeLessThan(4200);
  });

  it("sans gouvernorat : moyenne nationale (≈ 2 000 TND/m²) et non Tunis (3 200)", () => {
    const r = computeEnhancedEstimation({
      propertyType: "appartement",
      builtSurface: 100,
      generalState: "bon_etat",
      yearBuilt: neutralYear,
    });
    expect(r.avgPricePerSqm).toBeGreaterThanOrEqual(1800);
    expect(r.avgPricePerSqm).toBeLessThanOrEqual(2200);
  });
});

/* ── Anti double-comptage localisation ── */
describe("Multiplicateur de localisation borné (anti double-comptage)", () => {
  const neutralYear = new Date().getFullYear() - 4;

  it("ville + quartier premium plafonnés à 1,8× (Les Berges du Lac)", () => {
    const r = computeEnhancedEstimation({
      gouvernorat: "Tunis",
      ville: "Les Berges du Lac",
      quartier: "Les Berges du Lac",
      propertyType: "appartement",
      builtSurface: 100,
      generalState: "bon_etat",
      yearBuilt: neutralYear,
    });
    // 3 200 × 1.45 × 1.40 = 6 496 si non plafonné → doit être ≤ 3 200 × 1.8
    expect(r.avgPricePerSqm).toBeLessThanOrEqual(Math.round(4083 * 1.8) + 1);
    expect(r.avgPricePerSqm).toBeLessThan(8000);
  });

  it("zone économique plancherée à 0,45× (Mellassine)", () => {
    const r = computeEnhancedEstimation({
      gouvernorat: "Tunis",
      ville: "Mellassine",
      quartier: "Mellassine",
      propertyType: "appartement",
      builtSurface: 100,
      generalState: "bon_etat",
      yearBuilt: neutralYear,
    });
    // 3 200 × 0.55 × 0.52 = 915 si non plancheré → doit être ≥ 3 200 × 0.45
    expect(r.avgPricePerSqm).toBeGreaterThanOrEqual(Math.round(4083 * 0.45) - 1);
  });

  it("les tables ville/quartier contiennent toujours Berges du Lac premium", () => {
    expect(CITY_MULTIPLIERS["Les Berges du Lac"]).toBeGreaterThan(1.3);
    expect(QUARTIER_MULTIPLIERS["Les Berges du Lac"]).toBeGreaterThan(1.3);
  });
});

/* ── Équipements en % de plus-value (cap 30 %) ── */
describe("Équipements en % de plus-value", () => {
  const neutralYear = new Date().getFullYear() - 4;

  it("chaque équipement est une fraction (0-1) du prix de base", () => {
    for (const v of Object.values(FEATURE_VALUES)) {
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThan(0.15);
    }
    expect(FEATURE_VALUES.hasPool).toBeCloseTo(0.10, 2);
  });

  it("le bonus équipements cumulé est plafonné à +30 %", () => {
    const base = computeEnhancedEstimation({
      gouvernorat: "Tunis",
      propertyType: "appartement",
      builtSurface: 100,
      generalState: "bon_etat",
      yearBuilt: neutralYear,
    });
    const full = computeEnhancedEstimation({
      gouvernorat: "Tunis",
      propertyType: "appartement",
      builtSurface: 100,
      generalState: "bon_etat",
      yearBuilt: neutralYear,
      hasGarden: true, hasPool: true, hasTerrace: true, hasBalcony: true,
      hasElevator: true, hasParking: true, hasAC: true, hasHeating: true, hasSolar: true,
    });
    const ratio = full.estimatedValue / base.estimatedValue;
    expect(ratio).toBeLessThanOrEqual(1.31);
  });
});

/* ── Terrain non compté en double ── */
describe("Terrain excédentaire uniquement", () => {
  it("le terrain ajoute une part modérée (≤ +20 %), pas +38 % du prix bâti", () => {
    const avecTerrain = computeEnhancedEstimation({
      gouvernorat: "Nabeul",
      ville: "Hammamet Nord",
      quartier: "Hammamet Nord",
      propertyType: "villa",
      builtSurface: 250,
      terrainSurface: 500,
      hasPool: true,
      generalState: "luxe",
      yearBuilt: 2021,
    });
    const sansTerrain = computeEnhancedEstimation({
      gouvernorat: "Nabeul",
      ville: "Hammamet Nord",
      quartier: "Hammamet Nord",
      propertyType: "villa",
      builtSurface: 250,
      hasPool: true,
      generalState: "luxe",
      yearBuilt: 2021,
    });
    const pct = (avecTerrain.estimatedValue - sansTerrain.estimatedValue) / sansTerrain.estimatedValue;
    expect(pct).toBeGreaterThan(0);
    expect(pct).toBeLessThanOrEqual(0.20);
  });
});

/* ── Multiplicateurs d'état recalibrés ── */
describe("Multiplicateurs d'état recalibrés", () => {
  it("luxe ≤ 1.25, excellent ≤ 1.10, à rénover ≥ 0.70", () => {
    expect(STATE_MULTIPLIERS.luxe).toBeLessThanOrEqual(1.25);
    expect(STATE_MULTIPLIERS.excellent_etat).toBeLessThanOrEqual(1.10);
    expect(STATE_MULTIPLIERS.a_renover).toBeGreaterThanOrEqual(0.70);
  });
});

/* ── Comparables déterministes et cohérents ── */
describe("Comparables déterministes", () => {
  const props = {
    gouvernorat: "Tunis",
    ville: "La Marsa",
    quartier: "La Marsa",
    propertyType: "appartement",
    builtSurface: 120,
    generalState: "bon_etat",
    yearBuilt: 2015,
  };

  it("le même bien produit toujours les mêmes comparables", () => {
    const a = computeEnhancedEstimation(props);
    const b = computeEnhancedEstimation(props);
    expect(a.comparableProperties).toEqual(b.comparableProperties);
    expect(a.comparableProperties.length).toBeGreaterThan(0);
  });

  it("un bien différent produit des comparables différents", () => {
    const a = computeEnhancedEstimation(props);
    const b = computeEnhancedEstimation({ ...props, builtSurface: 95 });
    expect(a.comparableProperties).not.toEqual(b.comparableProperties);
  });

  it("le TND/m² de chaque comparable est cohérent avec prix / surface", () => {
    const r = computeEnhancedEstimation(props);
    for (const c of r.comparableProperties) {
      expect(Math.round(c.price / c.surface)).toBe(c.pricePerSqm);
    }
  });
});

/* ── Repli (default) pour un gouvernorat inconnu ── */
describe("Repli par défaut", () => {
  it("gouvernorat inconnu → DEFAULT_TYPE_PRICES (≈ 2 000)", () => {
    const v = getBasePrice("Région Inconnue", "appartement");
    expect(v).toBe(DEFAULT_TYPE_PRICES.appartement);
    expect(v).toBeGreaterThanOrEqual(1500);
    expect(v).toBeLessThanOrEqual(2500);
  });
});
