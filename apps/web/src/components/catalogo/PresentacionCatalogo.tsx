import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/i18n/es";
import { LogoRepo } from "@/components/marca/LogoRepo";

export interface HerramientaDestacada {
  id: string;
  nombre: string;
}

export interface PresentacionCatalogoProps {
  /** Identificador interno del destino: el componente arma un enlace de fragmento, nunca una URL externa. */
  idCatalogo: string;
  /** Identificador interno de la sección de seguridad (acción secundaria). */
  idSeguridad?: string;
  /** Herramientas reales del catálogo para los tiles del titular (hasta 12: 4 tiles × 3 que rotan; sin ellas no hay tiles). */
  destacadas?: HerramientaDestacada[];
}

// Giro leve de cada tile, como en la referencia.
const GIROS = ["-rotate-6", "rotate-3", "-rotate-3", "rotate-6"] as const;

/**
 * Tile inline del titular: marcas generativas de hasta 3 repos reales que rotan con una animación CSS (`ob-rotar`);
 * con movimiento reducido queda fija la primera. Sin letras (ui-brief §12.1).
 */
function Tile({ grupo, variante, className }: { grupo: HerramientaDestacada[]; variante: number; className?: string }) {
  if (grupo.length === 0) return null;
  return (
    <span className={cn("ob-rotar relative mx-[0.14em] inline-block size-[0.9em] -translate-y-[0.06em] align-middle", GIROS[variante % GIROS.length], className)}>
      {grupo.map((h) => (
        <LogoRepo key={h.id} id={h.id} className="absolute inset-0 size-full drop-shadow-md" />
      ))}
    </span>
  );
}

/** Portada centrada (ui-brief §11.2 #2): titular en 3 líneas con tiles de marcas generativas, subtítulo y dos acciones. */
export function PresentacionCatalogo({ idCatalogo, idSeguridad = "seguridad", destacadas = [] }: PresentacionCatalogoProps) {
  // Tile i rota entre los repos i, i+4 e i+8 de las destacadas.
  const grupo = (i: number) => [destacadas[i], destacadas[i + 4], destacadas[i + 8]].filter((h): h is HerramientaDestacada => h !== undefined);
  return (
    <section className="catalogo-contenedor flex flex-col items-center pt-20 pb-24 text-center sm:pt-28 sm:pb-32 lg:pt-36 lg:pb-40">
      <h1 className="max-w-5xl text-[2.35rem] leading-[1.04] font-semibold tracking-[-0.035em] sm:text-6xl lg:text-[4.25rem]">
        {/* El lector de pantalla lee la frase completa; la versión visual con tiles es decorativa. */}
        <span className="sr-only">{t("portada.titulo")}</span>
        <span aria-hidden="true">
          <span className="block">
            {t("portada.linea1a")}
            <Tile grupo={grupo(0)} variante={0} />
            {t("portada.linea1b")}
          </span>
          <span className="block">
            {t("portada.linea2a")}
            <Tile grupo={grupo(1)} variante={1} />
            <Tile grupo={grupo(2)} variante={2} />
            {t("portada.linea2b")}
          </span>
          <span className="block">
            {t("portada.linea3")}
            <Tile grupo={grupo(3)} variante={3} className="hidden sm:inline-block" />
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
