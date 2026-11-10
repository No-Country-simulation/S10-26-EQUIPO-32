// Lógica pura de filtrado (plan 4.5). T16: filtro por categoría; T17 suma los demás filtros y la búsqueda.
import type { Categoria } from "./categorias";

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
