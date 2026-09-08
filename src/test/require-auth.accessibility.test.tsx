import { describe, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { RequireAuth } from "@/components/RequireAuth";
import { MemoryRouter } from "react-router";
import { expectNoViolations } from "./helpers";

// Mock the useAuth hook in loading state
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    isLoading: true,
    isAuthenticated: false,
    user: null,
    signOut: vi.fn(),
    signIn: vi.fn(),
  }),
}));

// Mock Convex hooks (RequireAuth ensures the default free plan)
vi.mock("convex/react", () => ({
  useQuery: () => null,
  useMutation: () => vi.fn(),
}));

// Mock framer-motion for test environment
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, initial, animate, transition, ...props }: any) => (
      <div {...props}>{children}</div>
    ),
  },
}));

describe("RequireAuth accessibility", () => {
  it("should have no violations in loading state", async () => {
    const { container } = render(
      <MemoryRouter>
        <RequireAuth>
          <div>Protected content</div>
        </RequireAuth>
      </MemoryRouter>,
    );
    await expectNoViolations(container);
  });
});
