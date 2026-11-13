// Contrato de datos del catálogo (plan 4.2; P5, AM-04, AM-05, AM-10, MU-09, MU-12, R-11).
// Todo dato externo pasa por acá antes de llegar a la interfaz. Reglas:
//  - Identidad inválida (id, nombre, categorías) -> se omite la herramienta.
//  - Métrica, licencia, texto opcional o URL inválidos -> null (la UI dice «Sin dato»).
//  - Idea.revisada: solo el booleano true cuenta; cualquier otra cosa -> false (falla cerrado).
//  - Las claves desconocidas se descartan. Nada se coacciona (el string "5" no es un 5).
import { z } from "zod";
import { CATEGORIAS, type Categoria } from "./categorias";
import { validarUrlRepo } from "./enlaces";
import { normalizarTexto, normalizarTextoLargo } from "./texto";

export { CATEGORIAS };
export const NIVELES_MANTENIMIENTO = ["activo", "moderado", "bajo", "abandonado"] as const;
export type NivelMantenimiento = (typeof NIVELES_MANTENIMIENTO)[number];
/** Componentes del health score del backend y su máximo (spec 001 §10, RF-15). Suman 100. */
export const MAXIMOS_SALUD = { commits: 25, issues: 20, licencia: 20, comunidad: 20, documentacion: 15 } as const;
export type ComponenteSalud = keyof typeof MAXIMOS_SALUD;
export const COMPONENTES_SALUD = Object.keys(MAXIMOS_SALUD) as ComponenteSalud[];
export const TIPOS_IDEA = ["rest", "docker", "sdk", "webhook"] as const;
export type TipoIdea = (typeof TIPOS_IDEA)[number];
export const DIFICULTADES = ["baja", "media", "alta"] as const;

export const COTAS = {
  nombre: 100,
  descripcion: 2000,
  descripcionTarjeta: 300,
  licencia: 64,
  lenguaje: 40,
  disparador: 200,
  snippet: 4000,
  stack: 60,
} as const;
export const MAX_IDEAS = 10;
export const MAX_ITEMS_IDEA = 10;
// Ninguna cota llega cerca de esto: evita trabajar sobre cientos de KB (MU-04).
const LIMITE_ENTRADA = 100_000;
const MAX_VALOR_NUMERICO = 1_000_000_000;
const UN_DIA_MS = 24 * 60 * 60 * 1000;

export type { Categoria };

// ---------- piezas reutilizables ----------

const esString = (v: unknown): v is string => typeof v === "string";
const acotar = (s: string) => (s.length > LIMITE_ENTRADA ? s.slice(0, LIMITE_ENTRADA) : s);

const enumONull = <T extends readonly [string, ...string[]]>(valores: T) =>
  z.enum(valores).nullable().catch(null);

const enteroONull = (max: number) =>
  z.number().int().min(0).max(max).nullable().catch(null);

/** Texto de una línea no vacío, normalizado y cortado a la cota; si no, null. */
const textoONull = (cota: number) =>
  z
    .unknown()
    .transform((v) => (esString(v) ? normalizarTexto(acotar(v), cota) : ""))
    .transform((v) => (v.length > 0 ? v : null))
    .catch(null);

/** Fecha ISO 8601 válida (con Z u offset); si no, null. */
const fechaONull = z.iso.datetime({ offset: true }).nullable().catch(null);

/** Lista de textos cortos: descarta lo que no sea string o quede vacío; máximo MAX_ITEMS_IDEA. */
const listaDeTextos = (cota: number) =>
  z
    .unknown()
    .transform((v) => {
      if (!Array.isArray(v)) return [] as string[];
      const salida: string[] = [];
      for (const item of v.slice(0, MAX_ITEMS_IDEA * 4)) {
        if (salida.length >= MAX_ITEMS_IDEA) break;
        if (!esString(item)) continue;
        const t = normalizarTexto(acotar(item), cota);
        if (t.length > 0) salida.push(t);
      }
      return salida;
    })
    .catch([] as string[]);

/** Texto largo (conserva \n y \t) cortado a `cota`; informa si hubo recorte. */
function textoLargoConRecorte(v: unknown, cota: number): { texto: string | null; recortado: boolean } {
  if (!esString(v)) return { texto: null, recortado: false };
  const entradaRecortada = v.length > LIMITE_ENTRADA;
  const completo = normalizarTextoLargo(acotar(v), Number.MAX_SAFE_INTEGER);
  const largo = Array.from(completo).length;
  const texto = normalizarTextoLargo(completo, cota);
  if (texto.trim().length === 0) return { texto: null, recortado: false };
  return { texto, recortado: entradaRecortada || largo > cota };
}

