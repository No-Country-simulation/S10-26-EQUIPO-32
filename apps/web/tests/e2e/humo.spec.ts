import { expect, test } from "@playwright/test";

test("la portada carga desde el build de producción", async ({ page }) => {
  const respuesta = await page.goto("/");
  expect(respuesta?.status()).toBe(200);
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
});
