"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n/es";

export interface BloqueSnippetProps {
  /** Código de la idea (dato externo): solo se muestra como texto dentro de <pre><code>, nunca como enlaces ni HTML. */
  codigo: string;
  /** `!snippetExcedeLimite`: con `false` no hay botón de copiar (un comando copiado a medias puede ser peligroso). */
  copiable: boolean;
  /** Copia el código; si rechaza o lanza, el botón avisa que no se pudo copiar. */
  onCopiar: () => void | Promise<void>;
  /** Id del aviso de «no revisada»: el botón lo toma como descripción, así el aviso queda ligado a «Copiar» (AM-04). */
  avisoId?: string;
}

const MS_COPIADO = 2000;

/** `<pre><code>` con desplazamiento propio (sin scroll horizontal de página) y, si es copiable, el botón «Copiar». */
export function BloqueSnippet({ codigo, copiable, onCopiar, avisoId }: BloqueSnippetProps) {
  const [estado, setEstado] = useState<"reposo" | "copiado" | "error">("reposo");
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (temporizador.current !== null) clearTimeout(temporizador.current);
  }, []);

  async function copiar() {
    let resultado: "copiado" | "error" = "copiado";
    try {
      await onCopiar();
    } catch {
      resultado = "error"; // sin detalle: el navegador puede negar el portapapeles
    }
    setEstado(resultado);
    if (temporizador.current !== null) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setEstado("reposo"), MS_COPIADO);
  }

  return (
    <div className="min-w-0 space-y-3">
      {/* tabIndex: una región desplazable debe poder recorrerse con teclado (2.1.1). */}
      <pre
        tabIndex={0}
        aria-label={t("snippet.region")}
        className="catalogo-foco max-w-full overflow-x-auto rounded-xl bg-secondary p-4 text-sm leading-relaxed"
      >
        <code className="font-mono">{codigo}</code>
      </pre>
      {copiable && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => void copiar()}
            aria-describedby={avisoId}
            className="catalogo-foco min-h-11 gap-2 rounded-full px-5"
          >
            {estado === "copiado" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {estado === "copiado" ? t("snippet.copiado") : t("snippet.copiar")}
          </Button>
          <span role="status" className="text-sm text-muted-foreground">
            {estado === "error" ? t("snippet.errorCopiar") : null}
          </span>
        </div>
      )}
    </div>
  );
}
