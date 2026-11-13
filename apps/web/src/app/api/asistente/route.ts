// POST /api/asistente (feature 002 · A05; RF-06, RNF-03, RNF-05, RNF-09, RNF-19, RNF-20, RNF-22).
// Orden: rate limit → tipo y tamaño → zod → normalizarTexto (≤ 500) → RAG → salida validada.
// Errores genéricos: el detalle nunca sale al cliente ni se registra la consulta (AM-25).
import { z } from "zod";
import { responder } from "@/lib/asistente/asistente";
import { resolverConfig } from "@/lib/asistente/config";
import { obtenerIndice } from "@/lib/asistente/indice";
import { Limitador, obtenerIp } from "@/lib/asistente/limite";
import { normalizarTexto } from "@/lib/catalogo/texto";

export const MAX_CONSULTA = 500;
const MAX_CUERPO_BYTES = 4096;

const limitador = new Limitador();
const esquemaEntrada = z.object({ consulta: z.string() }).strict();

type CodigoError = "limite" | "tipo" | "tamano" | "entrada" | "no-disponible" | "interno";

function error(codigo: CodigoError, estado: number, cabeceras: Record<string, string> = {}): Response {
  return Response.json({ error: codigo }, { status: estado, headers: { "Cache-Control": "no-store", ...cabeceras } });
}

async function leerCuerpo(request: Request): Promise<string | null> {
  const declarado = Number(request.headers.get("content-length") ?? "0");
  if (declarado > MAX_CUERPO_BYTES) return null;
  const texto = await request.text();
  return new TextEncoder().encode(texto).byteLength > MAX_CUERPO_BYTES ? null : texto;
}

export async function POST(request: Request): Promise<Response> {
  const limite = limitador.consumir(obtenerIp(request.headers));
  if (!limite.permitido) return error("limite", 429, { "Retry-After": String(limite.reintentarEnS) });

  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return error("tipo", 415);
  const cuerpo = await leerCuerpo(request);
  if (cuerpo === null) return error("tamano", 413);

  let json: unknown;
  try {
    json = JSON.parse(cuerpo);
  } catch {
    return error("entrada", 400);
  }
  const entrada = esquemaEntrada.safeParse(json);
  if (!entrada.success) return error("entrada", 400);

  let config;
  try {
    config = resolverConfig();
  } catch {
    console.error("[asistente] configuración inválida");
    return error("no-disponible", 503);
  }

  let consulta = entrada.data.consulta;
  if (config.guardrails) {
    // Tope sobre el texto tal como llega (puntos de código) y luego normalización (RNF-20).
    if (Array.from(consulta).length > MAX_CONSULTA) return error("entrada", 400);
    consulta = normalizarTexto(consulta, MAX_CONSULTA);
  }
  if (consulta.trim().length === 0) return error("entrada", 400);

  try {
    const respuesta = await responder(consulta, { config, indice: obtenerIndice() });
    return Response.json(respuesta, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const nombre = e instanceof Error ? e.name : "desconocido";
    console.error(`[asistente] fallo: ${nombre}`);
    return nombre === "ErrorOllama" ? error("no-disponible", 503) : error("interno", 500);
  }
}