// ---------- Idea ----------

export const esquemaIdea = z
  .object({
    tipo: enumONull(TIPOS_IDEA),
    disparadores: listaDeTextos(COTAS.disparador),
    snippet: z.unknown().optional(),
    stack: listaDeTextos(COTAS.stack),
    dificultad: enumONull(DIFICULTADES),
    revisada: z.unknown().optional(),
  })
  .transform((idea) => {
    const { texto, recortado } = textoLargoConRecorte(idea.snippet, COTAS.snippet);
    return {
      tipo: idea.tipo,
      disparadores: idea.disparadores,
      snippet: texto,
      snippetExcedeLimite: recortado,
      stack: idea.stack,
      dificultad: idea.dificultad,
      revisada: idea.revisada === true,
    };
  });
export type Idea = z.output<typeof esquemaIdea>;

// ---------- Herramienta ----------

const esquemaId = z.string().regex(/^[a-z0-9][a-z0-9._-]{0,99}$/);

/** Forma válida de un `id` (ASCII estricto). La usan los adaptadores antes de buscar por id. */
export function esIdValido(id: unknown): id is string {
  return esquemaId.safeParse(id).success;
}

const esquemaNombre = z
  .string()
  .transform((s) => normalizarTexto(acotar(s), COTAS.nombre))
  .refine((s) => s.length >= 1);

const esquemaCategorias = z
  .array(z.unknown())
  .transform((valores) => {
    const vistas = new Set<Categoria>();
    for (const v of valores.slice(0, 50)) {
      if (typeof v === "string" && (CATEGORIAS as readonly string[]).includes(v)) {
        vistas.add(v as Categoria);
      }
    }
    return CATEGORIAS.filter((c) => vistas.has(c));
  })
  .refine((c) => c.length >= 1);

const base = {
  id: esquemaId,
  nombre: esquemaNombre,
  categorias: esquemaCategorias,
  urlRepo: z.unknown().optional().transform((v) => validarUrlRepo(v)),
  descripcion: z.unknown().optional(),
  stars: enteroONull(MAX_VALOR_NUMERICO),
  ultimaActualizacion: fechaONull,
  licencia: textoONull(COTAS.licencia),
  lenguaje: textoONull(COTAS.lenguaje),
  issuesAbiertos: enteroONull(MAX_VALOR_NUMERICO),
  mantenedorActivo: z.boolean().nullable().catch(null),
  nivelMantenimiento: enumONull(NIVELES_MANTENIMIENTO),
  healthScore: enteroONull(100),
  metricasTomadasEn: fechaONull,
};

function conDescripcion(cota: number) {
  return (h: { descripcion?: unknown }) => {
    const { texto, recortado } = textoLargoConRecorte(h.descripcion, cota);
    return { descripcion: texto, descripcionTruncada: recortado };
  };
}

/**
 * Versión liviana para la grilla: sin ideas y con la descripción cortada a 300. Conserva solo los TIPOS de las
 * ideas válidas (`tiposIdea`, sin repetir): es lo único que necesita el filtro «Casos de uso» y no lleva snippets.
 */
export const esquemaHerramientaLista = z.object({ ...base, ideas: z.unknown().optional(), tiposIdea: z.unknown().optional() }).transform(({ ideas, tiposIdea, ...h }) => {
  const tipos = new Set<(typeof TIPOS_IDEA)[number]>();
  if (Array.isArray(ideas)) {
    for (const crudo of ideas.slice(0, MAX_IDEAS)) {
      const r = esquemaIdea.safeParse(crudo);
      if (r.success && r.data.tipo !== null) tipos.add(r.data.tipo);
    }
  } else if (Array.isArray(tiposIdea)) {
    // Idempotencia: una lista ya validada (sin ideas) trae sus tipos; se revalidan contra la lista cerrada.
    for (const v of tiposIdea.slice(0, TIPOS_IDEA.length)) if ((TIPOS_IDEA as readonly unknown[]).includes(v)) tipos.add(v as (typeof TIPOS_IDEA)[number]);
  }
  return { ...h, ...conDescripcion(COTAS.descripcionTarjeta)(h), tiposIdea: TIPOS_IDEA.filter((t) => tipos.has(t)) };
});
export type HerramientaLista = z.output<typeof esquemaHerramientaLista>;
/** Nombre que usa ui-brief §8 para la versión liviana de la grilla. */
export type HerramientaResumen = HerramientaLista;

