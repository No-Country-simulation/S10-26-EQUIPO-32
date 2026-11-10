import { describe, expect, it } from "vitest";
import {
  COTAS,
  parsearHerramientaDetalle,
  parsearHerramientaLista,
  parsearLista,
} from "@/lib/catalogo/contrato";

const AHORA = new Date("2026-11-10T12:00:00Z");
// Se arman con códigos para que el código fuente no lleve invisibles crudos (R-14).
const BIDI = String.fromCodePoint(0x202e);
const ANCHO_CERO = String.fromCodePoint(0x200b);

const idea = (extra: Record<string, unknown> = {}) => ({
  tipo: "rest",
  disparadores: ["cuando llega un pago"],
  snippet: "curl https://api.ejemplo.dev/x",
  stack: ["node"],
  dificultad: "baja",
  revisada: true,
  ...extra,
});

const crudo = (extra: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: "mi-herramienta",
  nombre: "Mi herramienta",
  urlRepo: "https://github.com/o/r",
  descripcion: "Hace cosas.",
  categorias: ["pagos"],
  stars: 120,
  ultimaActualizacion: "2026-11-01T10:00:00Z",
  licencia: "MIT",
  lenguaje: "TypeScript",
  issuesAbiertos: 4,
  mantenedorActivo: true,
  nivelMantenimiento: "activo",
  healthScore: 88,
  metricasTomadasEn: "2026-11-09T00:00:00Z",
  ideas: [idea()],
  ...extra,
});

const lista = (extra: Record<string, unknown> = {}) => parsearHerramientaLista(crudo(extra), AHORA);
const detalle = (extra: Record<string, unknown> = {}) => parsearHerramientaDetalle(crudo(extra), AHORA);

describe("contrato · caso válido", () => {
  it("una herramienta válida sale completa (lista, sin ideas)", () => {
    const h = lista();
    expect(h).toMatchObject({
      id: "mi-herramienta",
      nombre: "Mi herramienta",
      urlRepo: "https://github.com/o/r",
      descripcion: "Hace cosas.",
      descripcionTruncada: false,
      categorias: ["pagos"],
      stars: 120,
      licencia: "MIT",
      lenguaje: "TypeScript",
      issuesAbiertos: 4,
      mantenedorActivo: true,
      nivelMantenimiento: "activo",
      healthScore: 88,
    });
    expect(h).not.toHaveProperty("ideas");
  });

  it("el detalle trae ideas", () => {
    const h = detalle();
    expect(h?.ideas).toHaveLength(1);
    expect(h?.ideas[0]).toMatchObject({ tipo: "rest", revisada: true, snippetExcedeLimite: false });
  });

  it("descarta claves desconocidas", () => {
    const h = lista({ secreto: "x", __proto__: { polucion: 1 } });
    expect(h).not.toHaveProperty("secreto");
    expect(h).not.toHaveProperty("polucion");
  });
});

describe("contrato · claves realmente ausentes (no solo undefined)", () => {
  it("una herramienta con solo la identidad es válida y el resto queda en null/vacío", () => {
    const h = parsearHerramientaDetalle({ id: "solo-id", nombre: "Solo", categorias: ["ia"] }, AHORA);
    expect(h).toMatchObject({
      urlRepo: null,
      descripcion: null,
      stars: null,
      ultimaActualizacion: null,
      licencia: null,
      lenguaje: null,
      issuesAbiertos: null,
      mantenedorActivo: null,
      nivelMantenimiento: null,
      healthScore: null,
      metricasTomadasEn: null,
      ideas: [],
    });
  });

  it("una idea vacía es válida: campos null, listas vacías y revisada false", () => {
    const h = parsearHerramientaDetalle({ id: "x", nombre: "X", categorias: ["ia"], ideas: [{}] }, AHORA);
    expect(h?.ideas[0]).toEqual({
      tipo: null,
      disparadores: [],
      snippet: null,
      snippetExcedeLimite: false,
      stack: [],
      dificultad: null,
      revisada: false,
    });
  });
});

