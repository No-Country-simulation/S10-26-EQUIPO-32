import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { HerramientaDetalle } from "@/lib/catalogo/contrato";
import { textoLicencia } from "@/lib/catalogo/licencia";
import { cn } from "@/lib/utils";
import { t } from "@/i18n/es";
import { LogoRepo } from "@/components/marca/LogoRepo";
import { PreviewHerramienta, rutaCaptura } from "@/components/marca/PreviewHerramienta";
import { DesgloseSalud } from "./DesgloseSalud";
import { EstadoVacio } from "./EstadoVacio";
import { IdeaIntegracion } from "./IdeaIntegracion";
import { IndicadorSalud } from "./IndicadorSalud";

export interface FichaHerramientaProps {
  herramienta: HerramientaDetalle;
}

const COLOR_NIVEL = {
  activo: "text-salud-alta",
  moderado: "text-salud-media",
  bajo: "text-salud-baja",
  abandonado: "text-salud-baja",
} as const;

const formatoNumero = new Intl.NumberFormat("es-AR");
// UTC fijo: la misma fecha se ve igual en el servidor y en el navegador (sin diferencias de hidratación).
const formatoFecha = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeZone: "UTC" });

function fecha(iso: string | null): string {
  if (iso === null) return t("comun.sinDato");
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? t("comun.sinDato") : formatoFecha.format(d);
}

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-1">
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="font-medium [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

/**
 * Ficha completa. Todo texto de `herramienta` es externo: texto de React aislado con `<bdi>` (AM-06).
 * El enlace al repositorio solo aparece si `urlRepo` no es null (ya validada); siempre con `rel="noopener noreferrer"` (AM-03).
 */
export function FichaHerramienta({ herramienta: h }: FichaHerramientaProps) {
  const sinDato = t("comun.sinDato");
  return (
    <article className="space-y-10">
      <div className="space-y-6">
        <Link href="/" className="catalogo-foco inline-flex min-h-11 items-center gap-2 rounded-sm text-sm font-medium">
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t("ficha.volver")}
        </Link>
        <header className="min-w-0 space-y-3">
          <LogoRepo id={h.id} className="size-16" />
          <h1 className="text-3xl font-semibold tracking-tight [overflow-wrap:anywhere] sm:text-4xl">
            <bdi dir="auto">{h.nombre}</bdi>
          </h1>
          <code className="block font-mono text-sm break-all text-muted-foreground">{h.id}</code>
          <ul aria-label={t("ficha.categorias")} className="flex flex-wrap gap-1.5">
            {h.categorias.map((categoria) => (
              <li key={categoria}>
                <Badge variant="secondary">{t(`categoria.${categoria}`)}</Badge>
              </li>
            ))}
          </ul>
        </header>
        {/* Pantalla de preview (RF-24): captura real del repo o mockup por categoría; decorativa si es el mockup. */}
        {(rutaCaptura(h.id) !== null || h.categorias[0] !== undefined) && (
          <div className="relative aspect-[16/10] max-w-3xl overflow-hidden rounded-3xl bg-secondary ring-1 ring-border">
            <PreviewHerramienta id={h.id} nombre={h.nombre} categoria={h.categorias[0]} sizes="(min-width: 768px) 48rem, 100vw" />
          </div>
        )}
        <p className="max-w-3xl text-base [overflow-wrap:anywhere] text-muted-foreground">
          <bdi dir="auto">{h.descripcion ?? sinDato}</bdi>
          {h.descripcionTruncada && h.descripcion !== null ? t("comun.recortado") : null}
        </p>
        <dl aria-label={t("ficha.datos")} className="grid gap-x-6 gap-y-5 rounded-2xl bg-secondary p-6 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Dato etiqueta={t("tarjeta.lenguaje")}>
            <bdi dir="auto">{h.lenguaje ?? sinDato}</bdi>
          </Dato>
          <Dato etiqueta={t("tarjeta.licencia")}>
            <bdi dir="auto">{textoLicencia(h.licencia)}</bdi>
          </Dato>
          <Dato etiqueta={t("tarjeta.stars")}>{h.stars === null ? sinDato : formatoNumero.format(h.stars)}</Dato>
          <Dato etiqueta={t("ficha.issues")}>{h.issuesAbiertos === null ? sinDato : formatoNumero.format(h.issuesAbiertos)}</Dato>
          <Dato etiqueta={t("ficha.ultimaActualizacion")}>{fecha(h.ultimaActualizacion)}</Dato>
          <Dato etiqueta={t("ficha.mantenedor")}>
            {h.mantenedorActivo === null ? sinDato : h.mantenedorActivo ? t("ficha.si") : t("ficha.no")}
          </Dato>
          <Dato etiqueta={t("tarjeta.mantenimiento")}>
            {h.nivelMantenimiento === null ? (
              sinDato
            ) : (
              <span className={cn("font-semibold", COLOR_NIVEL[h.nivelMantenimiento])}>{t(`nivel.${h.nivelMantenimiento}`)}</span>
            )}
          </Dato>
          <Dato etiqueta={t("salud.etiqueta")}>
            <IndicadorSalud valor={h.healthScore} />
          </Dato>
        </dl>
        <DesgloseSalud desglose={h.desgloseSalud} />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <p className="text-sm text-muted-foreground">
            {t("ficha.metricasAl")} {fecha(h.metricasTomadasEn)}
          </p>
          {h.urlRepo !== null && (
            <a
              href={h.urlRepo}
              target="_blank"
              rel="noopener noreferrer"
              className="catalogo-foco inline-flex min-h-11 max-w-full items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground [overflow-wrap:anywhere]"
            >
              {t("ficha.repositorio")}
              <ExternalLink aria-hidden="true" className="size-4 shrink-0" />
            </a>
          )}
        </div>
      </div>
      <section aria-labelledby="titulo-ideas" className="space-y-5">
        <h2 id="titulo-ideas" className="text-2xl font-semibold tracking-tight">
          {t("ficha.ideas")}
        </h2>
        {h.ideas.length === 0 ? (
          <EstadoVacio titulo={t("ficha.sinIdeas.titulo")} texto={t("ficha.sinIdeas.texto")} />
        ) : (
          <ul className="space-y-5">
            {h.ideas.map((idea, i) => (
              <li key={i} className="min-w-0">
                <IdeaIntegracion idea={idea} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
