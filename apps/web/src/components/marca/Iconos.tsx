import { cn } from "@/lib/utils";

/** Estrella propia para las stars (reemplaza el glifo de texto «★»). */
export function IconoEstrella({ className }: { className?: string }) {
  return (
    <svg data-ob-svg="" aria-hidden="true" viewBox="0 0 16 16" className={cn("inline size-3 shrink-0", className)}>
      <path d="M8 1.5l1.9 4 4.3.5-3.2 3 .9 4.3L8 11.2l-3.9 2.1.9-4.3-3.2-3 4.3-.5z" fill="#ca8a04" />
    </svg>
  );
}

// Íconos propios a color (ui-brief §12.2 #3). Tile suave + figura en color fuerte, lienzo de 24 × 24. Sin letras.
const C = {
  violeta: ["#f3e8ff", "#6d28d9"],
  azul: ["#dbeafe", "#1d4ed8"],
  lima: ["#ecfccb", "#4d7c0f"],
  naranja: ["#ffedd5", "#c2410c"],
  rosa: ["#fce7f3", "#be185d"],
  cian: ["#cffafe", "#0e7490"],
  amarillo: ["#fef9c3", "#a16207"],
  rojo: ["#fee2e2", "#b91c1c"],
} as const;

type NombreColor = keyof typeof C;

const FIGURAS = {
  // Categorías
  autenticacion: { color: "violeta", d: "M12 6.5a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM6.5 18.5c.6-2.8 2.8-4.3 5.5-4.3s4.9 1.5 5.5 4.3z" },
  "base-de-datos": { color: "azul", d: "M12 5c3.6 0 6 1.1 6 2.4v9.2c0 1.3-2.4 2.4-6 2.4s-6-1.1-6-2.4V7.4C6 6.1 8.4 5 12 5zm0 1.6c-2.8 0-4.4.8-4.4.8s1.6.9 4.4.9 4.4-.9 4.4-.9-1.6-.8-4.4-.8z" },
  pagos: { color: "lima", d: "M5 7.5A1.5 1.5 0 0 1 6.5 6h11A1.5 1.5 0 0 1 19 7.5V9H5zM5 11h14v5.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 16.5zm2 3.5h4v1.5H7z" },
  ia: { color: "naranja", d: "M12 4.5l1.6 4.6 4.9 1.6-4.9 1.6L12 17l-1.6-4.7-4.9-1.6 4.9-1.6zM17.5 15l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" },
  analitica: { color: "rosa", d: "M6 18h2.5v-6H6zm4.75 0h2.5V7h-2.5zm4.75 0H18v-9h-2.5z" },
  busqueda: { color: "cian", d: "M10.5 5a5.5 5.5 0 0 1 4.4 8.8l3.7 3.7-1.2 1.2-3.7-3.7A5.5 5.5 0 1 1 10.5 5zm0 1.8a3.7 3.7 0 1 0 0 7.4 3.7 3.7 0 0 0 0-7.4z" },
  // Seguridad por diseño
  escudo: { color: "azul", d: "M12 4.5l6 2.2v4.6c0 3.9-2.5 6.6-6 7.9-3.5-1.3-6-4-6-7.9V6.7zm-1 9.3l4.3-4.3-1.1-1.1-3.2 3.2-1.5-1.5-1.1 1.1z" },
  candado: { color: "violeta", d: "M8.5 10V8.5a3.5 3.5 0 0 1 7 0V10h.5A1.5 1.5 0 0 1 17.5 11.5v5.5a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 17v-5.5A1.5 1.5 0 0 1 8 10zm1.7 0h3.6V8.5a1.8 1.8 0 0 0-3.6 0zm1 3.2v2.6h1.6v-2.6z" },
  llave: { color: "amarillo", d: "M9 7.5a4 4 0 0 1 3.9 4.9l5.6 5.6v1.5h-2.4v-1.4h-1.4v-1.4h-1.4l-1.2-1.2A4 4 0 1 1 9 7.5zm-.8 2.4a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z" },
  radar: { color: "lima", d: "M12 5a7 7 0 1 1 0 14 7 7 0 0 1 0-14zm0 1.8a5.2 5.2 0 1 0 5.2 5.2H12zm0 3.4a1.8 1.8 0 1 0 1.8 1.8H12z" },
  cadena: { color: "naranja", d: "M10.4 8.6l1.2-1.2a3.4 3.4 0 0 1 4.8 4.8l-1.6 1.6-1.2-1.2 1.6-1.6a1.7 1.7 0 0 0-2.4-2.4l-1.2 1.2zm3.2 6.8l-1.2 1.2a3.4 3.4 0 0 1-4.8-4.8l1.6-1.6 1.2 1.2-1.6 1.6a1.7 1.7 0 0 0 2.4 2.4l1.2-1.2zm-3.9-.3l4.6-4.6 1.1 1.1-4.6 4.6z" },
  diana: { color: "rojo", d: "M12 5a7 7 0 1 1 0 14 7 7 0 0 1 0-14zm0 1.8a5.2 5.2 0 1 0 0 10.4 5.2 5.2 0 0 0 0-10.4zm0 2a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 0 1 0-6.4zm0 1.7a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" },
} as const satisfies Record<string, { color: NombreColor; d: string }>;

export type NombreIcono = keyof typeof FIGURAS;

/** Ícono propio a color: decorativo (`aria-hidden`), sin texto ni enlaces (`data-ob-svg`, ui-brief §12.3). */
export function IconoPropio({ nombre, className }: { nombre: NombreIcono; className?: string }) {
  const { color, d } = FIGURAS[nombre];
  const [fondo, figura] = C[color];
  return (
    <svg data-ob-svg="" aria-hidden="true" viewBox="0 0 24 24" className={cn("size-6 shrink-0", className)}>
      <rect width="24" height="24" rx="7" fill={fondo} />
      <path d={d} fill={figura} fillRule="evenodd" />
    </svg>
  );
}
