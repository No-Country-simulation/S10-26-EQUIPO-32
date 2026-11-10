import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CATEGORIAS, type Categoria } from "@/lib/catalogo/categorias";
import { parsearLista } from "@/lib/catalogo/contrato";
import { filtrarPorCategoria } from "@/lib/catalogo/filtros";

const t = (id: string, categorias: Categoria[]) => ({ id, categorias });
const lista = [t("a", ["pagos"]), t("b", ["pagos", "ia"]), t("c", ["ia"]), t("d", ["busqueda"])];

describe("filtrarPorCategoria (RF-01 b)", () => {
  it("incluye las herramientas de la categoría aunque tengan otras", () => {
    expect(filtrarPorCategoria(lista, "pagos").map((h) => h.id)).toEqual(["a", "b"]);
    expect(filtrarPorCategoria(lista, "ia").map((h) => h.id)).toEqual(["b", "c"]);
  });

  it("null = sin filtro: devuelve todo, en el mismo orden y como copia", () => {
    const todo = filtrarPorCategoria(lista, null);
    expect(todo).toEqual(lista);
    expect(todo).not.toBe(lista);
  });

  it("una categoría sin herramientas devuelve una lista vacía", () => {
    expect(filtrarPorCategoria(lista, "analitica")).toEqual([]);
    expect(filtrarPorCategoria([], "pagos")).toEqual([]);
  });

  it("no modifica la entrada", () => {
    const copia = structuredClone(lista);
    filtrarPorCategoria(lista, "pagos");
    expect(lista).toEqual(copia);
  });

  it("sobre el dataset sintético: cada herramienta aparece en todas sus categorías y solo en ellas", () => {
    const crudos = JSON.parse(readFileSync(join(__dirname, "../../data/sintetico.json"), "utf8")) as unknown[];
    const { herramientas } = parsearLista(crudos);
    for (const categoria of CATEGORIAS) {
      const esperadas = herramientas.filter((h) => h.categorias.includes(categoria)).map((h) => h.id);
      expect(esperadas.length).toBeGreaterThan(0); // las 6 categorías tienen herramientas
      expect(filtrarPorCategoria(herramientas, categoria).map((h) => h.id)).toEqual(esperadas);
    }
    expect(filtrarPorCategoria(herramientas, null)).toHaveLength(herramientas.length);
    // hay herramientas con dos categorías: aparecen en dos filtros
    const doble = herramientas.find((h) => h.categorias.length === 2);
    expect(doble).toBeDefined();
    for (const c of doble?.categorias ?? []) {
      expect(filtrarPorCategoria(herramientas, c).map((h) => h.id)).toContain(doble?.id);
    }
  });
});
