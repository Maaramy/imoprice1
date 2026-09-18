import { describe, expect, it } from "vitest";
import {
  computeInvestmentAnalysis,
  governorateOpportunities,
  loanPayment,
  rankInvestmentZones,
  type InvestmentInput,
} from "../lib/investment-analysis";

const NOW = 1_700_000_000_000;

function makeInput(overrides: Partial<InvestmentInput> = {}): InvestmentInput {
  return {
    investmentType: "appartement",
    gouvernorat: "Sousse",
    ville: "Sousse Ville",
    quartier: "Corniche",
    builtSurface: 120,
    purchasePrice: 300_000,
    monthlyRent: 1_800,
    ...overrides,
  };
}

describe("loanPayment", () => {
  it("calcule une mensualité amortissable", () => {
    const p = loanPayment(200_000, 7, 15);
    expect(p).toBeGreaterThan(1700);
    expect(p).toBeLessThan(1900);
  });

  it("gère un taux nul (mensualité = capital / nombre de mois)", () => {
    expect(loanPayment(120_000, 0, 10)).toBeCloseTo(1000, 5);
  });

  it("renvoie 0 sans capital ou sans durée", () => {
    expect(loanPayment(0, 7, 15)).toBe(0);
    expect(loanPayment(100_000, 7, 0)).toBe(0);
  });
});

describe("computeInvestmentAnalysis — coûts", () => {
  it("ajoute les frais d'acquisition par défaut (8 % du prix)", () => {
    const r = computeInvestmentAnalysis(makeInput(), NOW);
    expect(r.acquisitionFees).toBe(24_000); // 8% de 300 000
    expect(r.totalInvestment).toBe(324_000);
  });

  it("additionne travaux, frais et mobilier", () => {
    const r = computeInvestmentAnalysis(
      makeInput({ worksCost: 40_000, feesCost: 10_000, furnitureCost: 5_000 }),
      NOW,
    );
    expect(r.totalInvestment).toBe(355_000);
  });

  it("respecte les frais d'acquisition explicites (y compris 0)", () => {
    const r = computeInvestmentAnalysis(makeInput({ feesCost: 0 }), NOW);
    expect(r.totalInvestment).toBe(300_000);
  });
});

describe("computeInvestmentAnalysis — rendements", () => {
  it("calcule la rentabilité brute et nette", () => {
    const r = computeInvestmentAnalysis(
      makeInput({
        purchasePrice: 420_000,
        feesCost: 0,
        monthlyRent: 3622.5,
        occupancyRate: 100,
        managementFeeRate: 0,
        annualTaxOverride: 0,
        annualMaintenanceOverride: 0,
      }),
      NOW,
    );
    // Loyers annuels = 43 470 ; assurance = 0,35 % de 420 000 = 1 470
    expect(r.annualGrossIncome).toBe(43_470);
    expect(r.annualOperatingExpenses).toBe(1_470);
    expect(r.netOperatingIncome).toBe(42_000);
    expect(r.grossYield).toBeCloseTo(10.35, 1);
    expect(r.netYield).toBe(10);
  });

  it("applique le taux d'occupation aux revenus locatifs", () => {
    const full = computeInvestmentAnalysis(makeInput({ occupancyRate: 100 }), NOW);
    const half = computeInvestmentAnalysis(makeInput({ occupancyRate: 50 }), NOW);
    expect(half.annualGrossIncome).toBeCloseTo(full.annualGrossIncome / 2, 0);
  });

  it("produit un cash-flow positif quand les loyers couvrent les charges", () => {
    const r = computeInvestmentAnalysis(makeInput({ monthlyRent: 3_000 }), NOW);
    expect(r.annualCashFlow).toBeGreaterThan(0);
    expect(r.monthlyCashFlow).toBeGreaterThan(0);
  });

  it("produit un cash-flow négatif quand les loyers sont trop faibles", () => {
    const r = computeInvestmentAnalysis(makeInput({ monthlyRent: 200, monthlyCharges: 800 }), NOW);
    expect(r.annualCashFlow).toBeLessThan(0);
    expect(r.monthlyCashFlow).toBeLessThan(0);
  });
});

