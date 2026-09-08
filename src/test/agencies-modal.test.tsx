import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import React from "react";
import Agencies from "@/pages/Agencies";

/* ── Mutable mock state (overridden per test) ── */
const { mockState } = vi.hoisted(() => ({
  mockState: {
    profile: {
      _id: "ag-1",
      name: "Agence Immobilière Tunis",
      regions: ["Tunis", "Ariana"],
      address: "12 Avenue Habib Bourguiba, Tunis",
      phone: "+216 71 234 567",
      email: "contact@agencetunis.tn",
      description: "Agence spécialisée en résidentiel et luxe",
      specialties: ["résidentiel", "luxe"],
      website: "https://agencetunis.tn",
      logoUrl: null,
    },
    requests: [] as any[],
    mySub: { planType: "agence", status: "active", trialEndDate: null },
    registerAgency: vi.fn(() => Promise.resolve({ _id: "ag-1" })),
  },
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: { name: "Agent", email: "contact@agencetunis.tn" },
    isLoading: false,
    isAuthenticated: true,
    signOut: vi.fn(),
  }),
}));

/* Mock the generated api as plain string paths so useQuery can identify each query */
vi.mock("@/convex/_generated/api", () => ({
  api: {
    agencies: {
      getMyAgencyProfile: "agencies:getMyAgencyProfile",
      getMyAgencyRequests: "agencies:getMyAgencyRequests",
      registerAgencyProfile: "agencies:registerAgencyProfile",
      updateRequestStatus: "agencies:updateRequestStatus",
      deleteAgencyRequest: "agencies:deleteAgencyRequest",
      suggestPrice: "agencies:suggestPrice",
      sendAgencyMessage: "agencies:sendAgencyMessage",
    },
    plans: {
      mySubscription: "plans:mySubscription",
      subscribeToPlan: "plans:subscribeToPlan",
    },
  },
}));

vi.mock("convex/react", () => ({
  useQuery: (ref: string) => {
    if (ref === "agencies:getMyAgencyProfile") return mockState.profile;
    if (ref === "agencies:getMyAgencyRequests") return mockState.requests;
    if (ref === "plans:mySubscription") return mockState.mySub;
    return null;
  },
  useMutation: (ref: string) => {
    if (ref === "agencies:registerAgencyProfile") return mockState.registerAgency;
    return vi.fn(() => Promise.resolve());
  },
}));

