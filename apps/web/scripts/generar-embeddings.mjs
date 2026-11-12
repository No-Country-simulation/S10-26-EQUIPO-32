// Genera data/embeddings.json con Ollama (feature 002 · A03, RF-13, D-20, D-21).
// Uso: npm run embeddings  (lee OLLAMA_URL de .env; por defecto http://localhost:11434 fuera de producción).
// Sin dependencias: fetch nativo de Node 22. El texto de cada documento sale de data/repos-reales.json.
import { readFileSync, writeFileSync } from "node:fs";

export const MODELO_EMBEDDINGS = "nomic-embed-text";
const ENTRADA = new URL("../data/repos-reales.json", import.meta.url);
const SALIDA = new URL("../data/embeddings.json", import.meta.url);
const ID_VALIDO = /^[a-z0-9][a-z0-9._-]{0,99}$/;

/** Texto que se indexa por repo. nomic-embed-text espera el prefijo `search_document:`. */
export function textoDocumento(repo) {
  const ideas = Array.isArray(repo.ideas) ? repo.ideas : [];
  const partes = [
    repo.nombre,
    `Categorías: ${(repo.categorias ?? []).join(", ")}`,
    repo.lenguaje ? `Lenguaje: ${repo.lenguaje}` : "",
    repo.descripcion ?? "",
    ideas.flatMap((i) => i.disparadores ?? []).join(". "),
    `Stack: ${[...new Set(ideas.flatMap((i) => i.stack ?? []))].join(", ")}`,
  ];
  return `search_document: ${partes.filter(Boolean).join("\n")}`;
}

function urlOllama() {
  const valor = process.env.OLLAMA_URL?.trim() || "http://localhost:11434";
  const url = new URL(valor);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("OLLAMA_URL debe ser http(s) sin credenciales.");
  }
  return url.origin;
}

async function main() {
  const repos = JSON.parse(readFileSync(ENTRADA, "utf8"));
  const validos = repos.filter((r) => typeof r?.id === "string" && ID_VALIDO.test(r.id));
  const respuesta = await fetch(`${urlOllama()}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODELO_EMBEDDINGS, input: validos.map(textoDocumento) }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!respuesta.ok) throw new Error(`Ollama respondió ${respuesta.status}.`);
  const { embeddings } = await respuesta.json();
  if (!Array.isArray(embeddings) || embeddings.length !== validos.length) throw new Error("Respuesta de Ollama inesperada.");
  const dimension = embeddings[0].length;
  const items = validos.map((r, i) => {
    if (embeddings[i].length !== dimension) throw new Error("Dimensiones distintas.");
    return { id: r.id, vector: embeddings[i].map((x) => Math.round(x * 1e6) / 1e6) };
  });
  const salida = { modelo: MODELO_EMBEDDINGS, dimension, generadoEn: new Date().toISOString(), items };
  writeFileSync(SALIDA, JSON.stringify(salida) + "\n");
  console.log(`${items.length} embeddings de dimensión ${dimension} escritos en data/embeddings.json`);
}

main().catch((e) => {
  console.error(`[embeddings] ${e instanceof Error ? e.message : "error"}`);
  process.exit(1);
});
