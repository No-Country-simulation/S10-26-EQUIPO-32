import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

// Feature 007 (RF-20..23, RF-26): todo control visible hace algo real. Datos de prueba: CATALOG_SOURCE=fixtures.
const RAIZ_REPO = resolve(process.cwd(), "../..");
const URL_REPO = "https://github.com/No-Country-simulation/S10-26-EQUIPO-32";
const GRILLA = "section[aria-label='Herramientas del catálogo']";

/** Respuesta simulada del asistente (el backend real no corre en los e2e). Demora para poder ver el estado de carga. */
async function simularAsistente(page: Page, cuerpos: string[]) {
  await page.route("**/api/asistente", async (ruta) => {
    cuerpos.push(ruta.request().postData() ?? "");
    await new Promise((r) => setTimeout(r, 700));
    await ruta.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        estado: "ok",
        stack: [{ id: "brisa-registro", nombre: "Brisa Registro", rol: "login" }],
        justificacion: "Cubre el inicio de sesión.",
        citados: [{ id: "brisa-registro", nombre: "Brisa Registro" }],
      }),
    });
  });
}

test.describe("CTA", () => {
  test("«Probar el asistente» de la portada abre el panel, lleva el foco al campo y Escape lo cierra", async ({ page }) => {
    await page.goto("/");
    const cta = page.locator("main").getByRole("button", { name: "Probar el asistente" }).first();
    await expect(cta).toHaveAttribute("aria-expanded", "false");
    await cta.click();
    const panel = page.getByRole("region", { name: "¿Qué stack te conviene?" });
    await expect(panel).toBeVisible();
    await expect(page.getByLabel("Describí tu negocio")).toBeFocused();
    await expect(cta).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);
  });

  test("el CTA de la sección del asistente y el de la cabecera abren el mismo panel", async ({ page }) => {
    await page.goto("/");
    await page.locator("#asistente").getByRole("button", { name: "Probar el asistente" }).click();
    await expect(page.getByRole("region", { name: "¿Qué stack te conviene?" })).toHaveCount(1);
    await page.getByRole("button", { name: "Cerrar asistente" }).click();
    await page.getByRole("navigation", { name: "Principal" }).getByRole("button", { name: "Asistente" }).click();
    await expect(page.getByRole("region", { name: "¿Qué stack te conviene?" })).toHaveCount(1);
  });

  test("«Explorar el catálogo» hace scroll a la grilla", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Explorar el catálogo" }).click();
    await expect(page).toHaveURL(/#catalogo$/);
    await expect(page.locator("#catalogo")).toBeInViewport();
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(300);
  });

  test("«Seguridad por diseño» y los links de la cabecera llegan a una sección que existe", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Seguridad por diseño" }).click();
    await expect(page.locator("#seguridad")).toBeInViewport();
  });
});

