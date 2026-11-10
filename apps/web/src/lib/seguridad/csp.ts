// Content-Security-Policy con nonce (plan 5.2; T25, AM-01, AM-11, AM-12, RNF-04, R-07, R-13, D-05). Función pura.

export interface OpcionesCsp {
  /** Valor aleatorio único por request. */
  nonce: string;
  /** `NODE_ENV === 'development'`: Next necesita `unsafe-eval` para la recarga en caliente. Nunca en producción. */
  desarrollo: boolean;
  /** Solo producción servida por HTTPS: sobre http://localhost el navegador rompería los recursos propios. */
  mejorarAHttps: boolean;
}

export function construirCsp({ nonce, desarrollo, mejorarAHttps }: OpcionesCsp): string {
  const directivas = [
    "default-src 'self'",
    // Sin 'unsafe-inline' ni 'unsafe-eval' en producción. 'strict-dynamic' deja cargar los fragmentos de Next que firma el nonce.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${desarrollo ? " 'unsafe-eval'" : ""}`,
    // Concesión deliberada (plan 5.2): shadcn/Tailwind usan style="" que un nonce no cubre. Ningún estilo sale de datos externos.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self'",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  if (mejorarAHttps) directivas.push("upgrade-insecure-requests");
  return directivas.join("; ");
}

/** Nonce de 128 bits aleatorios en base64 (distinto en cada request). */
export function generarNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}
