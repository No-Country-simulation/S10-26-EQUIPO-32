// Validación del enlace al repositorio (plan AM-03, MU-08, RF-02 e). Función pura.
// Fallo cerrado: ante cualquier duda devuelve null y la interfaz no muestra enlace.

const LARGO_MAXIMO = 2048;
const HOST_PERMITIDO = "github.com";
// Cualquier espacio, control, bidi o ancho cero crudo invalida la cadena completa:
// el parser de URL los ignoraría en silencio y no queremos aceptar lo que no vimos.
const PROHIBIDOS = /[\s\u0000-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069\u200B-\u200F\u2060\uFEFF\u061C\\]/u;

/**
 * Devuelve la URL canónica (`url.href`) si es `https://github.com/...` sin
 * credenciales ni puerto; en cualquier otro caso, `null`.
 */
export function validarUrlRepo(entrada: unknown): string | null {
  if (typeof entrada !== "string") return null;
  if (entrada.length === 0 || entrada.length > LARGO_MAXIMO) return null;
  if (PROHIBIDOS.test(entrada)) return null;

  let url: URL;
  try {
    url = new URL(entrada);
  } catch {
    return null;
  }

  if (url.protocol !== "https:") return null;
  if (url.hostname !== HOST_PERMITIDO) return null; // comparación exacta, sin subdominios
  if (url.username !== "" || url.password !== "") return null;
  if (url.port !== "") return null;
  return url.href;
}