const esquemaIdeas = z
  .unknown()
  .transform((v) => {
    if (!Array.isArray(v)) return [] as Idea[];
    const salida: Idea[] = [];
    for (const crudo of v.slice(0, MAX_IDEAS)) {
      const r = esquemaIdea.safeParse(crudo);
      if (r.success) salida.push(r.data);
    }
    return salida;
  })
  .catch([] as Idea[]);

const puntosSalud = (maximo: number) => z.number().min(0).max(maximo);
/**
 * Desglose del health score (RF-15). Todo o nada: si un componente es inválido (no numérico, negativo o mayor
 * que su máximo) o falta, el desglose entero es null y la UI dice «Sin dato». Nunca se muestra uno parcial.
 */
const esquemaDesgloseSalud = z
  .object({
    commits: puntosSalud(MAXIMOS_SALUD.commits),
    issues: puntosSalud(MAXIMOS_SALUD.issues),
    licencia: puntosSalud(MAXIMOS_SALUD.licencia),
    comunidad: puntosSalud(MAXIMOS_SALUD.comunidad),
    documentacion: puntosSalud(MAXIMOS_SALUD.documentacion),
    penalizacionArchivado: z.boolean(),
  })
  .nullable()
  .catch(null);
export type DesgloseSalud = NonNullable<z.output<typeof esquemaDesgloseSalud>>;

/** Valida un desglose suelto (lo usa el adaptador backend para derivar el nivel de mantenimiento con el mismo criterio). */
export function parsearDesgloseSalud(crudo: unknown): DesgloseSalud | null {
  return esquemaDesgloseSalud.parse(crudo);
}

/** Detalle: descripción completa (hasta 2000), ideas (máximo 10) y desglose de salud. */
export const esquemaHerramientaDetalle = z
  .object({ ...base, ideas: esquemaIdeas, desgloseSalud: esquemaDesgloseSalud })
  .transform((h) => ({ ...h, ...conDescripcion(COTAS.descripcion)(h) }));
export type HerramientaDetalle = z.output<typeof esquemaHerramientaDetalle>;

// ---------- API pública ----------

type ConFechas = { ultimaActualizacion: string | null };

/** Una fecha de última actualización posterior a «ahora + 1 día» es inválida (plan 4.2). */
function sinFechaFutura<T extends ConFechas>(h: T, ahora: Date): T {
  if (h.ultimaActualizacion === null) return h;
  const t = Date.parse(h.ultimaActualizacion);
  return Number.isNaN(t) || t > ahora.getTime() + UN_DIA_MS ? { ...h, ultimaActualizacion: null } : h;
}

/** Devuelve la herramienta (versión lista) o null si falla la identidad. */
export function parsearHerramientaLista(crudo: unknown, ahora: Date = new Date()): HerramientaLista | null {
  const r = esquemaHerramientaLista.safeParse(crudo);
  return r.success ? sinFechaFutura(r.data, ahora) : null;
}

/** Devuelve la herramienta (versión detalle) o null si falla la identidad. */
export function parsearHerramientaDetalle(crudo: unknown, ahora: Date = new Date()): HerramientaDetalle | null {
  const r = esquemaHerramientaDetalle.safeParse(crudo);
  return r.success ? sinFechaFutura(r.data, ahora) : null;
}

export interface ResultadoLista {
  herramientas: HerramientaLista[];
  /** Herramientas descartadas (identidad inválida o `id` repetido). El detalle va al log del servidor. */
  omitidas: number;
}

/** Valida una lista cruda. Una entrada inválida o con `id` repetido se omite y se cuenta. */
export function parsearLista(crudo: unknown, ahora: Date = new Date()): ResultadoLista {
  if (!Array.isArray(crudo)) throw new TypeError("La respuesta del catálogo no es una lista.");
  const herramientas: HerramientaLista[] = [];
  const ids = new Set<string>();
  let omitidas = 0;
  for (const item of crudo) {
    const h = parsearHerramientaLista(item, ahora);
    if (h === null || ids.has(h.id)) {
      omitidas += 1;
      continue;
    }
    ids.add(h.id);
    herramientas.push(h);
  }
  return { herramientas, omitidas };
}
