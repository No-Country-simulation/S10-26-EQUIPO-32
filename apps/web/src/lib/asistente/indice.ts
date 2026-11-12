// Índice en memoria del asistente (feature 002; RF-13, D-21, RNF-09). Une data/repos-reales.json (validado con
// contrato.ts) y data/embeddings.json (validado con zod). Solo entra un repo que pasa el contrato y tiene vector.
import { z } from "zod";
import repos from "../../../data/repos-reales.json";
import embeddings from "../../../data/embeddings.json";
import { parsearHerramientaDetalle, type HerramientaDetalle } from "@/lib/catalogo/contrato";

export interface DocumentoIndice {
  repo: HerramientaDetalle;
  vector: number[];
}

export interface Indice {
  existe(id: string): boolean;
  obtener(id: string): HerramientaDetalle | undefined;
  buscar(vector: number[], k: number): DocumentoIndice[];
  readonly tamano: number;
}

const esquemaEmbeddings = z.object({
  modelo: z.string(),
  dimension: z.number().int().min(1).max(8192),
  items: z.array(z.object({ id: z.string(), vector: z.array(z.number().finite()) })).max(10_000),
});

export function coseno(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length || a.length === 0) return -1;
  let punto = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    punto += x * y;
    na += x * x;
    nb += y * y;
  }
  return na === 0 || nb === 0 ? -1 : punto / (Math.sqrt(na) * Math.sqrt(nb));
}

export function crearIndice(reposCrudos: unknown, embeddingsCrudos: unknown): Indice {
  const e = esquemaEmbeddings.parse(embeddingsCrudos);
  const porId = new Map<string, DocumentoIndice>();
  const vectores = new Map(e.items.filter((i) => i.vector.length === e.dimension).map((i) => [i.id, i.vector]));
  for (const crudo of Array.isArray(reposCrudos) ? reposCrudos : []) {
    const repo = parsearHerramientaDetalle(crudo);
    const vector = repo === null ? undefined : vectores.get(repo.id);
    if (repo !== null && vector !== undefined && !porId.has(repo.id)) porId.set(repo.id, { repo, vector });
  }
  if (porId.size === 0) throw new Error("Índice del asistente vacío.");
  const documentos = [...porId.values()];
  return {
    tamano: documentos.length,
    existe: (id) => porId.has(id),
    obtener: (id) => porId.get(id)?.repo,
    buscar: (vector, k) =>
      documentos
        .map((d) => ({ d, s: coseno(vector, d.vector) }))
        .sort((x, y) => y.s - x.s)
        .slice(0, k)
        .map((x) => x.d),
  };
}

let indice: Indice | undefined;
/** Índice del dataset real, construido una sola vez por proceso. */
export function obtenerIndice(): Indice {
  indice ??= crearIndice(repos, embeddings);
  return indice;
}
