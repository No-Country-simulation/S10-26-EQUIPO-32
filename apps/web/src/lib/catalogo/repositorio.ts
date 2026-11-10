// Puerto de acceso al catálogo (plan 4.1; P3, P5, AM-13, RNF-02).
// Solo lectura por construcción: la interfaz no tiene ningún método de escritura.
import type { HerramientaDetalle, ResultadoLista } from "./contrato";

export interface RepositorioCatalogo {
  listarHerramientas(): Promise<ResultadoLista>;
  obtenerHerramienta(id: string): Promise<HerramientaDetalle | null>;
}

/** Lo único que ve la interfaz de un fallo del origen (A09): el detalle va al log del servidor. */
export const MENSAJE_ERROR_CATALOGO = "No se pudo cargar el catálogo.";

export class ErrorCatalogo extends Error {
  constructor(options?: { cause?: unknown }) {
    super(MENSAJE_ERROR_CATALOGO, options);
    this.name = "ErrorCatalogo";
  }
}

export const FUENTES = ["sintetico", "fixtures", "supabase"] as const;
export type FuenteCatalogo = (typeof FUENTES)[number];

/** Error de configuración del servidor: el mensaje es para quien despliega, nunca para el usuario. */
export class ErrorConfiguracion extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorConfiguracion";
  }
}

/**
 * Elige la fuente a partir de `CATALOG_SOURCE` (variable de servidor, sin NEXT_PUBLIC_).
 * En producción NO hay valor por defecto: si falta, falla con un error claro.
 * Fuera de producción el valor por defecto es `sintetico`. Un valor desconocido siempre falla.
 */
export function resolverFuente(env: { CATALOG_SOURCE?: string; NODE_ENV?: string }): FuenteCatalogo {
  const valor = env.CATALOG_SOURCE?.trim();
  if (valor === undefined || valor === "") {
    if (env.NODE_ENV === "production") {
      throw new ErrorConfiguracion(
        `CATALOG_SOURCE es obligatoria en producción. Valores: ${FUENTES.join(" | ")}.`,
      );
    }
    return "sintetico";
  }
  if (!(FUENTES as readonly string[]).includes(valor)) {
    throw new ErrorConfiguracion(`CATALOG_SOURCE tiene un valor no válido. Valores: ${FUENTES.join(" | ")}.`);
  }
  return valor as FuenteCatalogo;
}
