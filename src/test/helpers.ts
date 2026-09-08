import { axe } from "vitest-axe";

/**
 * Assert that the given container has no axe-core accessibility violations.
 * Throws with a readable message listing all violations.
 */
export async function expectNoViolations(container: HTMLElement): Promise<void> {
  const results = await axe(container);
  if (results.violations.length > 0) {
    const messages = results.violations.map((v) => {
      const nodes = v.nodes.map((n) => `  - ${n.target.join(", ")}: ${n.failureSummary?.split("\n")[0] || ""}`).join("\n");
      return `${v.id} (${v.impact}): ${v.help}\n${nodes}`;
    });
    throw new Error(`🧐 Accessibilité — ${results.violations.length} violation(s) détectée(s) :\n\n${messages.join("\n\n")}`);
  }
}
