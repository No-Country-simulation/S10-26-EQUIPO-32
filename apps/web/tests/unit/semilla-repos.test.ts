// Lista curada de repos reales (feature 005, RF-16): forma de data/semilla-repos.json. El criterio contra la API
// de GitHub (activo, licencia OSI) lo aplica la ingesta; acá se verifica lo que no depende de la red.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CATEGORIAS, esIdValido } from "@/lib/catalogo/contrato";

interface EntradaSemilla {
  repo: string;
  id: string;
  nombre: string;
  categorias: string[];
  licencia?: string;
  notaLicencia?: string;
}
const semilla = JSON.parse(readFileSync(join(__dirname, "../../../../data/semilla-repos.json"), "utf8")) as {
  criterio: string;
  repos: EntradaSemilla[];
  excluidos: Array<{ repo: string; motivo: string }>;
};
const FULL_NAME = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9._-]{1,100}$/;

describe("data/semilla-repos.json (RF-16)", () => {
  it("al menos 100 repos, con el criterio de selección documentado", () => {
    expect(semilla.repos.length).toBeGreaterThanOrEqual(100);
    expect(semilla.criterio).toMatch(/OSI/);
    expect(semilla.criterio).toMatch(/180 días/);
  });

  it("ids válidos para el contrato y únicos; owner/repo válido y único", () => {
    const ids = semilla.repos.map((r) => r.id);
    const repos = semilla.repos.map((r) => r.repo.toLowerCase());
    expect(ids.every(esIdValido)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    expect(semilla.repos.every((r) => FULL_NAME.test(r.repo))).toBe(true);
    expect(new Set(repos).size).toBe(repos.length);
  });

  it("las 6 categorías del catálogo, al menos 15 repos por categoría principal (la primera)", () => {
    for (const r of semilla.repos) {
      expect(r.categorias.length).toBeGreaterThanOrEqual(1);
      expect(r.categorias.every((c) => (CATEGORIAS as readonly string[]).includes(c))).toBe(true);
      expect(r.nombre.trim().length).toBeGreaterThan(0);
    }
    for (const c of CATEGORIAS) {
      expect(semilla.repos.filter((r) => r.categorias[0] === c).length).toBeGreaterThanOrEqual(15);
    }
  });

  it("una licencia manual siempre lleva su justificación", () => {
    for (const r of semilla.repos.filter((x) => x.licencia !== undefined)) {
      expect(r.notaLicencia?.length ?? 0).toBeGreaterThan(20);
    }
  });

  it("ningún excluido vuelve a la lista", () => {
    const enLista = new Set(semilla.repos.map((r) => r.repo.toLowerCase()));
    expect(semilla.excluidos.every((e) => !enLista.has(e.repo.toLowerCase()))).toBe(true);
  });
});
