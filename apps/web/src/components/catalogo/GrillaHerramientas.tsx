import type { HerramientaResumen } from "@/lib/catalogo/contrato";
import { t } from "@/i18n/es";
import { EstadoVacio } from "./EstadoVacio";
import { TarjetaHerramienta } from "./TarjetaHerramienta";

export interface GrillaHerramientasProps {
  herramientas: HerramientaResumen[];
  /** Cantidad de resultados que se anuncia (la grilla no pagina: coincide con `herramientas.length`). */
  total: number;
  /** Estado vacío: texto propio (p. ej. «sin resultados para …») y acción de limpiar. */
  vacio?: { texto?: string; accion?: { etiqueta: string; onClick: () => void } };
  /** Si la grilla es el panel de unas tabs: su id y el id de la tab activa. */
  panel?: { id: string; idTab: string };
}

/** Grilla de tres, dos o una columna según el ancho. Vacía: muestra el estado vacío. */
export function GrillaHerramientas({ herramientas, total, vacio, panel }: GrillaHerramientasProps) {
  return (
    <section
      aria-label={t("grilla.region")}
      {...(panel ? { id: panel.id, role: "tabpanel", "aria-describedby": panel.idTab } : {})}
      className="space-y-4"
    >
      <p aria-live="polite" className="sr-only">
        <span className="tabular-nums">{total}</span>
        <span>{total === 1 ? t("grilla.resultado.uno") : t("grilla.resultado.otras")}</span>
      </p>
      {herramientas.length === 0 ? (
        <EstadoVacio titulo={t("estado.vacio.titulo")} texto={vacio?.texto ?? t("estado.vacio.texto")} accion={vacio?.accion} />
      ) : (
        <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
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
