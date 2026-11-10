import { cn } from "@/lib/utils";
import { t } from "@/i18n/es";

export interface IndicadorSaludProps {
  valor: number | null;
}

type Banda = "alta" | "media" | "baja";

// Solo presentación: el health score lo calcula el pipeline; acá se elige el color y el texto de la franja.
function banda(valor: number): Banda {
  if (valor >= 70) return "alta";
  if (valor >= 40) return "media";
  return "baja";
}

const COLORES: Record<Banda, string> = {
  alta: "bg-salud-alta-fondo text-salud-alta",
  media: "bg-salud-media-fondo text-salud-media",
  baja: "bg-salud-baja-fondo text-salud-baja",
};

/** Health score 0-100 con color, número y palabra: no depende solo del color (1.4.1). */
export function IndicadorSalud({ valor }: IndicadorSaludProps) {
  if (valor === null || !Number.isFinite(valor)) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>{t("salud.etiqueta")}</span>
        <span>{t("comun.sinDato")}</span>
      </span>
    );
  }
  const franja = banda(valor);
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", COLORES[franja])}>
      <span aria-hidden="true" className="size-2 rounded-full bg-current" />
      <span>{t("salud.etiqueta")}</span>
      <span className="tabular-nums">{valor}</span>
      <span className="sr-only">{t("salud.de")}</span>
      <span>{t(`salud.${franja}`)}</span>
    </span>
  );
}
