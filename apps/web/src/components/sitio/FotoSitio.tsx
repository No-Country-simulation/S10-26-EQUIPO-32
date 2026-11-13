import Image from "next/image";
import fuentes from "../../../public/imagenes/fuentes.json";
import { cn } from "@/lib/utils";

// Fotos decorativas (feature 007; RF-25, RNF-31): solo las listadas en public/imagenes/fuentes.json, servidas por el
// sitio con next/image. Nunca se usan como captura de una herramienta; el crédito está en el footer.
export type IdFoto = "portada" | "asistente" | "seguridad";

const FOTOS = new Map(fuentes.fotos.map((f) => [f.id, f]));

export function fotosConCredito() {
  return fuentes.fotos.map(({ id, autor, fuente }) => ({ id, autor, fuente }));
}

/** Foto con `alt` descriptivo del manifiesto. Si el id no está en el manifiesto, no dibuja nada. */
export function FotoSitio({ id, sizes, className }: { id: IdFoto; sizes: string; className?: string }) {
  const foto = FOTOS.get(id);
  if (foto === undefined) return null;
  return (
    <Image
      data-ob-foto=""
      src={`/imagenes/${foto.archivo}`}
      alt={foto.alt}
      width={foto.ancho}
      height={foto.alto}
      sizes={sizes}
      draggable={false}
      className={cn("h-full w-full object-cover", className)}
    />
  );
}
