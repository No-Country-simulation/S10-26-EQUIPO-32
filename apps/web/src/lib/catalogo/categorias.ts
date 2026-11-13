// Constantes sin dependencias: las usa también el código del navegador (NavCategorias) sin arrastrar zod.
export const CATEGORIAS = [
  "autenticacion",
  "base-de-datos",
  "pagos",
  "ia",
  "analitica",
  "busqueda",
] as const;

export type Categoria = (typeof CATEGORIAS)[number];
