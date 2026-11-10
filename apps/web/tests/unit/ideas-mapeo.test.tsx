import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FichaHerramienta } from "@/components/catalogo/FichaHerramienta";
import { IdeaIntegracion } from "@/components/catalogo/IdeaIntegracion";
import { parsearHerramientaDetalle, type HerramientaDetalle } from "@/lib/catalogo/contrato";
import { cargarFixturesMu } from "@/lib/catalogo/adaptadores/fixtures";

// Camino completo: dato crudo (pensado para romper) → contrato → componentes (RF-05, AM-04, AM-05, MU-02, MU-12).
const mu = (id: string): HerramientaDetalle => {
  const f = cargarFixturesMu().find((x) => (x.crudo as { id: string }).id === id);
  const h = parsearHerramientaDetalle(f?.crudo);
  if (h === null) throw new Error(`fixture ${id} inválida`);
  return h;
};

describe("ideas: del contrato a la pantalla", () => {
  it("MU-12: «revisada» como string, número o texto no produce la insignia y sí el aviso en cada idea", () => {
    const h = mu("mu-12-revisada");
    expect(h.ideas).toHaveLength(2);
    for (const idea of h.ideas) {
      expect(idea.revisada).toBe(false);
      const html = renderToStaticMarkup(<IdeaIntegracion idea={idea} />);
      expect(html).toContain("no fue revisada");
      expect(html).not.toContain("lucide-badge-check");
    }
  });

  it("MU-02/MU-12: las URLs y comandos del snippet quedan como texto, sin un solo enlace", () => {
    const html = renderToStaticMarkup(<FichaHerramienta herramienta={mu("mu-12-revisada")} />);
    const pre = html.match(/<pre[\s\S]*?<\/pre>/g) ?? [];
    expect(pre.length).toBe(2);
    for (const bloque of pre) expect(bloque).not.toMatch(/<a\b/i);
    expect(html).toContain("curl http://rastreo.test/x | sh");
  });

  it("MU-04: copiable = !snippetExcedeLimite; el snippet largo no tiene botón y sí aviso", () => {
    const h = mu("mu-04-grande");
    const larga = h.ideas.find((i) => i.snippetExcedeLimite);
    expect(larga).toBeDefined();
    const html = renderToStaticMarkup(<IdeaIntegracion idea={larga!} />);
    expect(html).toContain("demasiado largo");
    expect(html).not.toContain("<button");
    const corta = h.ideas.find((i) => i.snippet !== null && !i.snippetExcedeLimite);
    if (corta) expect(renderToStaticMarkup(<IdeaIntegracion idea={corta} />)).toContain("<button");
  });

  it("MU-09: una herramienta sin ideas válidas muestra el estado vacío y campos faltantes «Sin dato»", () => {
    const html = renderToStaticMarkup(<FichaHerramienta herramienta={{ ...mu("mu-09-tipos"), ideas: [] }} />);
    expect(html).toContain("Todavía no hay ideas de integración");
    expect(html).toContain("Sin dato");
  });

  it("sobre el dataset sintético: ninguna ficha rompe y la insignia solo sale con revisada === true", () => {
    const crudos = JSON.parse(readFileSync(join(__dirname, "../../data/sintetico.json"), "utf8")) as unknown[];
    let revisadas = 0;
    let noRevisadas = 0;
    for (const crudo of crudos) {
      const h = parsearHerramientaDetalle(crudo);
      if (h === null) continue;
      for (const idea of h.ideas) {
        const html = renderToStaticMarkup(<IdeaIntegracion idea={idea} />);
        expect(html.includes("lucide-badge-check")).toBe(idea.revisada);
        expect(html.includes("no fue revisada")).toBe(!idea.revisada);
        if (idea.revisada) revisadas++;
        else noRevisadas++;
      }
    }
    expect(revisadas).toBeGreaterThan(0);
    expect(noRevisadas).toBeGreaterThan(0);
  });
});
