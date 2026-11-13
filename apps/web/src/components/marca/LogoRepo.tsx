import fuentes from "../../../public/logos/fuentes.json";
import { cn } from "@/lib/utils";
import { MarcaRepo } from "./MarcaRepo";

// Logos oficiales (feature 005; RF-18, RNF-26): el avatar de la org u owner que descargó y validó la ingesta
// (PNG o JPEG por magic bytes, ≤ 200 KB) y que sirve el propio sitio (`img-src 'self'`, sin hosts externos).
// Solo se usan archivos listados en public/logos/fuentes.json cuyo nombre es exactamente `<id>.png|jpg`.
const ID = /^[a-z0-9][a-z0-9._-]{0,99}$/;
const ARCHIVOS: ReadonlyMap<string, string> = new Map(
  (fuentes.logos as Array<{ id: unknown; archivo: unknown }>)
    .filter(
      (l): l is { id: string; archivo: string } =>
        typeof l.id === "string" && ID.test(l.id) && !l.id.includes("..") && (l.archivo === `${l.id}.png` || l.archivo === `${l.id}.jpg`),
    )
    .map((l) => [l.id, l.archivo]),
);

/** Ruta pública del logo de un repo, o `null` si no hay (entonces se usa la marca generativa). */
export function rutaLogo(id: string): string | null {
  const archivo = ARCHIVOS.get(id);
  return archivo === undefined ? null : `/logos/${archivo}`;
}

export interface LogoRepoProps {
  /** Id del repo (ASCII estricto del contrato). Es lo único que se usa para elegir el archivo. */
  id: string;
  className?: string;
}

/** Logo oficial del repo con el mismo tile redondeado que la marca generativa; si falta, `MarcaRepo`. Decorativo. */
export function LogoRepo({ id, className }: LogoRepoProps) {
  const ruta = rutaLogo(id);
  if (ruta === null) return <MarcaRepo id={id} className={className} />;
  return (
    // Archivo propio y estático: el optimizador de next/image no aporta y está prohibido por ui-brief §5.3.
    // loading="lazy": además evita que React emita un <link rel="preload"> por cada logo.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      data-ob-logo=""
      src={ruta}
      alt=""
      aria-hidden="true"
      width={128}
      height={128}
      loading="lazy"
      decoding="async"
      draggable={false}
      className={cn("size-12 shrink-0 rounded-[23%] bg-white object-cover shadow-sm ring-1 ring-black/5", className)}
    />
  );
}
