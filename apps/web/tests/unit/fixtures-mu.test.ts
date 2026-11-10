import { describe, expect, it } from "vitest";
import { crearAdaptadorFixtures, cargarFixturesMu, expandir, ID_FORZAR_ERROR } from "@/lib/catalogo/adaptadores/fixtures";
import { parsearHerramientaDetalle } from "@/lib/catalogo/contrato";
import { ErrorCatalogo, ErrorConfiguracion, obtenerRepositorio } from "@/lib/catalogo/repositorio";
import { ejecutarSuiteContratoAdaptador } from "./suite-adaptador";

const fixtures = cargarFixturesMu();

function en(objeto: unknown, ruta: string): unknown {
  return ruta.split(".").reduce<unknown>((v, k) => (v as Record<string, unknown> | undefined)?.[k], objeto);
}

describe("mu.json · fixtures de mal uso (T11)", () => {
  it("cubre los 6 casos del MVP, cada uno con `mu` y `esperado`", () => {
    expect(fixtures.map((f) => f.mu).sort()).toEqual(["MU-01", "MU-03", "MU-04", "MU-08", "MU-09", "MU-12"]);
    for (const f of fixtures) {
      expect(typeof f.mu).toBe("string");
      expect(f.esperado).toBeTypeOf("object");
      expect(f.nota.length).toBeGreaterThan(10);
    }
  });

  it.each(fixtures.map((f) => [f.mu, f] as const))("%s produce lo esperado tras el contrato", (_mu, f) => {
    const salida = parsearHerramientaDetalle(f.crudo);
    if (f.esperado.omitida === true) {
      expect(salida).toBeNull();
      return;
    }
    expect(salida).not.toBeNull();
    expect(salida).toMatchObject(f.esperado.detalle as object);
    for (const [ruta, valor] of Object.entries((f.esperado.valores ?? {}) as Record<string, unknown>)) {
      expect(en(salida, ruta)).toEqual(valor);
    }
    for (const [ruta, largo] of Object.entries((f.esperado.longitudes ?? {}) as Record<string, number>)) {
      expect(String(en(salida, ruta))).toHaveLength(largo);
    }
    for (const [ruta, n] of Object.entries((f.esperado.cantidades ?? {}) as Record<string, number>)) {
      expect(en(salida, ruta) as unknown[]).toHaveLength(n);
    }
  });

  it("MU-04 parte de un payload realmente grande (300 KB) y sale acotado", () => {
    const f = fixtures.find((x) => x.mu === "MU-04");
    const crudo = f?.crudo as { descripcion: string; ideas: unknown[] };
    expect(crudo.descripcion.length).toBeGreaterThan(250_000);
    expect(crudo.ideas).toHaveLength(25);
  });

  it("los caracteres engañosos están en el crudo pero no en la salida (MU-03)", () => {
    const f = fixtures.find((x) => x.mu === "MU-03");
    const nombreCrudo = (f?.crudo as { nombre: string }).nombre;
    expect(nombreCrudo).toContain(String.fromCodePoint(0x202e));
    const salida = parsearHerramientaDetalle(f?.crudo);
    expect(salida?.nombre).not.toContain(String.fromCodePoint(0x202e));
    expect(salida?.nombre).not.toContain(String.fromCodePoint(0x200b));
  });

  it("MU-12: ninguna idea falsa sale como revisada", () => {
    const f = fixtures.find((x) => x.mu === "MU-12");
    expect(parsearHerramientaDetalle(f?.crudo)?.ideas.every((i) => i.revisada === false)).toBe(true);
  });
});

describe("expandir", () => {
  it("expande $repetir y deja el resto igual", () => {
    expect(expandir({ a: { $repetir: ["ab", 3] }, b: [1, { $repetir: ["x", 2] }], c: null })).toEqual({ a: "ababab", b: [1, "xx"], c: null });
  });
  it("no expande objetos con más claves y acota las repeticiones", () => {
    expect(expandir({ $repetir: ["a", 2], otra: 1 })).toEqual({ $repetir: ["a", 2], otra: 1 });
    expect((expandir({ $repetir: ["a", 9e12] }) as string).length).toBe(1_000_000);
  });
});

ejecutarSuiteContratoAdaptador("fixtures (sintético + mu.json)", () => crearAdaptadorFixtures());

describe("adaptador fixtures", () => {
  it("lista el sintético y los casos de mal uso, y ninguno inválido sale (P5)", async () => {
    const { herramientas, omitidas } = await crearAdaptadorFixtures().listarHerramientas();
    expect(omitidas).toBe(0);
    expect(herramientas.length).toBe(40 + fixtures.length);
    expect(herramientas.map((h) => h.id)).toContain("mu-01-xss");
  });

  it("solo en este modo, mu-forzar-error lanza un ErrorCatalogo genérico", async () => {
    await expect(crearAdaptadorFixtures().obtenerHerramienta(ID_FORZAR_ERROR)).rejects.toBeInstanceOf(ErrorCatalogo);
    const sintetico = await obtenerRepositorio({ NODE_ENV: "test", CATALOG_SOURCE: "sintetico" });
    await expect(sintetico.obtenerHerramienta(ID_FORZAR_ERROR)).resolves.toBeNull();
  });
});

describe("obtenerRepositorio", () => {
  it("elige el adaptador según CATALOG_SOURCE", async () => {
    const s = await (await obtenerRepositorio({ NODE_ENV: "production", CATALOG_SOURCE: "sintetico" })).listarHerramientas();
    const f = await (await obtenerRepositorio({ NODE_ENV: "production", CATALOG_SOURCE: "fixtures" })).listarHerramientas();
    expect(s.herramientas).toHaveLength(40);
    expect(f.herramientas.length).toBeGreaterThan(40);
  });

  it("sin variable en producción falla; supabase no está disponible en el MVP", () => {
    expect(() => obtenerRepositorio({ NODE_ENV: "production" })).toThrow(ErrorConfiguracion);
    return expect(obtenerRepositorio({ NODE_ENV: "production", CATALOG_SOURCE: "supabase" })).rejects.toThrow(/no está disponible/);
  });
});
