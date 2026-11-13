// Cliente del navegador para POST /api/asistente (feature 002 · A06; RF-11, RNF-04, P5).
// La respuesta del servidor también se valida: ningún campo sin validar llega a la interfaz.
import { z } from "zod";
import { esIdValido } from "@/lib/catalogo/contrato";

export const MAX_CONSULTA = 500;
const RUTA = "/api/asistente";
const TIMEOUT_MS = 90_000;

const id = z.string().refine(esIdValido);
const texto = (max: number) => z.string().max(max);

export const esquemaRespuesta = z.discriminatedUnion("estado", [
  z.object({
    estado: z.literal("ok"),
    stack: z.array(z.object({ id, nombre: texto(100), rol: texto(200) })).max(10),
    justificacion: texto(2000),
    citados: z.array(z.object({ id, nombre: texto(100) })).max(10),
  }),
  z.object({ estado: z.literal("sin-contexto") }),
  z.object({ estado: z.literal("crudo"), salida: texto(50_000) }),
]);
export type RespuestaCliente = z.output<typeof esquemaRespuesta>;

export type CodigoErrorCliente = "limite" | "entrada" | "no-disponible" | "interno";
export type ResultadoConsulta = { tipo: "ok"; respuesta: RespuestaCliente } | { tipo: "error"; codigo: CodigoErrorCliente };

function codigoPorEstado(estado: number): CodigoErrorCliente {
  if (estado === 429) return "limite";
  if (estado === 400 || estado === 413 || estado === 415) return "entrada";
  if (estado === 503) return "no-disponible";
  return "interno";
}

/** Ruta interna de la ficha. Solo con un `id` válido; nunca una URL que venga del modelo (D-23). */
export function rutaFicha(idRepo: string): string | null {
  return esIdValido(idRepo) ? `/herramientas/${encodeURIComponent(idRepo)}` : null;
}

export async function consultarAsistente(consulta: string, fetchFn: typeof fetch = fetch): Promise<ResultadoConsulta> {
  let respuesta: Response;
  try {
    respuesta = await fetchFn(RUTA, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consulta }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      credentials: "same-origin",
    });
  } catch {
    return { tipo: "error", codigo: "no-disponible" };
  }
  if (!respuesta.ok) return { tipo: "error", codigo: codigoPorEstado(respuesta.status) };
  try {
    const r = esquemaRespuesta.safeParse(await respuesta.json());
    return r.success ? { tipo: "ok", respuesta: r.data } : { tipo: "error", codigo: "interno" };
  } catch {
    return { tipo: "error", codigo: "interno" };
  }
}
