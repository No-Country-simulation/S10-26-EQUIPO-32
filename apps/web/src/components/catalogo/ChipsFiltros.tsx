"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n/es";

export interface ChipsFiltrosProps {
  /** Las etiquetas las arma nuestro código; acá se muestran solo como texto. */
  activos: { clave: string; etiqueta: string }[];
  onQuitar: (clave: string) => void;
  onLimpiar: () => void;
}

/** Filtros activos, cada uno con «quitar», y «limpiar todos». Sin filtros activos no se dibuja nada. */
export function ChipsFiltros({ activos, onQuitar, onLimpiar }: ChipsFiltrosProps) {
  if (activos.length === 0) return null;
  return (
    <section aria-label={t("chips.etiqueta")}>
      <ul className="flex flex-wrap items-center gap-2">
        {activos.map(({ clave, etiqueta }) => (
          <li key={clave} className="min-w-0 max-w-full">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onQuitar(clave)}
              aria-label={`${t("chips.quitar")}: ${etiqueta}`}
              className="catalogo-foco h-auto min-h-11 max-w-full gap-2 rounded-full px-4 py-2 whitespace-normal"
            >
              <bdi dir="auto" className="line-clamp-1 [overflow-wrap:anywhere]">
                {etiqueta}
              </bdi>
              <X aria-hidden="true" />
            </Button>
          </li>
        ))}
        <li>
          <Button type="button" variant="ghost" onClick={onLimpiar} className="catalogo-foco min-h-11 rounded-full px-4">
            {t("chips.limpiar")}
          </Button>
        </li>
      </ul>
    </section>
  );
}
