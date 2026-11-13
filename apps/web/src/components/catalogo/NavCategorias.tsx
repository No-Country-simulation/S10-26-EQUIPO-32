"use client";

import { CATEGORIAS, type Categoria } from "@/lib/catalogo/categorias";
import { IconoPropio } from "@/components/marca/Iconos";
import { cn } from "@/lib/utils";
import { t } from "@/i18n/es";

export interface NavCategoriasProps {
  activa: Categoria | null;
  onElegir: (categoria: Categoria | null) => void;
}

/** Clase compartida de los ítems de las columnas del explorador (categorías, lenguajes y licencias). */
export function claseItemColumna(activo: boolean) {
  return cn(
    "catalogo-foco flex min-h-10 w-full min-w-0 cursor-pointer items-center justify-between gap-3 rounded-xl px-3 text-left text-[0.95rem] transition-colors",
    activo ? "bg-primary font-medium text-primary-foreground" : "text-foreground hover:bg-secondary",
  );
}

/** Las 6 categorías más «Todas» en columna; la activa resaltada (fondo y peso, no solo color) y anunciada con aria-pressed. */
export function NavCategorias({ activa, onElegir }: NavCategoriasProps) {
  return (
    <nav aria-label={t("nav.etiqueta")}>
      <ul className="-mx-3 space-y-0.5">
        <li>
          <button type="button" aria-pressed={activa === null} onClick={() => onElegir(null)} className={claseItemColumna(activa === null)}>
            {t("nav.todas")}
          </button>
        </li>
        {CATEGORIAS.map((categoria) => (
          <li key={categoria}>
            <button
              type="button"
              aria-pressed={activa === categoria}
              onClick={() => onElegir(categoria)}
              className={cn(claseItemColumna(activa === categoria), "justify-start")}
            >
              <IconoPropio nombre={categoria} className="size-6" />
              {t(`categoria.${categoria}`)}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
