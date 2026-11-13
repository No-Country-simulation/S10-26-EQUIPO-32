import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { HerramientaResumen } from "@/lib/catalogo/contrato";
import { textoLicencia } from "@/lib/catalogo/licencia";
import { cn } from "@/lib/utils";
import { t } from "@/i18n/es";
import { IndicadorSalud } from "./IndicadorSalud";

export interface TarjetaHerramientaProps {
  herramienta: HerramientaResumen;
}

const COLOR_NIVEL = {
  activo: "text-salud-alta",
  moderado: "text-salud-media",
  abandonado: "text-salud-baja",
} as const;

const formatoNumero = new Intl.NumberFormat("es-AR");

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="line-clamp-2 font-medium [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

/**
 * Todo texto de `herramienta` es externo: se muestra solo como texto de React, aislado con <bdi dir="auto">
 * (unicode-bidi: isolate) y cortado con line-clamp / truncate / overflow-wrap, así no altera a sus vecinas.
 */
export function TarjetaHerramienta({ herramienta }: TarjetaHerramientaProps) {
  const { nombre, id, descripcion, descripcionTruncada, categorias, lenguaje, licencia, stars, healthScore, nivelMantenimiento } =
    herramienta;
  const sinDato = t("comun.sinDato");
  return (
    <Card className="relative h-full min-w-0 gap-4 rounded-2xl py-5">
      <CardHeader className="min-w-0 gap-1 px-5">
        <h3 className="line-clamp-2 text-lg leading-snug font-semibold [overflow-wrap:anywhere]">
          {/* El enlace cubre toda la tarjeta (after:inset-0). El id es ASCII estricto: seguro en la ruta (MU-05). */}
          <Link href={`/herramientas/${encodeURIComponent(id)}`} className="catalogo-foco rounded-sm after:absolute after:inset-0 after:rounded-2xl">
            <bdi dir="auto">{nombre}</bdi>
          </Link>
        </h3>
        <code className="block truncate font-mono text-xs text-muted-foreground">{id}</code>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-1 flex-col gap-4 px-5">
        <p className="line-clamp-3 text-sm text-muted-foreground [overflow-wrap:anywhere]">
          <bdi dir="auto">{descripcion ?? sinDato}</bdi>
          {descripcionTruncada && descripcion !== null ? t("comun.recortado") : null}
        </p>
        <ul aria-label={t("tarjeta.categorias")} className="flex flex-wrap gap-1.5">
          {categorias.map((categoria) => (
            <li key={categoria}>
              <Badge variant="secondary">{t(`categoria.${categoria}`)}</Badge>
            </li>
          ))}
        </ul>
        <dl className="mt-auto grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <Dato etiqueta={t("tarjeta.lenguaje")}>
            <bdi dir="auto">{lenguaje ?? sinDato}</bdi>
          </Dato>
          <Dato etiqueta={t("tarjeta.licencia")}>
            <bdi dir="auto">{textoLicencia(licencia)}</bdi>
          </Dato>
          <Dato etiqueta={t("tarjeta.stars")}>{stars === null ? sinDato : formatoNumero.format(stars)}</Dato>
          <Dato etiqueta={t("tarjeta.mantenimiento")}>
            {nivelMantenimiento === null ? (
              sinDato
            ) : (
              <span className={cn("font-semibold", COLOR_NIVEL[nivelMantenimiento])}>{t(`nivel.${nivelMantenimiento}`)}</span>
            )}
          </Dato>
        </dl>
        <div>
          <IndicadorSalud valor={healthScore} />
        </div>
      </CardContent>
    </Card>
  );
}
