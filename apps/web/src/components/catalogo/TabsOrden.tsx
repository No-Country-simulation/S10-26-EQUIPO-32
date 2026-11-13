"use client";

import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { t } from "@/i18n/es";
import { ORDENES, type Orden } from "./orden";

export interface TabsOrdenProps {
  /** Prefijo de ids: cada tab es `${base}-tab-${orden}` y el panel es `${base}-panel`. */
  base: string;
  activo: Orden;
  onCambiar: (orden: Orden) => void;
}

/** Tabs «Recientes / Mejor salud» con el patrón WAI-ARIA: foco itinerante y flechas, Inicio y Fin. */
export function TabsOrden({ base, activo, onCambiar }: TabsOrdenProps) {
  const refs = useRef<Record<Orden, HTMLButtonElement | null>>({ recientes: null, salud: null });

  const mover = (evento: KeyboardEvent<HTMLDivElement>) => {
    const i = ORDENES.indexOf(activo);
    const indice =
      evento.key === "ArrowRight" ? (i + 1) % ORDENES.length
      : evento.key === "ArrowLeft" ? (i - 1 + ORDENES.length) % ORDENES.length
      : evento.key === "Home" ? 0
      : evento.key === "End" ? ORDENES.length - 1
      : null;
    const destino = indice === null ? undefined : ORDENES[indice];
    if (destino === undefined) return;
    evento.preventDefault();
    onCambiar(destino);
    refs.current[destino]?.focus();
  };

  return (
    <div role="tablist" aria-label={t("orden.etiqueta")} onKeyDown={mover} className="inline-flex rounded-full bg-secondary p-1">
      {ORDENES.map((orden) => (
        <button
          key={orden}
          ref={(el) => {
            refs.current[orden] = el;
          }}
          id={`${base}-tab-${orden}`}
          type="button"
          role="tab"
          aria-selected={activo === orden}
          aria-controls={`${base}-panel`}
          tabIndex={activo === orden ? 0 : -1}
          onClick={() => onCambiar(orden)}
          className={cn(
            "catalogo-foco min-h-10 cursor-pointer rounded-full px-4 text-[0.95rem] font-medium transition-colors",
            activo === orden ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t(`orden.${orden}`)}
        </button>
      ))}
    </div>
  );
}
