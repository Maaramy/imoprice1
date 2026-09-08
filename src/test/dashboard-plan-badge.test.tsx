import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router";
import React from "react";
import Dashboard from "@/pages/Dashboard";

/* ── Mutable mock state (overridden per test) ── */
const { mockState } = vi.hoisted(() => ({
  mockState: {
    mySub: { planType: "start", status: "active", estimationsLimit: 3, estimationsUsed: 1 },
    quota: { canEstimate: true, remaining: 2, planType: "start", reason: null, estimationsLimit: 3 },
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
    estimation: { getUserEstimations: "estimation:getUserEstimations" },
    properties: { getUserProperties: "properties:getUserProperties" },
    rent: { getUserRentEstimations: "rent:getUserRentEstimations" },
    partners: { seedPartners: "partners:seedPartners" },
    users: { updateUserProfile: "users:updateUserProfile" },
    plans: {
      mySubscription: "plans:mySubscription",
      remainingEstimations: "plans:remainingEstimations",
      getPaymentHistory: "plans:getPaymentHistory",
    },
    agencies: { getMyAgencyProfile: "agencies:getMyAgencyProfile" },
    alerts: {
      getMyPriceAlerts: "alerts:getMyPriceAlerts",
      createPriceAlert: "alerts:createPriceAlert",
      deletePriceAlert: "alerts:deletePriceAlert",
    },
    messages: {
      getMyInbox: "messages:getMyInbox",
      markMessagesRead: "messages:markMessagesRead",
      markAllMessagesRead: "messages:markAllMessagesRead",
      sendUserMessage: "messages:sendUserMessage",
    },
  },
}));

vi.mock("convex/react", () => {
  const defaults: Record<string, unknown> = {
    "estimation:getUserEstimations": [],
    "properties:getUserProperties": [],
    "rent:getUserRentEstimations": [],
    "plans:getPaymentHistory": [],
    "agencies:getMyAgencyProfile": null,
    "messages:getMyInbox": { messages: [], unread: 0 },
    "alerts:getMyPriceAlerts": [],
  };
  return {
    useQuery: (ref: string) => {
      if (ref === "plans:mySubscription") return mockState.mySub;
      if (ref === "plans:remainingEstimations") return mockState.quota;
      return defaults[ref] ?? null;
    },
    useMutation: () => vi.fn(() => Promise.resolve()),
  };
});

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

/* recharts: simple passthrough so charts render without layout */
vi.mock("recharts", () => {
  const Box = ({ children }: any) => <div>{children}</div>;
  const None = () => null;
  return {
    ResponsiveContainer: Box,
    LineChart: Box,
    Line: None,
    XAxis: None,
    YAxis: None,
    CartesianGrid: None,
    Tooltip: None,
  };
});

/* leaflet: not needed in jsdom (map tab is not the default tab) */
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: any) => <div>{children}</div>,
  TileLayer: () => null,
  Marker: () => null,
  Popup: ({ children }: any) => <div>{children}</div>,
  useMap: () => ({ setView: vi.fn(), fitBounds: vi.fn() }),
}));
vi.mock("leaflet", () => ({
  default: {
    icon: () => ({}),
    latLngBounds: () => ({}),
    Icon: {
      Default: {
        prototype: {},
        mergeOptions: vi.fn(),
      },
    },
  },
}));
vi.mock("@/components/MapResizer", () => ({ default: () => null }));

/* Theme toggle is irrelevant for this test */
vi.mock("@/components/ThemeProvider", () => ({
  ThemeToggle: () => null,
}));

/** Small probe that renders the current router location (to assert navigation) */
function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Dashboard />
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe("Dashboard plan badge", () => {
  beforeEach(() => {
    mockState.mySub = { planType: "start", status: "active", estimationsLimit: 3, estimationsUsed: 1 };
    mockState.quota = { canEstimate: true, remaining: 2, planType: "start", reason: null, estimationsLimit: 3 };
  });

  it("shows the plan name and remaining quota in the badge", () => {
    renderDashboard();
    const badge = screen.getByTitle(/Réinitialisation dans \d+ jour/);
    expect(badge).toHaveTextContent("Free");
    expect(badge).toHaveTextContent("2 rest.");
  });

  it("navigates to /pricing when the badge is clicked", async () => {
    renderDashboard();
    const badge = screen.getByTitle(/Réinitialisation dans \d+ jour/);
    const u = userEvent.setup();
    await u.click(badge);
    expect(screen.getByTestId("location")).toHaveTextContent("/pricing");
  });

  it("shows the Pro plan name and quota for Pro subscriptions", () => {
    mockState.mySub = { planType: "pro", status: "active", estimationsLimit: 10, estimationsUsed: 4 };
    mockState.quota = { canEstimate: true, remaining: 6, planType: "pro", reason: null, estimationsLimit: 10 };
    renderDashboard();
    const badge = screen.getByTitle(/Réinitialisation dans \d+ jour/);
    expect(badge).toHaveTextContent("Pro");
    expect(badge).toHaveTextContent("6 rest.");
  });

  it("keeps the reset countdown in the badge tooltip", () => {
    renderDashboard();
    const badge = screen.getByTitle(/Réinitialisation dans \d+ jour/);
    expect(badge.getAttribute("title")).toMatch(/· \d+ estimation\(s\) restante\(s\) ce mois/);
    expect(badge.getAttribute("title")).toMatch(/Réinitialisation dans \d+ jour/);
  });

  it("does not render a Booster link for any plan", () => {
    renderDashboard();
    expect(screen.queryByText(/booster/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /booster à pro/i })).not.toBeInTheDocument();
  });
});
