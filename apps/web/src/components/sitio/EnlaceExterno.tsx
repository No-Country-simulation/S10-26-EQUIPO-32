import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { t } from "@/i18n/es";
import { ENLACES } from "./enlaces";

export type DestinoExterno = keyof typeof ENLACES;

export interface EnlaceExternoProps {
  /** Clave de una constante de `enlaces.ts`: el componente no acepta URLs libres (ui-brief §11.3). */
  destino: DestinoExterno;
  className?: string;
  children: ReactNode;
}

/** Enlace a un documento del repositorio: pestaña nueva sin acceso a esta página y aviso para lectores de pantalla. */
export function EnlaceExterno({ destino, className, children }: EnlaceExternoProps) {
  return (
    <a href={ENLACES[destino]} target="_blank" rel="noopener noreferrer" className={cn("catalogo-foco", className)}>
      {children}
      <span className="sr-only">{t("enlace.pestanaNueva")}</span>
    </a>
  );
}