describe("computeInvestmentAnalysis — financement", () => {
  it("déduit le service de la dette du cash-flow", () => {
    const noLoan = computeInvestmentAnalysis(makeInput({ monthlyRent: 3_000 }), NOW);
    const withLoan = computeInvestmentAnalysis(
      makeInput({ monthlyRent: 3_000, loanAmount: 200_000, loanRate: 7, loanYears: 15 }),
      NOW,
    );
    expect(withLoan.annualDebtService).toBeGreaterThan(0);
    expect(withLoan.annualCashFlow).toBeLessThan(noLoan.annualCashFlow);
    expect(withLoan.loanAmount).toBe(200_000);
  });
});

describe("computeInvestmentAnalysis — récupération du capital", () => {
  it("reproduit l'exemple de la spécification : 420 000 / 42 000 = 10 ans", () => {
    const r = computeInvestmentAnalysis(
      makeInput({
        purchasePrice: 420_000,
        feesCost: 0,
        monthlyRent: 3622.5,
        occupancyRate: 100,
        managementFeeRate: 0,
        annualTaxOverride: 0,
        annualMaintenanceOverride: 0,
      }),
      NOW,
    );
    expect(r.paybackYears).toBeCloseTo(10, 1);
    expect(r.paybackLabel).toContain("10");
    expect(r.paybackDate).toBeGreaterThan(NOW);
  });

  it("marque l'investissement non récupérable si le revenu net est négatif", () => {
    const r = computeInvestmentAnalysis(
      makeInput({ monthlyRent: 100, monthlyCharges: 2_000 }),
      NOW,
    );
    expect(Number.isFinite(r.paybackYears)).toBe(false);
    expect(r.paybackLabel).toBe("Non récupérable");
    expect(r.paybackDate).toBe(0);
  });
});

describe("computeInvestmentAnalysis — ROI et projections", () => {
  const r = computeInvestmentAnalysis(makeInput({ monthlyRent: 2_500 }), NOW);

  it("produit 10 années de projections", () => {
    expect(r.projections).toHaveLength(10);
    expect(r.projections[0].year).toBe(1);
    expect(r.projections[9].year).toBe(10);
  });

  it("fait croître la valeur du bien et le patrimoine", () => {
    expect(r.projections[9].propertyValue).toBeGreaterThan(r.projections[0].propertyValue);
    expect(r.projections[9].totalWealth).toBeGreaterThan(0);
  });

  it("expose 4 jalons de bénéfices (1, 3, 5, 10 ans)", () => {
    expect(r.benefits.map((b) => b.year)).toEqual([1, 3, 5, 10]);
    for (const b of r.benefits) {
      expect(b.futurePropertyValue).toBeGreaterThan(0);
      expect(Number.isFinite(b.cumulatedProfit)).toBe(true);
    }
  });

  it("ordonne les ROI : 10 ans > 5 ans", () => {
    expect(r.roi10).toBeGreaterThan(r.roi5);
  });
});

describe("computeInvestmentAnalysis — scénarios", () => {
  const r = computeInvestmentAnalysis(makeInput({ monthlyRent: 2_400 }), NOW);
  const byKey = Object.fromEntries(r.scenarios.map((s) => [s.key, s]));

  it("expose les trois scénarios", () => {
    expect(r.scenarios.map((s) => s.key)).toEqual(["optimiste", "realiste", "prudent"]);
  });

  it("classe les performances : optimiste > réaliste > prudent", () => {
    expect(byKey.optimiste.futureValue).toBeGreaterThan(byKey.realiste.futureValue);
    expect(byKey.realiste.futureValue).toBeGreaterThan(byKey.prudent.futureValue);
    expect(byKey.optimiste.roi10).toBeGreaterThan(byKey.prudent.roi10);
  });

  it("associe des risques à chaque scénario", () => {
    for (const s of r.scenarios) {
      expect(s.risks.length).toBeGreaterThan(0);
      expect(["faible", "modéré", "élevé"]).toContain(s.riskLevel);
    }
  });
});

