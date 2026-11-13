// Validación de la salida del LLM (feature 002; RNF-04, RNF-09, RNF-19, AM-19, AM-20, AM-21, D-23).
// La salida es NO confiable (P5): JSON → zod → ids del índice → sin URLs ni HTML → sin fuga del prompt.
import { z } from "zod";
import { esIdValido } from "@/lib/catalogo/contrato";
import { normalizarTexto } from "@/lib/catalogo/texto";
import type { Indice } from "./indice";
import { FRAGMENTOS_PROMPT } from "./prompt";

export const MAX_STACK = 6;
const MAX_ROL = 120;
const MAX_JUSTIFICACION = 1200;

export interface ItemStack {
  id: string;
  nombre: string;
  rol: string;
}

export type RespuestaAsistente =
  | { estado: "ok"; stack: ItemStack[]; justificacion: string; citados: Array<{ id: string; nombre: string }> }
  | { estado: "sin-contexto" }
  /** Solo en el modo sin guardrails del red-team: la salida del modelo tal cual (igual se renderiza como texto). */
  | { estado: "crudo"; salida: string };

export type ResultadoValidacion =
  | { tipo: "ok"; respuesta: RespuestaAsistente; descartados: number }
  | { tipo: "rechazada"; motivo: "json" | "esquema" | "fuga" };

const esquemaSalidaModelo = z.object({
  sinContexto: z.boolean(),
  stack: z.array(z.object({ id: z.string().max(200), rol: z.string().max(2000) })).max(50),
  justificacion: z.string().max(20_000),
});

const URLS = /\b(?:[a-z][a-z0-9+.-]*:\/\/|www\.|javascript:|data:)\S*/giu;
const ETIQUETAS = /<\/?[a-z!][^>]*>?/giu;

/** Quita URLs, esquemas peligrosos y etiquetas: la salida solo puede enlazar a fichas internas (MU-16, MU-17). */
export function limpiarTexto(texto: string, cota: number): string {
  return normalizarTexto(texto.replace(ETIQUETAS, " ").replace(URLS, "[enlace eliminado]"), cota);
}

/** ¿El texto contiene el canario o fragmentos del system prompt? (RNF-19). */
export function filtraPrompt(texto: string): boolean {
  const t = texto.toLowerCase();
  return FRAGMENTOS_PROMPT.some((f) => t.includes(f.toLowerCase()));
}

export function validarSalida(crudo: string, indice: Indice): ResultadoValidacion {
  if (filtraPrompt(crudo)) return { tipo: "rechazada", motivo: "fuga" };
  let json: unknown;
  try {
    json = JSON.parse(crudo);
  } catch {
    return { tipo: "rechazada", motivo: "json" };
  }
  const r = esquemaSalidaModelo.safeParse(json);
  if (!r.success) return { tipo: "rechazada", motivo: "esquema" };

  const vistos = new Set<string>();
  const stack: ItemStack[] = [];
  let descartados = 0;
  for (const item of r.data.stack) {
    const id = item.id.trim().toLowerCase();
    const repo = esIdValido(id) ? indice.obtener(id) : undefined;
    if (repo === undefined) {
      descartados += 1; // repo alucinado o inventado por el atacante (RNF-09)
      continue;
    }
    if (vistos.has(id) || stack.length >= MAX_STACK) continue;
    vistos.add(id);
    stack.push({ id, nombre: repo.nombre, rol: limpiarTexto(item.rol, MAX_ROL) });
  }
  const justificacion = limpiarTexto(r.data.justificacion, MAX_JUSTIFICACION);
  // P6: una recomendación sin fuente es un bug → sin repos válidos, «sin contexto».
  if (r.data.sinContexto || stack.length === 0) return { tipo: "ok", respuesta: { estado: "sin-contexto" }, descartados };
  return {
    tipo: "ok",
    descartados,
    respuesta: { estado: "ok", stack, justificacion, citados: stack.map(({ id, nombre }) => ({ id, nombre })) },
  };
}