/* framer-motion: strip animation props, keep plain DOM nodes */
vi.mock("framer-motion", () => {
  const Tag = (tag: string) => (props: any) => {
    const { children, initial, animate, exit, transition, layoutId, whileHover, whileTap, ...rest } = props;
    return React.createElement(tag, rest, children);
  };
  return {
    motion: new Proxy({}, { get: (_t, tag) => Tag(String(tag)) }),
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

/* Theme toggle is irrelevant for this test */
vi.mock("@/components/ThemeProvider", () => ({
  ThemeToggle: () => null,
}));

function renderAgencies() {
  return render(
    <MemoryRouter initialEntries={["/agencies"]}>
      <Agencies />
    </MemoryRouter>,
  );
}

describe("Espace Agences — modale de modification", () => {
  beforeEach(() => {
    mockState.registerAgency.mockClear();
  });

  it("affiche la modale fermée puis l'ouvre avec les informations pré-remplies", async () => {
    const user = userEvent.setup();
    renderAgencies();

    // Dashboard agence affiché
    expect(screen.getByText("Agence Immobilière Tunis")).toBeInTheDocument();

    // La modale est fermée au départ
    expect(
      screen.queryByRole("heading", { name: "Modifier le profil agence" }),
    ).not.toBeInTheDocument();

    // Ouverture via le bouton « Modifier le profil »
    const editBtn = screen.getByRole("button", { name: /Modifier le profil/i });
    await user.click(editBtn);

    expect(
      await screen.findByRole("heading", { name: "Modifier le profil agence" }),
    ).toBeInTheDocument();

    // Champs pré-remplis avec les données de l'agence
    expect(screen.getByPlaceholderText("Nom")).toHaveValue("Agence Immobilière Tunis");
    expect(screen.getByPlaceholderText("+216 XX XXX XXX")).toHaveValue("+216 71 234 567");
    expect(screen.getByPlaceholderText("contact@agence.tn")).toHaveValue("contact@agencetunis.tn");
    expect(screen.getByPlaceholderText("Adresse complète")).toHaveValue(
      "12 Avenue Habib Bourguiba, Tunis",
    );

    // Chips multi-sélection : régions et spécialités sélectionnées
    const tunisChip = screen.getByRole("button", { name: "Tunis" });
    expect(tunisChip).toHaveAttribute("aria-pressed", "true");
    const luxeChip = screen.getByRole("button", { name: "luxe" });
    expect(luxeChip).toHaveAttribute("aria-pressed", "true");
  });

  it("ferme la modale avec le bouton Annuler", async () => {
    const user = userEvent.setup();
    renderAgencies();

    await user.click(screen.getByRole("button", { name: /Modifier le profil/i }));
    expect(
      await screen.findByRole("heading", { name: "Modifier le profil agence" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Annuler" }));

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Modifier le profil agence" }),
      ).not.toBeInTheDocument();
    });
  });

  it("affiche toutes les infos du bien et le bouton Contacter (tel:)", async () => {
    mockState.requests = [
      {
        _id: "req-1",
        userName: "Sami Ben Ali",
        userEmail: "sami@test.tn",
        userPhone: "+216 98 765 432",
        status: "pending",
        createdAt: Date.now(),
        message: "Vente urgente",
        property: {
          propertyType: "appartement",
          address: "Rue de Marseille, Lac 2",
          gouvernorat: "Tunis",
          ville: "Tunis",
          quartier: "Les Berges du Lac",
          terrainSurface: null,
          builtSurface: 120,
          floors: 2,
          bedrooms: 3,
          bathrooms: 2,
          kitchens: 1,
          livingRooms: 1,
          garages: 1,
          hasGarden: false,
          hasPool: false,
          hasTerrace: true,
          hasBalcony: true,
          hasElevator: true,
          hasParking: true,
          hasAC: true,
          hasHeating: false,
          hasSolar: false,
          yearBuilt: 2019,
          generalState: "excellent_etat",
        },
        estimation: {
          estimatedValue: 350000,
          priceMin: 320000,
          priceMax: 380000,
          fastSalePrice: 310000,
          maxProfitPrice: 400000,
          confidenceIndex: 88,
          avgPricePerSqm: 2900,
        },
      },
    ];
    renderAgencies();

    // Bouton Contacter = lien tel: vers le numéro du client
    const callLink = screen.getByRole("link", { name: /Contacter/i });
    expect(callLink).toHaveAttribute("href", "tel:+216 98 765 432");

    // Le numéro est affiché
    expect(screen.getByText("+216 98 765 432")).toBeInTheDocument();

    // Type de bien (libellé français)
    expect(screen.getByText("Appartement")).toBeInTheDocument();

    // Détails du bien : localisation, surfaces, pièces, année
    expect(screen.getByText(/Rue de Marseille/)).toBeInTheDocument();
    expect(screen.getByText(/120 m²/)).toBeInTheDocument();
    expect(screen.getByText(/3 ch\./)).toBeInTheDocument();
    expect(screen.getByText(/2 sdb/)).toBeInTheDocument();
    expect(screen.getByText("2019")).toBeInTheDocument();

    // Équipements visibles
    expect(screen.getByText("Climatisation")).toBeInTheDocument();
    expect(screen.getByText("Ascenseur")).toBeInTheDocument();

    // Le prix n'est PAS affiché à côté du type de bien
    expect(screen.queryByText(/350[\s,.]?000\s*TND/)).not.toBeInTheDocument();
    // La confiance + la fourchette de prix restent affichées
    expect(screen.getByText(/Confiance 88%/)).toBeInTheDocument();

  });

  it("enregistre les modifications via la mutation registerAgencyProfile", async () => {
    const user = userEvent.setup();
    renderAgencies();

    await user.click(screen.getByRole("button", { name: /Modifier le profil/i }));

    // Modification du nom
    const nameInput = screen.getByPlaceholderText("Nom");
    await user.clear(nameInput);
    await user.type(nameInput, "Nouveau Nom Agence");

    await user.click(
      screen.getByRole("button", { name: /Enregistrer les modifications/i }),
    );

    await waitFor(() => {
      expect(mockState.registerAgency).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Nouveau Nom Agence",
          email: "contact@agencetunis.tn",
          regions: ["Tunis", "Ariana"],
        }),
      );
    });

    // La modale se ferme après l'enregistrement réussi
    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Modifier le profil agence" }),
      ).not.toBeInTheDocument();
    });
  });
});
