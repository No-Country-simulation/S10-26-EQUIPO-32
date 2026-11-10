import type { NextConfig } from "next";

// Headers estáticos de seguridad (plan 5.2; T24, AM-11, AM-13, RNF-04, R-13). La CSP con nonce la emite el proxy (T25).
const headersSeguridad = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), clipboard-write=(self)" },
  // Solo tiene efecto sobre HTTPS (Vercel); el navegador la ignora en http://localhost.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  // No anunciar el framework (AM-13).
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: headersSeguridad }];
  },
};

export default nextConfig;
