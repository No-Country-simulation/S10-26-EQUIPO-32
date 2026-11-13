// Adaptador de solo lectura contra la API REST del backend (spec 001 §10, plan §9, spec 005; RF-15, RF-19, RNF-24, RNF-28, AM-30..33, AM-35).
// El backend es una fuente NO confiable (P5): cada respuesta pasa por un sobre con zod y luego por contrato.ts.
// Falla cerrado: respuesta malformada, lenta, redirigida o backend caído → ErrorCatalogo, nunca datos inventados
// ni de otra fuente. En runtime no se envía ninguna credencial: solo endpoints públicos de lectura (P3).
import { z } from "zod";
import datosReales from "../../../../data/repos-reales.json";
import {
  esIdValido,
  parsearDesgloseSalud,
  parsearHerramientaDetalle,
  parsearLista,
  type DesgloseSalud,
  type HerramientaDetalle,
  type NivelMantenimiento,
  type ResultadoLista,
} from "../contrato";
import { ErrorCatalogo, ErrorConfiguracion, type RepositorioCatalogo } from "../repositorio";

export const TIMEOUT_BACKEND_MS = 3000;
export const MAX_RESPUESTA_BYTES = 1_000_000;
/** Vida de la instantánea de la lista y de cada desglose: acota los requests contra el límite de 60/min del backend (AM-35). */
export const VIDA_INSTANTANEA_MS = 60_000;
const LIMITE_LISTA = 100;

export type Fetch = (url: string, init: RequestInit) => Promise<Response>;

export interface OpcionesBackend {
  baseUrl: string;
  fetchFn?: Fetch;
  timeoutMs?: number;
  ahora?: () => number;
}

// ---------- configuración (AM-26 análogo) ----------

/** `BACKEND_URL`: solo de servidor, http(s), sin credenciales, ruta, query ni fragmento. Sin valor por defecto. */
export function resolverBackendUrl(env: Record<string, string | undefined>): string {
  const valor = env.BACKEND_URL?.trim();
  if (valor === undefined || valor === "") {
    throw new ErrorConfiguracion("CATALOG_SOURCE=backend requiere BACKEND_URL (variable de servidor).");
  }
  let url: URL;
  try {
    url = new URL(valor);
  } catch {
    throw new ErrorConfiguracion("BACKEND_URL no es una URL válida.");
  }
  const valida =
    (url.protocol === "http:" || url.protocol === "https:") &&
    url.username === "" &&
    url.password === "" &&
    url.pathname === "/" &&
    url.search === "" &&
    url.hash === "";
  if (!valida) throw new ErrorConfiguracion("BACKEND_URL debe ser un origen http(s) sin credenciales, ruta ni query.");
  return url.origin;
}

// ---------- cliente HTTP: solo GET, sin credenciales, sin redirecciones ----------

class FalloBackend extends Error {
  constructor(readonly codigo: string) {
    super(codigo);
    this.name = "FalloBackend";
  }
}

async function leerConLimite(r: Response): Promise<string> {
  const declarado = Number(r.headers.get("content-length") ?? "0");
  if (declarado > MAX_RESPUESTA_BYTES) throw new FalloBackend("tamano");
  if (r.body === null) return "";
  const lector = r.body.getReader();
  const partes: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_RESPUESTA_BYTES) {
      await lector.cancel();
      throw new FalloBackend("tamano");
    }
    partes.push(value);
  }
  const todo = new Uint8Array(total);
  let i = 0;
  for (const p of partes) {
    todo.set(p, i);
    i += p.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(todo);
}

