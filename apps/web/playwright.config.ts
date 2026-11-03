import { defineConfig, devices } from "@playwright/test";

// E2E contra el BUILD DE PRODUCCIÓN con datos de prueba (plan 6.2, D-13).
const PUERTO = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://localhost:${PUERTO}` },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run build && npm run start -- --port ${PUERTO}`,
    url: `http://localhost:${PUERTO}`,
    env: { CATALOG_SOURCE: "fixtures" },
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
