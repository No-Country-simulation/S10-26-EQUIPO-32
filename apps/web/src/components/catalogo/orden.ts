// Orden de presentación de la grilla (ui-brief §11.2 #4). Solo reordena en memoria: no filtra, no va a la URL
// ni al servidor. Los `null` (o fechas inválidas) quedan al final: no se presenta como reciente o sano lo que no se sabe.
export const ORDENES = ["recientes", "salud"] as const;
export type Orden = (typeof ORDENES)[number];

interface Ordenable {
  ultimaActualizacion: string | null;
  healthScore: number | null;
}

function clave(h: Ordenable, orden: Orden): number {
  if (orden === "salud") return h.healthScore ?? Number.NEGATIVE_INFINITY;
  const ms = h.ultimaActualizacion === null ? Number.NaN : Date.parse(h.ultimaActualizacion);
  return Number.isNaN(ms) ? Number.NEGATIVE_INFINITY : ms;
}

/** Copia ordenada de mayor a menor; los empates conservan el orden original (sort estable). */
export function ordenar<T extends Ordenable>(herramientas: readonly T[], orden: Orden): T[] {
  return [...herramientas].sort((a, b) => {
    const x = clave(a, orden);
    const y = clave(b, orden);
    if (x === y) return 0;
    return y > x ? 1 : -1;
  });
}
