"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { useAsistente } from "@/components/asistente/Asistente";
import { EnlaceExterno } from "@/components/sitio/EnlaceExterno";
import { cn } from "@/lib/utils";
import { t } from "@/i18n/es";

export const CLASE_NAV =
  "catalogo-foco inline-flex min-h-11 items-center rounded-full px-3 text-[0.95rem] font-medium text-foreground transition-colors hover:bg-secondary";

// A partir de cuánto scroll aparece el CTA (aprox. el alto del hero).
const UMBRAL_CTA = 520;

/**
 * Cabecera sticky minimalista (ui-brief §11.2 #1 y §12.2 #5c). El panel del asistente se posiciona contra este
 * `header` (`absolute top-full`). Al scrollear aparece el CTA «Probar el asistente», que abre el mismo panel.
 * Oculto, el CTA es `invisible`: no se enfoca ni lo anuncia el lector de pantalla.
 */
export function Cabecera() {
  const asistente = useAsistente();
  const [conCta, setConCta] = useState(false);

  useEffect(() => {
    const medir = () => setConCta(window.scrollY > UMBRAL_CTA);
    medir();
    window.addEventListener("scroll", medir, { passive: true });
    return () => window.removeEventListener("scroll", medir);
  }, []);

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
              <button
                type="button"
                aria-expanded={asistente.abierto}
                aria-controls={asistente.id}
                onClick={asistente.alternar}
                className={cn(CLASE_NAV, "cursor-pointer aria-expanded:bg-secondary")}
              >
                {t("cabecera.asistente")}
              </button>
            </li>
            <li>
              <Link href="/#seguridad" className={CLASE_NAV}>
                {t("cabecera.seguridad")}
              </Link>
            </li>
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <EnlaceExterno destino="repositorio" className={cn(CLASE_NAV, "gap-1.5")}>
            {t("cabecera.github")}
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </EnlaceExterno>
          <button
            type="button"
            aria-expanded={asistente.abierto}
            aria-controls={asistente.id}
            onClick={asistente.alternar}
            className={cn(
              "catalogo-foco hidden min-h-11 cursor-pointer items-center gap-2 rounded-full bg-primary px-5 text-[0.95rem] font-medium text-primary-foreground transition-all duration-300 hover:bg-primary/85 sm:inline-flex motion-reduce:transition-none",
              conCta ? "visible translate-y-0 opacity-100" : "invisible translate-y-1 opacity-0",
            )}
          >
            <Sparkles aria-hidden="true" className="size-4" />
            {t("cabecera.cta")}
          </button>
        </div>
      </div>
      {asistente.panel}
    </header>
  );
}
