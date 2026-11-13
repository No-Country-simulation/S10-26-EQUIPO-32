"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { Categoria } from "@/lib/catalogo/categorias";
import type { HerramientaResumen } from "@/lib/catalogo/contrato";
import { serializarEstadoUrl } from "@/lib/catalogo/estado-url";
import { derivarOpciones, ESTADO_SIN_FILTROS, filtrar, type EstadoFiltros, type ValoresFiltros } from "@/lib/catalogo/filtros";
import { t } from "@/i18n/es";
import { Buscador, LARGO_MAXIMO_BUSQUEDA } from "./Buscador";
import { ChipsFiltros } from "./ChipsFiltros";
import { AtajosFiltro, CasosDeUso, Columna, type AtajoFiltro } from "./ColumnasCatalogo";
import { GrillaHerramientas } from "./GrillaHerramientas";
import { NavCategorias } from "./NavCategorias";
import { PanelFiltros } from "./PanelFiltros";

export interface CatalogoProps {
  /** Lista ya validada por el contrato en el servidor. El catálogo completo viaja una vez y se filtra acá. */
  herramientas: HerramientaResumen[];
  /** Estado inicial ya validado (el servidor lo lee de la URL y lo valida). */
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

const MAX_ATAJOS = 6;

/** Los valores más frecuentes de un campo (empates por orden alfabético); el activo se incluye aunque no esté entre ellos. */
function atajos(valores: (string | null)[], activo: string | null): { atajos: AtajoFiltro[]; restantes: number } {
  const cuentas = new Map<string, number>();
  for (const v of valores) if (v !== null) cuentas.set(v, (cuentas.get(v) ?? 0) + 1);
  const todos = [...cuentas].map(([valor, cantidad]) => ({ valor, cantidad }));
  todos.sort((a, b) => b.cantidad - a.cantidad || a.valor.localeCompare(b.valor, "es"));
  const elegidos = todos.slice(0, MAX_ATAJOS);
  if (activo !== null && !elegidos.some((a) => a.valor === activo)) {
    const actual = todos.find((a) => a.valor === activo);
    if (actual) elegidos.push(actual);
  }
  return { atajos: elegidos, restantes: todos.length - elegidos.length };
}

const CLAVES = ["categoria", "lenguaje", "licencia", "mantenimiento", "stars", "q"] as const;

/** Estado en memoria del catálogo (categoría, filtros y búsqueda), reflejado en la URL con `history.replaceState`. */
export function Catalogo({ herramientas, estadoInicial = ESTADO_SIN_FILTROS }: CatalogoProps) {
  const [estado, setEstado] = useState<EstadoFiltros>(estadoInicial);
  const opciones = useMemo(() => derivarOpciones(herramientas), [herramientas]);
  const visibles = useMemo(() => filtrar(herramientas, estado), [herramientas, estado]);
  const base = useId();
  const lenguajes = useMemo(() => atajos(herramientas.map((h) => h.lenguaje), estado.lenguaje), [herramientas, estado.lenguaje]);
  const licencias = useMemo(() => atajos(herramientas.map((h) => h.licencia), estado.licencia), [herramientas, estado.licencia]);

  const cambiar = useCallback((parcial: Partial<EstadoFiltros>) => setEstado((e) => ({ ...e, ...parcial })), []);
  const limpiar = useCallback(() => setEstado(ESTADO_SIN_FILTROS), []);
  const quitar = useCallback(
    (clave: string) => {
      if ((CLAVES as readonly string[]).includes(clave)) setEstado((e) => ({ ...e, [clave]: ESTADO_SIN_FILTROS[clave as (typeof CLAVES)[number]] }));
    },
    [],
  );

  // Estado en memoria ⇄ URL (RF-03 f, D-06): replaceState no navega ni va al servidor (RNF-07).
  // Se omite el primer render: el estado inicial ya salió de la URL. La query se serializa siempre con URLSearchParams.
  const primerRender = useRef(true);
  useEffect(() => {
    if (primerRender.current) {
      primerRender.current = false;
      return;
    }
    const query = serializarEstadoUrl(estado);
    const destino = `${window.location.pathname}${query === "" ? "" : `?${query}`}${window.location.hash}`;
    window.history.replaceState(null, "", destino);
  }, [estado]);

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
      {/* «App preview» (ui-brief §11.2 #3): buscador central y explorador de 4 columnas sobre una superficie gris. */}
      <div role="group" aria-label={t("explorador.region")} className="rounded-[2rem] bg-secondary p-3 sm:p-6 lg:p-10">
        <div className="mx-auto max-w-2xl">
          <Buscador valor={estado.q} onBuscar={(q) => cambiar({ q: q.slice(0, LARGO_MAXIMO_BUSQUEDA) })} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-8 rounded-3xl bg-background p-5 shadow-sm sm:mt-6 sm:gap-x-8 sm:p-6 lg:grid-cols-4 lg:p-8">
          <Columna id={`${base}-categorias`} titulo={t("explorador.categorias")}>
            <NavCategorias activa={estado.categoria} onElegir={(categoria: Categoria | null) => cambiar({ categoria })} />
          </Columna>
          <Columna id={`${base}-casos`} titulo={t("explorador.casos")}>
            <CasosDeUso idTitulo={`${base}-casos`} />
          </Columna>
          <Columna id={`${base}-lenguajes`} titulo={t("explorador.lenguajes")}>
            <AtajosFiltro
              idTitulo={`${base}-lenguajes`}
              {...lenguajes}
              activo={estado.lenguaje}
              onElegir={(lenguaje) => cambiar({ lenguaje })}
            />
          </Columna>
          <Columna id={`${base}-licencias`} titulo={t("explorador.licencias")}>
            <AtajosFiltro
              idTitulo={`${base}-licencias`}
              {...licencias}
              activo={estado.licencia}
              onElegir={(licencia) => cambiar({ licencia })}
            />
          </Columna>
        </div>
      </div>
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
