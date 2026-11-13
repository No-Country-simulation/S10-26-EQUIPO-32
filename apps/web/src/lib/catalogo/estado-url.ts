// Estado del catálogo en la URL (plan 4.4; RF-03 f, MU-05, MU-06, AM-02).
// TODO valor de la URL es no confiable: se valida acá, en el servidor (render inicial) y en el cliente.
import { CATEGORIAS } from "./categorias";
import { NIVELES_MANTENIMIENTO } from "./contrato";
import type { EstadoFiltros } from "./filtros";
import { normalizarTexto } from "./texto";

export const LARGO_MAXIMO_Q = 100;
const LARGO_MAXIMO_VALOR = 64;
const STARS_MAXIMO = 10_000_000;
/** Cota defensiva antes de normalizar: una `q` enorme no se procesa entera. */
const ENTRADA_MAXIMA_Q = 10_000;

export type FuenteParametros =
  | URLSearchParams
  | Record<string, string | readonly string[] | undefined>;

export interface OpcionesValidas {
  /** Valores presentes en los datos: un `lenguaje` o `licencia` fuera de esta lista se ignora. */
  lenguajes: readonly string[];
  licencias: readonly string[];
}

/** Primer valor del parámetro (los repetidos se ignoran). */
function primero(fuente: FuenteParametros, clave: string): string | undefined {
  if (fuente instanceof URLSearchParams) return fuente.get(clave) ?? undefined;
  if (!Object.hasOwn(fuente, clave)) return undefined;
  const v = fuente[clave];
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return undefined;
}

function deLista(valor: string | undefined, validos: readonly string[]): string | null {
  if (valor === undefined || valor.length === 0 || valor.length > LARGO_MAXIMO_VALOR) return null;
  return validos.includes(valor) ? valor : null;
}

/**
 * Parseo validado según el plan 4.4: lo inválido se ignora (la herramienta nunca recibe un valor sin validar);
 * `q` es la excepción, que se recorta a 100 caracteres tras normalizarla como texto.
 */
export function parsearEstadoUrl(fuente: FuenteParametros, opciones: OpcionesValidas): EstadoFiltros {
  const categoria = primero(fuente, "categoria");
  const mantenimiento = primero(fuente, "mantenimiento");
  const stars = primero(fuente, "stars");
  const q = primero(fuente, "q");
  return {
    categoria: (CATEGORIAS as readonly string[]).includes(categoria ?? "")
      ? (categoria as EstadoFiltros["categoria"])
      : null,
    lenguaje: deLista(primero(fuente, "lenguaje"), opciones.lenguajes),
    licencia: deLista(primero(fuente, "licencia"), opciones.licencias),
    mantenimiento: (NIVELES_MANTENIMIENTO as readonly string[]).includes(mantenimiento ?? "")
      ? (mantenimiento as EstadoFiltros["mantenimiento"])
      : null,
    stars: stars !== undefined && /^\d{1,8}$/.test(stars) && Number(stars) <= STARS_MAXIMO ? Number(stars) : null,
    q: q === undefined ? "" : normalizarTexto(q.slice(0, ENTRADA_MAXIMA_Q), LARGO_MAXIMO_Q),
  };
}

/** Query string (sin «?») solo con los filtros activos. Siempre con URLSearchParams, nunca concatenando. */
export function serializarEstadoUrl(estado: EstadoFiltros): string {
  const p = new URLSearchParams();
  if (estado.categoria !== null) p.set("categoria", estado.categoria);
  if (estado.lenguaje !== null) p.set("lenguaje", estado.lenguaje);
  if (estado.licencia !== null) p.set("licencia", estado.licencia);
  if (estado.mantenimiento !== null) p.set("mantenimiento", estado.mantenimiento);
  if (estado.stars !== null) p.set("stars", String(estado.stars));
  if (estado.q !== "") p.set("q", estado.q);
  return p.toString();
}
