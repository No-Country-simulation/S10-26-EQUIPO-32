import { expect, test, type Page } from "@playwright/test";

// Feature 008: la búsqueda mira id, lenguaje, licencia y categorías; los ítems del explorador son filtros reales
// que se reflejan en la URL; feedback con scroll a la grilla, chips y conteo anunciado. Datos: CATALOG_SOURCE=fixtures.
const EXPLORADOR = "[role='group'][aria-label='Explorar el catálogo']";
const GRILLA = "section[aria-label='Herramientas del catálogo']";

const tarjetas = (page: Page) => page.locator(`${GRILLA} > ul > li`);
const buscador = (page: Page) => page.getByRole("searchbox", { name: "Buscar herramientas" });
const cantidad = (page: Page) => tarjetas(page).count();

test("buscar «Java» da más de un resultado, todos con Java, y se refleja en la URL", async ({ page }) => {
  await page.goto("/");
  const total = await cantidad(page);
  await buscador(page).fill("Java");
  await expect.poll(() => cantidad(page)).toBeGreaterThan(1);
  expect(await cantidad(page)).toBeLessThan(total);
  await expect(page).toHaveURL(/[?&]q=Java(&|$)/);
  // Cada resultado tiene «java» en algún campo visible (lenguaje, nombre, descripción, id o categoría).
  for (const texto of await tarjetas(page).allInnerTexts()) expect(texto.toLowerCase()).toContain("java");
  // Feedback: chip de la búsqueda con «Limpiar todo» y conteo anunciado.
  await expect(page.getByRole("button", { name: /Quitar.*Búsqueda: Java/ })).toBeVisible();
  await expect(page.locator(`${GRILLA} [aria-live='polite']`)).toContainText(/\d+\s*herramientas/);
  await page.getByRole("button", { name: "Limpiar todo" }).first().click();
  await expect.poll(() => cantidad(page)).toBe(total);
  await expect(page).not.toHaveURL(/q=/);
});

test("la búsqueda también encuentra por id, licencia y categoría", async ({ page }) => {
  await page.goto("/");
  await buscador(page).fill("brisa-registro"); // id
  await expect.poll(() => cantidad(page)).toBe(1);
  await buscador(page).fill("Apache-2.0"); // licencia
  await expect.poll(() => cantidad(page)).toBeGreaterThan(1);
  await buscador(page).fill("Analítica"); // etiqueta de categoría
  await expect.poll(() => cantidad(page)).toBeGreaterThan(1);
});

test("Enter en la búsqueda lleva a la grilla", async ({ page }) => {
  await page.goto("/");
  await buscador(page).fill("Python");
  await buscador(page).press("Enter");
  await expect(page.locator(GRILLA)).toBeInViewport();
});

test("clic en Java, en MIT o en un caso de uso filtra, se refleja en la URL y un segundo clic lo quita", async ({ page }) => {
  await page.goto("/");
  const total = await cantidad(page);
  const explorador = page.locator(EXPLORADOR);

  const ciclo = async (nombre: RegExp, parametro: RegExp) => {
    const item = explorador.getByRole("button", { name: nombre });
    await item.click();
    await expect(item).toHaveAttribute("aria-pressed", "true"); // estado activo visible y anunciado
    await expect(page).toHaveURL(parametro);
    await expect.poll(() => cantidad(page)).toBeLessThan(total);
    expect(await cantidad(page)).toBeGreaterThan(0);
    await expect(page.locator(GRILLA)).toBeInViewport(); // scroll hasta la grilla
    await item.click(); // segundo clic: lo quita
    await expect(item).toHaveAttribute("aria-pressed", "false");
    await expect(page).not.toHaveURL(parametro);
    await expect.poll(() => cantidad(page)).toBe(total);
  };

  await ciclo(/^Java\s*\d+$/, /[?&]lenguaje=Java(&|$)/);
  await ciclo(/^MIT\s*\d+$/, /[?&]licencia=MIT(&|$)/);
  await ciclo(/^Docker\s*\d+$/, /[?&]caso=docker(&|$)/);
});

test("el filtro del caso de uso muestra su chip y el conteo coincide con el resultado", async ({ page }) => {
  await page.goto("/");
  const item = page.locator(EXPLORADOR).getByRole("button", { name: /^SDK\s*\d+$/ });
  const conteo = Number((await item.innerText()).match(/\d+$/)?.[0]);
  expect(conteo).toBeGreaterThan(0);
  await item.click();
  await expect.poll(() => cantidad(page)).toBe(conteo);
  await expect(page.getByRole("button", { name: /Quitar.*Casos de uso/ })).toBeVisible();
});

test("la URL con un caso inválido se ignora (MU-05)", async ({ page }) => {
  await page.goto("/?caso=__proto__&lenguaje=%27%20OR%201%3D1");
  expect(await cantidad(page)).toBeGreaterThan(10);
  await expect(page.getByRole("button", { name: /Quitar/ })).toHaveCount(0);
});

test("con los fixtures MU la búsqueda sigue siendo literal, sin regex ni HTML (MU-05)", async ({ page }) => {
  await page.goto("/");
  await buscador(page).fill("<img src=x onerror=alert(1)>");
  await expect.poll(() => cantidad(page)).toBe(1);
  await expect(tarjetas(page).first()).toContainText("<img src=x onerror=alert(1)>");
  await expect(page.locator("main img[src='x']")).toHaveCount(0);
  await buscador(page).fill(".*");
  await expect.poll(() => cantidad(page)).toBeLessThan(5); // como patrón habría coincidido con todo
  await buscador(page).fill("[(");
  await expect.poll(() => cantidad(page)).toBeLessThan(5);
  await buscador(page).fill("zzz-no-existe");
  await expect(page.getByRole("heading", { name: "No encontramos herramientas" })).toBeVisible();
});

test.describe("movimiento reducido", () => {
  test.use({ reducedMotion: "reduce" });
  test("elegir un ítem lleva a la grilla al instante", async ({ page }) => {
    await page.goto("/");
    await page.locator(EXPLORADOR).getByRole("button", { name: /^MIT\s*\d+$/ }).click();
    // Instantáneo: la grilla ya está a la vista sin esperar una animación.
    await expect(page.locator(GRILLA)).toBeInViewport({ timeout: 500 });
  });
});
