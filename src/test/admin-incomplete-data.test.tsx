import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import React from "react";
import Admin from "@/pages/Admin";

/* ── Mutable mock state ── */
const { mockState } = vi.hoisted(() => ({
  mockState: {
    isAdmin: true as boolean,
    user: { name: "Admin User", email: "admin@example.com", role: "admin" },
    agencies: [
      {
        _id: "a1",
        // name is MISSING (legacy/incomplete record) → must not crash
        name: undefined as string | undefined,
        email: "agence@test.tn",
        phone: "+216 99 000 000",
        regions: undefined as string[] | undefined,
        specialties: ["Vente"],
        isSubscribed: true,
        logoUrl: null,
      },
    ],
    estimations: [
      {
        _id: "e1",
        userName: "Client Test",
        userEmail: "client@test.tn",
        propertyType: "villa",
        gouvernorat: "Tunis",
        ville: null,
        builtSurface: 180,
        // confidenceIndex / estimatedValue / priceMin / priceMax MISSING
        confidenceIndex: undefined as number | undefined,
        estimatedValue: undefined as number | undefined,
        priceMin: null,
        priceMax: null,
        createdAt: Date.now(),
      },
    ],
  },
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: mockState.user,
    isLoading: false,
    isAuthenticated: true,
    signOut: vi.fn(),
  }),
}));

/* Mock the generated api as plain string paths so useQuery can identify each query */
vi.mock("@/convex/_generated/api", () => ({
  api: {
    admin: {
      isAdmin: "admin:isAdmin",
      adminExists: "admin:adminExists",
      bootstrapAdmin: "admin:bootstrapAdmin",
      getAdminStats: "admin:getAdminStats",
      listUsers: "admin:listUsers",
      listSubscriptions: "admin:listSubscriptions",
      listAgencies: "admin:listAgencies",
      listEstimations: "admin:listEstimations",
      setUserRole: "admin:setUserRole",
      deleteUser: "admin:deleteUser",
      adminConfirmPayment: "admin:adminConfirmPayment",
      adminAdjustSubscription: "admin:adminAdjustSubscription",
      toggleAgencyStatus: "admin:toggleAgencyStatus",
      deleteAgency: "admin:deleteAgency",
      deleteEstimation: "admin:deleteEstimation",
    },
    settings: {
      getAdminSettings: "settings:getAdminSettings",
      updateSettings: "settings:updateSettings",
      resetSettings: "settings:resetSettings",
    },
  },
}));

vi.mock("convex/react", () => ({
  useQuery: (ref: string) => {
    if (ref === "admin:isAdmin") return mockState.isAdmin;
    if (ref === "admin:adminExists") return true;
    if (ref === "admin:getAdminStats") {
      return {
        users: 1,
        newUsersThisMonth: 0,
        properties: 1,
        estimations: 1,
        estimationsThisMonth: 0,
        subscriptions: 0,
        activeSubs: 0,
        pendingPayments: 0,
        paidSubs: 0,
        revenue: 0,
        agencies: 1,
        agencyRequests: 0,
      };
    }
    if (ref === "admin:listEstimations") return mockState.estimations;
    if (ref === "admin:listAgencies") return mockState.agencies;
    if (ref === "admin:listUsers") return [];
    if (ref === "admin:listSubscriptions") return [];
    if (ref === "settings:getAdminSettings") {
      return {
        bankDetails: { beneficiary: "", bank: "", agency: "", rib: "", swift: "", reason: "" },
        d17Details: { beneficiary: "", ccp: "", center: "", reason: "" },
        planOverrides: {},
        marketConfig: {},
        updatedAt: null,
      };
    }
    return null;
  },
  useMutation: () => vi.fn(() => Promise.resolve({ success: true })),
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

function renderAdmin() {
  return render(
    <MemoryRouter initialEntries={["/admin"]}>
      <Admin />
    </MemoryRouter>,
  );
}

describe("Admin — données incomplètes", () => {
  beforeEach(() => {
    mockState.isAdmin = true;
  });

  it("affiche 'Confiance —%' quand confidenceIndex est absent (pas de crash)", () => {
    renderAdmin();
    // L'onglet par défaut (Aperçu) rend les dernières estimations
    expect(screen.getByText(/Confiance —%/)).toBeInTheDocument();
    // Valeur estimée absente → « — » au lieu de crash
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("affiche la liste des agences sans nom sans crash (fallback initiales '?')", async () => {
    const user = userEvent.setup();
    renderAdmin();

    // Aller sur l'onglet Agences
    await user.click(screen.getAllByText("Agences")[0]);

    expect(screen.getByText(/Agences inscrites/i)).toBeInTheDocument();
    // L'agence sans nom ne crash pas : initiales "?" (fallback) + e-mail affiché
    expect(screen.getByText("?")).toBeInTheDocument();
    expect(screen.getByText(/agence@test\.tn/)).toBeInTheDocument();
  });

  it("ne crash pas quand une agence n'a ni régions ni spécialités", async () => {
    const user = userEvent.setup();
    renderAdmin();

    await user.click(screen.getAllByText("Agences")[0]);

    // regions undefined → aucun badge région, aucun crash
    expect(screen.getByText(/Agences inscrites/i)).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });
});
