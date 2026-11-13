import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

// R-24 (ui-brief §9, TI1/TI3). La demo de UI (`demo/demo-ui/page.tsx`) es solo de desarrollo: el build de producción
// no registra la ruta `/demo-ui` ni publica su código en `/_next/static`. Un `notFound()` en producción no alcanza:
// la página responde 404, pero su componente cliente igual se compila y queda descargable como chunk estático.
const NEXT = join(__dirname, "../../.next");

// Textos que solo existen en los datos inventados de la demo (no en el catálogo, las fixtures ni el diccionario).
const MARCAS_DEMO = ["Herramienta de ejemplo para revisar la presentación", "ejemplo-sintetico/ejemplo"];

function archivosJs(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".js"))
    .map((e) => join(e.parentPath, e.name));
}

test("/demo-ui responde 404 en producción", async ({ request }) => {
  const respuesta = await request.get("/demo-ui");
  expect(respuesta.status()).toBe(404);
  expect(await respuesta.text()).not.toContain(MARCAS_DEMO[0]);
});

test("el build de producción no registra ninguna ruta de demo", () => {
  const rutas = JSON.parse(readFileSync(join(NEXT, "app-path-routes-manifest.json"), "utf8")) as Record<string, string>;
  const conDemo = Object.entries(rutas).filter(([clave, ruta]) => /demo/i.test(clave) || /demo/i.test(ruta));
  expect(conDemo).toEqual([]);
  expect(Object.values(rutas)).toContain("/");
});

test("ningún chunk estático publicado contiene código de la demo", () => {
  const chunks = archivosJs(join(NEXT, "static"));
  expect(chunks.length).toBeGreaterThan(0);
  const conDemo = chunks.filter((ruta) => {
    const contenido = readFileSync(ruta, "utf8");
    return MARCAS_DEMO.some((marca) => contenido.includes(marca));
  });
  expect(conDemo).toEqual([]);
});
