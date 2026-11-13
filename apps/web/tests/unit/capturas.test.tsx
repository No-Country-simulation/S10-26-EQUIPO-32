// Capturas de producto y fotos del sitio (feature 007; RF-24, RF-25, RNF-30, RNF-31, RNF-32, MU-29..MU-32).
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PreviewHerramienta, rutaCaptura } from "@/components/marca/PreviewHerramienta";
import { esIdValido } from "@/lib/catalogo/contrato";
import {
  MAX_CAPTURA_BYTES,
  archivoCaptura,
  candidatasCaptura,
  tipoCaptura,
  urlCaptura,
} from "../../scripts/ingesta-lib.mjs";

const PUBLIC = join(__dirname, "../../public");
const capturas = JSON.parse(readFileSync(join(PUBLIC, "capturas/fuentes.json"), "utf8")) as {
  capturas: Array<{ id: string; archivo: string; tipo: string; bytes: number; sha256: string; origen: string; repo: string; licencia: string | null }>;
};
const fotos = JSON.parse(readFileSync(join(PUBLIC, "imagenes/fuentes.json"), "utf8")) as {
  fotos: Array<{ id: string; archivo: string; autor: string; url: string; licencia: string; alt: string; bytes: number }>;
};
const reales = JSON.parse(readFileSync(join(__dirname, "../../data/repos-reales.json"), "utf8")) as Array<{ id: string; urlRepo: string; licencia: string | null }>;

const relleno = (cabecera: number[], largo = 8000) => {
  const b = new Uint8Array(largo);
  b.set(cabecera);
  return b;
};
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

describe("urlCaptura (RNF-30, MU-29)", () => {
  const ok = (u: string, repo = "o/r") => expect(urlCaptura(u, repo)).not.toBeNull();
  const no = (u: unknown, repo = "o/r") => expect(urlCaptura(u, repo)).toBeNull();
  it("acepta solo los 4 orígenes permitidos", () => {
    ok("https://raw.githubusercontent.com/o/r/HEAD/a.png");
    ok("https://user-images.githubusercontent.com/1/a.png");
    ok("https://private-user-images.githubusercontent.com/1/a.png?jwt=x");
    ok("https://github.com/user-attachments/assets/abc");
  });
  it("rechaza otros hosts, http, credenciales, puerto, github.com fuera de user-attachments y valores no string", () => {
    no("https://evil.test/a.png");
    no("http://raw.githubusercontent.com/o/r/a.png");
    no("https://u:p@raw.githubusercontent.com/o/r/a.png");
    no("https://raw.githubusercontent.com:8443/o/r/a.png");
    no("https://github.com/o/r/blob/main/a.png");
    no("https://raw.githubusercontent.com.evil.test/o/r/a.png");
    no("https://avatars.githubusercontent.com/u/1");
    no("javascript:alert(1)");
    no("data:image/png;base64,AAAA");
    no(null);
    no(42);
    no("https://raw.githubusercontent.com/" + "a".repeat(2100));
  });
  it("una captura de raw.githubusercontent.com tiene que ser del propio repo (MU-31)", () => {
    no("https://raw.githubusercontent.com/otro/producto/HEAD/screenshot.png", "o/r");
    ok("https://RAW.githubusercontent.com/O/R/HEAD/screenshot.png", "o/r");
  });
});

