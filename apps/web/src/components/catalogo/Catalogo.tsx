"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { Categoria } from "@/lib/catalogo/categorias";
import { TIPOS_IDEA, type HerramientaResumen, type TipoIdea } from "@/lib/catalogo/contrato";
import { serializarEstadoUrl } from "@/lib/catalogo/estado-url";
import { derivarOpciones, ESTADO_SIN_FILTROS, filtrar, type EstadoFiltros, type ValoresFiltros } from "@/lib/catalogo/filtros";
import { t } from "@/i18n/es";
import { Buscador, LARGO_MAXIMO_BUSQUEDA } from "./Buscador";
import { ChipsFiltros } from "./ChipsFiltros";
import { AtajosFiltro, CasosDeUso, Columna, type AtajoFiltro } from "./ColumnasCatalogo";
import { GrillaHerramientas } from "./GrillaHerramientas";
import { NavCategorias } from "./NavCategorias";
import { ordenar, type Orden } from "./orden";
import { TabsOrden } from "./TabsOrden";
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
  if (estado.caso !== null) chips.push({ clave: "caso", etiqueta: `${t("explorador.casos")}: ${t(`idea.tipo.${estado.caso}`)}` });
  if (estado.stars !== null) chips.push({ clave: "stars", etiqueta: `${t("chip.stars")} ${estado.stars}` });
  if (estado.q !== "") chips.push({ clave: "q", etiqueta: `${t("chip.busqueda")}: ${estado.q}` });
  return chips;
}

const MAX_ATAJOS = 8;

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

const CLAVES = ["categoria", "lenguaje", "licencia", "mantenimiento", "caso", "stars", "q"] as const;

/** Estado en memoria del catálogo (categoría, filtros y búsqueda), reflejado en la URL con `history.replaceState`. */
export function Catalogo({ herramientas, estadoInicial = ESTADO_SIN_FILTROS }: CatalogoProps) {
  const [estado, setEstado] = useState<EstadoFiltros>(estadoInicial);
  const opciones = useMemo(() => derivarOpciones(herramientas), [herramientas]);
  const visibles = useMemo(() => filtrar(herramientas, estado), [herramientas, estado]);
  const base = useId();
  const [orden, setOrden] = useState<Orden>("recientes");
  const ordenadas = useMemo(() => ordenar(visibles, orden), [visibles, orden]);
  const lenguajes = useMemo(() => atajos(herramientas.map((h) => h.lenguaje), estado.lenguaje), [herramientas, estado.lenguaje]);
  const licencias = useMemo(() => atajos(herramientas.map((h) => h.licencia), estado.licencia), [herramientas, estado.licencia]);

  const casos = useMemo(
    () => Object.fromEntries(TIPOS_IDEA.map((tipo) => [tipo, herramientas.filter((h) => h.tiposIdea.includes(tipo)).length])) as Record<TipoIdea, number>,
    [herramientas],
  );

  // Feedback (feature 008): al buscar (con debounce), apretar Enter o elegir un ítem, scroll suave hasta la grilla.
  // Con prefers-reduced-motion el desplazamiento es instantáneo.
  const destinoGrilla = useRef<HTMLDivElement>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const irALaGrilla = useCallback(() => {
    if (temporizador.current !== null) clearTimeout(temporizador.current);
    temporizador.current = null;
    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    destinoGrilla.current?.scrollIntoView({ behavior: quieto ? "auto" : "smooth", block: "start" });
  }, []);
  useEffect(() => () => {
    if (temporizador.current !== null) clearTimeout(temporizador.current);
  }, []);

  const cambiar = useCallback((parcial: Partial<EstadoFiltros>) => setEstado((e) => ({ ...e, ...parcial })), []);
  /** Elegir un ítem del explorador: aplica el filtro y lleva a la grilla. */
  const elegir = useCallback(
    (parcial: Partial<EstadoFiltros>) => {
      cambiar(parcial);
      irALaGrilla();
    },
    [cambiar, irALaGrilla],
  );
  const buscar = useCallback(
    (q: string) => {
      cambiar({ q: q.slice(0, LARGO_MAXIMO_BUSQUEDA) });
      if (temporizador.current !== null) clearTimeout(temporizador.current);
      temporizador.current = q.trim() === "" ? null : setTimeout(irALaGrilla, 600);
    },
    [cambiar, irALaGrilla],
  );
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
          <Buscador valor={estado.q} onBuscar={buscar} onEnter={irALaGrilla} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-8 rounded-3xl bg-background p-5 shadow-sm sm:mt-6 sm:gap-x-8 sm:p-6 lg:grid-cols-4 lg:p-8">
          <Columna id={`${base}-categorias`} titulo={t("explorador.categorias")}>
            <NavCategorias activa={estado.categoria} onElegir={(categoria: Categoria | null) => elegir({ categoria })} />
          </Columna>
          <Columna id={`${base}-casos`} titulo={t("explorador.casos")}>
            <CasosDeUso idTitulo={`${base}-casos`} activo={estado.caso} conteos={casos} onElegir={(caso) => elegir({ caso })} />
          </Columna>
          <Columna id={`${base}-lenguajes`} titulo={t("explorador.lenguajes")}>
            <AtajosFiltro
              idTitulo={`${base}-lenguajes`}
              {...lenguajes}
              activo={estado.lenguaje}
              onElegir={(lenguaje) => elegir({ lenguaje })}
            />
          </Columna>
          <Columna id={`${base}-licencias`} titulo={t("explorador.licencias")}>
            <AtajosFiltro
              idTitulo={`${base}-licencias`}
              {...licencias}
              activo={estado.licencia}
              onElegir={(licencia) => elegir({ licencia })}
            />
          </Columna>
        </div>
      </div>
      {/* Tabs y grilla (ui-brief §11.2 #4): el orden es solo de presentación. */}
      {/* El contador de resultados vive en PanelFiltros (ui-brief §8). */}
      <div ref={destinoGrilla} className="scroll-mt-28 pt-10">
        <TabsOrden base={base} activo={orden} onCambiar={setOrden} />
      </div>
      <PanelFiltros opciones={opciones} valores={valores} total={visibles.length} onCambiar={cambiar} />
      <ChipsFiltros activos={activos} onQuitar={quitar} onLimpiar={limpiar} />
      {/* La clave reinicia la animación de entrada al cambiar de tab (ui-brief §12.2 #5b). */}
      <div key={orden} className="ob-aparecer">
      <GrillaHerramientas
        herramientas={ordenadas}
        total={visibles.length}
        panel={{ id: `${base}-panel`, idTab: `${base}-tab-${orden}` }}
        vacio={{
          // La búsqueda se muestra como texto (React la escapa); nunca como HTML.
          texto: sinResultadosPorBusqueda ? `${t("vacio.paraBusqueda")} «${estado.q}».` : undefined,
          accion: activos.length > 0 ? { etiqueta: t("vacio.limpiar"), onClick: limpiar } : undefined,
        }}
      />
      </div>
    </div>
  );
}
