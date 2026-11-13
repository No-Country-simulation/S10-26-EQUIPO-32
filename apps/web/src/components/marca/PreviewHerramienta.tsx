import Image from "next/image";
import fuentes from "../../../public/capturas/fuentes.json";
import type { Categoria } from "@/lib/catalogo/categorias";
import { t } from "@/i18n/es";
import { cn } from "@/lib/utils";
import { PantallaPreview } from "./PantallaPreview";

// Capturas de producto (feature 007; RF-24, RNF-30, RNF-31, RNF-32): el archivo que descargó y validó la ingesta
// (PNG, JPEG o WebP por magic bytes, ≤ 600 KB) desde el README del propio repo, servido por el sitio (`img-src 'self'`).
// Solo se usan archivos listados en public/capturas/fuentes.json cuyo nombre es exactamente `<id>.png|jpg|webp`: la
// captura de un repo no puede aparecer en la card de otro, porque la ruta se arma SOLO con el id de la herramienta.
const ID = /^[a-z0-9][a-z0-9._-]{0,99}$/;
const ARCHIVOS: ReadonlyMap<string, string> = new Map(
  (fuentes.capturas as Array<{ id: unknown; archivo: unknown }>)
    .filter(
      (c): c is { id: string; archivo: string } =>
        typeof c.id === "string" &&
        ID.test(c.id) &&
        !c.id.includes("..") &&
        (c.archivo === `${c.id}.png` || c.archivo === `${c.id}.jpg` || c.archivo === `${c.id}.webp`),
    )
    .map((c) => [c.id, c.archivo]),
);

/** Ruta pública de la captura de un repo, o `null` si no hay (entonces queda la pantalla de preview). */
export function rutaCaptura(id: string): string | null {
  const archivo = ARCHIVOS.get(id);
  return archivo === undefined ? null : `/capturas/${archivo}`;
}

export interface PreviewHerramientaProps {
  /** Id de la herramienta (ASCII estricto del contrato). Es lo único que elige el archivo. */
  id: string;
  /** Nombre para el texto alternativo; se escapa como cualquier atributo de React. */
  nombre: string;
  categoria?: Categoria;
  /** Tamaños reales de la imagen según el diseño (para que `next/image` pida el ancho justo). */
  sizes: string;
  className?: string;
}

/**
 * Pantalla de preview de una herramienta: su captura real si la ingesta encontró una válida; si no, la
 * `PantallaPreview` generativa. Nunca muestra la imagen de otro producto. El contenedor lo pone quien la usa.
 */
export function PreviewHerramienta({ id, nombre, categoria, sizes, className }: PreviewHerramientaProps) {
  const ruta = rutaCaptura(id);
  if (ruta !== null) {
    return (
      <Image
        data-ob-captura=""
        src={ruta}
        alt={`${t("captura.alt")} ${nombre}`}
        fill
        sizes={sizes}
        draggable={false}
        className={cn("object-cover object-top", className)}
      />
    );
  }
  if (categoria === undefined) return null;
  return <PantallaPreview id={id} categoria={categoria} className={className} />;
}
