// Configuración del asistente (feature 002; AM-24, AM-26, RNF-21). Solo variables de servidor, nunca NEXT_PUBLIC_.
import { ErrorConfiguracion } from "@/lib/catalogo/repositorio";

export interface ConfigAsistente {
  /** Origen de Ollama validado (http/https, sin credenciales ni ruta). */
  ollamaUrl: string;
  /** false solo con REDTEAM_SIN_GUARDRAILS=1 y fuera de producción. */
  guardrails: boolean;
}

type Env = { OLLAMA_URL?: string; REDTEAM_SIN_GUARDRAILS?: string; NODE_ENV?: string };

const URL_POR_DEFECTO = "http://localhost:11434";

export function resolverConfig(env: Env = process.env): ConfigAsistente {
  const produccion = env.NODE_ENV === "production";
  const valor = env.OLLAMA_URL?.trim();
  if ((valor === undefined || valor === "") && produccion) {
    throw new ErrorConfiguracion("OLLAMA_URL es obligatoria en producción.");
  }
  let url: URL;
  try {
    url = new URL(valor || URL_POR_DEFECTO);
  } catch {
    throw new ErrorConfiguracion("OLLAMA_URL no es una URL válida.");
  }
  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username !== "" || url.password !== "") {
    throw new ErrorConfiguracion("OLLAMA_URL debe ser http(s) y sin credenciales.");
  }
  // El modo sin guardrails existe solo para medir el red-team; en producción se ignora (RNF-21).
  const sinGuardrails = !produccion && env.REDTEAM_SIN_GUARDRAILS?.trim() === "1";
  return { ollamaUrl: url.origin, guardrails: !sinGuardrails };
}
