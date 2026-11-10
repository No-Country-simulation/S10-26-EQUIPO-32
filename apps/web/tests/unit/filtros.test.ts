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

// ---------- T17: filtros combinados y búsqueda ----------
import { derivarOpciones, ESTADO_SIN_FILTROS, filtrar, type EstadoFiltros } from "@/lib/catalogo/filtros";

type F = {
  id: string; nombre: string; descripcion: string | null; categorias: Categoria[];
  lenguaje: string | null; licencia: string | null; stars: number | null;
  nivelMantenimiento: "activo" | "moderado" | "abandonado" | null;
};
const f = (id: string, o: Partial<F> = {}): F => ({
  id, nombre: id, descripcion: null, categorias: ["pagos"], lenguaje: "Go", licencia: "MIT", stars: 100,
  nivelMantenimiento: "activo", ...o,
});
const datos: F[] = [
  f("alfa", { descripcion: "Pasarela de Pagos", stars: 5000 }),
  f("beta", { lenguaje: "Python", licencia: "Apache-2.0", categorias: ["ia", "busqueda"], nivelMantenimiento: "moderado", stars: 50 }),
  f("gamma", { lenguaje: null, licencia: null, stars: null, nivelMantenimiento: null, categorias: ["ia"] }),
  f("delta", { nombre: "Búsqueda.*[(", descripcion: "regex? a+b", lenguaje: "Go", nivelMantenimiento: "abandonado", stars: 0 }),
];
const con = (p: Partial<EstadoFiltros>): EstadoFiltros => ({ ...ESTADO_SIN_FILTROS, ...p });
const ids = (e: Partial<EstadoFiltros>) => filtrar(datos, con(e)).map((h) => h.id);

describe("filtrar (RF-03, RF-04, AM-02)", () => {
  it("sin filtros devuelve todo, en orden y como copia", () => {
    expect(ids({})).toEqual(["alfa", "beta", "gamma", "delta"]);
    expect(filtrar(datos, ESTADO_SIN_FILTROS)).not.toBe(datos);
  });
  it("cada filtro por separado", () => {
    expect(ids({ categoria: "ia" })).toEqual(["beta", "gamma"]);
    expect(ids({ lenguaje: "Go" })).toEqual(["alfa", "delta"]);
    expect(ids({ licencia: "Apache-2.0" })).toEqual(["beta"]);
    expect(ids({ mantenimiento: "moderado" })).toEqual(["beta"]);
    expect(ids({ stars: 100 })).toEqual(["alfa"]);
  });
  it("una combinación se resuelve con AND", () => {
    expect(ids({ lenguaje: "Go", stars: 100 })).toEqual(["alfa"]);
    expect(ids({ categoria: "ia", lenguaje: "Go" })).toEqual([]);
    expect(ids({ categoria: "busqueda", mantenimiento: "moderado", licencia: "Apache-2.0", lenguaje: "Python" })).toEqual(["beta"]);
  });
  it("una métrica null no cumple el filtro de esa métrica", () => {
    expect(ids({ stars: 0 })).toEqual(["alfa", "beta", "delta"]); // gamma (stars null) queda afuera aun con mínimo 0
    expect(ids({ lenguaje: "Go" })).not.toContain("gamma");
    expect(ids({ licencia: "MIT" })).not.toContain("gamma");
    expect(ids({ mantenimiento: "activo" })).not.toContain("gamma");
  });
  it("categoría múltiple: aparece en todas las suyas", () => {
    expect(ids({ categoria: "ia" })).toContain("beta");
    expect(ids({ categoria: "busqueda" })).toContain("beta");
  });
  it("la búsqueda no distingue mayúsculas y mira nombre y descripción", () => {
    expect(ids({ q: "ALFA" })).toEqual(["alfa"]);
    expect(ids({ q: "pasarela de pagos" })).toEqual(["alfa"]);
    expect(ids({ q: "  PAGOS  " })).toEqual(["alfa"]);
    expect(ids({ q: "zzz" })).toEqual([]);
  });
  it("las entradas .*[( se tratan como texto literal, no como patrón", () => {
    expect(ids({ q: ".*" })).toEqual(["delta"]); // como patrón habría coincidido con todo
    expect(ids({ q: "[(" })).toEqual(["delta"]);
    expect(ids({ q: "a+b" })).toEqual(["delta"]);
    expect(ids({ q: "(" })).toEqual(["delta"]);
  });
  it("no modifica la entrada", () => {
    const copia = structuredClone(datos);
    filtrar(datos, con({ q: "a", stars: 1, categoria: "pagos" }));
    expect(datos).toEqual(copia);
  });
});

describe("derivarOpciones (RF-03 b)", () => {
  it("devuelve solo valores presentes, sin repetir y ordenados; ignora null", () => {
    expect(derivarOpciones(datos)).toEqual({ lenguajes: ["Go", "Python"], licencias: ["Apache-2.0", "MIT"] });
  });
  it("sobre el dataset sintético hay al menos 8 lenguajes y 6 licencias (plan 4.6)", () => {
    const crudos = JSON.parse(readFileSync(join(__dirname, "../../data/sintetico.json"), "utf8")) as unknown[];
    const { herramientas } = parsearLista(crudos);
    const o = derivarOpciones(herramientas);
    expect(o.lenguajes.length).toBeGreaterThanOrEqual(8);
    expect(o.licencias.length).toBeGreaterThanOrEqual(6);
  });
});
