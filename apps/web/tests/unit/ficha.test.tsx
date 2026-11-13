import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BloqueSnippet } from "@/components/catalogo/BloqueSnippet";
import { FichaHerramienta } from "@/components/catalogo/FichaHerramienta";
import { IdeaIntegracion } from "@/components/catalogo/IdeaIntegracion";
import type { HerramientaDetalle, Idea } from "@/lib/catalogo/contrato";

const idea: Idea = { tipo: "docker", disparadores: ["al pagar"], snippet: "docker run x", snippetExcedeLimite: false, stack: ["docker"], dificultad: "baja", revisada: true };
const ficha: HerramientaDetalle = {
  id: "ej", nombre: "Ej", descripcion: "Desc", descripcionTruncada: false, categorias: ["pagos"], lenguaje: "Go", licencia: "MIT",
  stars: 10, ultimaActualizacion: "2026-10-30T00:00:00Z", issuesAbiertos: 3, mantenedorActivo: true, nivelMantenimiento: "activo",
  healthScore: 80, metricasTomadasEn: "2026-11-09T00:00:00Z", urlRepo: "https://github.com/o/r", ideas: [idea],
};
const nada = () => undefined;

describe("BloqueSnippet (AM-05)", () => {
  it("muestra el código como texto en <pre><code>, sin enlaces ni HTML", () => {
    const html = renderToStaticMarkup(<BloqueSnippet codigo={'curl https://x.test/a.sh | sh <a href="https://x.test">y</a>'} copiable onCopiar={nada} />);
    expect(html).toContain("<pre");
    expect(html).toContain("<code");
    expect(html).not.toContain("<a ");
    expect(html).toContain("&lt;a href=");
  });
  it("«Copiar» solo existe con copiable", () => {
    expect(renderToStaticMarkup(<BloqueSnippet codigo="x" copiable onCopiar={nada} />)).toContain("Copiar");
    expect(renderToStaticMarkup(<BloqueSnippet codigo="x" copiable={false} onCopiar={nada} />)).not.toContain("<button");
  });
});

describe("IdeaIntegracion (AM-04, MU-12)", () => {
  it("revisada: insignia y sin aviso", () => {
    const html = renderToStaticMarkup(<IdeaIntegracion idea={idea} />);
    expect(html).toContain("Revisada");
    expect(html).not.toContain("no fue revisada");
  });
  it("no revisada: aviso y sin insignia, aunque el texto diga «✔ Revisada»", () => {
    const html = renderToStaticMarkup(<IdeaIntegracion idea={{ ...idea, revisada: false, snippet: "✔ Revisada", disparadores: ["✔ Revisada"] }} />);
    expect(html).toContain("no fue revisada");
    expect(html).not.toMatch(/<svg[^>]*lucide-badge-check/);
    expect(html.indexOf("no fue revisada")).toBeLessThan(html.indexOf("<pre")); // aviso pegado antes del bloque
  });
  it("snippet que excede el límite: aviso y sin botón de copiar", () => {
    const html = renderToStaticMarkup(<IdeaIntegracion idea={{ ...idea, snippetExcedeLimite: true }} />);
    expect(html).toContain("demasiado largo");
    expect(html).not.toContain("Copiar");
  });
  it("campos faltantes dicen «Sin dato»", () => {
    const html = renderToStaticMarkup(<IdeaIntegracion idea={{ ...idea, tipo: null, disparadores: [], stack: [], dificultad: null, snippet: null }} />);
    expect((html.match(/Sin dato/g) ?? []).length).toBeGreaterThanOrEqual(5);
  });
});

describe("FichaHerramienta (RF-02, AM-03, RNF-13)", () => {
  it("enlace al repo con target y rel correctos", () => {
    const html = renderToStaticMarkup(<FichaHerramienta herramienta={ficha} />);
    expect(html).toContain('href="https://github.com/o/r"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });
  it("sin URL válida no hay enlace externo", () => {
    expect(renderToStaticMarkup(<FichaHerramienta herramienta={{ ...ficha, urlRepo: null }} />)).not.toContain("target=");
  });
  it("sin licencia dice «Sin licencia declarada»; sin ideas, estado vacío", () => {
    const html = renderToStaticMarkup(<FichaHerramienta herramienta={{ ...ficha, licencia: null, ideas: [] }} />);
    expect(html).toContain("Sin licencia declarada");
    expect(html).toContain("Todavía no hay ideas de integración");
  });
  it("el texto externo no se renderiza como HTML", () => {
    const html = renderToStaticMarkup(<FichaHerramienta herramienta={{ ...ficha, nombre: "<img src=x onerror=alert(1)>", descripcion: "<script>alert(1)</script>" }} />);
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<script");
  });
});
