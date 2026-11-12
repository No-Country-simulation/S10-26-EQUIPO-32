// Dataset real del asistente (feature 002 · A02, RF-12): 30 repos reales validados con contrato.ts.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CATEGORIAS, parsearHerramientaDetalle, parsearLista } from "@/lib/catalogo/contrato";
import { crearAdaptadorReales } from "@/lib/catalogo/adaptadores/reales";
import { ejecutarSuiteContratoAdaptador } from "./suite-adaptador";

const AHORA = new Date("2026-11-13T12:00:00Z");
const crudos = JSON.parse(readFileSync(join(__dirname, "../../data/repos-reales.json"), "utf8")) as Array<
  Record<string, unknown>
>;

describe("repos-reales.json · validado con contrato.ts (RF-12)", () => {
  const { herramientas, omitidas } = parsearLista(crudos, AHORA);

  it("30 repos, ninguno omitido", () => {
    expect(omitidas).toBe(0);
    expect(herramientas).toHaveLength(30);
  });

  it("5 repos por categoría principal (la primera) y las 6 categorías cubiertas", () => {
    const principal = herramientas.map((h) => h.categorias.length > 0 && (crudos.find((c) => c.id === h.id)!.categorias as string[])[0]);
    for (const c of CATEGORIAS) expect(principal.filter((p) => p === c)).toHaveLength(5);
  });

  it("cada repo tiene 1 o 2 ideas, todas sin revisar", () => {
    for (const c of crudos) {
      const d = parsearHerramientaDetalle(c, AHORA);
      expect(d).not.toBeNull();
      expect(d!.ideas.length).toBeGreaterThanOrEqual(1);
      expect(d!.ideas.length).toBeLessThanOrEqual(2);
      expect(d!.ideas.every((i) => i.revisada === false && i.snippet !== null)).toBe(true);
      expect((c.ideas as Array<{ revisada: unknown }>).every((i) => i.revisada === false)).toBe(true);
    }
  });

  it("enlaces válidos a github.com y licencia/descripcion presentes o «Sin dato» explícito", () => {
    for (const h of herramientas) {
      expect(h.urlRepo).toMatch(/^https:\/\/github\.com\/[^/]+\/[^/]+$/);
      expect(h.descripcion).not.toBeNull();
    }
  });

  it("no inventa métricas que dependen de la fórmula de 003 (P7)", () => {
    for (const h of herramientas) {
      expect(h.healthScore).toBeNull();
      expect(h.nivelMantenimiento).toBeNull();
      expect(h.metricasTomadasEn).not.toBeNull();
    }
  });
});

ejecutarSuiteContratoAdaptador("reales", () => crearAdaptadorReales());
