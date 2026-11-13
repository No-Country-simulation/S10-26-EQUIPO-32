import { expect, test } from "@playwright/test";

// T21 (RF-02, AM-03, AM-16, MU-08). Datos de prueba: CATALOG_SOURCE=fixtures.
test("la ficha se abre desde la tarjeta y se recarga en su propia dirección", async ({ page }) => {
  await page.goto("/");
  // Acotado a la grilla: el carrusel y el asistente también enlazan herramientas por nombre (UI v2.1).
  await page.locator("section[aria-label='Herramientas del catálogo']").getByRole("link", { name: "Brisa Registro" }).click();
  await expect(page).toHaveURL(/\/herramientas\/brisa-registro$/);
  await expect(page.getByRole("heading", { level: 1, name: "Brisa Registro" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Brisa Registro" })).toBeVisible();
});

test("el enlace al repositorio válido tiene target y rel correctos", async ({ page }) => {
  await page.goto("/herramientas/brisa-registro");
  const enlace = page.getByRole("link", { name: "Ver repositorio en GitHub" });
  await expect(enlace).toHaveAttribute("href", /^https:\/\/github\.com\//);
  await expect(enlace).toHaveAttribute("target", "_blank");
  await expect(enlace).toHaveAttribute("rel", "noopener noreferrer");
});

test("con URL de repositorio inválida (MU-08) no aparece ningún enlace externo", async ({ page }) => {
  await page.goto("/herramientas/mu-08-enlace");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("main a[target]")).toHaveCount(0);
  await expect(page.locator('main a[href^="javascript:"]')).toHaveCount(0);
});

test("un id inexistente o inválido muestra «no encontrado»", async ({ page }) => {
  for (const id of ["no-existe", "ID_INVALIDO", "%3Cscript%3E", "a".repeat(150)]) {
    await page.goto(`/herramientas/${id}`);
    await expect(page.getByRole("heading", { name: "No encontramos esta herramienta" })).toBeVisible();
  }
});

test("el estado de error del origen se ve como página de error genérica (RF-01 e)", async ({ page }) => {
  await page.goto("/herramientas/mu-forzar-error");
  await expect(page.getByRole("heading", { name: "No pudimos cargar el catálogo" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reintentar" })).toBeVisible();
});
