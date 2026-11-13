import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/i18n/es";
import { iniciales } from "./iniciales";

export interface HerramientaDestacada {
  id: string;
  nombre: string;
}

export interface PresentacionCatalogoProps {
  /** Identificador interno del destino: el componente arma un enlace de fragmento, nunca una URL externa. */
  idCatalogo: string;
  /** Identificador interno de la sección de seguridad (acción secundaria). */
  idSeguridad?: string;
  /** Herramientas reales del catálogo para los tiles del titular (se usan hasta 4; sin ellas no hay tiles). */
  destacadas?: HerramientaDestacada[];
}

// Variantes neutras de los tiles: negro, gris y blanco con borde, con un giro leve como en la referencia.
const TILES = [
  "bg-primary text-primary-foreground -rotate-6",
  "bg-secondary text-foreground ring-1 ring-border rotate-3",
  "bg-background text-foreground ring-1 ring-input -rotate-3",
  "bg-grafito text-primary-foreground rotate-6",
] as const;

function Tile({ herramienta, variante, className }: { herramienta: HerramientaDestacada | undefined; variante: number; className?: string }) {
  if (herramienta === undefined) return null;
  return (
    <span
      className={cn(
        "mx-[0.14em] inline-flex size-[0.9em] -translate-y-[0.06em] items-center justify-center rounded-[0.24em] align-middle shadow-sm",
        TILES[variante % TILES.length],
        className,
      )}
    >
      <span className="text-[0.34em] leading-none font-bold tracking-normal">{iniciales(herramienta.nombre, herramienta.id)}</span>
    </span>
  );
}

/** Portada centrada (ui-brief §11.2 #2): titular en 3 líneas con tiles de iniciales, subtítulo y dos acciones. */
export function PresentacionCatalogo({ idCatalogo, idSeguridad = "seguridad", destacadas = [] }: PresentacionCatalogoProps) {
  const [a, b, c, d] = destacadas;
  return (
    <section className="catalogo-contenedor flex flex-col items-center pt-20 pb-24 text-center sm:pt-28 sm:pb-32 lg:pt-36 lg:pb-40">
      <h1 className="max-w-5xl text-[2.35rem] leading-[1.04] font-semibold tracking-[-0.035em] sm:text-6xl lg:text-[4.25rem]">
        {/* El lector de pantalla lee la frase completa; la versión visual con tiles es decorativa. */}
        <span className="sr-only">{t("portada.titulo")}</span>
        <span aria-hidden="true">
          <span className="block">
            {t("portada.linea1a")}
            <Tile herramienta={a} variante={0} />
            {t("portada.linea1b")}
          </span>
          <span className="block">
            {t("portada.linea2a")}
            <Tile herramienta={b} variante={1} />
            <Tile herramienta={c} variante={2} />
            {t("portada.linea2b")}
          </span>
          <span className="block">
            {t("portada.linea3")}
            <Tile herramienta={d} variante={3} className="hidden sm:inline-flex" />
          </span>
        </span>
      </h1>
      <p className="mt-7 max-w-xl text-lg text-balance text-muted-foreground sm:text-xl">{t("portada.subtitulo")}</p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <a
          href={`#${encodeURIComponent(idCatalogo)}`}
          className="catalogo-foco inline-flex min-h-12 items-center rounded-full bg-primary px-6 text-[1.05rem] font-medium text-primary-foreground transition-colors hover:bg-primary/85"
        >
          {t("portada.accion")}
        </a>
        <a
          href={`#${encodeURIComponent(idSeguridad)}`}
          className="catalogo-foco inline-flex min-h-12 items-center gap-2 rounded-full bg-secondary px-6 text-[1.05rem] font-medium text-foreground transition-colors hover:bg-secundario-hover"
        >
          {t("portada.accionSecundaria")}
          <ArrowRight aria-hidden="true" className="size-4" />
        </a>
      </div>
    </section>
  );
}
