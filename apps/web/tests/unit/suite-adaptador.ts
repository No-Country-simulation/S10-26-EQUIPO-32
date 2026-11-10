// Suite de contrato reutilizable: la ejecutan TODOS los adaptadores (plan 6.1, P5).
// Garantiza que ningún campo inválido sale del adaptador y que no hay escritura.
import { describe, expect, it } from "vitest";
import {
  esIdValido,
  parsearHerramientaDetalle,
  parsearHerramientaLista,
  type HerramientaDetalle,
} from "@/lib/catalogo/contrato";
import type { RepositorioCatalogo } from "@/lib/catalogo/repositorio";

const METODOS_PERMITIDOS = ["constructor", "listarHerramientas", "obtenerHerramienta"];

// Nombres de los miembros que son funciones (propios y heredados). Un dato como `crudos` no cuenta.
function metodosDe(obj: object): string[] {
  const nombres = new Set<string>();
  const registrar = (o: object) => {
    for (const n of Object.getOwnPropertyNames(o)) {
      if (typeof (o as Record<string, unknown>)[n] === "function") nombres.add(n);
    }
  };
  registrar(obj);
  for (let p = Object.getPrototypeOf(obj); p && p !== Object.prototype; p = Object.getPrototypeOf(p)) registrar(p);
  return [...nombres];
}

export function ejecutarSuiteContratoAdaptador(
  nombre: string,
  crear: () => RepositorioCatalogo | Promise<RepositorioCatalogo>,
): void {
  describe(`contrato del adaptador · ${nombre}`, () => {
    it("solo expone lectura: listarHerramientas y obtenerHerramienta", async () => {
      const repo = await crear();
      const extras = metodosDe(repo).filter((m) => !METODOS_PERMITIDOS.includes(m));
      expect(extras).toEqual([]);
    });

    it("la lista es válida: cada herramienta ya es salida del contrato, sin ideas y con ids únicos", async () => {
      const { herramientas, omitidas } = await (await crear()).listarHerramientas();
      expect(Number.isInteger(omitidas) && omitidas >= 0).toBe(true);
      const ids = new Set<string>();
      for (const h of herramientas) {
        expect(parsearHerramientaLista(h)).toEqual(h); // volver a pasar por el contrato no la cambia
        expect(h).not.toHaveProperty("ideas");
        expect(esIdValido(h.id)).toBe(true);
        expect(ids.has(h.id)).toBe(false);
        ids.add(h.id);
      }
    });

    it("el detalle de cada herramienta listada es válido y coincide en identidad", async () => {
      const repo = await crear();
      const { herramientas } = await repo.listarHerramientas();
      for (const h of herramientas) {
        const d = (await repo.obtenerHerramienta(h.id)) as HerramientaDetalle | null;
        expect(d).not.toBeNull();
        if (d === null) continue;
        expect(d.id).toBe(h.id);
        expect(d.nombre).toBe(h.nombre);
        expect(parsearHerramientaDetalle(d)).toEqual(d);
        expect(d.ideas.length).toBeLessThanOrEqual(10);
        for (const idea of d.ideas) expect(typeof idea.revisada).toBe("boolean");
      }
    });

    it("un id inexistente o con forma inválida devuelve null y no lanza", async () => {
      const repo = await crear();
      for (const id of ["no-existe-xyz", "", "../etc/passwd", "A", "a".repeat(500), "x y", "__proto__", "constructor"]) {
        await expect(repo.obtenerHerramienta(id)).resolves.toBeNull();
      }
    });
  });
}
