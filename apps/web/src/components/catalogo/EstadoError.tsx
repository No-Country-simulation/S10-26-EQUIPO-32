"use client";

import { CircleAlert, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n/es";

export interface EstadoErrorProps {
  onReintentar?: () => void;
}

export function EstadoError({ onReintentar }: EstadoErrorProps) {
  return (
    <section role="alert" aria-label={t("estado.error.titulo")} className="catalogo-estado">
      <CircleAlert aria-hidden="true" className="mb-6 size-8 text-destructive" />
      <h2 className="catalogo-estado-titulo">{t("estado.error.titulo")}</h2>
      <p className="catalogo-estado-texto">{t("estado.error.texto")}</p>
      {onReintentar && (
        <Button type="button" onClick={onReintentar} className="catalogo-accion">
          <RotateCcw aria-hidden="true" />
          {t("estado.error.reintentar")}
        </Button>
      )}
    </section>
  );
}
