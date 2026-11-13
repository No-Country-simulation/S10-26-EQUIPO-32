// Adaptador de solo lectura contra la API REST del backend (spec 001 §10, plan §9; RF-15, RNF-24, AM-30..33, AM-35).
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
/** Vida de la instantánea (lista + desgloses): acota los requests contra el límite de 60/min del backend (AM-35). */
export const VIDA_INSTANTANEA_MS = 60_000;
const LIMITE_LISTA = 100;
const CONCURRENCIA_DETALLES = 6;

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
const sobreLista = z.object({ items: z.array(z.unknown()).max(LIMITE_LISTA) });
const sobreDetalle = z.object({ repository: z.object({ full_name: z.string() }).passthrough(), health_breakdown: z.unknown() });
type Registro = Record<string, unknown>;

// Los ids del asistente (data/repos-reales.json) se reutilizan para que sus enlaces a /herramientas/{id} sigan valiendo (D-28).
const ID_POR_FULL_NAME = new Map<string, string>(
  (datosReales as Array<{ id: string; urlRepo: string }>).map((r) => [r.urlRepo.replace("https://github.com/", "").toLowerCase(), r.id]),
);

function fullNameDe(item: unknown): string | null {
  const v = (item as Registro | null)?.full_name;
  return typeof v === "string" && FULL_NAME.test(v) ? v : null;
}

/** id del contrato para un `owner/repo`; `null` si no da un id válido (el contrato lo omitirá). */
export function idPara(fullName: string): string | null {
  const id = ID_POR_FULL_NAME.get(fullName.toLowerCase()) ?? fullName.toLowerCase().replace("/", "--");
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

/** Mapea un ítem del backend a la forma cruda del contrato. Nada se coacciona: lo inválido lo anula contrato.ts. */
function mapear(item: Registro, id: string, desglose: DesgloseSalud | null, calculadoEn: unknown): Registro {
  const salud = item.health_score;
  return {
    id,
    nombre: item.name,
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

async function enParalelo<T, R>(items: readonly T[], limite: number, f: (x: T) => Promise<R>): Promise<R[]> {
  const salida = new Array<R>(items.length);
  let siguiente = 0;
  const trabajador = async () => {
    while (siguiente < items.length) {
      const i = siguiente++;
      salida[i] = await f(items[i]!);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limite, items.length) }, trabajador));
  return salida;
}

// ---------- adaptador ----------

interface Instantanea {
  lista: ResultadoLista;
  crudosPorId: Map<string, Registro>;
}

export class AdaptadorBackend implements RepositorioCatalogo {
  private instantanea: { expira: number; promesa: Promise<Instantanea> } | null = null;

  constructor(private readonly opciones: OpcionesBackend) {}

  async listarHerramientas(): Promise<ResultadoLista> {
    return (await this.#obtenerInstantanea()).lista;
  }

  async obtenerHerramienta(id: string): Promise<HerramientaDetalle | null> {
    if (!esIdValido(id)) return null;
    const crudo = (await this.#obtenerInstantanea()).crudosPorId.get(id);
    return crudo === undefined ? null : parsearHerramientaDetalle(crudo);
  }

  #obtenerInstantanea(): Promise<Instantanea> {
    const ahora = (this.opciones.ahora ?? Date.now)();
    if (this.instantanea !== null && ahora < this.instantanea.expira) return this.instantanea.promesa;
    const promesa = this.#construir().catch((e: unknown) => {
      this.instantanea = null; // un fallo no queda en caché
      const codigo = e instanceof FalloBackend ? e.codigo : "interno";
      console.error(`[catalogo] backend: ${codigo}`); // solo un código, nunca contenido externo (A09)
      throw new ErrorCatalogo({ cause: e });
    });
    this.instantanea = { expira: ahora + VIDA_INSTANTANEA_MS, promesa };
    return promesa;
  }

  async #construir(): Promise<Instantanea> {
    const { baseUrl, fetchFn = fetch, timeoutMs = TIMEOUT_BACKEND_MS } = this.opciones;
    const sobre = sobreLista.safeParse(await obtenerJson(`${baseUrl}/api/v1/repositories?limit=${LIMITE_LISTA}`, fetchFn, timeoutMs));
    if (!sobre.success) throw new FalloBackend("sobre-lista");

    const conId = sobre.data.items.map((item) => {
      const fullName = fullNameDe(item);
      const id = fullName === null ? null : idPara(fullName);
      return { item: item as Registro, fullName, id };
    });
    const validos = conId.filter((x): x is { item: Registro; fullName: string; id: string } => x.fullName !== null && x.id !== null);

    const detalles = await enParalelo(validos, CONCURRENCIA_DETALLES, async ({ fullName }) => {
      const [owner, repo] = fullName.split("/") as [string, string];
      const url = `${baseUrl}/api/v1/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
      const json = await obtenerJson(url, fetchFn, timeoutMs, true);
      if (json === null) return { desglose: null, calculadoEn: undefined };
      const d = sobreDetalle.safeParse(json);
      if (!d.success || d.data.repository.full_name !== fullName) throw new FalloBackend("sobre-detalle");
      const b = d.data.health_breakdown as Registro | null;
      return { desglose: desgloseDe(b), calculadoEn: b !== null && typeof b === "object" ? b.calculated_at : undefined };
    });

    const crudosPorId = new Map<string, Registro>();
    validos.forEach(({ item, id }, i) => {
      if (!crudosPorId.has(id)) crudosPorId.set(id, mapear(item, id, detalles[i]!.desglose, detalles[i]!.calculadoEn));
    });
    // Los ítems sin identidad válida entran como {} para que el contrato los cuente en `omitidas`.
    const crudos = conId.map(({ id }) => (id === null ? {} : crudosPorId.get(id)!));
    const lista = parsearLista(crudos);
    if (lista.omitidas > 0) console.warn(`[catalogo] ${lista.omitidas} herramienta(s) del backend omitida(s) por el contrato.`);
    return { lista, crudosPorId };
  }
}

export function crearAdaptadorBackend(env: Record<string, string | undefined> = process.env): RepositorioCatalogo {
  return new AdaptadorBackend({ baseUrl: resolverBackendUrl(env) });
}
