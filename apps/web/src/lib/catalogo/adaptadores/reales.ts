// Adaptador de repos reales (feature 002, RF-12): lee data/repos-reales.json. Es el mismo dataset que indexa el asistente,
// así cada repo citado tiene su ficha. Métricas tomadas de la API de GitHub (ver metricasTomadasEn); todo pasa por contrato.ts.
import datos from "../../../../data/repos-reales.json";
import type { RepositorioCatalogo } from "../repositorio";
import { AdaptadorEnMemoria } from "./memoria";

export function crearAdaptadorReales(): RepositorioCatalogo {
  return new AdaptadorEnMemoria(datos);
}
