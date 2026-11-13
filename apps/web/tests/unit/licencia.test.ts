import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parsearLista } from "@/lib/catalogo/contrato";
import { textoLicencia } from "@/lib/catalogo/licencia";

describe("textoLicencia (RNF-13)", () => {
  it("null -> «Sin licencia declarada»", () => {
    expect(textoLicencia(null)).toBe("Sin licencia declarada");
  });

  it("vacío o solo espacios -> «Sin licencia declarada»", () => {
    expect(textoLicencia("")).toBe("Sin licencia declarada");
    expect(textoLicencia("   ")).toBe("Sin licencia declarada");
  });

  it("una licencia se devuelve tal cual", () => {
    expect(textoLicencia("Apache-2.0")).toBe("Apache-2.0");
  });

  it("sobre todo el dataset sintético siempre devuelve texto no vacío y los null dicen «Sin licencia declarada»", () => {
    const crudos = JSON.parse(readFileSync(join(__dirname, "../../data/sintetico.json"), "utf8")) as unknown[];
    const { herramientas } = parsearLista(crudos);
    expect(herramientas.length).toBeGreaterThanOrEqual(30);
    for (const h of herramientas) {
      const texto = textoLicencia(h.licencia);
      expect(texto.trim().length).toBeGreaterThan(0);
      if (h.licencia === null) expect(texto).toBe("Sin licencia declarada");
    }
    expect(herramientas.some((h) => h.licencia === null)).toBe(true);
  });
});