/** GET de JSON. Devuelve `null` solo ante un 404 cuando `permitir404` (repo inexistente). */
async function obtenerJson(url: string, fetchFn: Fetch, timeoutMs: number, permitir404 = false): Promise<unknown> {
  let r: Response;
  try {
    r = await fetchFn(url, {
      method: "GET",
      redirect: "error", // una redirección no se sigue (AM-32, MU-24)
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: "application/json" }, // sin Authorization (AM-33)
      cache: "no-store",
    });
  } catch (e) {
    throw new FalloBackend(e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError") ? "timeout" : "red");
  }
  if (permitir404 && r.status === 404) return null;
  if (r.status !== 200) throw new FalloBackend(`http-${r.status}`);
  if (!(r.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) throw new FalloBackend("tipo");
  let texto: string;
  try {
    texto = await leerConLimite(r);
  } catch (e) {
    throw e instanceof FalloBackend ? e : new FalloBackend(e instanceof Error && e.name === "TimeoutError" ? "timeout" : "cuerpo");
  }
  try {
    return JSON.parse(texto);
  } catch {
    throw new FalloBackend("json");
  }
}

// ---------- sobres y mapeo al contrato ----------

const FULL_NAME = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9._-]{1,100}$/;
const sobreLista = z.object({ items: z.array(z.unknown()).max(LIMITE_LISTA), total: z.number().int().min(0).optional().catch(undefined) });
const sobreDetalle = z.object({ repository: z.object({ full_name: z.string() }).passthrough(), health_breakdown: z.unknown() });
type Registro = Record<string, unknown>;

// Datos curados de data/repos-reales.json por `full_name` (sin distinguir mayúsculas):
//  - el id del asistente, para que sus enlaces a /herramientas/{id} sigan valiendo (D-28);
//  - el nombre del producto («Prisma» en vez de «orm»; spec 001 §10.3). Sin entrada → id derivado y nombre del backend.
const CURADOS_POR_FULL_NAME = new Map<string, { id: string; nombre: string }>(
  (datosReales as Array<{ id: string; nombre: string; urlRepo: string }>).map((r) => [
    r.urlRepo.replace("https://github.com/", "").toLowerCase(),
    { id: r.id, nombre: r.nombre },
  ]),
);

function fullNameDe(item: unknown): string | null {
  const v = (item as Registro | null)?.full_name;
  return typeof v === "string" && FULL_NAME.test(v) ? v : null;
}

/** id del contrato para un `owner/repo`; `null` si no da un id válido (el contrato lo omitirá). */
export function idPara(fullName: string): string | null {
  const id = CURADOS_POR_FULL_NAME.get(fullName.toLowerCase())?.id ?? fullName.toLowerCase().replace("/", "--");
  return esIdValido(id) ? id : null;
}

/** 25 → activo; ≥ 15 → moderado; < 15 → bajo (docs/mapeo-backend.md). Sin desglose válido → null. */
export function nivelPorCommits(desglose: DesgloseSalud | null): NivelMantenimiento | null {
  if (desglose === null) return null;
  if (desglose.commits >= 25) return "activo";
  if (desglose.commits >= 15) return "moderado";
  return "bajo";
}

function desgloseDe(breakdown: unknown): DesgloseSalud | null {
  const b = breakdown as Registro | null;
  if (b === null || typeof b !== "object") return null;
  return parsearDesgloseSalud({
    commits: b.commit_frequency_score,
    issues: b.issue_resolution_score,
    licencia: b.license_score,
    comunidad: b.community_score,
    documentacion: b.documentation_score,
    penalizacionArchivado: b.penalty_archived,
  });
}

/** Nombre a mostrar: el curado si el repo está en data/repos-reales.json; si no, el del backend (lo valida el contrato). */
export function nombrePara(fullName: string, nombreBackend: unknown): unknown {
  return CURADOS_POR_FULL_NAME.get(fullName.toLowerCase())?.nombre ?? nombreBackend;
}

