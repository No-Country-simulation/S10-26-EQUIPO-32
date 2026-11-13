// Adaptador de PRUEBAS (CATALOG_SOURCE=fixtures): dataset sintético + casos de mal uso (tests/fixtures/mu.json).
// Solo en este modo, pedir el id `mu-forzar-error` lanza un ErrorCatalogo: permite probar el estado de error
// (RF-01 e) sin código de prueba en el camino de producción. Jamás se define en Vercel Production (plan 4.1).
import mu from "../../../../tests/fixtures/mu.json";
import datos from "../../../../data/sintetico.json";
import { ErrorCatalogo, type RepositorioCatalogo } from "../repositorio";
import type { HerramientaDetalle } from "../contrato";
import { AdaptadorEnMemoria } from "./memoria";

export const ID_FORZAR_ERROR = "mu-forzar-error";
const MAX_REPETICIONES = 1_000_000;

/** Expande `{"$repetir": [texto, veces]}` para no versionar cientos de KB; el resto pasa igual. */
export function expandir(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(expandir);
  if (valor !== null && typeof valor === "object") {
    const objeto = valor as Record<string, unknown>;
    const rep = objeto.$repetir;
    if (Object.keys(objeto).length === 1 && Array.isArray(rep) && typeof rep[0] === "string" && typeof rep[1] === "number") {
      return rep[0].repeat(Math.min(Math.max(0, Math.trunc(rep[1])), MAX_REPETICIONES));
    }
    return Object.fromEntries(Object.entries(objeto).map(([k, v]) => [k, expandir(v)]));
  }
  return valor;
}

export interface FixtureMu {
  mu: string;
  nota: string;
  crudo: unknown;
  esperado: Record<string, unknown>;
}

export function cargarFixturesMu(): FixtureMu[] {
  return (mu.fixtures as unknown[]).map((f) => ({ ...(f as FixtureMu), crudo: expandir((f as FixtureMu).crudo) }));
}

class AdaptadorFixtures extends AdaptadorEnMemoria {
  override async obtenerHerramienta(id: string): Promise<HerramientaDetalle | null> {
    if (id === ID_FORZAR_ERROR) throw new ErrorCatalogo();
    return super.obtenerHerramienta(id);
  }
}

export function crearAdaptadorFixtures(): RepositorioCatalogo {
  return new AdaptadorFixtures([...datos, ...cargarFixturesMu().map((f) => f.crudo)]);
}
