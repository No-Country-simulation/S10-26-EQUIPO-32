// Dataset real del asistente (feature 002 · A02, RF-12; ampliado por la feature 005, RF-16 y RF-17): ≥ 100 repos reales
// de data/semilla-repos.json, validados con contrato.ts.
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
const semilla = JSON.parse(readFileSync(join(__dirname, "../../../../data/semilla-repos.json"), "utf8")) as {
  repos: Array<{ repo: string; id: string; nombre: string }>;
};

describe("repos-reales.json · validado con contrato.ts (RF-12, RF-16)", () => {
  const { herramientas, omitidas } = parsearLista(crudos, AHORA);

  it("al menos 100 repos, ninguno omitido", () => {
    expect(omitidas).toBe(0);
    expect(herramientas.length).toBeGreaterThanOrEqual(100);
  });

  it("al menos 15 repos por categoría principal (la primera) y las 6 categorías cubiertas", () => {
    const principal = herramientas.map((h) => h.categorias.length > 0 && (crudos.find((c) => c.id === h.id)!.categorias as string[])[0]);
    for (const c of CATEGORIAS) expect(principal.filter((p) => p === c).length).toBeGreaterThanOrEqual(15);
  });

  it("todos salen de la semilla, con su id, nombre y owner/repo (nada sintético)", () => {
    const porId = new Map(semilla.repos.map((r) => [r.id, r]));
    for (const c of crudos) {
      const s = porId.get(c.id as string);
      expect(s).toBeDefined();
      expect(c.nombre).toBe(s!.nombre);
      expect((c.urlRepo as string).toLowerCase()).toBe(`https://github.com/${s!.repo}`.toLowerCase());
    }
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
