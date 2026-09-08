import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import React from "react";
import RentEstimationResult from "@/pages/RentEstimationResult";

/* ── Mutable mock state (overridden per test) ── */
const { mockState } = vi.hoisted(() => ({
  mockState: {
    agencies: [] as any[],
    // null simule un résultat d'erreur : le garde du composant doit tenir
    agencyResponses: null as any,
    sendRentToAgency: vi.fn(() => Promise.resolve({})),
    deleteRentEstimation: vi.fn(() => Promise.resolve({})),
    // Journal des appels useQuery pour vérifier le comportement "skip" en démo
    queryCalls: [] as Array<{ ref: string; args: any }>,
  },
}));

/* Mock the generated api as plain string paths so useQuery can identify each query */
vi.mock("@/convex/_generated/api", () => ({
  api: {
    rent: {
      getRentEstimation: "rent:getRentEstimation",
      deleteRentEstimation: "rent:deleteRentEstimation",
    },
    agencies: {
      sendRentEstimationToAgency: "agencies:sendRentEstimationToAgency",
      getActiveAgencies: "agencies:getActiveAgencies",
      getAgencyResponsesForRentEstimation: "agencies:getAgencyResponsesForRentEstimation",
    },
  },
}));

vi.mock("convex/react", () => ({
  useQuery: (ref: string, args?: any) => {
    mockState.queryCalls.push({ ref, args });
    switch (ref) {
      case "rent:getRentEstimation":
        // Mode démo : aucun dossier Convex — la page calcule le résultat localement.
        return null;
      case "agencies:getActiveAgencies":
        return mockState.agencies;
      case "agencies:getAgencyResponsesForRentEstimation":
        return mockState.agencyResponses;
      default:
        return null;
    }
  },
  useMutation: (ref: string) => {
    if (ref === "agencies:sendRentEstimationToAgency") return mockState.sendRentToAgency;
    if (ref === "rent:deleteRentEstimation") return mockState.deleteRentEstimation;
    return vi.fn(() => Promise.resolve({}));
  },
}));

beforeEach(() => {
  mockState.agencies = [];
  mockState.agencyResponses = null;
  mockState.sendRentToAgency.mockClear();
  mockState.deleteRentEstimation.mockClear();
  mockState.queryCalls.length = 0;
  sessionStorage.clear();
});

function renderDemoRoute() {
  return render(
    <MemoryRouter initialEntries={["/estimate/loyer/demo"]}>
      <Routes>
        <Route path="/estimate/loyer/:id" element={<RentEstimationResult />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Route démo /estimate/loyer/demo — flux sans étapes de saisie", () => {
  it("affiche le résultat directement (bannière démo + maison de 120 m² à Nabeul)", async () => {
    renderDemoRoute();

    // Bannière « Exemple de démonstration » (la page n'a PAS besoin d'un dossier Convex)
    expect((await screen.findAllByText(/Exemple de démonstration/)).length).toBeGreaterThan(0);

    // Détails du bien démo (maison à Nabeul, 120 m²)
    expect(screen.getByText("Maison")).toBeInTheDocument();
    expect(screen.getAllByText(/Nabeul/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("120 m²").length).toBeGreaterThan(0);

    // Les deux volets sont disponibles : loyer mensuel ET nuitée (zone touristique)
    expect(screen.getByRole("button", { name: "Mensuel" })).toBeInTheDocument();
    const nuitBtn = screen.getByRole("button", { name: "Nuitée" });
    expect(nuitBtn).toBeEnabled();
  });

  it("ne déclenche aucune requête Convex avec un rentEstimationId (requêtes sautées en démo)", async () => {
    renderDemoRoute();
    await screen.findByText("Maison");

    const ids = mockState.queryCalls.filter((c) => c.args && typeof c.args !== "string" && c.args.rentEstimationId !== undefined);
    // Aucun appel de query ne doit porter un rentEstimationId : getRentEstimation et
    // getAgencyResponsesForRentEstimation reçoivent "skip" en mode démo.
    expect(ids).toHaveLength(0);

    const est = mockState.queryCalls.find((c) => c.ref === "rent:getRentEstimation");
    const resp = mockState.queryCalls.find((c) => c.ref === "agencies:getAgencyResponsesForRentEstimation");
    expect(est?.args).toBe("skip");
    expect(resp?.args).toBe("skip");
  });

  it("masque les actions liées à un vrai dossier : suppression et partage de lien", async () => {
    renderDemoRoute();
    await screen.findByText("Maison");

    // Pas de bouton de suppression en mode démo (aucun dossier Convex)
    expect(screen.queryByRole("button", { name: /Supprimer l'estimation/ })).not.toBeInTheDocument();

    // Le partage de lien est bloqué en démo : un toast d'info remplace la copie
    await userEvent.click(screen.getByRole("button", { name: /Partager/ }));
    expect(mockState.queryCalls.find((c) => c.ref === "rent:getRentEstimation")?.args).toBe("skip");
    expect(screen.queryByText("Lien copié")).not.toBeInTheDocument();
  });

  it("désactive l'envoi à une agence en mode démo", async () => {
    mockState.agencies = [
      {
        _id: "agence-demo-1",
        name: "Agence Test Nabeul",
        phone: "+216 00 000 000",
        address: "Avenue Habib Bourguiba",
        regions: ["Nabeul"],
        specialties: ["location"],
        rating: 4.5,
      },
    ];
    renderDemoRoute();
    await screen.findByText("Maison");

    await userEvent.click(screen.getByRole("tab", { name: "Agences" }));
    await userEvent.click(await screen.findByRole("button", { name: "Envoyer" }));

    // Le dialogue s'ouvre mais l'envoi est désactivé en démo
    expect(screen.getByText(/Envoyer à Agence Test Nabeul/)).toBeInTheDocument();
    const sendBtn = screen.getByRole("button", { name: /Exemple — envoi désactivé/ });
    expect(sendBtn).toBeDisabled();
    await userEvent.click(sendBtn);
    expect(mockState.sendRentToAgency).not.toHaveBeenCalled();
  });
});