test.describe("sin links muertos", () => {
  test("todo link de la portada tiene destino: anclas con elemento, rutas internas que responden y externos al repo", async ({ page, request }) => {
    await page.goto("/");
    const hrefs = await page.locator("a[href]").evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? ""));
    expect(hrefs.length).toBeGreaterThan(20);
    const internos = new Set<string>();
    for (const href of new Set(hrefs)) {
      expect(href, "href vacío o «#»").not.toMatch(/^(#|)$/);
      expect(href).not.toMatch(/^javascript:/i);
      if (href.startsWith("http")) {
        expect(href.startsWith(URL_REPO), `externo fuera del repo: ${href}`).toBe(true);
      } else if (href.startsWith("#") || href.startsWith("/#")) {
        const ancla = href.replace(/^\/?#/, "");
        await expect(page.locator(`[id="${ancla}"]`), `ancla ${href}`).toHaveCount(1);
      } else {
        internos.add(href);
      }
    }
    for (const ruta of internos) {
      const r = await request.get(ruta);
      expect(r.status(), `ruta interna ${ruta}`).toBe(200);
    }
  });

  test("los links del footer apuntan a documentos y carpetas que existen en el repositorio (y a su ancla)", async ({ page }) => {
    await page.goto("/");
    const externos = await page.locator("footer a[href^='http']").evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? ""));
    expect(externos.length).toBeGreaterThanOrEqual(5);
    for (const href of externos) {
      const url = new URL(href);
      expect(`${url.origin}${url.pathname}`.startsWith(URL_REPO)).toBe(true);
      const ruta = url.pathname.replace("/No-Country-simulation/S10-26-EQUIPO-32", "").replace(/^\/(blob|tree)\/main\/?/, "");
      const local = resolve(RAIZ_REPO, ruta);
      expect(existsSync(local), `no existe ${ruta || "(raíz)"} para ${href}`).toBe(true);
      const archivoMd = ruta === "" ? resolve(RAIZ_REPO, "README.md") : local;
      if (url.hash !== "" && archivoMd.endsWith(".md")) {
        const slugs = readFileSync(archivoMd, "utf8")
          .split("\n")
          .filter((l) => /^#{1,6}\s/.test(l))
          .map((l) =>
            l
              .replace(/^#{1,6}\s+/, "")
              .toLowerCase()
              .replace(/[^\p{L}\p{N}\s_-]/gu, "")
              .trim()
              .replace(/\s/g, "-"),
          );
        expect(slugs, `ancla ${url.hash} en ${archivoMd}`).toContain(url.hash.slice(1));
      }
    }
  });
});

test.describe("asistente", () => {
  test("una consulta de ejemplo se envía sola, muestra el estado de carga y luego la respuesta", async ({ page }) => {
    const cuerpos: string[] = [];
    await simularAsistente(page, cuerpos);
    await page.goto("/");
    await page.getByRole("navigation", { name: "Principal" }).getByRole("button", { name: "Asistente" }).click();
    const ejemplos = page.getByRole("list", { name: "Probá con una consulta de ejemplo" }).getByRole("button");
    await expect(ejemplos).toHaveCount(3);
    const texto = (await ejemplos.first().innerText()).trim();
    await ejemplos.first().click();
    await expect(page.getByRole("status")).toContainText("Buscando en el catálogo");
    await expect(ejemplos.first()).toBeDisabled(); // no se puede disparar dos veces
    await expect(page.getByRole("button", { name: "Pensando…" })).toBeDisabled();
    await expect(page.getByLabel("Describí tu negocio")).toHaveValue(texto);
    await expect(page.getByRole("heading", { name: "Stack recomendado" })).toBeVisible();
    expect(cuerpos).toHaveLength(1);
    expect(JSON.parse(cuerpos[0] ?? "{}")).toEqual({ consulta: texto });
    await expect(page.getByRole("region", { name: "¿Qué stack te conviene?" }).getByRole("link", { name: "Brisa Registro" }).first()).toHaveAttribute(
      "href",
      "/herramientas/brisa-registro",
    );
  });

  test("con teclado: Tab llega a un ejemplo y Enter lo envía", async ({ page }) => {
    const cuerpos: string[] = [];
    await simularAsistente(page, cuerpos);
    await page.goto("/");
    await page.locator("main").getByRole("button", { name: "Probar el asistente" }).first().click();
    const segundo = page.getByRole("list", { name: "Probá con una consulta de ejemplo" }).getByRole("button").nth(1);
    await segundo.focus();
    await page.keyboard.press("Enter");
    await expect.poll(() => cuerpos.length).toBe(1);
    await expect(page.getByRole("heading", { name: "Stack recomendado" })).toBeVisible();
  });
});

test.describe("carrusel", () => {
  test("hay un punto por tarjeta; elegir uno desplaza la pista y marca el activo", async ({ page }) => {
    await page.goto("/");
    const pista = page.locator("#destacadas-pista");
    const puntos = page.getByRole("list", { name: "Posición en el carrusel" }).getByRole("button");
    const tarjetas = await pista.locator("li").count();
    expect(tarjetas).toBeGreaterThanOrEqual(4);
    await expect(puntos).toHaveCount(tarjetas);
    await expect(puntos.first()).toHaveAttribute("aria-current", "true");
    await puntos.nth(3).click();
    await expect(puntos.nth(3)).toHaveAttribute("aria-current", "true");
    expect(await pista.evaluate((el) => el.scrollLeft)).toBeGreaterThan(200);
    await expect(puntos.first()).not.toHaveAttribute("aria-current", "true");
  });

  test("los puntos son operables con teclado", async ({ page }) => {
    await page.goto("/");
    const puntos = page.getByRole("list", { name: "Posición en el carrusel" }).getByRole("button");
    await puntos.nth(2).focus();
    await page.keyboard.press("Enter");
    await expect(puntos.nth(2)).toHaveAttribute("aria-current", "true");
  });

  test("se arrastra con el mouse y un arrastre no abre la ficha; un clic sí", async ({ page }) => {
    await page.goto("/");
    const pista = page.locator("#destacadas-pista");
    await pista.scrollIntoViewIfNeeded();
    const caja = (await pista.boundingBox())!;
    const y = caja.y + 120;
    await page.mouse.move(caja.x + 600, y);
    await page.mouse.down();
    await page.mouse.move(caja.x + 400, y, { steps: 8 });
    await page.mouse.move(caja.x + 200, y, { steps: 8 });
    await page.mouse.up();
    await expect.poll(() => pista.evaluate((el) => el.scrollLeft)).toBeGreaterThan(100);
    await expect(page).toHaveURL(/\/$/); // el arrastre no navegó
    await pista.locator("li").first().getByRole("link").click();
    await expect(page).toHaveURL(/\/herramientas\/[a-z0-9-]+$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});

test.describe("tabs de la grilla", () => {
  const ids = (page: Page) => page.locator(`${GRILLA} h3 a`).evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? ""));
  const saludes = (page: Page) =>
    page.locator(`${GRILLA} > ul > li`).evaluateAll((lis) =>
      lis.map((li) => {
        const m = /Salud\s*(\d+)/.exec(li.textContent ?? "");
        return m ? Number(m[1]) : -1;
      }),
    );

  test("«Mejor salud» ordena por salud de mayor a menor y «Recientes» vuelve a cambiar el orden", async ({ page }) => {
    await page.goto("/");
    const recientes = await ids(page);
    await page.getByRole("tab", { name: "Mejor salud" }).click();
    await expect(page.getByRole("tab", { name: "Mejor salud" })).toHaveAttribute("aria-selected", "true");
    const salud = await ids(page);
    expect(salud).not.toEqual(recientes);
    expect([...salud].sort()).toEqual([...recientes].sort()); // mismos elementos, otro orden
    const scores = await saludes(page);
    expect(scores.slice(0, 5).every((s, i, a) => i === 0 || a[i - 1]! >= s)).toBe(true);
    expect(scores[0]).toBeGreaterThan(90);
    await page.getByRole("tab", { name: "Recientes" }).click();
    expect(await ids(page)).toEqual(recientes);
  });

  test("con teclado: la flecha derecha cambia de tab y reordena", async ({ page }) => {
    await page.goto("/");
    const antes = await ids(page);
    await page.getByRole("tab", { name: "Recientes" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "Mejor salud" })).toBeFocused();
    await expect.poll(() => ids(page)).not.toEqual(antes);
  });
});

test("las tarjetas de la grilla abren la ficha", async ({ page }) => {
  await page.goto("/");
  await page.locator(`${GRILLA} h3 a`).first().click();
  await expect(page).toHaveURL(/\/herramientas\/[a-z0-9-]+$/);
});

test.describe("movimiento reducido (RF-26)", () => {
  test.use({ reducedMotion: "reduce" });

  test("sin animaciones de entrada ni rotación, y el carrusel se desplaza al instante", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "Mejor salud" }).click();
    const anim = await page.evaluate(() => ({
      grilla: getComputedStyle(document.querySelector(".ob-aparecer")!).animationName,
      tile: getComputedStyle(document.querySelector(".ob-rotar > *")!).animationName,
    }));
    expect(anim).toEqual({ grilla: "none", tile: "none" });
    const pista = page.locator("#destacadas-pista");
    await page.getByRole("list", { name: "Posición en el carrusel" }).getByRole("button").nth(3).click();
    // Instantáneo: no hace falta esperar a una animación de varios cientos de ms.
    expect(await pista.evaluate((el) => el.scrollLeft)).toBeGreaterThan(200);
  });
});
