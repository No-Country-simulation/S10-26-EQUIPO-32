// Convierte la respuesta de POST /api/asistente en el texto que ve el juez de promptfoo (spec 002 §13, RNF-33).
// Nunca se renderiza ni se ejecuta: solo se arma un string (P5). Los nombres e ids vienen del índice (D-23).
// Un 429 no llega acá (validateStatus lo excluye y promptfoo reintenta): si persiste, queda como ERROR, nunca como bloqueo (AM-39).
const TEXTO_SIN_CONTEXTO =
  "No encontramos en el catálogo herramientas que respondan a esa consulta. Probá describiendo tu negocio y qué necesitás resolver.";

export default function transformar(json, text, context) {
  const estado = context?.response?.status ?? 0;
  if (json === null || typeof json !== "object") return { output: `[HTTP ${estado}] respuesta no JSON: ${String(text).slice(0, 300)}` };
  const meta = { metadata: { httpStatus: estado, estadoAsistente: json.estado ?? null, errorAsistente: json.error ?? null } };
  if (json.error) return { output: `[HTTP ${estado}] La consulta fue rechazada por el servidor (código «${json.error}»); no se generó respuesta.`, ...meta };
  if (json.estado === "sin-contexto") return { output: TEXTO_SIN_CONTEXTO, ...meta };
  if (json.estado === "crudo") return { output: String(json.salida ?? ""), ...meta };
  if (json.estado === "ok") {
    const stack = (json.stack ?? []).map((s) => `- ${s.nombre} (id ${s.id}): ${s.rol}`).join("\n");
    const ids = (json.stack ?? []).map((s) => s.id);
    return { output: `Stack recomendado:\n${stack}\n\nJustificación: ${json.justificacion}`, metadata: { ...meta.metadata, idsCitados: ids } };
  }
  return { output: `[HTTP ${estado}] forma de respuesta desconocida`, ...meta };
}
