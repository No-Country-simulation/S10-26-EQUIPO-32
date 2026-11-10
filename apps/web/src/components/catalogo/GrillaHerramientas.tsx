import type { HerramientaResumen } from "@/lib/catalogo/contrato";
import { t } from "@/i18n/es";
import { EstadoVacio } from "./EstadoVacio";
import { TarjetaHerramienta } from "./TarjetaHerramienta";

export interface GrillaHerramientasProps {
  herramientas: HerramientaResumen[];
  /** Cantidad de resultados que se anuncia (la grilla no pagina: coincide con `herramientas.length`). */
  total: number;
}

/** Grilla de tres, dos o una columna según el ancho. Vacía: muestra el estado vacío. */
export function GrillaHerramientas({ herramientas, total }: GrillaHerramientasProps) {
  return (
    <section aria-label={t("grilla.region")} className="space-y-4">
      <p aria-live="polite" className="sr-only">
        <span className="tabular-nums">{total}</span>
        <span>{total === 1 ? t("grilla.resultado.uno") : t("grilla.resultado.otras")}</span>
      </p>
      {herramientas.length === 0 ? (
        <EstadoVacio titulo={t("estado.vacio.titulo")} texto={t("estado.vacio.texto")} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {herramientas.map((herramienta) => (
            <li key={herramienta.id} className="min-w-0">
              <TarjetaHerramienta herramienta={herramienta} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
