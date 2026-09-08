/**
 * 🛠️ Admin reset script — promote a user to admin by email.
 *
 * Recovers admin access WITHOUT depending on the ADMIN_EMAIL env var / Keys tab.
 * It calls the Convex *internal* mutation `resetAdminByEmail` through the CLI
 * (internal functions are not exposed to the browser, so this is safe).
 *
 * ── Usage ────────────────────────────────────────────────────────────────────
 *   bun run scripts/reset-admin.ts <email>
 *   bun run scripts/reset-admin.ts <email> --prod        # production deployment
 *   CONVEX_DEPLOY_KEY=... bun run scripts/reset-admin.ts <email>   # CI mode
 *
 * ── Requirements ─────────────────────────────────────────────────────────────
 *   • Be authenticated with Convex (`npx convex login`) — or set the
 *     CONVEX_DEPLOY_KEY env var for non-interactive/CI usage.
 *   • Local code must be pushed (the script uses --push automatically).
 */
import { execFileSync } from "node:child_process";

function main() {
  const args = process.argv.slice(2);
  const email = args.find((a) => !a.startsWith("--"))?.trim() ?? "";
  const isProd = args.includes("--prod");

  if (!email) {
    console.error("❌ Usage: bun run scripts/reset-admin.ts <email> [--prod]");
    process.exit(1);
  }

  console.log(`🔑 Promotion de « ${email} » en administrateur${isProd ? " (prod)" : " (dev)"}…`);

  const cliArgs = [
    "convex",
    "run",
    "internal:admin.resetAdminByEmail",
    "--args",
    JSON.stringify({ email }),
    "--push",
  ];
  if (isProd) cliArgs.push("--prod");

  try {
    const stdout = execFileSync("bunx", cliArgs, {
      encoding: "utf8",
      stdio: ["inherit", "pipe", "inherit"],
    });
    const parsed = stdout.trim();
    console.log(parsed || "✅ Mutation exécutée avec succès.");
    if (parsed.includes('"success":true')) {
      console.log("✅ L'utilisateur est maintenant administrateur.");
    }
  } catch (err) {
    const e = err as { stderr?: Buffer; message?: string };
    console.error("❌ Échec de la réinitialisation :");
    console.error(e.stderr?.toString() ?? e.message ?? err);
    process.exit(1);
  }
}

main();
