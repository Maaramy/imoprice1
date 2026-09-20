import { describe, expect, it } from "vitest";
import { investmentPrefillFromProject } from "@/lib/investmentPrefill";

describe("investmentPrefillFromProject", () => {
  it("mappe un projet villa vers un pré-remplissage cohérent", () => {
    const prefill = investmentPrefillFromProject({
      name: "Villa Les Oliviers",
      category: "villa",
      region: "Ariana",
      surface: 260,
      constructionCost: 512000,
    });
    expect(prefill.type).toBe("villa");
    expect(prefill.region).toBe("Ariana");
    expect(prefill.purchasePrice).toBe(512000);
    expect(prefill.surface).toBe(260);
    expect(prefill.projectName).toBe("Villa Les Oliviers");
  });

  it("retombe sur Tunis et appartement si région/catégorie inconnues", () => {
    const prefill = investmentPrefillFromProject({ category: "chalet", region: "Inconnue" });
    expect(prefill.type).toBe("appartement");
    expect(prefill.region).toBe("Tunis");
    expect(prefill.city.length).toBeGreaterThan(0);
  });

  it("tolère des valeurs manquantes ou invalides", () => {
    const prefill = investmentPrefillFromProject({ constructionCost: null, surface: null });
    expect(prefill.purchasePrice).toBe(0);
    expect(prefill.surface).toBe(0);
  });

  it("déduit le type depuis un libellé libre", () => {
    expect(investmentPrefillFromProject({ category: "Local commercial" }).type).toBe("local_commercial");
    expect(investmentPrefillFromProject({ category: "maison individuelle" }).type).toBe("maison");
  });
});
