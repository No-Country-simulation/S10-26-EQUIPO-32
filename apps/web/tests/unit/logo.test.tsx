// Logo oficial con fallback a la marca generativa (feature 005; RF-18, RNF-26).
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LogoRepo, rutaLogo } from "@/components/marca/LogoRepo";
import { esIdValido } from "@/lib/catalogo/contrato";
import { tipoImagen } from "../../scripts/ingesta-lib.mjs";

const LOGOS = join(__dirname, "../../public/logos");
const fuentes = JSON.parse(readFileSync(join(LOGOS, "fuentes.json"), "utf8")) as {
  logos: Array<{ id: string; archivo: string; tipo: string; bytes: number; origen: string; descargadoEn: string }>;
};
const reales = JSON.parse(readFileSync(join(__dirname, "../../data/repos-reales.json"), "utf8")) as Array<{ id: string }>;

describe("LogoRepo (RF-18)", () => {
  it("sin logo → la marca generativa (SVG propio decorativo)", () => {
    const html = renderToStaticMarkup(<LogoRepo id="no-tiene-logo" />);
    expect(html).toMatch(/^<svg data-ob-svg="" aria-hidden="true"/);
    expect(rutaLogo("no-tiene-logo")).toBeNull();
  });
  it("un id con forma de ruta nunca arma una URL", () => {
    for (const id of ["../keycloak", "keycloak/../../x", "KEYCLOAK"]) expect(rutaLogo(id)).toBeNull();
  });
  const conLogo = fuentes.logos[0];
  it.runIf(conLogo !== undefined)("con logo → <img> propio, decorativo, servido desde /logos/", () => {
    const html = renderToStaticMarkup(<LogoRepo id={conLogo!.id} className="size-10" />);
    expect(html).toMatch(/^<img data-ob-logo=""[^>]*\/>$/);
    expect(html).toContain('alt=""');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain(`src="/logos/${conLogo!.archivo}"`);
    expect(html).not.toMatch(/\son\w+=|https?:/i);
  });
});

describe("public/logos (RNF-26)", () => {
  it("cada logo listado existe, es PNG o JPEG por magic bytes, ≤ 200 KB, con origen de avatars.githubusercontent.com", () => {
    for (const l of fuentes.logos) {
      expect(esIdValido(l.id)).toBe(true);
      expect(l.archivo).toMatch(new RegExp(`^${l.id.replace(/[.]/g, "\\.")}\\.(png|jpg)$`));
      const ruta = join(LOGOS, l.archivo);
      expect(existsSync(ruta)).toBe(true);
      expect(statSync(ruta).size).toBeLessThanOrEqual(200 * 1024);
      const tipo = tipoImagen(new Uint8Array(readFileSync(ruta)));
      expect(tipo?.tipo).toBe(l.tipo);
      expect(l.origen).toMatch(/^https:\/\/avatars\.githubusercontent\.com\/[^?#]*$/);
      expect(Number.isNaN(Date.parse(l.descargadoEn))).toBe(false);
    }
  });
  it("solo hay logos de repos del catálogo", () => {
    const ids = new Set(reales.map((r) => r.id));
    expect(fuentes.logos.every((l) => ids.has(l.id))).toBe(true);
  });
});
