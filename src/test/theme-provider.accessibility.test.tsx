import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ThemeProvider, ThemeToggle } from "@/components/ThemeProvider";
import { expectNoViolations } from "./helpers";

describe("ThemeToggle accessibility", () => {
  it("should have no violations", async () => {
    const { container } = render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    await expectNoViolations(container);
  });

  it("should render with accessible label", async () => {
    const { getByRole } = render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    const button = getByRole("button");
    expect(button).toHaveAttribute("aria-label");
    expect(button).toHaveAttribute("title");
  });
});