describe("computeInvestmentAnalysis — comparaison et score", () => {
  const r = computeInvestmentAnalysis(makeInput(), NOW);

  it("compare cinq types d'investissement", () => {
    expect(r.comparison).toHaveLength(5);
    expect(r.comparison.map((c) => c.type)).toEqual([
      "appartement",
      "villa",
      "local_commercial",
      "bureau",
      "terrain_constructible",
    ]);
    for (const c of r.comparison) {
      expect(c.grossYield).toBeGreaterThanOrEqual(0);
      expect(c.pricePerSqm).toBeGreaterThan(0);
      expect(c.rentPerSqm).toBeGreaterThanOrEqual(0);
    }
  });

  it("attribue un score sur 100 avec des critères pondérés", () => {
    expect(r.score.total).toBeGreaterThanOrEqual(0);
    expect(r.score.total).toBeLessThanOrEqual(100);
    expect(r.score.criteria).toHaveLength(6);
    const weightSum = r.score.criteria.reduce((s, c) => s + c.weight, 0);
    expect(weightSum).toBeCloseTo(1, 5);
    expect(["excellent", "good", "average", "poor"]).toContain(r.score.tone);
    expect(r.score.grade.length).toBeGreaterThan(0);
  });

  it("fournit des recommandations et une analyse qualitative", () => {
    expect(r.recommendations.length).toBeGreaterThan(0);
    expect(r.risks.length).toBeGreaterThan(0);
    expect(r.positiveFactors.length + r.negativeFactors.length).toBeGreaterThan(0);
  });

  it("génère un assistant IA de 6 questions/réponses non vides", () => {
    expect(r.assistant).toHaveLength(6);
    for (const qa of r.assistant) {
      expect(qa.q.length).toBeGreaterThan(0);
      expect(qa.a.length).toBeGreaterThan(0);
    }
  });
});

describe("computeInvestmentAnalysis — marché", () => {
  it("résout la zone de marché et la valeur estimée", () => {
    const r = computeInvestmentAnalysis(makeInput(), NOW);
    expect(r.market.pricePerSqm).toBeGreaterThan(0);
    expect(r.market.rentPerSqm).toBeGreaterThan(0);
    expect(r.market.marketValue).toBeGreaterThan(0);
    expect(r.market.zoneLabel).toContain("Sousse");
  });

  it("signale une acquisition en-dessous du marché", () => {
    const cheap = computeInvestmentAnalysis(
      makeInput({ purchasePrice: 100_000, feesCost: 0 }),
      NOW,
    );
    expect(cheap.market.valueGapPct).toBeGreaterThan(0);
  });
});

describe("rankInvestmentZones", () => {
  it("classe les zones par score décroissant", () => {
    const zones = rankInvestmentZones(10);
    expect(zones).toHaveLength(10);
    for (let i = 1; i < zones.length; i++) {
      expect(zones[i - 1].score).toBeGreaterThanOrEqual(zones[i].score);
    }
  });

  it("respecte la limite demandée et renseigne les indicateurs", () => {
    const zones = rankInvestmentZones(3, "local_commercial");
    expect(zones).toHaveLength(3);
    for (const z of zones) {
      expect(z.pricePerSqm).toBeGreaterThan(0);
      expect(z.grossYield).toBeGreaterThan(0);
      expect(z.quarter.length).toBeGreaterThan(0);
    }
  });
});

describe("governorateOpportunities", () => {
  it("renvoie les 24 gouvernorats triés par rendement brut", () => {
    const rows = governorateOpportunities();
    expect(rows).toHaveLength(24);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].grossYield).toBeGreaterThanOrEqual(rows[i].grossYield);
    }
    expect(rows[0].grossYield).toBeGreaterThan(0);
  });
});