describe("contrato · identidad inválida omite la herramienta", () => {
  it.each([
    ["id con mayúsculas", { id: "MiHerramienta" }],
    ["id con espacio", { id: "mi herramienta" }],
    ["id con barra", { id: "../etc/passwd" }],
    ["id con carácter no ASCII", { id: "herramienta-ñ" }],
    ["id que empieza con punto", { id: ".oculto" }],
    ["id de 101 caracteres", { id: "a".repeat(101) }],
    ["id vacío", { id: "" }],
    ["id numérico", { id: 5 }],
    ["id ausente", { id: undefined }],
    ["nombre ausente", { nombre: undefined }],
    ["nombre vacío", { nombre: "" }],
    ["nombre de solo invisibles", { nombre: BIDI + ANCHO_CERO + "  " }],
    ["nombre no string", { nombre: { x: 1 } }],
    ["categorías ausentes", { categorias: undefined }],
    ["categorías vacías", { categorias: [] }],
    ["categorías solo desconocidas", { categorias: ["otra", 7, null] }],
    ["categorías no es arreglo", { categorias: "pagos" }],
  ])("%s", (_n, extra) => {
    expect(lista(extra)).toBeNull();
    expect(detalle(extra)).toBeNull();
  });

  it("no es un objeto", () => {
    for (const v of [null, undefined, 5, "texto", [], true]) expect(parsearHerramientaLista(v, AHORA)).toBeNull();
  });
});

describe("contrato · reglas de campos de identidad", () => {
  it("normaliza el nombre (bidi, ancho cero, espacios) y lo corta a 100", () => {
    expect(lista({ nombre: `  Mi${BIDI} ${ANCHO_CERO}  herr  ` })?.nombre).toBe("Mi herr");
    expect(lista({ nombre: "x".repeat(300) })?.nombre).toHaveLength(COTAS.nombre);
  });

  it("categorías: descarta desconocidas y repetidas, y las ordena como el catálogo", () => {
    expect(lista({ categorias: ["ia", "xx", "pagos", "ia", 3] })?.categorias).toEqual(["pagos", "ia"]);
  });
});

