import { describe, expect, it } from "vitest";
import { es, t } from "@/i18n/es";

describe("diccionario de textos (RNF-17)", () => {
  it("t() devuelve texto no vacío para cada clave", () => {
    for (const clave of Object.keys(es) as (keyof typeof es)[]) {
      expect(t(clave).trim().length).toBeGreaterThan(0);
    }
  });
});
