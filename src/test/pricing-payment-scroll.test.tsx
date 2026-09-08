import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import React from "react";
import Pricing from "@/pages/Pricing";

/* ── Mutable mock state (overridden per test) ── */
const { mockState } = vi.hoisted(() => ({
  mockState: {
    mySub: null as { planType: string; status: string; estimationsLimit: number; estimationsUsed: number } | null,
  },
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: { name: "Test User", email: "test@example.com" },
    signOut: vi.fn(),
  }),
}));

/* Mock the generated api as plain string paths so useQuery can identify each query */
vi.mock("@/convex/_generated/api", () => ({
  api: {
    plans: {
      mySubscription: "plans:mySubscription",
      subscribeToPlan: "plans:subscribeToPlan",
      confirmManualPayment: "plans:confirmManualPayment",
      ensureDefaultPlan: "plans:ensureDefaultPlan",
    },
    settings: {
      getPublicSettings: "settings:getPublicSettings",
    },
  },
}));

vi.mock("convex/react", () => ({
  useQuery: (ref: string) => {
    if (ref === "plans:mySubscription") return mockState.mySub;
    return null;
  },
  useMutation: () => vi.fn(() => Promise.resolve({ paymentStatus: "paid", message: "ok", subscriptionId: "sub_1" })),
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

function renderPricing() {
  return render(
    <MemoryRouter initialEntries={["/pricing"]}>
      <Pricing />
    </MemoryRouter>,
  );
}

describe("Pricing — défilement vers la section de paiement inline", () => {
  let scrollSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockState.mySub = null;
    scrollSpy = vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(() => {});
  });

  afterEach(() => {
    scrollSpy.mockRestore();
  });

  it("n'affiche aucune section de paiement avant de choisir un forfait", () => {
    renderPricing();
    expect(screen.queryByText(/Payer le forfait/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Choisissez votre moyen de paiement/i)).not.toBeInTheDocument();
    expect(scrollSpy).not.toHaveBeenCalled();
  });

  it("fait défiler vers la section de paiement inline quand on clique sur un forfait payant", async () => {
    const user = userEvent.setup();
    renderPricing();

    // Pro et Expert sont les deux forfaits payants sans essai ("Choisir ce forfait")
    const paidButtons = screen.getAllByRole("button", { name: /Choisir ce forfait/i });
    expect(paidButtons.length).toBeGreaterThanOrEqual(2);

    await user.click(paidButtons[0]); // Pro (premier forfait payant dans la grille)

    // scrollIntoView est déclenché (dans un setTimeout de 60ms)
    await vi.waitFor(() => expect(scrollSpy).toHaveBeenCalled());
    expect(scrollSpy).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });

    // La section de paiement inline est maintenant visible avec le bon forfait
    expect(screen.getByText(/Payer le forfait Pro/i)).toBeInTheDocument();
    expect(screen.getByText(/Choisissez votre moyen de paiement/i)).toBeInTheDocument();
    expect(screen.getByText("Virement bancaire")).toBeInTheDocument();
    expect(screen.getByText("D17 — Poste Tunisie")).toBeInTheDocument();
  });

  it("affiche le forfait Expert quand on clique sur sa carte", async () => {
    const user = userEvent.setup();
    renderPricing();

    const paidButtons = screen.getAllByRole("button", { name: /Choisir ce forfait/i });
    await user.click(paidButtons[1]); // Expert (second forfait payant)

    await vi.waitFor(() => expect(scrollSpy).toHaveBeenCalled());
    expect(screen.getByText(/Payer le forfait Expert/i)).toBeInTheDocument();
    expect(screen.queryByText(/Mode démo — aucun prélèvement/i)).not.toBeInTheDocument(); // étape 1 : pas encore de méthode
  });

  it("n'ouvre pas la section de paiement pour le forfait gratuit", async () => {
    const user = userEvent.setup();
    renderPricing();

    const freeButton = screen.getByRole("button", { name: /Commencer gratuitement/i });
    await user.click(freeButton);

    // Pas de défilement ni de section de paiement pour un forfait gratuit
    expect(scrollSpy).not.toHaveBeenCalled();
    expect(screen.queryByText(/Payer le forfait/i)).not.toBeInTheDocument();
  });
});
