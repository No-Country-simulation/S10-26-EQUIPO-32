import { defineConfig, devices } from "@playwright/test";

// E2E con el backend LEVANTADO y sembrado (spec 001 §10, plan §9.6, D-29). No corre en CI: ver README.
// Mismo build de producción, dos servidores: 3101 contra el backend real y 3102 contra un puerto muerto (backend caído).
const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

export default defineConfig({
  testDir: "tests/e2e-backend",
  fullyParallel: false,
  workers: 1, // el backend limita a 60 pedidos/min por IP
  reporter: "list",
  use: { baseURL: "http://localhost:3101" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run build && sh -c 'BACKEND_URL=http://127.0.0.1:9 npx next start -p 3102 & exec npx next start -p 3101'",
    url: "http://localhost:3101",
    env: { CATALOG_SOURCE: "backend", BACKEND_URL },
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
