// Panel del asistente (feature 002 · A06; RF-11, RNF-04).
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PanelAsistente, type EstadoPanel } from "@/components/asistente/PanelAsistente";
import { consultarAsistente, rutaFicha } from "@/lib/asistente/cliente";

const XSS = '<img src=x onerror="alert(1)"><script>alert(2)</script>';
const html = (estado: EstadoPanel, consulta = "") =>
  renderToStaticMarkup(
    <PanelAsistente id="p" consulta={consulta} estado={estado} onCambiar={() => {}} onEnviar={() => {}} onEjemplo={() => {}} onCerrar={() => {}} />,
  );

describe("PanelAsistente", () => {
  it("campo con etiqueta, máximo 500 y contador", () => {
    const h = html({ tipo: "inicial" }, "hola");
    expect(h).toMatch(/<label[^>]*for="[^"]+"[^>]*>Describí tu negocio<\/label>/);
    expect(h).toContain('maxLength="500"');
    expect(h).toContain("4 / 500 caracteres");
  });

  it("stack, justificación y citados enlazados a su ficha; nada del modelo se interpreta como HTML (RNF-04)", () => {
    const h = html({
      tipo: "respuesta",
      respuesta: {
        estado: "ok",
        stack: [{ id: "keycloak", nombre: "Keycloak", rol: XSS }],
        justificacion: XSS,
        citados: [{ id: "keycloak", nombre: "Keycloak" }],
      },
    });
    expect(h).toContain('href="/herramientas/keycloak"');
    expect(h.match(/href=/g)).toHaveLength(2);
    // El único <img> permitido es el logo propio del repo citado (feature 005, RF-18): decorativo y desde /logos/.
    const sinLogo = h.replace(/<img data-ob-logo="" src="\/logos\/keycloak\.(?:png|jpg)" alt="" aria-hidden="true"[^>]*\/>/g, "");
    expect(sinLogo).not.toContain("<img");
    expect(h).not.toContain("<script");
    expect(h).toContain("&lt;img src=x onerror=");
  });

  it("salida cruda (red-team) también como texto", () => {
    const h = html({ tipo: "respuesta", respuesta: { estado: "crudo", salida: XSS } });
    expect(h).not.toContain("<img");
    expect(h).toContain("sin guardrails");
  });

  it("estados: sin contexto, límite y no disponible", () => {
    expect(html({ tipo: "respuesta", respuesta: { estado: "sin-contexto" } })).toContain("No encontramos en el catálogo");
    expect(html({ tipo: "error", codigo: "limite" })).toContain("límite de consultas");
    expect(html({ tipo: "error", codigo: "no-disponible" })).toContain("no está disponible");
  });
});

describe("cliente del asistente", () => {
  it("rutaFicha solo con id válido", () => {
    expect(rutaFicha("supabase")).toBe("/herramientas/supabase");
    expect(rutaFicha("../admin")).toBeNull();
    expect(rutaFicha("javascript:alert(1)")).toBeNull();
  });

  it("valida la respuesta del servidor: ids inválidos → error interno", async () => {
    const malo = vi.fn(async () =>
      Response.json({ estado: "ok", stack: [{ id: "javascript:alert(1)", nombre: "x", rol: "x" }], justificacion: "", citados: [] }),
    );
    expect(await consultarAsistente("x", malo)).toEqual({ tipo: "error", codigo: "interno" });
  });

  it("mapea 429/400/503 y la caída de red", async () => {
    const con = (status: number) => vi.fn(async () => new Response("{}", { status }));
    expect(await consultarAsistente("x", con(429))).toEqual({ tipo: "error", codigo: "limite" });
    expect(await consultarAsistente("x", con(400))).toEqual({ tipo: "error", codigo: "entrada" });
    expect(await consultarAsistente("x", con(503))).toEqual({ tipo: "error", codigo: "no-disponible" });
    const caido = vi.fn(async () => {
      throw new TypeError("offline");
    });
    expect(await consultarAsistente("x", caido)).toEqual({ tipo: "error", codigo: "no-disponible" });
  });
});
