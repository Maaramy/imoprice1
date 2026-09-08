import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import React from "react";
import Admin from "@/pages/Admin";

/* ── Mutable mock state (overridden per test) ── */
const { mockState } = vi.hoisted(() => ({
  mockState: {
    isAdmin: false as boolean,
    adminExists: false as boolean,
    user: { name: "Test User", email: "test@example.com", role: "user" },
    bootstrapResult: { success: true, alreadyAdmin: false },
    users: [] as any[],
    subs: [] as any[],
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
      listEstimations: "admin:listEstimations",
      listUsers: "admin:listUsers",
      listSubscriptions: "admin:listSubscriptions",
      adminAdjustSubscription: "admin:adminAdjustSubscription",
      adminConfirmPayment: "admin:adminConfirmPayment",
      setUserRole: "admin:setUserRole",
      deleteUser: "admin:deleteUser",
    },
  },
}));

vi.mock("convex/react", () => ({
  useQuery: (ref: string) => {
    if (ref === "admin:isAdmin") return mockState.isAdmin;
    if (ref === "admin:adminExists") return mockState.adminExists;
    if (ref === "admin:getAdminStats") {
      return {
        users: 5,
        newUsersThisMonth: 1,
        properties: 8,
        estimations: 12,
        estimationsThisMonth: 3,
        subscriptions: 4,
        activeSubs: 3,
        pendingPayments: 1,
        paidSubs: 2,
        revenue: 1200,
        agencies: 2,
        agencyRequests: 3,
      };
    }
    if (ref === "admin:listEstimations") return [];
    if (ref === "admin:listUsers") return mockState.users;
    if (ref === "admin:listSubscriptions") return mockState.subs;
    return null;
  },
  useMutation: () =>
    vi.fn(() => {
      // Simulate the backend promoting the current user when bootstrapping
      mockState.isAdmin = true;
      return Promise.resolve(mockState.bootstrapResult);
    }),
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

describe("Admin — contrôle d'accès", () => {
  beforeEach(() => {
    mockState.isAdmin = false;
    mockState.user = { name: "Test User", email: "test@example.com", role: "user" };
    mockState.users = [];
    mockState.subs = [];
  });

  it("refuse l'accès à un utilisateur non-admin", () => {
    mockState.isAdmin = false;
    renderAdmin();

    // Message d'accès refusé affiché
    expect(screen.getByText("Accès refusé")).toBeInTheDocument();
    expect(screen.getByText(/réservée aux administrateurs/i)).toBeInTheDocument();

    // L'interface d'administration n'est PAS affichée
    expect(screen.queryByRole("heading", { name: "Administration" })).not.toBeInTheDocument();
    expect(screen.queryByText("Aperçu")).not.toBeInTheDocument();
    expect(screen.queryByText("Utilisateurs")).not.toBeInTheDocument();

    // Le bouton de bootstrap (premier admin) est disponible
    expect(
      screen.getByRole("button", { name: /Devenir le premier administrateur/i }),
    ).toBeInTheDocument();
  });

  it("affiche l'interface d'administration pour un admin", () => {
    mockState.isAdmin = true;
    renderAdmin();

    // En-tête + onglets de la page admin visibles (chaque onglet a 2 libellés : desktop + mobile)
    expect(screen.getByRole("heading", { name: "Administration" })).toBeInTheDocument();
    expect(screen.getAllByText("Aperçu").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Abonnements").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Agences").length).toBeGreaterThan(0);

    // Pas de message d'accès refusé
    expect(screen.queryByText("Accès refusé")).not.toBeInTheDocument();

    // Les statistiques admin sont rendues (revenus = 1200 TND → format compact "1k TND")
    expect(screen.getByText("Revenus payés")).toBeInTheDocument();
    expect(screen.getByText(/1k TND/)).toBeInTheDocument();
  });

  it("promote le premier utilisateur via le bouton bootstrap", async () => {
    mockState.isAdmin = false;
    const user = userEvent.setup();
    renderAdmin();

    const bootstrapBtn = screen.getByRole("button", {
      name: /Devenir le premier administrateur/i,
    });
    await user.click(bootstrapBtn);

    // Après la mutation, la requête isAdmin redevient true → interface admin
    await vi.waitFor(() => {
      expect(screen.getByRole("heading", { name: "Administration" })).toBeInTheDocument();
    });
    expect(screen.queryByText("Accès refusé")).not.toBeInTheDocument();
  });
});

describe("Admin — édition du forfait", () => {
  beforeEach(() => {
    mockState.isAdmin = true;
    mockState.user = { name: "Admin", email: "admin@test.tn", role: "admin" };
    mockState.users = [
      {
        _id: "u1",
        name: "Jean Dupont",
        email: "jean@test.tn",
        phone: "",
        image: null,
        role: "user",
        createdAt: Date.now(),
        subscription: {
          subscriptionId: "sub-1",
          planType: "pro",
          status: "active",
          paymentStatus: "paid",
          paymentMethod: "simulation",
          endDate: null,
          estimationsUsed: 2,
          estimationsLimit: 10,
        },
        estimationsCount: 2,
      },
    ];
    mockState.subs = [
      {
        _id: "sub-1",
        userId: "u1",
        userEmail: "jean@test.tn",
        userName: "Jean Dupont",
        planType: "pro",
        planName: "Pro",
        price: 120,
        status: "active",
        paymentStatus: "paid",
        paymentMethod: "simulation",
        paymentRef: null,
        startDate: Date.now(),
        endDate: null,
        trialEndDate: null,
        estimationsUsed: 2,
        estimationsLimit: 10,
        createdAt: Date.now(),
      },
    ];
  });

  it("ouvre la modale de modification du forfait depuis l'onglet Utilisateurs", async () => {
    const user = userEvent.setup();
    renderAdmin();

    // Onglet Utilisateurs
    const usersTab = screen.getByRole("tab", { name: /Utilisateurs/i });
    await user.click(usersTab);

    // Bouton d'édition du forfait présent sur la ligne de l'utilisateur
    const editBtn = await screen.findByRole("button", {
      name: /Modifier le forfait de Jean Dupont/i,
    });
    await user.click(editBtn);

    // La modale s'ouvre avec le forfait actuel (Pro)
    expect(await screen.findByText("Modifier le forfait")).toBeInTheDocument();
    expect(screen.getByLabelText("Forfait")).toHaveValue("pro");
  });

  it("ouvre la modale de modification du forfait depuis l'onglet Abonnements", async () => {
    const user = userEvent.setup();
    renderAdmin();

    const subsTab = screen.getByRole("tab", { name: /Abonnements/i });
    await user.click(subsTab);

    const editBtn = await screen.findByRole("button", {
      name: /Modifier le forfait de Jean Dupont/i,
    });
    await user.click(editBtn);

    expect(await screen.findByText("Modifier le forfait")).toBeInTheDocument();
    // Quota actuel pré-rempli (10)
    expect(screen.getByLabelText("Quota mensuel")).toHaveValue(10);
  });
});