/** Mapea un ítem del backend a la forma cruda del contrato. Nada se coacciona: lo inválido lo anula contrato.ts. */
function mapear(item: Registro, id: string, fullName: string, desglose: DesgloseSalud | null, calculadoEn: unknown): Registro {
  const salud = item.health_score;
  return {
    id,
    nombre: nombrePara(fullName, item.name),
    urlRepo: item.html_url,
    descripcion: item.description,
    categorias: typeof item.category === "string" ? [item.category] : item.category,
    stars: item.stars_count,
    issuesAbiertos: item.open_issues_count,
    licencia: item.license_spdx === "NOASSERTION" ? null : item.license_spdx,
    lenguaje: item.language,
    healthScore: typeof salud === "number" && Number.isFinite(salud) && salud >= 0 && salud <= 100 ? Math.round(salud) : salud,
    nivelMantenimiento: nivelPorCommits(desglose),
    metricasTomadasEn: calculadoEn ?? item.updated_at,
    // Sin dato en el backend (spec 001 §10.3): última actualización, mantenedor activo e ideas.
    ultimaActualizacion: null,
    mantenedorActivo: null,
    ideas: [],
    desgloseSalud: desglose,
  };
}

// ---------- adaptador ----------

/** Páginas de la lista como máximo (100 ítems cada una, el tope del backend): hasta 300 repos. */
export const MAX_PAGINAS = 3;
/**
 * Presupuesto de desgloses por minuto y por instancia (RNF-28, R-21). La grilla gasta ⌈N/100⌉ requests (2 con 108
 * repos); con 50 desgloses el total queda por debajo de los 60/min del backend. Agotado el presupuesto, la ficha se
 * sirve sin desglose («Sin dato»), nunca con datos inventados ni con un error.
 */
export const PRESUPUESTO_DETALLES_POR_MINUTO = 50;

interface EntradaLista {
  item: Registro;
  fullName: string;
}

interface Instantanea {
  lista: ResultadoLista;
  porId: Map<string, EntradaLista>;
}

interface Desglose {
  desglose: DesgloseSalud | null;
  calculadoEn: unknown;
}

export class AdaptadorBackend implements RepositorioCatalogo {
  private instantanea: { expira: number; promesa: Promise<Instantanea> } | null = null;
  private readonly detalles = new Map<string, { expira: number; promesa: Promise<Desglose> }>();
  private pedidosDetalle: number[] = [];

  constructor(private readonly opciones: OpcionesBackend) {}

  /** Grilla (RF-19): solo la lista paginada; el health score viene en cada ítem. No pide ningún desglose. */
  async listarHerramientas(): Promise<ResultadoLista> {
    return (await this.#obtenerInstantanea()).lista;
  }

  /** Ficha: el ítem de la lista (en caché) más un único pedido de su desglose, también en caché 60 s. */
  async obtenerHerramienta(id: string): Promise<HerramientaDetalle | null> {
    if (!esIdValido(id)) return null;
    const entrada = (await this.#obtenerInstantanea()).porId.get(id);
    if (entrada === undefined) return null;
    const { desglose, calculadoEn } = await this.#obtenerDesglose(id, entrada.fullName);
    return parsearHerramientaDetalle(mapear(entrada.item, id, entrada.fullName, desglose, calculadoEn));
  }

  #ahora(): number {
    return (this.opciones.ahora ?? Date.now)();
  }

  /** Caché con promesa compartida: un error nunca queda guardado y el fallo de una entrada vieja no borra la vigente. */
  #conCache<T>(
    leer: () => { expira: number; promesa: Promise<T> } | null | undefined,
    guardar: (v: { expira: number; promesa: Promise<T> } | null) => void,
    construir: () => Promise<T>,
  ): Promise<T> {
    const ahora = this.#ahora();
    const vigente = leer();
    if (vigente && ahora < vigente.expira) return vigente.promesa;
    const promesa: Promise<T> = construir().catch((e: unknown) => {
      if (leer()?.promesa === promesa) guardar(null);
      const codigo = e instanceof FalloBackend ? e.codigo : "interno";
      console.error(`[catalogo] backend: ${codigo}`); // solo un código, nunca contenido externo (A09)
      throw new ErrorCatalogo({ cause: e });
    });
    guardar({ expira: ahora + VIDA_INSTANTANEA_MS, promesa });
    return promesa;
  }

