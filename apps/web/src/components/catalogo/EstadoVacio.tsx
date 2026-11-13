"use client";

import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n/es";

export interface EstadoVacioProps {
  titulo: string;
  texto: string;
  accion?: { etiqueta: string; onClick: () => void };
}

export function EstadoVacio({ titulo, texto, accion }: EstadoVacioProps) {
  return (
    <section aria-label={t("estado.vacio.region")} className="catalogo-estado">
      <SearchX aria-hidden="true" className="mb-6 size-8 text-muted-foreground" />
      <h2 className="catalogo-estado-titulo"><bdi dir="auto">{titulo}</bdi></h2>
      <p className="catalogo-estado-texto"><bdi dir="auto">{texto}</bdi></p>
      {accion && (
        <Button type="button" onClick={accion.onClick} className="catalogo-accion">
          <bdi dir="auto" className="line-clamp-2 [overflow-wrap:anywhere]">{accion.etiqueta}</bdi>
        </Button>
      )}
    </section>
  );
}
