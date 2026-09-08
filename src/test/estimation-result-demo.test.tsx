import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import React from "react";
import EstimationResult from "@/pages/EstimationResult";

/* ── Mutable mock state (overridden per test) ── */
const { mockState } = vi.hoisted(() => ({
  mockState: {
    remaining: {
      canEstimate: true,
      estimationsLimit: 10,
      remaining: 8,
      planType: "pro",
      reason: "",
    },
    agencies: [] as any[],
    // null simule un résultat d'erreur : le garde du composant doit tenir
    agencyResponses: null as any,
    shareToken: vi.fn(() => Promise.resolve("demo-token")),
    sendToAgency: vi.fn(() => Promise.resolve({})),
    // Journal des appels useQuery pour vérifier le comportement "skip" en démo
    queryCalls: [] as Array<{ ref: string; args: any }>,
  },
}));

/* Mock the generated api as plain string paths so useQuery can identify each query */
vi.mock("@/convex/_generated/api", () => ({
  api: {
    estimation: {
      getEstimation: "estimation:getEstimation",
      reEstimateProperty: "estimation:reEstimateProperty",
      getPropertyHistory: "estimation:getPropertyHistory",
    },
    alerts: {
      createPriceAlert: "alerts:createPriceAlert",
      getMyPriceAlerts: "alerts:getMyPriceAlerts",
      deletePriceAlert: "alerts:deletePriceAlert",
    },
    reports: { createShareToken: "reports:createShareToken" },
    plans: { remainingEstimations: "plans:remainingEstimations" },
    agencies: {
      sendEstimationToAgency: "agencies:sendEstimationToAgency",
      getActiveAgencies: "agencies:getActiveAgencies",
      getAgencyResponsesForEstimation: "agencies:getAgencyResponsesForEstimation",
    },
  },
}));

vi.mock("convex/react", () => ({
  useQuery: (ref: string, args?: any) => {
    mockState.queryCalls.push({ ref, args });
    switch (ref) {
      case "estimation:getEstimation":
        // Mode démo : aucun dossier Convex — la page calcule le résultat localement.
        return null;
      case "plans:remainingEstimations":
        return mockState.remaining;
      case "estimation:getPropertyHistory":
        return { history: [] };
      case "agencies:getActiveAgencies":
        return mockState.agencies;
      case "agencies:getAgencyResponsesForEstimation":
        return mockState.agencyResponses;
      default:
        return null;
    }
  },
  useMutation: (ref: string) => {
    if (ref === "reports:createShareToken") return mockState.shareToken;
    if (ref === "agencies:sendEstimationToAgency") return mockState.sendToAgency;
    return vi.fn(() => Promise.resolve({}));
  },
}));

beforeEach(() => {
  mockState.remaining = { canEstimate: true, estimationsLimit: 10, remaining: 8, planType: "pro", reason: "" };
  mockState.agencies = [];
  mockState.agencyResponses = null;
  mockState.shareToken.mockClear();
  mockState.sendToAgency.mockClear();
  mockState.queryCalls.length = 0;
  localStorage.clear();
});

