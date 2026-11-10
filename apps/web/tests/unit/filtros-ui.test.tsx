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
