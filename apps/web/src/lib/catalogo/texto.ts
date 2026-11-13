// Normalización de todo texto externo (plan 4.3; AM-06, AM-07, MU-03, MU-04).
// Funciones puras: no tocan DOM ni red. El resultado se renderiza siempre como texto.

// Controles C0 (U+0000-001F), DEL y C1 (U+0080-009F).
const CONTROLES = /[\u0000-\u001F\u007F-\u009F]/gu;
// Saltos y tabulaciones (incluidos \r, \v, \f y los separadores Unicode): separan palabras.
const SALTOS = /[\t\n\v\f\r\u2028\u2029]/gu;
// Igual que CONTROLES pero conserva \n (U+000A) y \t (U+0009).
const CONTROLES_SALVO_LINEA = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/gu;
// Dirección de texto (defensa contra «Trojan Source») y ancho cero.
const INVISIBLES = /[\u202A-\u202E\u2066-\u2069\u200E\u200F\u061C\u200B-\u200D\u2060\uFEFF]/gu;
// Separadores de línea y párrafo de Unicode.
const SEPARADORES = /[\u2028\u2029]/gu;

function validarCota(cota: number): void {
  if (!Number.isInteger(cota) || cota < 0) {
    throw new RangeError("La cota debe ser un entero mayor o igual que 0.");
  }
}

// Corta por puntos de código (no por unidades UTF-16) para no partir un par sustituto.
function cortar(texto: string, cota: number): string {
  if (texto.length <= cota) return texto;
  return Array.from(texto).slice(0, cota).join("");
}

/**
 * Texto de una línea (nombres, licencias, disparadores, consultas de búsqueda).
 * Los saltos y tabulaciones pasan a espacio; quita el resto de controles, bidi y ancho cero; aplica NFC; colapsa
 * cualquier espacio en blanco a un espacio; recorta los extremos y corta a `cota`.
 * Orden: se quita lo invisible antes de NFC para que la salida sea siempre NFC.
 */
export function normalizarTexto(entrada: string, cota: number): string {
  validarCota(cota);
  const limpio = entrada
    .replace(SALTOS, " ")
    .replace(CONTROLES, "")
    .replace(INVISIBLES, "")
    .normalize("NFC");
  return cortar(limpio.replace(/\s+/gu, " ").trim(), cota);
}

/**
 * Texto de varias líneas (descripciones, snippets). Conserva \n y \t; no colapsa
 * espacios ni recorta, para no alterar el código. Quita el resto de controles
 * (\r incluido, así CRLF pasa a LF), bidi y ancho cero; aplica NFC y corta a `cota`.
 */
export function normalizarTextoLargo(entrada: string, cota: number): string {
  validarCota(cota);
  const limpio = entrada
    .replace(SEPARADORES, "\n")
    .replace(CONTROLES_SALVO_LINEA, "")
    .replace(INVISIBLES, "")
    .normalize("NFC");
  return cortar(limpio, cota);
}