function renderDemoRoute() {
  return render(
    <MemoryRouter initialEntries={["/estimate/demo"]}>
      <Routes>
        <Route path="/estimate/:id" element={<EstimationResult />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Route démo /estimate/demo — flux sans étapes de saisie", () => {
  it("affiche le résultat directement (bannière démo + valeur estimée + bien de Béja)", async () => {
    renderDemoRoute();

    // Bannière « Exemple de démonstration » (la page n'a PAS besoin d'un dossier Convex)
    expect((await screen.findAllByText(/Exemple de démonstration/)).length).toBeGreaterThan(0);

    // Valeur estimée calculée localement par le BIM Engine
    expect(screen.getByText("Valeur estimée")).toBeInTheDocument();

    // Détails du bien démo (maison à Béja)
    expect(screen.getAllByText("Maison individuelle").length).toBeGreaterThan(0);
    expect(screen.getByText("Béja")).toBeInTheDocument();

    // Le comparatif Location vs Vente (maison = type supporté par le moteur locatif) est présent
    expect(screen.getByText(/Quelle stratégie valorise le mieux votre bien \?/)).toBeInTheDocument();
  });

  it("ne déclenche aucune requête Convex avec un estimationId (requêtes sautées en démo)", async () => {
    renderDemoRoute();
    await screen.findByText("Valeur estimée");

    const ids = mockState.queryCalls.filter((c) => c.args && typeof c.args !== "string" && c.args.estimationId !== undefined);
    // Aucun appel de query ne doit porter un estimationId : getEstimation et
    // getAgencyResponsesForEstimation reçoivent "skip" en mode démo.
    expect(ids).toHaveLength(0);

    const est = mockState.queryCalls.find((c) => c.ref === "estimation:getEstimation");
    const resp = mockState.queryCalls.find((c) => c.ref === "agencies:getAgencyResponsesForEstimation");
    expect(est?.args).toBe("skip");
    expect(resp?.args).toBe("skip");
  });

  it("masque les actions liées à un vrai dossier : re-estimation et bandeau de quota", async () => {
    renderDemoRoute();
    await screen.findByText("Valeur estimée");

    // Pas de bouton d'actualisation / re-estimation en mode démo
    expect(screen.queryByLabelText("Actualiser l'estimation")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Mise à jour en cours")).not.toBeInTheDocument();

    // Pas de bandeau de quota même si le quota serait atteint (mocké ici comme non atteint)
    expect(screen.queryByText(/Quota d'estimations atteint/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Essai gratuit terminé/)).not.toBeInTheDocument();
  });

  it("bloque le partage de rapport en mode démo (aucune mutation createShareToken)", async () => {
    renderDemoRoute();
    await screen.findByText("Valeur estimée");

    await userEvent.click(screen.getByLabelText("Partager le rapport"));

    // La mutation n'est jamais appelée en démo
    expect(mockState.shareToken).not.toHaveBeenCalled();
    // Aucun lien de partage n'est généré
    await waitFor(() => {
      expect(screen.queryByText(/Scannez pour consulter ce rapport/)).not.toBeInTheDocument();
    });
  });

  it("désactive l'envoi à une agence en mode démo", async () => {
    mockState.agencies = [
      {
        _id: "agence-demo-1",
        name: "Agence Test Béja",
        phone: "+216 00 000 000",
        address: "Avenue Habib Bourguiba",
        regions: ["Béja"],
        specialties: ["vente"],
        rating: 4.5,
      },
    ];
    renderDemoRoute();
    await screen.findByText("Valeur estimée");

    await userEvent.click(screen.getByRole("tab", { name: "Agences" }));
    await userEvent.click(await screen.findByRole("button", { name: "Envoyer" }));

    // Le dialogue s'ouvre mais l'envoi est désactivé en démo
    expect(screen.getByText(/Envoyer à Agence Test Béja/)).toBeInTheDocument();
    const sendBtn = screen.getByRole("button", { name: /Exemple — envoi désactivé/ });
    expect(sendBtn).toBeDisabled();
    await userEvent.click(sendBtn);
    expect(mockState.sendToAgency).not.toHaveBeenCalled();
  });

  it("« Modifier » charge le bien démo dans le formulaire (brouillon localStorage)", async () => {
    renderDemoRoute();
    await screen.findByText("Valeur estimée");

    await userEvent.click(screen.getByLabelText("Modifier l'estimation"));

    const draft = JSON.parse(localStorage.getItem("imoprice_draft") || "{}");
    expect(draft.gouvernorat).toBe("Béja");
    expect(draft.ville).toBe("Béja Ville");
    expect(draft.propertyType).toBe("maison");
    expect(String(draft.builtSurface)).toBe("110");
  });
});
