"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NIVELES_MANTENIMIENTO } from "@/lib/catalogo/contrato";
import type { ValoresFiltros } from "@/lib/catalogo/filtros";
import { t } from "@/i18n/es";

export const STARS_MAXIMO = 10_000_000;

export interface PanelFiltrosProps {
  opciones: { lenguajes: string[]; licencias: string[] };
  valores: ValoresFiltros;
  total: number;
  onCambiar: (parcial: Partial<ValoresFiltros>) => void;
}

const CLASE_CONTROL = "catalogo-foco h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-base";

function Campo({ etiqueta, id, children }: { etiqueta: string; id: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={id}>{etiqueta}</Label>
      {children}
    </div>
  );
}

/** Entero decimal 0..STARS_MAXIMO o `undefined` si lo escrito no lo es. Vacío = sin filtro (`null`). */
function leerStars(texto: string): number | null | undefined {
  if (texto === "") return null;
  if (!/^\d{1,8}$/.test(texto)) return undefined;
  const n = Number(texto);
  return n <= STARS_MAXIMO ? n : undefined;
}

/** Filtros secundarios con `label`, `<select>` nativos y, en pantallas chicas, plegables con `<details>` nativo. */
export function PanelFiltros({ opciones, valores, total, onCambiar }: PanelFiltrosProps) {
  const base = useId();
  const idLenguaje = `${base}-lenguaje`;
  const idLicencia = `${base}-licencia`;
  const idMantenimiento = `${base}-mantenimiento`;
  const idStars = `${base}-stars`;
  return (
    <details open className="rounded-2xl border border-border bg-background px-5 py-4">
      <summary className="catalogo-foco flex cursor-pointer items-center justify-between gap-3 rounded-sm text-base font-semibold">
        <span>{t("filtros.titulo")}</span>
        <span className="flex gap-1.5 text-sm font-normal text-muted-foreground">
          <span className="tabular-nums">{total}</span>
          <span>{total === 1 ? t("filtros.resultado.uno") : t("filtros.resultado.otros")}</span>
        </span>
      </summary>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Campo etiqueta={t("filtros.lenguaje")} id={idLenguaje}>
          <select
            id={idLenguaje}
            className={CLASE_CONTROL}
            value={valores.lenguaje ?? ""}
            onChange={(e) => onCambiar({ lenguaje: e.target.value === "" ? null : e.target.value })}
          >
            <option value="">{t("filtros.cualquiera")}</option>
            {opciones.lenguajes.map((lenguaje) => (
              <option key={lenguaje} value={lenguaje}>
                {lenguaje}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta={t("filtros.licencia")} id={idLicencia}>
          <select
            id={idLicencia}
            className={CLASE_CONTROL}
            value={valores.licencia ?? ""}
            onChange={(e) => onCambiar({ licencia: e.target.value === "" ? null : e.target.value })}
          >
            <option value="">{t("filtros.cualquiera")}</option>
            {opciones.licencias.map((licencia) => (
              <option key={licencia} value={licencia}>
                {licencia}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta={t("filtros.mantenimiento")} id={idMantenimiento}>
          <select
            id={idMantenimiento}
            className={CLASE_CONTROL}
            value={valores.mantenimiento ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              onCambiar({ mantenimiento: (NIVELES_MANTENIMIENTO as readonly string[]).includes(v) ? (v as ValoresFiltros["mantenimiento"]) : null });
            }}
          >
            <option value="">{t("filtros.cualquiera")}</option>
            {NIVELES_MANTENIMIENTO.map((nivel) => (
              <option key={nivel} value={nivel}>
                {t(`nivel.${nivel}`)}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta={t("filtros.stars")} id={idStars}>
          <Input
            id={idStars}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={8}
            value={valores.stars === null ? "" : String(valores.stars)}
            onChange={(e) => {
              const n = leerStars(e.target.value);
              if (n !== undefined) onCambiar({ stars: n });
            }}
            className={CLASE_CONTROL}
          />
        </Campo>
      </div>
    </details>
  );
}
