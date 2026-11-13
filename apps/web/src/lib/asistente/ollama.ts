// Cliente mínimo de Ollama con fetch (feature 002; D-20, AM-22). Sin SDK. Toda respuesta se valida con zod (P5).
import { z } from "zod";

export const MODELO_EMBEDDINGS = "nomic-embed-text";
export const MODELO_CHAT = "llama3.2:3b";
const TIMEOUT_MS = 60_000;
// Determinismo para que el red-team sea reproducible (P7).
const OPCIONES_CHAT = { temperature: 0, seed: 42, num_predict: 700 } as const;

/** Fallo de Ollama (caído, timeout, respuesta inesperada). El detalle no sale al cliente (AM-25). */
export class ErrorOllama extends Error {
  constructor(motivo: string, options?: { cause?: unknown }) {
    super(motivo, options);
    this.name = "ErrorOllama";
  }
}

export type Fetch = typeof fetch;
export interface MensajeChat {
  role: "system" | "user";
  content: string;
}

const esquemaEmbed = z.object({ embeddings: z.array(z.array(z.number().finite()).min(1)).length(1) });
const esquemaChat = z.object({ message: z.object({ content: z.string().max(50_000) }) });

async function pedir(fetchFn: Fetch, url: string, cuerpo: unknown): Promise<unknown> {
  let respuesta: Response;
  try {
    respuesta = await fetchFn(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (e) {
    throw new ErrorOllama("sin conexión o timeout", { cause: e });
  }
  if (!respuesta.ok) throw new ErrorOllama(`estado ${respuesta.status}`);
  try {
    return await respuesta.json();
  } catch (e) {
    throw new ErrorOllama("respuesta no JSON", { cause: e });
  }
}

/** Embedding de la consulta. nomic-embed-text espera el prefijo `search_query:`. */
export async function embeber(ollamaUrl: string, texto: string, fetchFn: Fetch = fetch): Promise<number[]> {
  const datos = await pedir(fetchFn, `${ollamaUrl}/api/embed`, {
    model: MODELO_EMBEDDINGS,
    input: [`search_query: ${texto}`],
  });
  const r = esquemaEmbed.safeParse(datos);
  const vector = r.success ? r.data.embeddings[0] : undefined;
  if (vector === undefined) throw new ErrorOllama("embedding inválido");
  return vector;
}

/** Chat sin streaming. `formato` es un JSON schema que Ollama usa para restringir la salida (D-22). */
export async function conversar(
  ollamaUrl: string,
  mensajes: MensajeChat[],
  formato: object | undefined,
  fetchFn: Fetch = fetch,
): Promise<string> {
  const datos = await pedir(fetchFn, `${ollamaUrl}/api/chat`, {
    model: MODELO_CHAT,
    messages: mensajes,
    stream: false,
    options: OPCIONES_CHAT,
    ...(formato !== undefined ? { format: formato } : {}),
  });
  const r = esquemaChat.safeParse(datos);
  if (!r.success) throw new ErrorOllama("chat inválido");
  return r.data.message.content;
}
