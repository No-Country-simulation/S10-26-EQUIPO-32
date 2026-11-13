// Lógica pura de filtrado (plan 4.5). T16: filtro por categoría; T17 suma los demás filtros y la búsqueda.
import type { Categoria } from "./categorias";

/** Valores de los filtros secundarios (RF-03); `null` = sin filtro. Tipo de ui-brief §8. */
export interface ValoresFiltros {
  lenguaje: string | null;
  licencia: string | null;
  mantenimiento: "activo" | "moderado" | "bajo" | "abandonado" | null;
  /** Entero 0 a 10^7. */
  stars: number | null;
}

/**
 * Una herramienta cumple el filtro si pertenece a la categoría elegida, aunque tenga otras (RF-01 b, RF-03 a).
 * `null` = sin filtro. No modifica la entrada y conserva el orden.
 */
export function filtrarPorCategoria<T extends { categorias: readonly Categoria[] }>(
  herramientas: readonly T[],
  categoria: Categoria | null,
): T[] {
  if (categoria === null) return [...herramientas];
  return herramientas.filter((h) => h.categorias.includes(categoria));
}

/** Estado completo del catálogo: categoría, filtros secundarios y texto de búsqueda (plan 4.4). */
export interface EstadoFiltros extends ValoresFiltros {
  categoria: Categoria | null;
  /** Texto de búsqueda ya normalizado y acotado. Se usa solo como texto: nunca como patrón. */
  q: string;
}

export const ESTADO_SIN_FILTROS: EstadoFiltros = {
  categoria: null,
  lenguaje: null,
  licencia: null,
  mantenimiento: null,
  stars: null,
  q: "",
};

interface Filtrable {
  nombre: string;
  descripcion: string | null;
  categorias: readonly Categoria[];
  lenguaje: string | null;
  licencia: string | null;
  stars: number | null;
  nivelMantenimiento: ValoresFiltros["mantenimiento"];
}

/**
 * Todos los filtros se combinan con AND (RF-03 a). Una herramienta con la métrica en `null` NO cumple el filtro
 * de esa métrica: no se muestra como válido lo que no se sabe (plan 4.5). La búsqueda usa `toLowerCase()` +
 * `includes` sobre nombre y descripción: sin `RegExp`, así la entrada no puede ser un patrón (AM-02, ReDoS).
 */
export function filtrar<T extends Filtrable>(herramientas: readonly T[], estado: EstadoFiltros): T[] {
  const aguja = estado.q.trim().toLowerCase();
  return herramientas.filter((h) => {
    if (estado.categoria !== null && !h.categorias.includes(estado.categoria)) return false;
    if (estado.lenguaje !== null && h.lenguaje !== estado.lenguaje) return false;
    if (estado.licencia !== null && h.licencia !== estado.licencia) return false;
    if (estado.mantenimiento !== null && h.nivelMantenimiento !== estado.mantenimiento) return false;
    if (estado.stars !== null && (h.stars === null || h.stars < estado.stars)) return false;
    if (aguja !== "") {
      const enNombre = h.nombre.toLowerCase().includes(aguja);
      const enDescripcion = h.descripcion !== null && h.descripcion.toLowerCase().includes(aguja);
      if (!enNombre && !enDescripcion) return false;
    }
    return true;
  });
}

/** Valores de lenguaje y licencia presentes en los datos, sin repetir y ordenados (RF-03 b). */
export function derivarOpciones(
  herramientas: readonly { lenguaje: string | null; licencia: string | null }[],
): { lenguajes: string[]; licencias: string[] } {
  const lenguajes = new Set<string>();
  const licencias = new Set<string>();
  for (const h of herramientas) {
    if (h.lenguaje !== null) lenguajes.add(h.lenguaje);
    if (h.licencia !== null) licencias.add(h.licencia);
  }
  const orden = (a: string, b: string) => a.localeCompare(b, "es");
  return { lenguajes: [...lenguajes].sort(orden), licencias: [...licencias].sort(orden) };
}