describe("contrato · métricas inválidas -> null", () => {
  it.each([
    ["stars negativo", { stars: -1 }, "stars"],
    ["stars decimal", { stars: 1.5 }, "stars"],
    ["stars como texto", { stars: "5" }, "stars"],
    ["stars mayor que 10^9", { stars: 1_000_000_001 }, "stars"],
    ["stars NaN", { stars: Number.NaN }, "stars"],
    ["stars Infinity", { stars: Number.POSITIVE_INFINITY }, "stars"],
    ["stars ausente", { stars: undefined }, "stars"],
    ["issues negativos", { issuesAbiertos: -3 }, "issuesAbiertos"],
    ["issues decimal", { issuesAbiertos: 0.5 }, "issuesAbiertos"],
    ["mantenedor como texto", { mantenedorActivo: "true" }, "mantenedorActivo"],
    ["mantenedor como número", { mantenedorActivo: 1 }, "mantenedorActivo"],
    ["nivel desconocido", { nivelMantenimiento: "inactivo" }, "nivelMantenimiento"],
    ["nivel con mayúscula", { nivelMantenimiento: "Activo" }, "nivelMantenimiento"],
    ["health score 101", { healthScore: 101 }, "healthScore"],
    ["health score -1", { healthScore: -1 }, "healthScore"],
    ["health score decimal", { healthScore: 50.5 }, "healthScore"],
    ["health score como texto", { healthScore: "80" }, "healthScore"],
    ["fecha inválida", { ultimaActualizacion: "ayer" }, "ultimaActualizacion"],
    ["fecha imposible", { ultimaActualizacion: "2026-02-31T00:00:00Z" }, "ultimaActualizacion"],
    ["fecha como número", { ultimaActualizacion: 1_700_000_000 }, "ultimaActualizacion"],
    ["fecha de métricas inválida", { metricasTomadasEn: "2026-13-01T00:00:00Z" }, "metricasTomadasEn"],
  ])("%s", (_n, extra, campo) => {
    const h = lista(extra) as Record<string, unknown> | null;
    expect(h).not.toBeNull();
    expect(h?.[campo]).toBeNull();
    expect(h?.id).toBe("mi-herramienta"); // la herramienta NO se omite
  });

  it("valores límite válidos se conservan", () => {
    const h = lista({ stars: 0, healthScore: 0, issuesAbiertos: 0 });
    expect(h).toMatchObject({ stars: 0, healthScore: 0, issuesAbiertos: 0 });
    expect(lista({ healthScore: 100, stars: 1_000_000_000 })).toMatchObject({ healthScore: 100, stars: 1_000_000_000 });
  });

  it("fecha de última actualización posterior a ahora + 1 día -> null; hasta ese límite se acepta", () => {
    expect(lista({ ultimaActualizacion: "2026-11-11T12:00:00Z" })?.ultimaActualizacion).toBe("2026-11-11T12:00:00Z");
    expect(lista({ ultimaActualizacion: "2026-11-11T12:00:01Z" })?.ultimaActualizacion).toBeNull();
    expect(lista({ ultimaActualizacion: "2099-01-01T00:00:00Z" })?.ultimaActualizacion).toBeNull();
  });

  it("acepta fechas con offset", () => {
    expect(lista({ ultimaActualizacion: "2026-11-01T10:00:00+02:00" })?.ultimaActualizacion).toBe("2026-11-01T10:00:00+02:00");
  });
});

describe("contrato · licencia, texto opcional y URL", () => {
  it.each([
    ["licencia ausente", { licencia: undefined }],
    ["licencia vacía", { licencia: "" }],
    ["licencia solo espacios e invisibles", { licencia: ` ${ANCHO_CERO}${BIDI} ` }],
    ["licencia no string", { licencia: 7 }],
  ])("%s -> null", (_n, extra) => {
    expect(lista(extra)?.licencia).toBeNull();
  });

  it("licencia y lenguaje se normalizan y cortan (64 y 40)", () => {
    expect(lista({ licencia: "M" + BIDI + "IT" })?.licencia).toBe("MIT");
    expect(lista({ licencia: "L".repeat(200) })?.licencia).toHaveLength(COTAS.licencia);
    expect(lista({ lenguaje: "T".repeat(200) })?.lenguaje).toHaveLength(COTAS.lenguaje);
    expect(lista({ lenguaje: "" })?.lenguaje).toBeNull();
    expect(lista({ lenguaje: [] })?.lenguaje).toBeNull();
  });

  it("urlRepo inválida -> null; válida -> canónica", () => {
    for (const u of ["javascript:alert(1)", "http://github.com/o/r", "https://github.com.evil.io/o/r", 5, null, undefined]) {
      expect(lista({ urlRepo: u })?.urlRepo).toBeNull();
    }
    expect(lista({ urlRepo: "HTTPS://GitHub.com/o/r" })?.urlRepo).toBe("https://github.com/o/r");
  });
});

