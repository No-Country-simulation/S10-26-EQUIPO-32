"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { LogoRepo } from "@/components/marca/LogoRepo";
import { PantallaPreview } from "@/components/marca/PantallaPreview";
import type { Categoria } from "@/lib/catalogo/categorias";
import { cn } from "@/lib/utils";
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
 * (botones nativos, operables con teclado), puntos de posición (RF-22) y arrastre con mouse (el touch ya desplaza la
 * pista de forma nativa). Con movimiento reducido, el desplazamiento es instantáneo.
 */
export function Carrusel({ id, items }: { id: string; items: ItemCarrusel[] }) {
  const pista = useRef<HTMLUListElement>(null);
  const [bordes, setBordes] = useState({ inicio: true, fin: false });
  const [actual, setActual] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);
  // Arrastre con mouse: `inicioX` null = sin gesto; `movio` distingue un clic de un arrastre.
  const gesto = useRef<{ inicioX: number; inicioScroll: number; movio: boolean } | null>(null);

  const medir = useCallback(() => {
    const el = pista.current;
    if (!el) return;
    const fin = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    setBordes({ inicio: el.scrollLeft <= 4, fin });
    // Tarjeta activa: la primera cuyo borde izquierdo queda a la derecha del scroll actual (la última si se llegó al fin).
    const tarjetas = Array.from(el.querySelectorAll("li"));
    const margen = parseFloat(getComputedStyle(el).paddingLeft) || 0;
    const centro = el.scrollLeft + margen + 8;
    let indice = tarjetas.findIndex((li) => li.offsetLeft + li.offsetWidth / 2 > centro);
    if (indice === -1 || fin) indice = tarjetas.length - 1;
    setActual(Math.max(0, indice));
  }, []);

  useEffect(() => {
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [medir]);

  const irA = (indice: number) => {
    const el = pista.current;
    const li = el?.querySelectorAll("li")[indice];
    if (!el || !li) return;
    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const margen = parseFloat(getComputedStyle(el).paddingLeft) || 0;
    el.scrollTo({ left: li.offsetLeft - margen, behavior: quieto ? "auto" : "smooth" });
  };

  const alPresionar = (e: PointerEvent<HTMLUListElement>) => {
    if (e.pointerType !== "mouse" || e.button !== 0 || !pista.current) return;
    gesto.current = { inicioX: e.clientX, inicioScroll: pista.current.scrollLeft, movio: false };
  };
  const alMover = (e: PointerEvent<HTMLUListElement>) => {
    const g = gesto.current;
    const el = pista.current;
    if (!g || !el) return;
    const dx = e.clientX - g.inicioX;
    if (!g.movio && Math.abs(dx) < 6) return;
    if (!g.movio) {
      g.movio = true;
      setArrastrando(true);
      el.setPointerCapture(e.pointerId);
    }
    el.scrollLeft = g.inicioScroll - dx;
  };
  const alSoltar = (e: PointerEvent<HTMLUListElement>) => {
    const el = pista.current;
    if (el?.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    setArrastrando(false);
    // `movio` se limpia después del clic que sigue al soltar, para que el arrastre no abra la ficha.
    if (gesto.current?.movio) setTimeout(() => (gesto.current = null), 0);
    else gesto.current = null;
  };

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
        onPointerDown={alPresionar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={alSoltar}
        onClickCapture={(e) => {
          if (gesto.current?.movio) e.preventDefault();
        }}
        onDragStart={(e) => e.preventDefault()}
        aria-label={t("carrusel.region")}
        className={cn(
          "ob-carrusel relative mt-10 flex gap-5 overflow-x-auto scroll-px-5 px-5 pb-4 sm:scroll-px-8 sm:px-8 xl:scroll-px-[calc((100vw-72rem)/2+2rem)] xl:px-[calc((100vw-72rem)/2+2rem)]",
          // Mientras se arrastra con el mouse se apaga el snap para que la pista siga al puntero.
          arrastrando ? "cursor-grabbing snap-none select-none" : "snap-x snap-mandatory md:cursor-grab",
        )}
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
      {/* Puntos de posición (RF-22): botones nativos; el activo se marca con aria-current. */}
      <ul aria-label={t("carrusel.puntos")} className="mt-4 flex flex-wrap justify-center gap-1">
        {items.map((item, i) => (
          <li key={item.id}>
            <button
              type="button"
              aria-controls={`${id}-pista`}
              aria-current={i === actual ? "true" : undefined}
              aria-label={`${t("carrusel.ir")} ${i + 1} / ${items.length}`}
              onClick={() => irA(i)}
              className="catalogo-foco group/punto flex size-6 cursor-pointer items-center justify-center rounded-full"
            >
              <span
                aria-hidden="true"
                className={cn("block rounded-full transition-all duration-300 motion-reduce:transition-none", i === actual ? "h-2 w-6 bg-foreground" : "size-2 bg-foreground/30 group-hover/punto:bg-foreground/60")}
              />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
