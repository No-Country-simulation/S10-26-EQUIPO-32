"use client";

import type { ReactNode } from "react";
import { Container, Globe, Package, Webhook, type LucideIcon } from "lucide-react";
import { TIPOS_IDEA } from "@/lib/catalogo/contrato";
import { t } from "@/i18n/es";
import { claseItemColumna } from "./NavCategorias";

/** Una columna del explorador (ui-brief §11.2 #3): título chico y gris, como en la referencia. */
export function Columna({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <h3 id={id} className="mb-3 text-sm font-medium text-muted-foreground">
        {titulo}
      </h3>
      {children}
    </div>
  );
}

const ICONO_TIPO: Record<(typeof TIPOS_IDEA)[number], LucideIcon> = { rest: Globe, docker: Container, sdk: Package, webhook: Webhook };

/** Casos de uso: los tipos de integración que documentan las fichas. Informativo: no es un filtro del listado. */
export function CasosDeUso({ idTitulo }: { idTitulo: string }) {
  return (
    <>
      <ul aria-labelledby={idTitulo} className="space-y-0.5">
        {TIPOS_IDEA.map((tipo) => {
          const Icono = ICONO_TIPO[tipo];
          return (
            <li key={tipo} className="flex min-h-10 items-center gap-2.5 text-[0.95rem]">
              <Icono aria-hidden="true" className="size-4 text-muted-foreground" />
              {t(`idea.tipo.${tipo}`)}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">{t("explorador.casosNota")}</p>
    </>
  );
}

export interface AtajoFiltro {
  valor: string;
  cantidad: number;
}

/**
 * Atajos a un filtro (lenguaje o licencia): los valores más frecuentes del catálogo cargado.
 * El valor es texto externo: va como texto de React, aislado con <bdi> y cortado con truncate.
 */
export function AtajosFiltro({
  idTitulo,
  atajos,
  restantes,
  activo,
  onElegir,
}: {
  idTitulo: string;
  atajos: AtajoFiltro[];
  restantes: number;
  activo: string | null;
  onElegir: (valor: string | null) => void;
}) {
  return (
    <>
      <ul aria-labelledby={idTitulo} className="-mx-3 space-y-0.5">
        {atajos.map(({ valor, cantidad }) => (
          <li key={valor}>
            <button
              type="button"
              aria-pressed={activo === valor}
              onClick={() => onElegir(activo === valor ? null : valor)}
              className={claseItemColumna(activo === valor)}
            >
              <bdi dir="auto" className="truncate">
                {valor}
              </bdi>
              <span className="shrink-0 text-xs tabular-nums opacity-70">{cantidad}</span>
            </button>
          </li>
        ))}
      </ul>
      {restantes > 0 && (
        <p className="mt-2 flex gap-1 text-xs text-muted-foreground">
          <span className="tabular-nums">{restantes}</span>
          <span>{t("explorador.masEnFiltros")}</span>
        </p>
      )}
    </>
  );
}