describe("contrato · descripción (lista 300, detalle 2000)", () => {
  it("ausente o inválida -> null", () => {
    for (const d of [undefined, null, 5, "", "   ", BIDI]) {
      expect(lista({ descripcion: d })?.descripcion).toBeNull();
      expect(lista({ descripcion: d })?.descripcionTruncada).toBe(false);
    }
  });

  it("la lista corta a 300 y marca descripcionTruncada", () => {
    const h = lista({ descripcion: "d".repeat(301) });
    expect(h?.descripcion).toHaveLength(COTAS.descripcionTarjeta);
    expect(h?.descripcionTruncada).toBe(true);
    expect(lista({ descripcion: "d".repeat(300) })?.descripcionTruncada).toBe(false);
  });

  it("el detalle conserva hasta 2000 y marca el recorte", () => {
    expect(detalle({ descripcion: "d".repeat(2000) })).toMatchObject({ descripcionTruncada: false });
    const h = detalle({ descripcion: "d".repeat(2001) });
    expect(h?.descripcion).toHaveLength(COTAS.descripcion);
    expect(h?.descripcionTruncada).toBe(true);
  });

  it("conserva los saltos de línea y no interpreta HTML", () => {
    const h = detalle({ descripcion: "<script>alert(1)</script>\nlínea 2" });
    expect(h?.descripcion).toBe("<script>alert(1)</script>\nlínea 2");
  });

  it("una descripción de 300 KB se corta sin error (MU-04)", () => {
    const h = detalle({ descripcion: "x".repeat(300_000) });
    expect(h?.descripcion).toHaveLength(COTAS.descripcion);
    expect(h?.descripcionTruncada).toBe(true);
  });
});

describe("contrato · ideas", () => {
  it("revisada: solo el booleano true cuenta (MU-12, falla cerrado)", () => {
    for (const v of ["true", 1, null, {}, [], "✔ Revisada", "yes", undefined, 0, false]) {
      expect(detalle({ ideas: [idea({ revisada: v })] })?.ideas[0]?.revisada).toBe(false);
    }
    expect(detalle({ ideas: [idea({ revisada: true })] })?.ideas[0]?.revisada).toBe(true);
  });

  it("revisada ausente -> false", () => {
    const sin = idea();
    delete (sin as Record<string, unknown>).revisada;
    expect(detalle({ ideas: [sin] })?.ideas[0]?.revisada).toBe(false);
  });

  it("snippet de exactamente 4000 no marca límite; 4001 sí (AM-04)", () => {
    const ok = detalle({ ideas: [idea({ snippet: "a".repeat(4000) })] })?.ideas[0];
    expect(ok?.snippetExcedeLimite).toBe(false);
    expect(ok?.snippet).toHaveLength(4000);
    const largo = detalle({ ideas: [idea({ snippet: "a".repeat(4001) })] })?.ideas[0];
    expect(largo?.snippetExcedeLimite).toBe(true);
    expect(largo?.snippet).toHaveLength(COTAS.snippet);
  });

  it("snippet: conserva saltos y tabs, elimina bidi (Trojan Source) y no vuelve clickeable nada", () => {
    const s = `if (x) {\n\treturn 1; ${BIDI}// fin\n}\nhttps://evil.io`;
    expect(detalle({ ideas: [idea({ snippet: s })] })?.ideas[0]?.snippet).toBe("if (x) {\n\treturn 1; // fin\n}\nhttps://evil.io");
  });

  it("snippet inválido o vacío -> null", () => {
    for (const s of [undefined, null, 5, "", "  \n ", {}]) {
      const i = detalle({ ideas: [idea({ snippet: s })] })?.ideas[0];
      expect(i?.snippet).toBeNull();
      expect(i?.snippetExcedeLimite).toBe(false);
    }
  });

  it("tipo y dificultad fuera del enum -> null", () => {
    const i = detalle({ ideas: [idea({ tipo: "grpc", dificultad: "imposible" })] })?.ideas[0];
    expect(i?.tipo).toBeNull();
    expect(i?.dificultad).toBeNull();
  });

  it("disparadores y stack: máximo 10, cota 200/60, solo strings no vacíos", () => {
    const muchos = Array.from({ length: 500 }, (_, i) => `d${i}`);
    const i = detalle({ ideas: [idea({ disparadores: muchos, stack: muchos })] })?.ideas[0];
    expect(i?.disparadores).toHaveLength(10);
    expect(i?.stack).toHaveLength(10);
    const j = detalle({ ideas: [idea({ disparadores: ["a".repeat(500), 5, null, "", "  ", `b${BIDI}`], stack: ["s".repeat(100)] })] })?.ideas[0];
    expect(j?.disparadores).toEqual(["a".repeat(200), "b"]);
    expect(j?.stack).toEqual(["s".repeat(60)]);
  });

  it("disparadores/stack que no son arreglo -> []", () => {
    const i = detalle({ ideas: [idea({ disparadores: "x", stack: 5 })] })?.ideas[0];
    expect(i?.disparadores).toEqual([]);
    expect(i?.stack).toEqual([]);
  });

  it("máximo 10 ideas; el resto se descarta", () => {
    const ideas = Array.from({ length: 25 }, (_, i) => idea({ snippet: `n${i}` }));
    const h = detalle({ ideas });
    expect(h?.ideas).toHaveLength(10);
    expect(h?.ideas[9]?.snippet).toBe("n9");
  });

  it("0 ideas es válido; ideas ausentes o no arreglo -> []", () => {
    expect(detalle({ ideas: [] })?.ideas).toEqual([]);
    expect(detalle({ ideas: undefined })?.ideas).toEqual([]);
    expect(detalle({ ideas: "mala" })?.ideas).toEqual([]);
  });

  it("entradas de idea que no son objeto se descartan sin romper la herramienta", () => {
    const h = detalle({ ideas: [null, 5, "x", idea()] });
    expect(h?.ideas).toHaveLength(1);
  });
});

