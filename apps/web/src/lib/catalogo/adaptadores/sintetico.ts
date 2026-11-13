// Adaptador sintético: lee data/sintetico.json (salida de scripts/generar-dataset.mjs).
import datos from "../../../../data/sintetico.json";
import type { RepositorioCatalogo } from "../repositorio";
import { AdaptadorEnMemoria } from "./memoria";

export function crearAdaptadorSintetico(): RepositorioCatalogo {
  return new AdaptadorEnMemoria(datos);
}
