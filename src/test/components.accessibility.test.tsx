import { describe, it } from "vitest";
import { render } from "@testing-library/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { expectNoViolations } from "./helpers";

describe("Button accessibility", () => {
  it("default button", async () => {
    const { container } = render(<Button>Cliquez ici</Button>);
    await expectNoViolations(container);
  });

  it("icon button with aria-label", async () => {
    const { container } = render(
      <Button aria-label="Fermer" size="icon">
        ✕
      </Button>,
    );
    await expectNoViolations(container);
  });

  it("disabled button", async () => {
    const { container } = render(<Button disabled>Enregistré</Button>);
    await expectNoViolations(container);
  });
});

describe("Badge accessibility", () => {
  it("default badge", async () => {
    const { container } = render(<Badge>Nouveau</Badge>);
    await expectNoViolations(container);
  });

  it("badge with variant", async () => {
    const { container } = render(
      <Badge variant="secondary" className="rounded-full">
        85% confiance
      </Badge>,
    );
    await expectNoViolations(container);
  });
});

describe("Input accessibility", () => {
  it("with associated label", async () => {
    const { container } = render(
      <div>
        <label htmlFor="test-input">Nom</label>
        <Input id="test-input" placeholder="Votre nom" />
      </div>,
    );
    await expectNoViolations(container);
  });

  it("with aria-label", async () => {
    const { container } = render(
      <Input aria-label="Rechercher" placeholder="Rechercher..." />,
    );
    await expectNoViolations(container);
  });
});

describe("Spinner accessibility", () => {
  it("with aria-hidden and visible text", async () => {
    const { container } = render(
      <div>
        <Spinner aria-hidden="true" />
        <span>Chargement...</span>
      </div>,
    );
    await expectNoViolations(container);
  });

  it("with role status and sr-only text", async () => {
    const { container } = render(
      <div role="status" aria-live="polite">
        <Spinner />
        <span className="sr-only">Chargement en cours...</span>
      </div>,
    );
    await expectNoViolations(container);
  });
});
