import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Buscador } from "@/components/catalogo/Buscador";
import { ChipsFiltros } from "@/components/catalogo/ChipsFiltros";
import { PanelFiltros } from "@/components/catalogo/PanelFiltros";

const sinFiltros = { lenguaje: null, licencia: null, mantenimiento: null, stars: null };
const nada = () => undefined;

describe("componentes de filtros (TI4, RNF-10, RNF-16)", () => {
  it("el panel tiene un label por control, selects nativos, <details> y ningún style", () => {
    const html = renderToStaticMarkup(
      <PanelFiltros opciones={{ lenguajes: ["Go"], licencias: ["MIT"] }} valores={sinFiltros} total={3} onCambiar={nada} />,
    );
    expect(html).toContain("<details");
    expect((html.match(/<select/g) ?? []).length).toBe(3);
    expect((html.match(/<label/g) ?? []).length).toBe(4);
    expect(html).not.toContain("style=");
  });

  it("el texto externo de opciones, búsqueda y chips sale escapado, nunca como HTML", () => {
    const xss = "<img src=x onerror=alert(1)>";
    const html =
      renderToStaticMarkup(<PanelFiltros opciones={{ lenguajes: [xss], licencias: [xss] }} valores={sinFiltros} total={1} onCambiar={nada} />) +
      renderToStaticMarkup(<Buscador valor={xss} onBuscar={nada} />) +
      renderToStaticMarkup(<ChipsFiltros activos={[{ clave: "q", etiqueta: xss }]} onQuitar={nada} onLimpiar={nada} />);
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("los chips solo aparecen con filtros activos y el buscador limita a 100", () => {
    expect(renderToStaticMarkup(<ChipsFiltros activos={[]} onQuitar={nada} onLimpiar={nada} />)).toBe("");
    expect(renderToStaticMarkup(<Buscador valor="" onBuscar={nada} />)).toContain('maxLength="100"');
  });
});

// ---------- T19: cableado en el catálogo ----------
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Catalogo } from "@/components/catalogo/Catalogo";
import { parsearLista } from "@/lib/catalogo/contrato";
import { ESTADO_SIN_FILTROS } from "@/lib/catalogo/filtros";

const { herramientas } = parsearLista(JSON.parse(readFileSync(join(__dirname, "../../data/sintetico.json"), "utf8")));

describe("Catalogo cableado (RF-03, RF-04, D-08, D-16)", () => {
  it("sin filtros muestra todo y ningún chip", () => {
    const html = renderToStaticMarkup(<Catalogo herramientas={herramientas} />);
    expect(html).toContain(`>${herramientas.length}</span>`);
    expect(html).not.toContain("Filtros activos");
  });

  it("con un estado inicial muestra la cantidad filtrada y los chips activos", () => {
    const html = renderToStaticMarkup(
      <Catalogo herramientas={herramientas} estadoInicial={{ ...ESTADO_SIN_FILTROS, categoria: "ia", stars: 100 }} />,
    );
    const esperadas = herramientas.filter((h) => h.categorias.includes("ia") && h.stars !== null && h.stars >= 100).length;
    expect(html).toContain(`>${esperadas}</span>`);
    expect(html).toContain("Filtros activos");
    expect(html).toContain("Limpiar todo");
  });

  it("combinación sin resultados: estado vacío con el texto buscado escapado y la acción de limpiar", () => {
    const html = renderToStaticMarkup(
      <Catalogo herramientas={herramientas} estadoInicial={{ ...ESTADO_SIN_FILTROS, q: "<svg onload=x>" }} />,
    );
    expect(html).toContain("No hay herramientas para la búsqueda");
    expect(html).toContain("«&lt;svg onload=x&gt;»");
    expect(html).not.toContain("<svg onload");
    expect(html).toContain("Limpiar todo");
  });
});
