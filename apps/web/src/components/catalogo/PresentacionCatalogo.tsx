import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n/es";

export interface PresentacionCatalogoProps {
  /** Identificador interno del destino: el componente arma un enlace de fragmento, nunca una URL externa. */
  idCatalogo: string;
}

export function PresentacionCatalogo({ idCatalogo }: PresentacionCatalogoProps) {
  return (
    <section className="catalogo-contenedor flex flex-col items-center py-16 text-center sm:py-24 lg:py-28">
      <h1 className="max-w-4xl text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
        {t("portada.titulo")}
      </h1>
      <p className="mt-6 max-w-2xl text-lg text-balance text-muted-foreground sm:text-xl">{t("portada.subtitulo")}</p>
      <Button asChild className="catalogo-accion mt-10 h-12 px-8 text-base">
        <a href={`#${encodeURIComponent(idCatalogo)}`}>
          {t("portada.accion")}
          <ArrowRight aria-hidden="true" />
        </a>
      </Button>
    </section>
  );
}
