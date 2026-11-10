import { describe, expect, it } from "vitest";
import { parsearHerramientaDetalle, parsearLista } from "@/lib/catalogo/contrato";
import {
  ErrorCatalogo,
  ErrorConfiguracion,
  MENSAJE_ERROR_CATALOGO,
  resolverFuente,
  type RepositorioCatalogo,
} from "@/lib/catalogo/repositorio";
import { ejecutarSuiteContratoAdaptador } from "./suite-adaptador";

describe("resolverFuente · CATALOG_SOURCE sin valor por defecto en producción", () => {
  it("en producción sin la variable falla con un error claro", () => {
    for (const v of [undefined, "", "   "]) {
      expect(() => resolverFuente({ NODE_ENV: "production", CATALOG_SOURCE: v })).toThrow(ErrorConfiguracion);
    }
    expect(() => resolverFuente({ NODE_ENV: "production" })).toThrow(/CATALOG_SOURCE es obligatoria en producción/);
  });

  it("fuera de producción el valor por defecto es sintetico", () => {
    expect(resolverFuente({})).toBe("sintetico");
    expect(resolverFuente({ NODE_ENV: "development" })).toBe("sintetico");
    expect(resolverFuente({ NODE_ENV: "test", CATALOG_SOURCE: "" })).toBe("sintetico");
  });

  it("acepta los tres valores, también en producción", () => {
    for (const v of ["sintetico", "fixtures", "supabase"] as const) {
      expect(resolverFuente({ NODE_ENV: "production", CATALOG_SOURCE: v })).toBe(v);
    }
    expect(resolverFuente({ CATALOG_SOURCE: " sintetico " })).toBe("sintetico");
  });

  it("un valor desconocido falla siempre, sin caer a un valor por defecto", () => {
    for (const env of ["production", "development"]) {
      for (const v of ["SINTETICO", "mock", "supabase;drop", "NEXT_PUBLIC_x"]) {
        expect(() => resolverFuente({ NODE_ENV: env, CATALOG_SOURCE: v })).toThrow(ErrorConfiguracion);
      }
    }
  });

  it("el mensaje de configuración no filtra el valor recibido", () => {
    expect(() => resolverFuente({ CATALOG_SOURCE: "valor-secreto-123" })).toThrow(/no válido/);
    try {
      resolverFuente({ CATALOG_SOURCE: "valor-secreto-123" });
    } catch (e) {
      expect(String((e as Error).message)).not.toContain("valor-secreto-123");
    }
  });
});

describe("ErrorCatalogo", () => {
  it("tiene un mensaje genérico y no expone la causa en el mensaje", () => {
    const e = new ErrorCatalogo({ cause: new Error("password=hunter2 host=db.interno") });
    expect(e.message).toBe(MENSAJE_ERROR_CATALOGO);
    expect(e.message).not.toContain("hunter2");
    expect(e.name).toBe("ErrorCatalogo");
    expect(e).toBeInstanceOf(Error);
  });
});

// Adaptador mínimo en memoria: comprueba que la propia suite funciona y está lista para los demás.
class RepoMemoria implements RepositorioCatalogo {
  constructor(private readonly crudos: unknown[]) {}
  async listarHerramientas() {
    return parsearLista(this.crudos);
  }
  async obtenerHerramienta(id: string) {
    const crudo = this.crudos.find((c) => (c as { id?: unknown } | null)?.id === id);
    return crudo === undefined ? null : parsearHerramientaDetalle(crudo);
  }
}

const crudos = [
  { id: "uno", nombre: "Uno", categorias: ["pagos"], stars: 5, ideas: [{ revisada: "true", snippet: "ls" }] },
  { id: "dos", nombre: "Dos", categorias: ["ia", "busqueda"] },
  { id: "MALO", nombre: "Omitida", categorias: ["ia"] },
];

ejecutarSuiteContratoAdaptador("memoria (prueba de la suite)", () => new RepoMemoria(crudos));
