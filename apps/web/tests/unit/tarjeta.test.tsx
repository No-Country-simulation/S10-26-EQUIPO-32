import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GrillaHerramientas } from "@/components/catalogo/GrillaHerramientas";
import { IndicadorSalud } from "@/components/catalogo/IndicadorSalud";
import { NavCategorias } from "@/components/catalogo/NavCategorias";
import { TarjetaHerramienta } from "@/components/catalogo/TarjetaHerramienta";
import { parsearLista, type HerramientaResumen } from "@/lib/catalogo/contrato";

const base: HerramientaResumen = {
  id: "ejemplo",
  nombre: "Ejemplo",
  descripcion: "Una descripción.",
  descripcionTruncada: false,
  categorias: ["autenticacion", "pagos"],
  lenguaje: "TypeScript",
  licencia: "MIT",
  stars: 12840,
  ultimaActualizacion: "2026-10-30T00:00:00Z",
  issuesAbiertos: 42,
  mantenedorActivo: true,
  nivelMantenimiento: "activo",
  healthScore: 88,
  metricasTomadasEn: "2026-11-09T00:00:00Z",
  urlRepo: null,
};

const html = (h: Partial<HerramientaResumen> = {}) => renderToStaticMarkup(<TarjetaHerramienta herramienta={{ ...base, ...h }} />);
const cuenta = (texto: string, parte: string) => texto.split(parte).length - 1;

describe("TarjetaHerramienta · muestra todos los campos", () => {
  it("nombre, id en monoespaciada, descripción, categorías, lenguaje, licencia, stars, mantenimiento y salud", () => {
    const salida = html();
    for (const esperado of ["Ejemplo", "Una descripción.", "Autenticación", "Pagos", "TypeScript", "MIT", "12.840", "Activo", "Salud", "88", "Buena"]) {
      expect(salida).toContain(esperado);
    }
    expect(salida).toMatch(/<code[^>]*font-mono[^>]*>ejemplo<\/code>/);
  });

  it("los campos null dicen «Sin dato» y la licencia null dice «Sin licencia declarada»", () => {
    const salida = html({ descripcion: null, lenguaje: null, licencia: null, stars: null, nivelMantenimiento: null, healthScore: null });
    // descripción, lenguaje, stars, mantenimiento y salud
    expect(cuenta(salida, "Sin dato")).toBe(5);
    expect(salida).toContain("Sin licencia declarada");
  });

  it("el nivel de mantenimiento tiene texto además del color", () => {
    expect(html({ nivelMantenimiento: "moderado" })).toContain("Moderado");
    expect(html({ nivelMantenimiento: "abandonado" })).toContain("Abandonado");
  });

  it("la descripción recortada lo indica", () => {
    expect(html({ descripcionTruncada: true })).toContain("…");
    expect(html({ descripcionTruncada: false })).not.toContain("…");
  });
});

describe("TarjetaHerramienta · el texto externo nunca se inserta como HTML (AM-06, AM-12)", () => {
  const ataques = [
    "<script>alert(1)</script>",
    "<img src=x onerror=alert(1)>",
    "<svg onload=alert(1)>",
    '"><iframe src="https://rastreo.test"></iframe>',
  ];

  it.each(ataques)("%s sale escapado en nombre, descripción, licencia y lenguaje", (ataque) => {
    const salida = html({ nombre: ataque, descripcion: ataque, licencia: ataque, lenguaje: ataque });
    expect(salida).not.toMatch(/<(script|img|svg|iframe)\b/i);
    expect(salida).toContain("&lt;");
    // «onerror=» puede verse como texto escapado, pero nunca como atributo de una etiqueta real
    expect(salida).not.toMatch(/<[^>]*\son(error|load)=/i);
  });

  it("no usa style ni imágenes; su único enlace es interno a la ficha, y cada texto externo va aislado con bdi", () => {
    const salida = html();
    expect(salida).not.toMatch(/\sstyle=/);
    expect(salida).not.toMatch(/<(img|iframe|script)\b/i);
    expect(salida.match(/<a\b[^>]*>/gi) ?? []).toHaveLength(1);
    expect(salida).toContain('href="/herramientas/ejemplo"');
    expect(salida).not.toContain("target=");
    expect(cuenta(salida, '<bdi dir="auto">')).toBeGreaterThanOrEqual(4);
  });

  it("el texto sin cortes lleva las clases que lo contienen", () => {
    const salida = html({ nombre: "N".repeat(100), descripcion: "D".repeat(300) });
    expect(salida).toContain("line-clamp-2"); // nombre
    expect(salida).toContain("line-clamp-1"); // descripción en una línea (UI v2, más estricto que 3)
    expect(salida).toContain("[overflow-wrap:anywhere]");
  });
});

