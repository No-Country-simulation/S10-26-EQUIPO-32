import { expect, test } from "@playwright/test";

// T20 (RF-03 f, RF-04, MU-05, D-06). Datos de prueba: CATALOG_SOURCE=fixtures (playwright.config.ts).
test("elegir una categoría y buscar actualiza la URL sin ir al servidor", async ({ page }) => {
  await page.goto("/");
  const pedidos: string[] = [];
  page.on("request", (r) => {
    // Los prefetch de los enlaces a las fichas (/herramientas/…) son esperables; un pedido a «/» no (RNF-07).
    const { pathname } = new URL(r.url());
    if (pathname === "/" && (r.resourceType() === "document" || r.url().includes("_rsc"))) pedidos.push(r.url());
  });
  await page.getByRole("button", { name: "Pagos", exact: true }).click();
  await page.getByLabel("Buscar herramientas").fill("a");
  await expect(page).toHaveURL(/\?categoria=pagos&q=a$/);
  expect(pedidos).toEqual([]);
});

test("recargar un enlace con filtros muestra la misma selección", async ({ page }) => {
  await page.goto("/?categoria=ia&mantenimiento=activo&stars=100");
  await expect(page.getByRole("button", { name: "IA", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Mantenimiento", { exact: true })).toHaveValue("activo");
  await expect(page.getByLabel("Stars mínimos")).toHaveValue("100");
  const cantidad = await page.locator("section[aria-label='Herramientas del catálogo'] ul > li").count();
  await page.reload();
  await expect(page.locator("section[aria-label='Herramientas del catálogo'] ul > li")).toHaveCount(cantidad);
});

test("una URL manipulada carga sin error y muestra la búsqueda como texto", async ({ page }) => {
  const dialogos: string[] = [];
  page.on("dialog", (d) => dialogos.push(d.message()));
  const r = await page.goto("/?categoria=hackeo&stars=-5&lenguaje=%3Cb%3E&q=%3Csvg%20onload%3Dx%3E");
  expect(r?.status()).toBe(200);
  await expect(page.getByLabel("Buscar herramientas")).toHaveValue("<svg onload=x>");
  await expect(page.getByText("No hay herramientas para la búsqueda «<svg onload=x>».")).toBeVisible();
  await expect(page.locator("main svg[onload]")).toHaveCount(0);
  expect(dialogos).toEqual([]);
  await page.getByRole("button", { name: "Limpiar todo" }).first().click();
  await expect(page).toHaveURL(/\/$/);
});
