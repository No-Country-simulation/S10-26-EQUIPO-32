"use client";

import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n/es";

export interface BloqueSnippetProps {
  /** Código de la idea (dato externo): solo se muestra como texto dentro de <pre><code>, nunca como enlaces ni HTML. */
  codigo: string;
  /** `!snippetExcedeLimite`: con `false` no hay botón de copiar (un comando copiado a medias puede ser peligroso). */
  copiable: boolean;
  onCopiar: () => void;
}

/** `<pre><code>` con desplazamiento propio (sin scroll horizontal de página) y, si es copiable, el botón «Copiar». */
export function BloqueSnippet({ codigo, copiable, onCopiar }: BloqueSnippetProps) {
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
        <Button type="button" variant="secondary" onClick={onCopiar} className="catalogo-foco min-h-11 gap-2 rounded-full px-5">
          <Copy aria-hidden="true" />
          {t("snippet.copiar")}
        </Button>
      )}
    </div>
  );
}
