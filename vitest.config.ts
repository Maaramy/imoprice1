import { defineConfig } from "vitest/config";
import path from "path";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: true,
    include: ["src/**/*.accessibility.test.{ts,tsx}", "src/test/auth-error-messages.test.ts", "src/test/auth-forms.test.{ts,tsx}", "src/test/dashboard-plan-badge.test.{ts,tsx}", "src/test/pricing-payment-scroll.test.{ts,tsx}", "src/test/admin-access.test.{ts,tsx}", "src/test/admin-incomplete-data.test.{ts,tsx}", "src/test/set-user-role.test.ts", "src/test/admin-mutations.test.ts",    "src/test/agencies-modal.test.{ts,tsx}",    "src/test/agency-price-scenario.test.ts", "src/test/messages-inbox.test.ts",    "src/test/listing-engine.test.ts", "src/test/photo-analysis.test.ts",    "src/test/enhanced-estimation.test.ts", "src/test/rent-estimation.test.ts",
    "src/test/estimation-result-demo.test.tsx", "src/test/rent-estimation-demo.test.tsx", "src/test/alerts.test.ts", "src/test/credit-simulator.test.ts", "src/test/announcements.test.ts"],
    exclude: ["node_modules", "dist"],
  },
});
