// Tipos de scripts/ingesta-lib.mjs para los tests (feature 005). El script corre en Node sin compilar.
export const DIAS_ACTIVO: number;
export const MAX_LOGO_BYTES: number;
export const HOST_AVATARES: string;
export const TIPOS_IDEA: string[];
export const DIFICULTADES: string[];
export const LICENCIAS_OSI: Set<string>;
export const FORMATO_IDEAS: Record<string, unknown>;
export interface EntradaSemilla {
  repo: string;
  id: string;
  nombre: string;
  categorias: string[];
  licencia?: string;
}
export interface IdeaGenerada {
  tipo: string;
  disparadores: string[];
  snippet: string;
  stack: string[];
  dificultad: string;
  revisada: false;
}
export function validarSemilla(crudo: unknown): EntradaSemilla[];
export function licenciaDe(meta: unknown, manual: string | undefined): string | null;
export function motivoExclusion(meta: unknown, manual: string | undefined, ahora: Date): string | null;
export function mapearRepo(
  entrada: EntradaSemilla,
  meta: Record<string, unknown>,
  previo: { descripcion?: unknown } | undefined,
  ideas: unknown[],
  ahoraIso: string,
): Record<string, unknown> & { stars: number | null; issuesAbiertos: number | null; descripcion?: string };
export function validarIdeaGenerada(crudo: unknown): IdeaGenerada | null;
export function mensajesIdeas(repo: Record<string, unknown>): Array<{ role: string; content: string }>;
export function urlAvatar(crudo: unknown): string | null;
export function tipoImagen(bytes: unknown): { tipo: string; extension: string } | null;
export function archivoLogo(id: unknown, extension: string): string | null;
