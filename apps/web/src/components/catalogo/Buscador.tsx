"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { t } from "@/i18n/es";

export const LARGO_MAXIMO_BUSQUEDA = 100;

export interface BuscadorProps {
  valor: string;
  onBuscar: (q: string) => void;
}

/** Campo de búsqueda con etiqueta visible. El texto escrito nunca se interpreta: solo se devuelve a quien lo usa. */
export function Buscador({ valor, onBuscar }: BuscadorProps) {
  const id = useId();
  return (
    <div role="search" className="space-y-2">
      <Label htmlFor={id}>{t("buscador.etiqueta")}</Label>
      <Input
        id={id}
        type="search"
        value={valor}
        maxLength={LARGO_MAXIMO_BUSQUEDA}
        autoComplete="off"
        spellCheck={false}
        placeholder={t("buscador.placeholder")}
        onChange={(evento) => onBuscar(evento.target.value)}
        className="catalogo-foco h-11 rounded-full px-5 text-base"
      />
    </div>
  );
}
