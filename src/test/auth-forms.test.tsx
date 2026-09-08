import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import React from "react";
import AuthPage, {
  resolveRedirectAfterAuth,
} from "@/pages/Auth";

/* ── Mocks ── */
const { mockSignIn } = vi.hoisted(() => {
  const mockSignIn = vi.fn();
  return { mockSignIn };
});

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    isLoading: false,
    isAuthenticated: false,
    user: null,
    signIn: mockSignIn,
    signOut: vi.fn(),
  }),
}));

function stripMotion<P extends Record<string, any>>(c: string, props: P) {
  const { children, initial, animate, exit, transition, layoutId, ...p } = props;
  return React.createElement(c, p, children);
}

vi.mock("framer-motion", () => ({
  motion: {
    div: (p: any) => stripMotion("div", p),
    p: (p: any) => stripMotion("p", p),
    button: (p: any) => stripMotion("button", p),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

function renderAuth() {
  return render(<MemoryRouter initialEntries={["/auth"]}><AuthPage /></MemoryRouter>);
}

function getByLabel(lbl: string) { return screen.getByLabelText(lbl) as HTMLInputElement; }

/* ── Pure functions ── */
describe("resolveRedirectAfterAuth", () => {
  it("returns returnTo when valid", () => {
    expect(resolveRedirectAfterAuth("/dashboard")).toBe("/dashboard");
  });
  it("returns returnTo for nested paths", () => {
    expect(resolveRedirectAfterAuth("/estimate/new")).toBe("/estimate/new");
  });
  it("ignores double-slash paths", () => {
    expect(resolveRedirectAfterAuth("//evil.com")).toBe("/dashboard");
  });
  it("returns fallback when returnTo is null", () => {
    expect(resolveRedirectAfterAuth(null)).toBe("/dashboard");
  });
  it("returns custom fallback when passed", () => {
    expect(resolveRedirectAfterAuth(null, "/custom")).toBe("/custom");
  });
  it("returns fallback when returnTo does not start with /", () => {
    expect(resolveRedirectAfterAuth("http://evil.com")).toBe("/dashboard");
  });
});

/* ── Sign In form ── */
describe("Sign In form", () => {
  beforeEach(() => { mockSignIn.mockReset(); });

  it("renders the form", () => {
    renderAuth();
    expect(screen.getByText("Connexion")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Mot de passe")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /se connecter/i })).toBeInTheDocument();
  });

  it("shows brand header", () => {
    renderAuth();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("baticost AI");
    expect(screen.getByText("Estimation immobilière intelligente")).toBeInTheDocument();
  });

  it("shows forgot password link", () => {
    renderAuth();
    expect(screen.getByText("Mot de passe oublié ?")).toBeInTheDocument();
  });

  it("disables submit when empty", () => {
    renderAuth();
    expect(screen.getByRole("button", { name: /se connecter/i })).toBeDisabled();
  });

  it("enables submit when filled", async () => {
    renderAuth();
    const u = userEvent.setup();
    await u.type(getByLabel("Email"), "test@example.com");
    await u.type(getByLabel("Mot de passe"), "password123");
    expect(screen.getByRole("button", { name: /se connecter/i })).not.toBeDisabled();
  });

  it("has hidden flow input", () => {
    renderAuth();
    expect(document.querySelector('input[name="flow"][value="signIn"]')).toBeInTheDocument();
  });
});

/* ── Sign In submission ── */
describe("Sign In submission", () => {
  beforeEach(() => { mockSignIn.mockReset(); });

  it("shows error message on wrong credentials (wrapped Convex error)", async () => {
    mockSignIn.mockRejectedValueOnce(
      new Error(
        "Uncaught Error: InvalidSecret at retrieveAccount (../../node_modules/@convex-dev/auth/src/server/implementation/index.ts:602:9)",
      ),
    );
    renderAuth();
    const u = userEvent.setup();
    await u.type(screen.getByLabelText("Email"), "test@example.com");
    await u.type(screen.getByLabelText("Mot de passe"), "wrongpass");
    await u.click(screen.getByRole("button", { name: /se connecter/i }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Mot de passe ou e-mail erronée",
      ),
    );
  });

  it("shows detailed message for unknown email", async () => {
    mockSignIn.mockRejectedValueOnce(new Error("InvalidAccountId"));
    renderAuth();
    const u = userEvent.setup();
    await u.type(screen.getByLabelText("Email"), "inconnu@test.com");
    await u.type(screen.getByLabelText("Mot de passe"), "whatever");
    await u.click(screen.getByRole("button", { name: /se connecter/i }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Aucun compte trouvé avec cet email",
      ),
    );
  });
});

/* ── Sign Up form ── */
describe("Sign Up form", () => {
  beforeEach(() => { mockSignIn.mockReset(); });

  async function toSignUp() {
    const u = userEvent.setup();
    await u.click(screen.getByRole("button", { name: /inscription/i }));
    return u;
  }

  it("renders all fields", async () => {
    renderAuth();
    await toSignUp();
    for (const lbl of ["Nom complet", "Email", "Téléphone", "Mot de passe", "Confirmer le mot de passe"]) {
      expect(screen.getByLabelText(lbl)).toBeInTheDocument();
    }
  });

  it("has disabled submit when empty", async () => {
    renderAuth();
    await toSignUp();
    expect(screen.getByRole("button", { name: /créer mon compte/i })).toBeDisabled();
  });

  it("enables submit when filled", async () => {
    renderAuth();
    const u = await toSignUp();
    await u.type(getByLabel("Nom complet"), "Jean");
    await u.type(getByLabel("Email"), "j@t.com");
    await u.type(getByLabel("Mot de passe"), "secret123");
    await u.type(getByLabel("Confirmer le mot de passe"), "secret123");
    expect(screen.getByRole("button", { name: /créer mon compte/i })).not.toBeDisabled();
  });

  it("shows password length validation", async () => {
    renderAuth();
    const u = await toSignUp();
    await u.type(getByLabel("Mot de passe"), "ab");
    await waitFor(() => expect(screen.getByText(/6 caractères minimum/i)).toBeInTheDocument());
  });

  it("shows password match validation", async () => {
    renderAuth();
    const u = await toSignUp();
    await u.type(getByLabel("Mot de passe"), "secret123");
    await u.type(getByLabel("Confirmer le mot de passe"), "sec456");
    await waitFor(() => expect(screen.getByText(/mots de passe identiques/i)).toBeInTheDocument());
  });

  it("has hidden flow input", async () => {
    renderAuth();
    await toSignUp();
    expect(document.querySelector('input[name="flow"][value="signUp"]')).toBeInTheDocument();
  });
});

/* ── Mode Switching ── */
describe("Mode switching", () => {
  it("sign-in → sign-up", async () => {
    renderAuth();
    await userEvent.setup().click(screen.getByRole("button", { name: /inscription/i }));
    expect(screen.getByLabelText("Nom complet")).toBeInTheDocument();
  });

  it("sign-up → sign-in", async () => {
    renderAuth();
    const u = userEvent.setup();
    await u.click(screen.getByRole("button", { name: /inscription/i }));
    await u.click(screen.getByRole("button", { name: /connexion/i }));
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Mot de passe")).toBeInTheDocument();
  });
});

/* ── Reset Password flow ── */
describe("Reset Password flow", () => {
  beforeEach(() => { mockSignIn.mockReset(); });

  it("opens reset form", async () => {
    renderAuth();
    await userEvent.setup().click(screen.getByText("Mot de passe oublié ?"));
    expect(screen.getByText("Mot de passe oublié")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /envoyer le code/i })).toBeInTheDocument();
  });

  it("shows return link", async () => {
    renderAuth();
    await userEvent.setup().click(screen.getByText("Mot de passe oublié ?"));
    expect(screen.getByText(/← Retour à la connexion/i)).toBeInTheDocument();
  });

  it("disables send when empty", async () => {
    renderAuth();
    await userEvent.setup().click(screen.getByText("Mot de passe oublié ?"));
    expect(screen.getByRole("button", { name: /envoyer le code/i })).toBeDisabled();
  });

  it("enables send when filled", async () => {
    renderAuth();
    const u = userEvent.setup();
    await u.click(screen.getByText("Mot de passe oublié ?"));
    await u.type(getByLabel("Email"), "test@example.com");
    expect(screen.getByRole("button", { name: /envoyer le code/i })).not.toBeDisabled();
  });

  it("returns to sign in", async () => {
    renderAuth();
    const u = userEvent.setup();
    await u.click(screen.getByText("Mot de passe oublié ?"));
    await u.click(screen.getByText(/retour à la connexion/i));
    expect(screen.getByRole("button", { name: /se connecter/i })).toBeInTheDocument();
  });
});

/* ── Reset Password submission ── */
describe("Reset Password submission", () => {
  beforeEach(() => { mockSignIn.mockReset(); });

  async function toReset(u: ReturnType<typeof userEvent.setup>) {
    await u.click(screen.getByText("Mot de passe oublié ?"));
    await u.type(screen.getByLabelText("Email"), "inconnu@test.com");
  }

  it("shows error message for unknown email", async () => {
    mockSignIn.mockRejectedValueOnce(new Error("InvalidAccountId"));
    renderAuth();
    const u = userEvent.setup();
    await toReset(u);
    await u.click(screen.getByRole("button", { name: /envoyer le code/i }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Aucun compte trouvé avec cet email",
      ),
    );
  });

  it("shows fallback error for generic failure", async () => {
    mockSignIn.mockRejectedValueOnce(new Error(""));
    renderAuth();
    const u = userEvent.setup();
    await toReset(u);
    await u.click(screen.getByRole("button", { name: /envoyer le code/i }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Erreur lors de l'envoi du code",
      ),
    );
  });
});

/* ── Controlled input persistence ── */
describe("Controlled input persistence", () => {
  it("keeps email after visibility toggle", async () => {
    renderAuth();
    const email = getByLabel("Email");
    const u = userEvent.setup();
    await u.type(email, "persist@test.com");
    expect(email.value).toBe("persist@test.com");
    await u.click(screen.getByRole("button", { name: /afficher le mot de passe/i }));
    expect(email.value).toBe("persist@test.com");
  });

  it("keeps fields after toggle in sign-up", async () => {
    renderAuth();
    const u = userEvent.setup();
    await u.click(screen.getByRole("button", { name: /inscription/i }));
    const name = getByLabel("Nom complet");
    const email = getByLabel("Email");
    await u.type(name, "Jean");
    await u.type(email, "jean@test.com");
    expect(name.value).toBe("Jean");
    expect(email.value).toBe("jean@test.com");
    await u.click(screen.getAllByRole("button", { name: /afficher le mot de passe/i })[0]);
    expect(name.value).toBe("Jean");
    expect(email.value).toBe("jean@test.com");
  });
});

/* ── Brand ── */
describe("Brand elements", () => {
  it("renders security badge", () => {
    renderAuth();
    expect(screen.getByText(/Sécurisé par/)).toBeInTheDocument();
    expect(screen.getByText("freebuff.com")).toBeInTheDocument();
  });

  it("has home button", () => {
    renderAuth();
    const btn = screen.getAllByRole("button").find(
      (b) => b.textContent?.includes("bati") && b.textContent?.includes("AI"),
    );
    expect(btn).toBeInTheDocument();
  });
});
