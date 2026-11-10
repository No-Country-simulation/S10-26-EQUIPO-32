// Adaptador de solo lectura sobre datos crudos en memoria. Lo usan `sintetico` y `fixtures`.
// Todo pasa por contrato.ts: nunca devuelve un campo sin validar (P5).
import {
  esIdValido,
  parsearHerramientaDetalle,
  parsearLista,
  type HerramientaDetalle,
  type ResultadoLista,
} from "../contrato";
import type { RepositorioCatalogo } from "../repositorio";

export class AdaptadorEnMemoria implements RepositorioCatalogo {
  private readonly porId = new Map<string, unknown>();

  constructor(private readonly crudos: readonly unknown[]) {
    for (const crudo of crudos) {
      const id = (crudo as { id?: unknown } | null)?.id;
      if (esIdValido(id) && !this.porId.has(id)) this.porId.set(id, crudo); // el primero gana, como en la lista
    }
  }

  async listarHerramientas(): Promise<ResultadoLista> {
    const resultado = parsearLista(this.crudos);
    if (resultado.omitidas > 0) {
      // Solo un número: nunca contenido externo en el log (evita inyección en logs).
      console.warn(`[catalogo] ${resultado.omitidas} herramienta(s) omitida(s) por el contrato.`);
    }
    return resultado;
  }

  async obtenerHerramienta(id: string): Promise<HerramientaDetalle | null> {
    if (!esIdValido(id)) return null;
    const crudo = this.porId.get(id);
    return crudo === undefined ? null : parsearHerramientaDetalle(crudo);
  }
}
