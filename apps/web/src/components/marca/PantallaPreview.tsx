import type { ReactNode } from "react";
import type { Categoria } from "@/lib/catalogo/categorias";
import { cn } from "@/lib/utils";
import { rasgos, type Color } from "./paleta";

// Tipo de pantalla según la categoría principal (ui-brief §12.2 #2).
const TIPO: Record<Categoria, "formulario" | "grilla" | "dashboard" | "chat" | "grafico" | "terminal"> = {
  autenticacion: "formulario",
  "base-de-datos": "grilla",
  pagos: "dashboard",
  ia: "chat",
  analitica: "grafico",
  busqueda: "terminal",
};

const GRIS = "#e5e5e5";
const GRIS_2 = "#d4d4d4";

/** Línea de texto simulada (nunca texto real). */
const Linea = ({ x, y, w, fill = GRIS }: { x: number; y: number; w: number; fill?: string }) => (
  <rect x={x} y={y} width={w} height="7" rx="3.5" fill={fill} />
);

function Contenido({ tipo, c, a }: { tipo: (typeof TIPO)[Categoria]; c: Color; a: Color }): ReactNode {
  switch (tipo) {
    case "formulario":
      return (
        <>
          <circle cx="160" cy="62" r="14" fill={c.hasta} />
          <Linea x={110} y={86} w={100} fill={GRIS_2} />
          <rect x="92" y="104" width="136" height="20" rx="7" fill="#ffffff" stroke={GRIS_2} />
          <rect x="92" y="132" width="136" height="20" rx="7" fill="#ffffff" stroke={GRIS_2} />
          <rect x="92" y="162" width="136" height="22" rx="11" fill={c.desde} />
        </>
      );
    case "grilla":
      return (
        <>
          <rect x="44" y="46" width="232" height="18" rx="5" fill={c.suave} />
          {[0, 1, 2, 3, 4].map((f) => (
            <g key={f}>
              <circle cx="58" cy={82 + f * 22} r="6" fill={f % 2 === 0 ? c.hasta : a.hasta} />
              <Linea x={72} y={78 + f * 22} w={70} />
              <Linea x={160} y={78 + f * 22} w={50} />
              <rect x="226" y={77 + f * 22} width="36" height="10" rx="5" fill={f === 1 ? a.suave : c.suave} />
            </g>
          ))}
        </>
      );
    case "dashboard":
      return (
        <>
          <rect x="44" y="46" width="72" height="44" rx="8" fill={c.desde} />
          <rect x="124" y="46" width="72" height="44" rx="8" fill={c.suave} />
          <rect x="204" y="46" width="72" height="44" rx="8" fill={a.suave} />
          <Linea x={54} y={58} w={40} fill="#ffffff" />
          <Linea x={134} y={58} w={40} fill={c.hasta} />
          <Linea x={214} y={58} w={40} fill={a.hasta} />
          <rect x="44" y="100" width="232" height="84" rx="8" fill="#fafafa" stroke={GRIS} />
          <path d="M56 168 C90 150 110 160 140 138 S200 120 230 126 S262 110 266 112" fill="none" stroke={c.hasta} strokeWidth="4" strokeLinecap="round" />
        </>
      );
    case "chat":
      return (
        <>
          <rect x="150" y="44" width="126" height="26" rx="13" fill={c.desde} />
          <rect x="44" y="80" width="150" height="38" rx="13" fill="#f5f5f5" />
          <Linea x={56} y={90} w={110} fill={GRIS_2} />
          <Linea x={56} y={102} w={70} fill={GRIS_2} />
          <rect x="170" y="128" width="106" height="22" rx="11" fill={a.hasta} />
          <rect x="44" y="160" width="232" height="24" rx="12" fill="#ffffff" stroke={GRIS_2} />
          <circle cx="262" cy="172" r="7" fill={c.hasta} />
        </>
      );
    case "grafico":
      return (
        <>
          {[52, 88, 64, 120, 96, 140, 110].map((alto, i) => (
            <rect key={i} x={52 + i * 32} y={184 - alto} width="20" height={alto} rx="5" fill={i === 5 ? a.hasta : i % 2 === 0 ? c.desde : c.hasta} />
          ))}
          <Linea x={44} y={44} w={80} fill={GRIS_2} />
        </>
      );
    default:
      return (
        <>
          <rect x="36" y="38" width="248" height="162" fill="#141414" />
          <rect x="50" y="52" width="10" height="8" rx="2" fill={c.hasta} />
          <Linea x={66} y={52} w={120} fill="#525252" />
          <Linea x={50} y={70} w={170} fill={c.hasta} />
          <Linea x={50} y={88} w={130} fill="#525252" />
          <Linea x={50} y={106} w={190} fill={a.hasta} />
          <Linea x={50} y={124} w={90} fill="#525252" />
          <rect x="50" y="142" width="8" height="12" fill="#ffffff" />
        </>
      );
  }
}

export interface PantallaPreviewProps {
  id: string;
  categoria: Categoria;
  className?: string;
}

/**
 * Mini mockup de «pantalla» (ui-brief §12.2 #2): barra superior, bloques con la paleta del repo y líneas simuladas.
 * Decorativo y fijo: SVG propio sin texto, enlaces ni manejadores (`data-ob-svg`, `aria-hidden`).
 */
export function PantallaPreview({ id, categoria, className }: PantallaPreviewProps) {
  const { color, acento } = rasgos(id);
  return (
    <svg data-ob-svg="" aria-hidden="true" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" className={cn("block size-full", className)}>
      <rect width="320" height="200" fill={color.suave} />
      <rect x="28" y="16" width="264" height="200" rx="12" fill="#ffffff" />
      <rect x="28" y="16" width="264" height="22" rx="12" fill="#fafafa" />
      <rect x="28" y="30" width="264" height="8" fill="#fafafa" />
      <circle cx="42" cy="27" r="3.5" fill="#f87171" />
      <circle cx="53" cy="27" r="3.5" fill="#facc15" />
      <circle cx="64" cy="27" r="3.5" fill="#4ade80" />
      <Contenido tipo={TIPO[categoria]} c={color} a={acento} />
    </svg>
  );
}