  #obtenerInstantanea(): Promise<Instantanea> {
    return this.#conCache(
      () => this.instantanea,
      (v) => (this.instantanea = v),
      () => this.#construirLista(),
    );
  }

  #obtenerDesglose(id: string, fullName: string): Promise<Desglose> {
    const vigente = this.detalles.get(id);
    if (vigente && this.#ahora() < vigente.expira) return vigente.promesa;
    if (!this.#hayPresupuesto()) return Promise.resolve({ desglose: null, calculadoEn: undefined });
    return this.#conCache(
      () => this.detalles.get(id),
      (v) => (v === null ? this.detalles.delete(id) : this.detalles.set(id, v)),
      () => this.#pedirDesglose(fullName),
    );
  }

  #hayPresupuesto(): boolean {
    const ahora = this.#ahora();
    this.pedidosDetalle = this.pedidosDetalle.filter((t) => ahora - t < 60_000);
    if (this.pedidosDetalle.length >= PRESUPUESTO_DETALLES_POR_MINUTO) {
      console.warn("[catalogo] backend: presupuesto de desgloses agotado; ficha sin desglose");
      return false;
    }
    this.pedidosDetalle.push(ahora);
    return true;
  }

  async #pedirDesglose(fullName: string): Promise<Desglose> {
    const { baseUrl, fetchFn = fetch, timeoutMs = TIMEOUT_BACKEND_MS } = this.opciones;
    const [owner, repo] = fullName.split("/") as [string, string];
    const url = `${baseUrl}/api/v1/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
    const json = await obtenerJson(url, fetchFn, timeoutMs, true);
    if (json === null) return { desglose: null, calculadoEn: undefined };
    const d = sobreDetalle.safeParse(json);
    if (!d.success || d.data.repository.full_name !== fullName) throw new FalloBackend("sobre-detalle");
    const b = d.data.health_breakdown as Registro | null;
    return { desglose: desgloseDe(b), calculadoEn: b !== null && typeof b === "object" ? b.calculated_at : undefined };
  }

  async #construirLista(): Promise<Instantanea> {
    const { baseUrl, fetchFn = fetch, timeoutMs = TIMEOUT_BACKEND_MS } = this.opciones;
    const items: unknown[] = [];
    for (let pagina = 0; pagina < MAX_PAGINAS; pagina += 1) {
      const offset = pagina * LIMITE_LISTA;
      const crudo = await obtenerJson(`${baseUrl}/api/v1/repositories?limit=${LIMITE_LISTA}&offset=${offset}`, fetchFn, timeoutMs);
      const sobre = sobreLista.safeParse(crudo);
      if (!sobre.success) throw new FalloBackend("sobre-lista");
      items.push(...sobre.data.items);
      const total = sobre.data.total;
      // Sin `total` confiable, una página incompleta es la última.
      const hayMas = total === undefined ? sobre.data.items.length === LIMITE_LISTA : offset + LIMITE_LISTA < total;
      if (!hayMas || sobre.data.items.length === 0) break;
      if (pagina === MAX_PAGINAS - 1) console.warn(`[catalogo] backend: más de ${MAX_PAGINAS * LIMITE_LISTA} repos; se muestran los primeros`);
    }

    const porId = new Map<string, EntradaLista>();
    const crudos = items.map((item) => {
      const fullName = fullNameDe(item);
      const id = fullName === null ? null : idPara(fullName);
      // Los ítems sin identidad válida entran como {} para que el contrato los cuente en `omitidas`.
      if (fullName === null || id === null) return {};
      if (!porId.has(id)) porId.set(id, { item: item as Registro, fullName });
      // En la grilla no hay desglose: nivel de mantenimiento «Sin dato» con esta fuente (docs/mapeo-backend.md).
      return mapear(item as Registro, id, fullName, null, undefined);
    });
    const lista = parsearLista(crudos);
    if (lista.omitidas > 0) console.warn(`[catalogo] ${lista.omitidas} herramienta(s) del backend omitida(s) por el contrato.`);
    return { lista, porId };
  }
}

export function crearAdaptadorBackend(env: Record<string, string | undefined> = process.env): RepositorioCatalogo {
  return new AdaptadorBackend({ baseUrl: resolverBackendUrl(env) });
}
