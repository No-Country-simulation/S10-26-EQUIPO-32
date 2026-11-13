// Orquestación del asistente RAG (feature 002; RF-06). Recibe la consulta ya validada por el route handler.
import type { ConfigAsistente } from "./config";
import type { Indice } from "./indice";
import { conversar, embeber, ErrorOllama, type Fetch } from "./ollama";
import { armarMensajes, FORMATO_SALIDA } from "./prompt";
import { detectarCambioDeRol } from "./rol";
import { validarSalida, type RespuestaAsistente } from "./salida";

export const TOP_K = 5;

export interface Dependencias {
  config: ConfigAsistente;
  indice: Indice;
  fetchFn?: Fetch;
}

export async function responder(consulta: string, { config, indice, fetchFn = fetch }: Dependencias): Promise<RespuestaAsistente> {
  // Jailbreak por rol/persona (RNF-23, AM-27): no llega al modelo. Solo se registra la señal, nunca la consulta (RNF-22).
  if (config.guardrails) {
    const senal = detectarCambioDeRol(consulta);
    if (senal !== null) {
      console.warn(`[asistente] entrada rechazada: cambio-de-rol (${senal})`);
      return { estado: "sin-contexto" };
    }
  }
  const vector = await embeber(config.ollamaUrl, consulta, fetchFn);
  const repos = indice.buscar(vector, TOP_K).map((d) => d.repo);
  const mensajes = armarMensajes(consulta, repos, config.guardrails);

  if (!config.guardrails) {
    // Red-team: sin esquema ni validación. La salida igual se muestra como texto en la interfaz.
    return { estado: "crudo", salida: await conversar(config.ollamaUrl, mensajes, undefined, fetchFn) };
  }

  const crudo = await conversar(config.ollamaUrl, mensajes, FORMATO_SALIDA, fetchFn);
  const resultado = validarSalida(crudo, indice);
  if (resultado.tipo === "rechazada") {
    // Solo el motivo, nunca el contenido (AM-25, RNF-22).
    console.warn(`[asistente] salida rechazada: ${resultado.motivo}`);
    if (resultado.motivo === "fuga") return { estado: "sin-contexto" };
    throw new ErrorOllama(`salida inválida (${resultado.motivo})`);
  }
  if (resultado.descartados > 0) console.warn(`[asistente] ${resultado.descartados} repo(s) fuera del índice descartado(s)`);
  return resultado.respuesta;
}
