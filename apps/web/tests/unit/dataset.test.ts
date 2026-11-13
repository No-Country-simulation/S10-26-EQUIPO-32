import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parsearHerramientaDetalle, parsearLista } from "@/lib/catalogo/contrato";
import { crearAdaptadorSintetico } from "@/lib/catalogo/adaptadores/sintetico";
import { ejecutarSuiteContratoAdaptador } from "./suite-adaptador";

const AHORA = new Date("2026-11-10T12:00:00Z");
const RUTA = join(__dirname, "../../data/sintetico.json");
const crudos = JSON.parse(readFileSync(RUTA, "utf8")) as Array<Record<string, unknown>>;

describe("dataset sintético · validado con contrato.ts (T10, spec §9)", () => {
  const { herramientas, omitidas } = parsearLista(crudos, AHORA);

  it("todas las herramientas son válidas: ninguna omitida", () => {
    expect(omitidas).toBe(0);
    expect(herramientas).toHaveLength(crudos.length);
    expect(herramientas.length).toBeGreaterThanOrEqual(30); // MVP: reducido de 150
  });

  it("cumple la distribución mínima de plan 4.6", () => {
    expect(new Set(herramientas.flatMap((h) => h.categorias)).size).toBe(6);
    expect(herramientas.filter((h) => h.categorias.length === 2).length).toBeGreaterThanOrEqual(15);
    expect(new Set(herramientas.map((h) => h.lenguaje).filter(Boolean)).size).toBeGreaterThanOrEqual(8);
    expect(new Set(herramientas.map((h) => h.licencia).filter(Boolean)).size).toBeGreaterThanOrEqual(6);
    expect(new Set(herramientas.map((h) => h.nivelMantenimiento).filter(Boolean))).toEqual(
      new Set(["activo", "moderado", "abandonado"]),
    );
    expect(herramientas.filter((h) => h.licencia === null).length).toBeGreaterThanOrEqual(5);
    expect(herramientas.filter((h) => h.descripcion === null).length).toBeGreaterThanOrEqual(10);
  });

  it("al menos 20 sin ideas y con ideas revisadas y no revisadas", () => {
    const detalles = crudos.map((c) => parsearHerramientaDetalle(c, AHORA));
    expect(detalles.every((d) => d !== null)).toBe(true);
    expect(detalles.filter((d) => d?.ideas.length === 0).length).toBeGreaterThanOrEqual(20);
    const ideas = detalles.flatMap((d) => d?.ideas ?? []);
    expect(ideas.some((i) => i.revisada)).toBe(true);
    expect(ideas.some((i) => !i.revisada)).toBe(true);
    expect(ideas.every((i) => i.snippet !== null && !i.snippetExcedeLimite)).toBe(true);
  });

  it("incluye descripciones que la tarjeta tiene que cortar", () => {
    expect(herramientas.some((h) => h.descripcionTruncada)).toBe(true);
  });

  it("los datos de ejemplo no llevan enlaces reales a otras personas ni nada fuera de lo ficticio", () => {
    for (const c of crudos) {
      const url = c.urlRepo;
      if (url !== null) expect(url).toMatch(/^https:\/\/github\.com\/ejemplo-sintetico\//);
    }
  });
});

describe("generar-dataset.mjs · determinista", () => {
  it("re-ejecutar el script no cambia el archivo", () => {
    const dir = mkdtempSync(join(tmpdir(), "openbridge-"));
    try {
      const salida = join(dir, "sintetico.json");
      const r = spawnSync(process.execPath, [join(__dirname, "../../scripts/generar-dataset.mjs"), "--salida", salida], {
        encoding: "utf8",
      });
      expect(r.status).toBe(0);
      expect(readFileSync(salida, "utf8")).toBe(readFileSync(RUTA, "utf8"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

ejecutarSuiteContratoAdaptador("sintetico", () => crearAdaptadorSintetico());
