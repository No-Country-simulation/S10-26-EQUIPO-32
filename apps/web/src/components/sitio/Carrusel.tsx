"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { LogoRepo } from "@/components/marca/LogoRepo";
import { PantallaPreview } from "@/components/marca/PantallaPreview";
import type { Categoria } from "@/lib/catalogo/categorias";
import { t } from "@/i18n/es";

export interface ItemCarrusel {
  id: string;
  nombre: string;
  descripcion: string | null;
  categoria: Categoria;
}

const CLASE_FLECHA =
  "catalogo-foco inline-flex size-11 cursor-pointer items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:bg-secundario-hover disabled:cursor-default disabled:opacity-40";

/**
 * Carrusel «Joyful onboarding» (ui-brief §12.2 #4): tarjetas grandes con pantalla y marca, scroll-snap y flechas
 * (botones nativos, operables con teclado). Con movimiento reducido, el desplazamiento es instantáneo.
 */
export function Carrusel({ id, items }: { id: string; items: ItemCarrusel[] }) {
  const pista = useRef<HTMLUListElement>(null);
  const [bordes, setBordes] = useState({ inicio: true, fin: false });

  const medir = useCallback(() => {
    const el = pista.current;
    if (!el) return;
    setBordes({ inicio: el.scrollLeft <= 4, fin: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [medir]);

  const mover = (sentido: 1 | -1) => {
    const el = pista.current;
    if (!el) return;
    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const paso = (el.querySelector("li")?.clientWidth ?? el.clientWidth) + 20;
    el.scrollBy({ left: sentido * paso, behavior: quieto ? "auto" : "smooth" });
  };

  if (items.length === 0) return null;
  return (
    <section aria-labelledby={`${id}-titulo`} className="pb-24 sm:pb-32">
      <div className="catalogo-contenedor flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h2 id={`${id}-titulo`} className="text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
            {t("carrusel.titulo")}
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">{t("carrusel.subtitulo")}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" aria-controls={`${id}-pista`} aria-label={t("carrusel.anterior")} disabled={bordes.inicio} onClick={() => mover(-1)} className={CLASE_FLECHA}>
            <ArrowLeft aria-hidden="true" className="size-5" />
          </button>
          <button type="button" aria-controls={`${id}-pista`} aria-label={t("carrusel.siguiente")} disabled={bordes.fin} onClick={() => mover(1)} className={CLASE_FLECHA}>
            <ArrowRight aria-hidden="true" className="size-5" />
          </button>
        </div>
      </div>
      <ul
        id={`${id}-pista`}
        ref={pista}
        onScroll={medir}
        aria-label={t("carrusel.region")}
        className="ob-carrusel mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-px-5 px-5 pb-4 sm:scroll-px-8 sm:px-8 xl:scroll-px-[calc((100vw-72rem)/2+2rem)] xl:px-[calc((100vw-72rem)/2+2rem)]"
      >
        {items.map((item) => (
          <li key={item.id} className="w-[min(82vw,26rem)] shrink-0 snap-start">
            <Link href={`/herramientas/${encodeURIComponent(item.id)}`} className="catalogo-foco group/carrusel block rounded-[2rem]">
              <span className="block aspect-[4/3] overflow-hidden rounded-[2rem] ring-1 ring-border">
                <PantallaPreview id={item.id} categoria={item.categoria} className="ob-escala transition-transform duration-300 group-hover/carrusel:scale-[1.02]" />
              </span>
              <span className="mt-4 flex min-w-0 items-center gap-3">
                <LogoRepo id={item.id} className="size-11" />
                <span className="min-w-0">
                  <bdi dir="auto" className="block truncate text-base font-semibold">
                    {item.nombre}
                  </bdi>
                  <span className="block truncate text-sm text-muted-foreground">{t(`categoria.${item.categoria}`)}</span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
