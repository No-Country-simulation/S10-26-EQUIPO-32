import { describe, expect, it } from "vitest";
import { construirCsp, generarNonce } from "@/lib/seguridad/csp";

const scriptSrc = (csp: string) => csp.split("; ").find((d) => d.startsWith("script-src")) ?? "";

describe("CSP con nonce (plan 5.2; AM-11, R-07, R-13)", () => {
  it("producción: script-src sin unsafe-inline ni unsafe-eval, con el nonce y strict-dynamic", () => {
    const csp = construirCsp({ nonce: "abc", desarrollo: false, mejorarAHttps: false });
    expect(scriptSrc(csp)).toBe("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    expect(scriptSrc(csp)).not.toMatch(/unsafe-/);
  });
  it("unsafe-eval solo en desarrollo", () => {
    expect(scriptSrc(construirCsp({ nonce: "abc", desarrollo: true, mejorarAHttps: false }))).toContain("'unsafe-eval'");
  });
  it("cierra la exfiltración y el embebido: sin orígenes externos, sin frames, sin object", () => {
    const csp = construirCsp({ nonce: "abc", desarrollo: false, mejorarAHttps: false });
    for (const d of ["default-src 'self'", "img-src 'self'", "font-src 'self'", "connect-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'"]) {
      expect(csp.split("; ")).toContain(d);
    }
    expect(csp).not.toMatch(/https?:|\*/);
  });
  it("upgrade-insecure-requests solo si se pide (producción sobre HTTPS)", () => {
    expect(construirCsp({ nonce: "a", desarrollo: false, mejorarAHttps: true })).toContain("upgrade-insecure-requests");
    expect(construirCsp({ nonce: "a", desarrollo: false, mejorarAHttps: false })).not.toContain("upgrade-insecure-requests");
  });
  it("el nonce es distinto en cada llamada y tiene 128 bits", () => {
    const nonces = new Set(Array.from({ length: 50 }, generarNonce));
    expect(nonces.size).toBe(50);
    expect(atob(String([...nonces][0])).length).toBe(16);
  });
});