describe("contrato · tipos exportados", () => {
  it("los campos tienen tipos estrictos, no unknown", () => {
    const h = lista();
    expect(h).not.toBeNull();
    if (h === null) return;
    const descripcion: string | null = h.descripcion;
    const truncada: boolean = h.descripcionTruncada;
    const urlRepo: string | null = h.urlRepo;
    expect([descripcion, truncada, urlRepo]).toHaveLength(3);
  });
});

describe("contrato · lista y omitidas", () => {
  it("omite las inválidas y las cuenta", () => {
    const r = parsearLista([crudo(), crudo({ id: "OTRA" }), crudo({ id: "b", categorias: [] }), null, crudo({ id: "c" })], AHORA);
    expect(r.herramientas.map((h) => h.id)).toEqual(["mi-herramienta", "c"]);
    expect(r.omitidas).toBe(3);
  });

  it("un id repetido se omite (queda la primera)", () => {
    const r = parsearLista([crudo({ nombre: "Primera" }), crudo({ nombre: "Segunda" })], AHORA);
    expect(r.herramientas).toHaveLength(1);
    expect(r.herramientas[0]?.nombre).toBe("Primera");
    expect(r.omitidas).toBe(1);
  });

  it("lista vacía es válida", () => {
    expect(parsearLista([], AHORA)).toEqual({ herramientas: [], omitidas: 0 });
  });

  it("algo que no es una lista lanza un error genérico", () => {
    for (const v of [null, undefined, {}, "x", 5]) expect(() => parsearLista(v, AHORA)).toThrow(TypeError);
  });

  it("ningún campo inválido sale de la lista (P5)", () => {
    const sucio = [
      crudo({ stars: "mil", healthScore: 999, nivelMantenimiento: "x", mantenedorActivo: "si", urlRepo: "javascript:alert(1)", licencia: 5 }),
    ];
    const h = parsearLista(sucio, AHORA).herramientas[0];
    expect(h).toMatchObject({
      stars: null,
      healthScore: null,
      nivelMantenimiento: null,
      mantenedorActivo: null,
      urlRepo: null,
      licencia: null,
    });
  });

  it("MU-01: un nombre con HTML llega como texto literal", () => {
    expect(lista({ nombre: "<img src=x onerror=alert(1)>" })?.nombre).toBe("<img src=x onerror=alert(1)>");
  });
});
