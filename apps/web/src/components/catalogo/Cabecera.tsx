import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Asistente } from "@/components/asistente/Asistente";
import { EnlaceExterno } from "@/components/sitio/EnlaceExterno";
import { t } from "@/i18n/es";

export const CLASE_NAV =
  "catalogo-foco inline-flex min-h-11 items-center rounded-full px-3 text-[0.95rem] font-medium text-foreground transition-colors hover:bg-secondary";

/**
 * Cabecera sticky minimalista (ui-brief §11.2 #1). El panel del asistente se posiciona contra este `header`
 * (`absolute top-full`), por eso ningún contenedor intermedio lleva `position`.
 */
export function Cabecera() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="catalogo-contenedor flex flex-wrap items-center gap-x-6 gap-y-1 py-3 md:h-[4.5rem] md:flex-nowrap md:py-0">
        <Link href="/" className="catalogo-foco rounded-sm text-xl font-bold tracking-tight">
          {t("sitio.nombre")}
        </Link>
        <nav aria-label={t("cabecera.navegacion")} className="order-last -mx-3 basis-full md:order-none md:mx-0 md:basis-auto">
          <ul className="flex flex-wrap items-center gap-1">
            <li>
              <Link href="/#catalogo" className={CLASE_NAV}>
                {t("cabecera.catalogo")}
              </Link>
            </li>
            <li>
              <Asistente />
            </li>
            <li>
              <Link href="/#seguridad" className={CLASE_NAV}>
                {t("cabecera.seguridad")}
              </Link>
            </li>
          </ul>
        </nav>
        <EnlaceExterno
          destino="repositorio"
          className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-5 text-[0.95rem] font-medium text-primary-foreground transition-colors hover:bg-primary/85"
        >
          {t("cabecera.github")}
          <ArrowUpRight aria-hidden="true" className="size-4" />
        </EnlaceExterno>
      </div>
    </header>
  );
}
