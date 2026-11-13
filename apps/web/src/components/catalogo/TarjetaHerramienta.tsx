import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { HerramientaResumen } from "@/lib/catalogo/contrato";
import { textoLicencia } from "@/lib/catalogo/licencia";
import { cn } from "@/lib/utils";
import { t } from "@/i18n/es";
import { IndicadorSalud } from "./IndicadorSalud";
import { IconoEstrella } from "@/components/marca/Iconos";
import { MarcaRepo } from "@/components/marca/MarcaRepo";
import { PantallaPreview } from "@/components/marca/PantallaPreview";

export interface TarjetaHerramientaProps {
  herramienta: HerramientaResumen;
}

const COLOR_NIVEL = {
  activo: "text-salud-alta",
  moderado: "text-salud-media",
  bajo: "text-salud-baja",
  abandonado: "text-salud-baja",
} as const;

const formatoNumero = new Intl.NumberFormat("es-AR");

/** Un dato de la línea de metadatos: la etiqueta existe para lectores de pantalla y el valor se ve compacto. */
function Dato({ etiqueta, visible = false, children }: { etiqueta: string; visible?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex max-w-full min-w-0 items-baseline gap-1">
      <dt className={visible ? "shrink-0" : "sr-only"}>{etiqueta}</dt>
      <dd className="min-w-0 font-medium text-foreground [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

/**
 * Tarjeta v2 (ui-brief §11.2 #4 y §11.4): pantalla de preview según la categoría y marca generativa (§12; no hay imágenes),
 * nombre, descripción en una línea, salud y una línea de metadatos que conserva lo que exige RF-01 (c) y RNF-13.
 * Todo texto de `herramienta` es externo: va como texto de React, aislado con <bdi dir="auto"> y cortado.
 */
export function TarjetaHerramienta({ herramienta }: TarjetaHerramientaProps) {
  const { nombre, id, descripcion, descripcionTruncada, categorias, lenguaje, licencia, stars, healthScore, nivelMantenimiento } =
    herramienta;
  const sinDato = t("comun.sinDato");
  return (
    <Card className="group/tarjeta relative h-full min-w-0 gap-0 overflow-visible rounded-none bg-transparent py-0 ring-0 transition-transform duration-300 ease-out hover:-translate-y-1 focus-within:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:focus-within:translate-y-0">
      <div className="relative aspect-[16/10] overflow-hidden rounded-3xl bg-secondary ring-1 ring-border transition-shadow duration-300 group-hover/tarjeta:shadow-xl group-hover/tarjeta:shadow-black/10 group-focus-within/tarjeta:shadow-xl group-focus-within/tarjeta:shadow-black/10">
        {categorias[0] !== undefined && <PantallaPreview id={id} categoria={categorias[0]} className="ob-escala transition-transform duration-300 ease-out group-hover/tarjeta:scale-[1.02] group-focus-within/tarjeta:scale-[1.02]" />}
        <ul aria-label={t("tarjeta.categorias")} className="absolute inset-x-3 bottom-3 flex flex-wrap gap-1.5">
          {categorias.map((categoria) => (
            <li key={categoria} className="rounded-full bg-background px-2.5 py-1 text-xs font-medium">
              {t(`categoria.${categoria}`)}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 px-1 pt-4">
        <div className="flex min-w-0 items-center gap-3">
          <MarcaRepo id={id} className="size-10" />
          <h3 className="line-clamp-2 min-w-0 flex-1 text-base leading-snug font-semibold [overflow-wrap:anywhere]">
            {/* El enlace cubre toda la tarjeta (after:inset-0). El id es ASCII estricto: seguro en la ruta (MU-05). */}
            <Link href={`/herramientas/${encodeURIComponent(id)}`} className="catalogo-foco rounded-sm after:absolute after:inset-0 after:rounded-3xl">
              <bdi dir="auto">{nombre}</bdi>
            </Link>
          </h3>
          <span className="shrink-0">
            <IndicadorSalud valor={healthScore} />
          </span>
        </div>
        <p className="line-clamp-1 text-sm text-muted-foreground [overflow-wrap:anywhere]">
          <bdi dir="auto">{descripcion ?? sinDato}</bdi>
          {descripcionTruncada && descripcion !== null ? t("comun.recortado") : null}
        </p>
        {/* MU-03: el nombre se muestra siempre junto a su id. */}
        <code className="block truncate font-mono text-xs text-muted-foreground">{id}</code>
        <dl className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <Dato etiqueta={t("tarjeta.lenguaje")}>
            <bdi dir="auto">{lenguaje ?? sinDato}</bdi>
          </Dato>
          <Dato etiqueta={t("tarjeta.licencia")}>
            <bdi dir="auto">{textoLicencia(licencia)}</bdi>
          </Dato>
          <Dato etiqueta={t("tarjeta.stars")}>
            <IconoEstrella className="mr-0.5 -translate-y-px" />
            {stars === null ? sinDato : formatoNumero.format(stars)}
          </Dato>
          <Dato etiqueta={t("tarjeta.mantenimiento")} visible>
            {nivelMantenimiento === null ? (
              sinDato
            ) : (
              <span className={cn("font-semibold", COLOR_NIVEL[nivelMantenimiento])}>{t(`nivel.${nivelMantenimiento}`)}</span>
            )}
          </Dato>
        </dl>
      </div>
    </Card>
  );
}
