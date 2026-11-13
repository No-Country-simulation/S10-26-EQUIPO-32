import { expect, test } from "@playwright/test";

// T44 (RF-15, RNF-24). Requiere el backend levantado y sembrado con `npm run sembrar:backend` (README).
const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";
const tarjetas = "section[aria-label='Herramientas del catálogo'] > ul > li"; // hijos directos: cada tarjeta tiene su propia lista de categorías

test("la grilla muestra los 30 repos del backend y el navegador nunca habla con el backend", async ({ page }) => {
  const alBackend: string[] = [];
  page.on("request", (r) => {
    if (r.url().startsWith(BACKEND_URL)) alBackend.push(r.url());
  });
  await page.goto("/");
  await expect(page.locator(tarjetas)).toHaveCount(30);
  expect(alBackend).toEqual([]);
});

test("la ficha muestra el health score y el desglose de los 5 componentes con sus máximos, iguales a la API", async ({ page, request }) => {
  const r = await request.get(`${BACKEND_URL}/api/v1/repositories/prisma/orm`);
  expect(r.status(), "429 = rate limit del backend (60/min): esperá un minuto entre corridas").toBe(200);
  const api = await r.json();
  const b = api.health_breakdown;
  await page.goto("/herramientas/prisma"); // id del asistente (D-28)
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(api.repository.name);
  await expect(page.getByText(String(Math.round(api.repository.health_score)), { exact: true }).first()).toBeVisible();
  const desglose = page.locator("section[aria-labelledby='titulo-desglose']");
  const esperado: Array<[string, number, number]> = [
    ["commits", b.commit_frequency_score, 25],
    ["issues", b.issue_resolution_score, 20],
    ["licencia", b.license_score, 20],
    ["comunidad", b.community_score, 20],
    ["documentacion", b.documentation_score, 15],
  ];
  for (const [clave, puntos, maximo] of esperado) {
    const texto = `${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(puntos)} de ${maximo}`;
    await expect(desglose.locator(`[data-componente='${clave}'] dd`)).toHaveText(texto);
  }
  // Datos que el backend no tiene: «Sin dato», nunca inventados (spec 001 §10.3).
  await expect(page.getByText("Todavía no hay ideas de integración")).toBeVisible();
});

test("el filtro de mantenimiento reparte los 30 entre activo, moderado y bajo según commit_frequency_score", async ({ page }) => {
  let total = 0;
  for (const nivel of ["activo", "moderado", "bajo"]) {
    await page.goto(`/?mantenimiento=${nivel}`);
    await expect(page.getByLabel("Mantenimiento", { exact: true })).toHaveValue(nivel);
    const n = await page.locator(tarjetas).count();
    total += n;
  }
  await page.goto("/?mantenimiento=abandonado");
  await expect(page.locator(tarjetas)).toHaveCount(0); // «abandonado» no se deriva del backend
  expect(total).toBe(30);
});

test("con el backend caído se ve el error genérico y ningún dato", async ({ page }) => {
  const respuesta = await page.goto("http://localhost:3102/");
  expect(respuesta?.status()).toBeGreaterThanOrEqual(200);
  await expect(page.getByRole("heading", { name: "No pudimos cargar el catálogo" })).toBeVisible();
  await expect(page.locator(tarjetas)).toHaveCount(0);
  await page.goto("http://localhost:3102/herramientas/prisma");
  await expect(page.getByRole("heading", { name: "No pudimos cargar el catálogo" })).toBeVisible();
});
