"use client";

import { useId } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { t } from "@/i18n/es";

export const LARGO_MAXIMO_BUSQUEDA = 100;

export interface BuscadorProps {
  valor: string;
  onBuscar: (q: string) => void;
  /** Enter en el campo: quien lo usa lleva al resultado (feature 008). */
  onEnter?: () => void;
}

/**
 * Buscador central del explorador. La etiqueta existe (3.3.2, 4.1.2) pero se oculta visualmente, como en la
 * referencia; el ícono es decorativo. El texto escrito nunca se interpreta: solo se devuelve a quien lo usa.
 */
export function Buscador({ valor, onBuscar, onEnter }: BuscadorProps) {
  const id = useId();
  return (
    <div role="search" className="relative">
      <Label htmlFor={id} className="sr-only">
        {t("buscador.etiqueta")}
      </Label>
      <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-5 size-5 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={id}
        type="search"
        value={valor}
        maxLength={LARGO_MAXIMO_BUSQUEDA}
        autoComplete="off"
        spellCheck={false}
        placeholder={t("buscador.placeholder")}
        onChange={(evento) => onBuscar(evento.target.value)}
        onKeyDown={(evento) => {
          if (evento.key === "Enter") {
            evento.preventDefault();
            onEnter?.();
          }
        }}
        className="catalogo-foco h-14 rounded-full border-input bg-background pr-5 pl-13 text-base shadow-sm"
      />
    </div>
  );
}