describe("IndicadorSalud", () => {
  it.each([
    [100, "Buena"],
    [70, "Buena"],
    [69, "Regular"],
    [40, "Regular"],
    [39, "Baja"],
    [0, "Baja"],
  ])("%i -> %s, con número y palabra", (valor, palabra) => {
    const salida = renderToStaticMarkup(<IndicadorSalud valor={valor} />);
    expect(salida).toContain(String(valor));
    expect(salida).toContain(palabra);
    expect(salida).toContain("de 100");
  });

  it("null -> «Sin dato»", () => {
    expect(renderToStaticMarkup(<IndicadorSalud valor={null} />)).toContain("Sin dato");
  });
});

describe("NavCategorias", () => {
  it("muestra «Todas» y las 6 categorías, y marca la activa con aria-pressed", () => {
    const salida = renderToStaticMarkup(<NavCategorias activa="pagos" onElegir={() => undefined} />);
    for (const nombre of ["Todas", "Autenticación", "Base de datos", "Pagos", "IA", "Analítica", "Búsqueda"]) {
      expect(salida).toContain(nombre);
    }
    expect(cuenta(salida, 'aria-pressed="true"')).toBe(1);
    expect(cuenta(salida, 'aria-pressed="false"')).toBe(6);
    expect(salida).toMatch(/aria-pressed="true"[^>]*>Pagos</);
  });

  it("sin categoría activa, «Todas» está activa", () => {
    const salida = renderToStaticMarkup(<NavCategorias activa={null} onElegir={() => undefined} />);
    expect(salida).toMatch(/aria-pressed="true"[^>]*>Todas</);
  });
});

describe("GrillaHerramientas", () => {
  it("vacía muestra el estado vacío y la cantidad 0", () => {
    const salida = renderToStaticMarkup(<GrillaHerramientas herramientas={[]} total={0} />);
    expect(salida).toContain("No encontramos herramientas");
    expect(salida).toMatch(/>0<\/span><span>herramientas</);
  });

  it("singular y plural", () => {
    expect(renderToStaticMarkup(<GrillaHerramientas herramientas={[base]} total={1} />)).toMatch(/>1<\/span><span>herramienta</);
    expect(renderToStaticMarkup(<GrillaHerramientas herramientas={[base, { ...base, id: "otra" }]} total={2} />)).toMatch(/>2<\/span><span>herramientas</);
  });

  it("renderiza las 40 herramientas del dataset sintético sin romper y con licencia siempre visible", () => {
    const crudos = JSON.parse(readFileSync(join(__dirname, "../../data/sintetico.json"), "utf8")) as unknown[];
    const { herramientas } = parsearLista(crudos);
    const salida = renderToStaticMarkup(<GrillaHerramientas herramientas={herramientas} total={herramientas.length} />);
    expect(cuenta(salida, 'data-slot="card"')).toBe(herramientas.length);
    expect(cuenta(salida, "Sin licencia declarada")).toBe(herramientas.filter((h) => h.licencia === null).length);
    expect(salida).not.toMatch(/\sstyle=/);
  });
});
