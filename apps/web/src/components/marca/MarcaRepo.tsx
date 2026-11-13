import { useId } from "react";
import { cn } from "@/lib/utils";
import { rasgos } from "./paleta";

export interface MarcaRepoProps {
  /** Id del repo (ASCII estricto del contrato). Es lo único que se usa: nunca el nombre ni otro texto externo. */
  id: string;
  className?: string;
}

/** Forma geométrica en blanco (y un acento) sobre el gradiente; coordenadas en un lienzo de 64 × 64. */
function Forma({ n, acento }: { n: number; acento: string }) {
  switch (n) {
    case 0:
      return (
        <>
          <circle cx="32" cy="32" r="15" fill="#ffffff" />
          <circle cx="45" cy="19" r="7" fill={acento} />
        </>
      );
    case 1:
      return (
        <>
          <rect x="15" y="15" width="22" height="22" rx="6" fill="#ffffff" fillOpacity="0.9" />
          <rect x="27" y="27" width="22" height="22" rx="6" fill={acento} />
        </>
      );
    case 2:
      return (
        <>
          <path d="M32 13 L51 47 L13 47 Z" fill="#ffffff" />
          <circle cx="32" cy="38" r="5" fill={acento} />
        </>
      );
    case 3:
      return (
        <>
          <circle cx="32" cy="32" r="16" fill="none" stroke="#ffffff" strokeWidth="7" />
          <circle cx="32" cy="32" r="5" fill={acento} />
        </>
      );
    case 4:
      return (
        <>
          <path d="M32 11 L53 32 L32 53 L11 32 Z" fill="#ffffff" fillOpacity="0.92" />
          <rect x="26" y="26" width="12" height="12" rx="3" fill={acento} />
        </>
      );
    default:
      return (
        <>
          <rect x="14" y="16" width="36" height="8" rx="4" fill="#ffffff" />
          <rect x="14" y="28" width="26" height="8" rx="4" fill="#ffffff" fillOpacity="0.85" />
          <rect x="14" y="40" width="16" height="8" rx="4" fill={acento} />
        </>
      );
  }
}

/**
 * Marca generativa del repo (ui-brief §12.2 #1): tile redondeado tipo ícono de app, determinista por `id`.
 * SVG propio y decorativo: `data-ob-svg`, `aria-hidden`, sin texto, sin enlaces ni manejadores (guarda de los e2e).
 */
export function MarcaRepo({ id, className }: MarcaRepoProps) {
  const { color, acento, forma, giro } = rasgos(id);
  const gradiente = `ob-marca-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg data-ob-svg="" aria-hidden="true" viewBox="0 0 64 64" className={cn("size-12 shrink-0 drop-shadow-sm", className)}>
      <defs>
        <linearGradient id={gradiente} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={color.desde} />
          <stop offset="1" stopColor={color.hasta} />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill={`url(#${gradiente})`} />
      <g transform={`rotate(${giro} 32 32)`}>
        <Forma n={forma} acento={acento.hasta} />
      </g>
    </svg>
  );
}
