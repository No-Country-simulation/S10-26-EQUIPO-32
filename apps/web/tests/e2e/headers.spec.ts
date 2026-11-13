import { expect, test } from "@playwright/test";

// T29 (R-13, AM-11, RNF-15, Spec §9). Contra el build de producción: cubre T24 (headers estáticos) y T25 (CSP con nonce).
const RUTAS = ["/", "/herramientas/brisa-registro"];

const ESTATICOS: Record<string, string> = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-frame-options": "DENY",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), clipboard-write=(self)",
  "strict-transport-security": "max-age=63072000; includeSubDomains",
  "cross-origin-opener-policy": "same-origin",
};

for (const ruta of RUTAS) {
  test(`${ruta}: headers estáticos del plan 5.2 y sin X-Powered-By`, async ({ request }) => {
    const r = await request.get(ruta);
    expect(r.status()).toBe(200);
    const h = r.headers();
    for (const [nombre, valor] of Object.entries(ESTATICOS)) expect(h[nombre], nombre).toBe(valor);
    expect(h["x-powered-by"]).toBeUndefined();
  });

  test(`${ruta}: CSP sin unsafe-eval ni unsafe-inline en script-src, con nonce`, async ({ request }) => {
    const csp = (await request.get(ruta)).headers()["content-security-policy"] ?? "";
    const directivas = Object.fromEntries(csp.split(";").map((d) => d.trim()).filter(Boolean).map((d) => [d.split(" ")[0], d]));
    expect(directivas["script-src"]).toMatch(/^script-src 'self' 'nonce-[A-Za-z0-9+/=]{22,}' 'strict-dynamic'$/);
    expect(directivas["script-src"]).not.toMatch(/unsafe-/);
    for (const d of ["default-src 'self'", "img-src 'self'", "font-src 'self'", "connect-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'"])
      expect(Object.values(directivas), d).toContain(d);
  });
}

test("el nonce cambia entre dos requests y es el que llevan los scripts de la página", async ({ request }) => {
  const nonce = async () => {
    const r = await request.get("/");
    const delHeader = /'nonce-([^']+)'/.exec(r.headers()["content-security-policy"] ?? "")?.[1];
    const html = await r.text();
    return { delHeader, enHtml: /<script[^>]*\snonce="([^"]+)"/.exec(html)?.[1] };
  };
  const a = await nonce();
  const b = await nonce();
  expect(a.delHeader).toBeTruthy();
  expect(a.delHeader).not.toBe(b.delHeader);
  expect(a.enHtml).toBe(a.delHeader); // Next aplicó el nonce a sus scripts
  expect(b.enHtml).toBe(b.delHeader);
});

for (const esquema of ["light", "dark"] as const) {
  test(`RNF-15: con el sistema en ${esquema} el fondo es blanco y no hay control de tema`, async ({ browser }) => {
    const contexto = await browser.newContext({ colorScheme: esquema });
    const page = await contexto.newPage();
    await page.goto("/");
    const fondo = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(fondo).toBe("rgb(255, 255, 255)");
    await expect(page.getByRole("button", { name: /tema|oscuro|claro|dark|light/i })).toHaveCount(0);
    await expect(page.locator("html.dark, [data-theme]")).toHaveCount(0);
    await contexto.close();
  });
}

test("Feature 002 (RF-11): el botón abre el panel del asistente y no hace requests hasta enviar", async ({ page }) => {
  await page.goto("/");
  const boton = page.getByRole("button", { name: "Asistente", exact: true });
  await expect(boton).toHaveAttribute("aria-expanded", "false");
  const pedidos: string[] = [];
  page.on("request", (r) => pedidos.push(r.url()));
  await boton.click();
  await expect(boton).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByLabel("Describí tu negocio")).toHaveAttribute("maxlength", "500");
  await page.waitForTimeout(300);
  expect(pedidos.filter((u) => u.includes("/api/asistente"))).toEqual([]);
});
