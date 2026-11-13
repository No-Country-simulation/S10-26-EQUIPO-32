import { describe, expect, it } from "vitest";
import { ordenar } from "@/components/catalogo/orden";

const h = (id: string, ultimaActualizacion: string | null, healthScore: number | null) => ({ id, ultimaActualizacion, healthScore });

describe("orden de la grilla (UI v2, ui-brief §11.2 #4)", () => {
  const lista = [h("a", "2026-01-01T00:00:00Z", 50), h("b", null, 90), h("c", "2026-10-01T00:00:00Z", null), h("d", "no-es-fecha", 70)];

  it("recientes: por última actualización descendente, nulls e inválidas al final", () => {
    expect(ordenar(lista, "recientes").map((x) => x.id)).toEqual(["c", "a", "b", "d"]);
  });

  it("mejor salud: por health score descendente, null al final", () => {
    expect(ordenar(lista, "salud").map((x) => x.id)).toEqual(["b", "d", "a", "c"]);
  });

  it("no modifica la entrada y los empates conservan el orden original", () => {
    const copia = [...lista];
    ordenar(lista, "salud");
    expect(lista).toEqual(copia);
    expect(ordenar([h("x", null, 10), h("y", null, 10)], "salud").map((x) => x.id)).toEqual(["x", "y"]);
  });
});
