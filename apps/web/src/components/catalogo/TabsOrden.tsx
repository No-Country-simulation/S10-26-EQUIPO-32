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
    <div role="tablist" aria-label={t("orden.etiqueta")} onKeyDown={mover} className="inline-flex gap-6 border-b border-border">
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
            // Subrayado animado (ui-brief §12.2 #5b): crece desde el centro al elegir la tab; sin animación con movimiento reducido.
            "catalogo-foco relative -mb-px min-h-11 cursor-pointer rounded-sm px-0.5 text-lg font-medium transition-colors",
            "after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-foreground after:transition-transform after:duration-300 motion-reduce:after:transition-none",
            activo === orden ? "text-foreground after:scale-x-100" : "text-muted-foreground after:scale-x-0 hover:text-foreground",
          )}
        >
          {t(`orden.${orden}`)}
        </button>
      ))}
    </div>
  );
}
