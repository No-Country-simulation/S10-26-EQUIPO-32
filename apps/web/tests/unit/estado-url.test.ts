import { describe, expect, it } from "vitest";
import { parsearEstadoUrl, serializarEstadoUrl } from "@/lib/catalogo/estado-url";
import { ESTADO_SIN_FILTROS, type EstadoFiltros } from "@/lib/catalogo/filtros";

const opciones = { lenguajes: ["Go", "Python"], licencias: ["MIT", "Apache-2.0"] };
const p = (query: string) => parsearEstadoUrl(new URLSearchParams(query), opciones);

describe("parsearEstadoUrl (RF-03 f, MU-05, MU-06, AM-02)", () => {
  it("sin parámetros: estado vacío", () => {
    expect(p("")).toEqual(ESTADO_SIN_FILTROS);
  });
  it("acepta valores válidos de cada parámetro", () => {
    expect(p("categoria=ia&lenguaje=Go&licencia=MIT&mantenimiento=activo&stars=100&q=auth")).toEqual({
      categoria: "ia", lenguaje: "Go", licencia: "MIT", mantenimiento: "activo", stars: 100, q: "auth",
    });
  });
  it("ignora categoría y mantenimiento inexistentes", () => {
    expect(p("categoria=hackeo&mantenimiento=inactivo")).toEqual(ESTADO_SIN_FILTROS);
    expect(p("categoria=__proto__&mantenimiento=constructor").categoria).toBeNull();
  });
  it("ignora lenguaje y licencia que no existen en los datos o superan 64", () => {
    expect(p("lenguaje=Rust&licencia=GPL")).toEqual(ESTADO_SIN_FILTROS);
    expect(parsearEstadoUrl(new URLSearchParams(`lenguaje=${"a".repeat(65)}`), { lenguajes: ["a".repeat(65)], licencias: [] }).lenguaje).toBeNull();
    expect(p("lenguaje=go").lenguaje).toBeNull(); // coincidencia exacta
  });
  it("stars: solo enteros decimales 0 a 10^7", () => {
    for (const malo of ["-5", "1.5", "1e3", "abc", "", " 5", "10000001", "99999999999", "0x10", "+5"]) {
      expect(p(`stars=${encodeURIComponent(malo)}`).stars, malo).toBeNull();
    }
    expect(p("stars=0").stars).toBe(0);
    expect(p("stars=10000000").stars).toBe(10_000_000);
  });
  it("parámetros repetidos: toma el primero (también con objeto de Next)", () => {
    expect(p("categoria=ia&categoria=pagos").categoria).toBe("ia");
    expect(p("categoria=hackeo&categoria=pagos").categoria).toBeNull(); // el primero es el que cuenta
    expect(parsearEstadoUrl({ categoria: ["pagos", "ia"], q: ["uno", "dos"] }, opciones)).toMatchObject({ categoria: "pagos", q: "uno" });
    expect(parsearEstadoUrl({ categoria: undefined, stars: [] }, opciones)).toEqual(ESTADO_SIN_FILTROS);
  });
  it("parámetros desconocidos o __proto__ en un objeto se ignoran", () => {
    expect(parsearEstadoUrl(JSON.parse('{"__proto__":"x","otro":"y"}'), opciones)).toEqual(ESTADO_SIN_FILTROS);
    expect(p("x=1&evil=<script>")).toEqual(ESTADO_SIN_FILTROS);
  });
  it("q de 5 000 caracteres queda en 100", () => {
    expect(p(`q=${"a".repeat(5000)}`).q).toHaveLength(100);
  });
  it("q se normaliza como texto: bidi y controles fuera, el HTML queda literal", () => {
    expect(p(`q=${encodeURIComponent("a\u202Eb\u200Bc\u0007d")}`).q).toBe("abcd");
    expect(p(`q=${encodeURIComponent("<svg onload=x>")}`).q).toBe("<svg onload=x>");
  });
});

describe("serializarEstadoUrl", () => {
  it("estado vacío = query vacía; solo se escriben los filtros activos", () => {
    expect(serializarEstadoUrl(ESTADO_SIN_FILTROS)).toBe("");
    expect(serializarEstadoUrl({ ...ESTADO_SIN_FILTROS, stars: 0, categoria: "pagos" })).toBe("categoria=pagos&stars=0");
  });
  it("codifica con URLSearchParams: no se puede inyectar otro parámetro", () => {
    const s = serializarEstadoUrl({ ...ESTADO_SIN_FILTROS, q: "a&categoria=ia#x" });
    expect(s).toBe("q=a%26categoria%3Dia%23x");
    expect(p(s).categoria).toBeNull();
  });
  it("ida y vuelta serializar → parsear", () => {
    const estados: EstadoFiltros[] = [
      ESTADO_SIN_FILTROS,
      { categoria: "base-de-datos", lenguaje: "Python", licencia: "Apache-2.0", mantenimiento: "abandonado", stars: 0, q: "hola mundo" },
      { ...ESTADO_SIN_FILTROS, q: "<svg onload=x>&=?# ñ 日本" },
    ];
    for (const e of estados) expect(p(serializarEstadoUrl(e))).toEqual(e);
  });
});
