"use client";

import { useCallback, useMemo, useState } from "react";
import type { Categoria } from "@/lib/catalogo/categorias";
import type { HerramientaResumen } from "@/lib/catalogo/contrato";
import { derivarOpciones, ESTADO_SIN_FILTROS, filtrar, type EstadoFiltros, type ValoresFiltros } from "@/lib/catalogo/filtros";
import { t } from "@/i18n/es";
import { Buscador, LARGO_MAXIMO_BUSQUEDA } from "./Buscador";
import { ChipsFiltros } from "./ChipsFiltros";
import { GrillaHerramientas } from "./GrillaHerramientas";
import { NavCategorias } from "./NavCategorias";
import { PanelFiltros } from "./PanelFiltros";

export interface CatalogoProps {
  /** Lista ya validada por el contrato en el servidor. El catálogo completo viaja una vez y se filtra acá. */
  herramientas: HerramientaResumen[];
  /** Estado inicial ya validado (T20 lo lee de la URL en el servidor). */
  estadoInicial?: EstadoFiltros;
}

/** Etiquetas de los chips: las arma este código a partir de `t()` y de los valores; nunca HTML. */
function chipsActivos(estado: EstadoFiltros): { clave: string; etiqueta: string }[] {
  const chips: { clave: string; etiqueta: string }[] = [];
  if (estado.categoria !== null) chips.push({ clave: "categoria", etiqueta: `${t("chip.categoria")}: ${t(`categoria.${estado.categoria}`)}` });
  if (estado.lenguaje !== null) chips.push({ clave: "lenguaje", etiqueta: `${t("filtros.lenguaje")}: ${estado.lenguaje}` });
  if (estado.licencia !== null) chips.push({ clave: "licencia", etiqueta: `${t("filtros.licencia")}: ${estado.licencia}` });
  if (estado.mantenimiento !== null) chips.push({ clave: "mantenimiento", etiqueta: `${t("filtros.mantenimiento")}: ${t(`nivel.${estado.mantenimiento}`)}` });
  if (estado.stars !== null) chips.push({ clave: "stars", etiqueta: `${t("chip.stars")} ${estado.stars}` });
  if (estado.q !== "") chips.push({ clave: "q", etiqueta: `${t("chip.busqueda")}: ${estado.q}` });
  return chips;
}

const CLAVES = ["categoria", "lenguaje", "licencia", "mantenimiento", "stars", "q"] as const;

/** Estado en memoria del catálogo: categoría, filtros y búsqueda. T20 lo sincroniza con la URL. */
export function Catalogo({ herramientas, estadoInicial = ESTADO_SIN_FILTROS }: CatalogoProps) {
  const [estado, setEstado] = useState<EstadoFiltros>(estadoInicial);
  const opciones = useMemo(() => derivarOpciones(herramientas), [herramientas]);
  const visibles = useMemo(() => filtrar(herramientas, estado), [herramientas, estado]);

  const cambiar = useCallback((parcial: Partial<EstadoFiltros>) => setEstado((e) => ({ ...e, ...parcial })), []);
  const limpiar = useCallback(() => setEstado(ESTADO_SIN_FILTROS), []);
  const quitar = useCallback(
    (clave: string) => {
      if ((CLAVES as readonly string[]).includes(clave)) setEstado((e) => ({ ...e, [clave]: ESTADO_SIN_FILTROS[clave as (typeof CLAVES)[number]] }));
    },
    [],
  );

  const activos = chipsActivos(estado);
  const valores: ValoresFiltros = {
    lenguaje: estado.lenguaje,
    licencia: estado.licencia,
    mantenimiento: estado.mantenimiento,
    stars: estado.stars,
  };
  const sinResultadosPorBusqueda = visibles.length === 0 && estado.q !== "";

  return (
    <div className="space-y-6">
      <Buscador valor={estado.q} onBuscar={(q) => cambiar({ q: q.slice(0, LARGO_MAXIMO_BUSQUEDA) })} />
      <NavCategorias activa={estado.categoria} onElegir={(categoria: Categoria | null) => cambiar({ categoria })} />
      <PanelFiltros opciones={opciones} valores={valores} total={visibles.length} onCambiar={cambiar} />
      <ChipsFiltros activos={activos} onQuitar={quitar} onLimpiar={limpiar} />
      <GrillaHerramientas
        herramientas={visibles}
        total={visibles.length}
        vacio={{
          // La búsqueda se muestra como texto (React la escapa); nunca como HTML.
          texto: sinResultadosPorBusqueda ? `${t("vacio.paraBusqueda")} «${estado.q}».` : undefined,
          accion: activos.length > 0 ? { etiqueta: t("vacio.limpiar"), onClick: limpiar } : undefined,
        }}
      />
    </div>
  );
}