describe("tipoCaptura (RNF-30, MU-30)", () => {
  it("PNG, JPEG y WebP por magic bytes", () => {
    expect(tipoCaptura(relleno(PNG))?.extension).toBe("png");
    expect(tipoCaptura(relleno([0xff, 0xd8, 0xff, 0xe0]))?.extension).toBe("jpg");
    const webp = relleno([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
    expect(tipoCaptura(webp)?.extension).toBe("webp");
  });
  it("SVG, HTML, GIF, vacío, demasiado chico o demasiado grande → null", () => {
    const texto = (s: string) => relleno([...Buffer.from(s)]);
    expect(tipoCaptura(texto('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)">'))).toBeNull();
    expect(tipoCaptura(texto("<!doctype html><script>alert(1)</script>"))).toBeNull();
    expect(tipoCaptura(texto("GIF89a"))).toBeNull();
    expect(tipoCaptura(new Uint8Array(0))).toBeNull();
    expect(tipoCaptura(relleno(PNG, 100))).toBeNull();
    expect(tipoCaptura(relleno(PNG, MAX_CAPTURA_BYTES + 1))).toBeNull();
    expect(tipoCaptura(relleno(PNG, MAX_CAPTURA_BYTES))).not.toBeNull();
    expect(tipoCaptura("no son bytes" as unknown as Uint8Array)).toBeNull();
  });
});

describe("archivoCaptura (MU-32)", () => {
  it("deriva el nombre solo del id válido", () => {
    expect(archivoCaptura("supabase", "png")).toBe("supabase.png");
    for (const id of ["../x", "a/../b", "A", "", "a b", "x".repeat(101)]) expect(archivoCaptura(id, "png")).toBeNull();
    expect(archivoCaptura("ok", "svg")).toBeNull();
    expect(archivoCaptura("ok", "../png")).toBeNull();
  });
});

describe("candidatasCaptura", () => {
  const md = [
    "![Logo](assets/logo.png)",
    "![build](https://img.shields.io/badge/x.svg)",
    "![Dashboard](docs/img/dashboard.png)",
    '<img src="https://raw.githubusercontent.com/o/r/main/s/screenshot.png" alt="x">',
    "![demo](demo.gif)",
    "![otro](https://evil.test/screenshot.png)",
    "![ajeno](https://raw.githubusercontent.com/otro/producto/HEAD/screenshot.png)",
    "![traversal](../../etc/screenshot.png)",
    "![x](javascript:alert(1)//screenshot.png)",
    "![anónima](https://github.com/user-attachments/assets/1234)",
    "![ui oscura](docs/ui.png#gh-dark-mode-only)",
  ].join("\n");
  it("toma en orden las que parecen capturas y descarta badges, logos, GIF, otros hosts, otros repos y rutas con ..", () => {
    expect(candidatasCaptura(md, "o/r")).toEqual([
      "https://raw.githubusercontent.com/o/r/HEAD/docs/img/dashboard.png",
      "https://raw.githubusercontent.com/o/r/main/s/screenshot.png",
    ]);
  });
  it("una imagen sin pista (anónima) no se acepta: preferimos no mostrar nada antes que un logo", () => {
    expect(candidatasCaptura("![](https://github.com/user-attachments/assets/1234)", "o/r")).toEqual([]);
  });
  it("entradas raras no rompen", () => {
    expect(candidatasCaptura(undefined as unknown as string, "o/r")).toEqual([]);
    expect(candidatasCaptura("![x](a)", "../x")).toEqual([]);
    expect(candidatasCaptura("![screenshot](" + "a".repeat(100_000) + ")", "o/r")).toEqual([]);
  });
});

describe("public/capturas (RNF-30, RNF-32)", () => {
  it("cada captura existe, es PNG/JPEG/WebP por magic bytes y ≤ 600 KB, del repo que la declara, con licencia y origen permitido", () => {
    for (const c of capturas.capturas) {
      expect(esIdValido(c.id)).toBe(true);
      expect(c.archivo).toMatch(new RegExp(`^${c.id.replace(/[.]/g, "\\.")}\\.(png|jpg|webp)$`));
      const ruta = join(PUBLIC, "capturas", c.archivo);
      expect(existsSync(ruta)).toBe(true);
      expect(statSync(ruta).size).toBeLessThanOrEqual(MAX_CAPTURA_BYTES);
      const bytes = new Uint8Array(readFileSync(ruta));
      expect(tipoCaptura(bytes)?.tipo).toBe(c.tipo);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(c.sha256);
      expect(urlCaptura(c.origen)).not.toBeNull();
      expect(c.origen).not.toMatch(/[?#]/); // sin tokens (jwt) guardados
      const repo = reales.find((r) => r.id === c.id);
      expect(repo, `repo ${c.id} en el catálogo`).toBeDefined();
      expect(c.repo).toBe(repo?.urlRepo);
      expect(c.licencia).toBe(repo?.licencia);
      expect(c.licencia, "licencia del repo").toBeTruthy();
    }
  });
  it("ninguna imagen se repite entre repos y no sobra ningún archivo sin listar", () => {
    const hashes = capturas.capturas.map((c) => c.sha256);
    expect(new Set(hashes).size).toBe(hashes.length);
    const archivos = readdirSync(join(PUBLIC, "capturas")).filter((f) => f !== "fuentes.json").sort();
    expect(archivos).toEqual(capturas.capturas.map((c) => c.archivo).sort());
  });
});

describe("PreviewHerramienta (RF-24, RNF-32)", () => {
  const conCaptura = capturas.capturas[0];
  it.runIf(conCaptura !== undefined)("con captura: next/image con su propio archivo y alt descriptivo", () => {
    const html = renderToStaticMarkup(<PreviewHerramienta id={conCaptura!.id} nombre="<b>X</b>" categoria="analitica" sizes="100vw" />);
    expect(html).toContain("data-ob-captura");
    expect(html).toContain(encodeURIComponent(`/capturas/${conCaptura!.archivo}`));
    expect(html).toMatch(/alt="Captura de pantalla de la interfaz de &lt;b&gt;X&lt;\/b&gt;"/);
    expect(html).not.toMatch(/\son\w+=|<svg/i);
  });
  it("sin captura: la PantallaPreview (SVG propio fijo); sin captura ni categoría: nada", () => {
    const html = renderToStaticMarkup(<PreviewHerramienta id="no-tiene" nombre="N" categoria="pagos" sizes="100vw" />);
    expect(html).toMatch(/^<svg data-ob-svg="" aria-hidden="true"/);
    expect(renderToStaticMarkup(<PreviewHerramienta id="no-tiene" nombre="N" sizes="100vw" />)).toBe("");
  });
  it("la ruta sale solo del id: nunca la captura de otro repo ni un id con forma de ruta", () => {
    for (const id of ["../supabase", "supabase/../lago", "SUPABASE", "supabase.png", "lago "]) expect(rutaCaptura(id)).toBeNull();
    for (const c of capturas.capturas) expect(rutaCaptura(c.id)).toBe(`/capturas/${c.archivo}`);
  });
});

describe("public/imagenes (RF-25)", () => {
  it("3 a 5 fotos JPEG ≤ 300 KB con autor, URL de Pexels, licencia y alt descriptivo", () => {
    expect(fotos.fotos.length).toBeGreaterThanOrEqual(3);
    expect(fotos.fotos.length).toBeLessThanOrEqual(5);
    for (const f of fotos.fotos) {
      const ruta = join(PUBLIC, "imagenes", f.archivo);
      expect(statSync(ruta).size).toBeLessThanOrEqual(300 * 1024);
      expect(statSync(ruta).size).toBe(f.bytes);
      const bytes = readFileSync(ruta);
      expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xff, 0xd8, 0xff]);
      expect(f.autor.length).toBeGreaterThan(2);
      expect(f.url).toMatch(/^https:\/\/www\.pexels\.com\/photo\/[a-z0-9-]+\/$/);
      expect(f.licencia).toBe("Pexels License");
      expect(f.alt.length).toBeGreaterThan(20);
    }
    const archivos = readdirSync(join(PUBLIC, "imagenes")).filter((f) => f !== "fuentes.json").sort();
    expect(archivos).toEqual(fotos.fotos.map((f) => f.archivo).sort());
  });
});
