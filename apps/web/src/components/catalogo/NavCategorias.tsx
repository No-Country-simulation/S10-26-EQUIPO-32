"use client";

import { Button } from "@/components/ui/button";
import { CATEGORIAS, type Categoria } from "@/lib/catalogo/categorias";
import { t } from "@/i18n/es";

export interface NavCategoriasProps {
  activa: Categoria | null;
  onElegir: (categoria: Categoria | null) => void;
}

/** Las 6 categorías más «Todas»; la activa resaltada y anunciada con aria-pressed. */
export function NavCategorias({ activa, onElegir }: NavCategoriasProps) {
  return (
    <nav aria-label={t("nav.etiqueta")}>
      <ul className="flex flex-wrap gap-2">
        <li>
          <Button
            type="button"
            variant={activa === null ? "default" : "secondary"}
            aria-pressed={activa === null}
            onClick={() => onElegir(null)}
            className="catalogo-foco min-h-11 rounded-full px-5"
          >
            {t("nav.todas")}
          </Button>
        </li>
        {CATEGORIAS.map((categoria) => (
          <li key={categoria}>
            <Button
              type="button"
              variant={activa === categoria ? "default" : "secondary"}
              aria-pressed={activa === categoria}
              onClick={() => onElegir(categoria)}
              className="catalogo-foco min-h-11 rounded-full px-5"
            >
              {t(`categoria.${categoria}`)}
            </Button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
