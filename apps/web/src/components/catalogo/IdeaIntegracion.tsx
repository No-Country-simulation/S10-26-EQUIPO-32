"use client";

import { useId } from "react";
import { BadgeCheck, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Idea } from "@/lib/catalogo/contrato";
import { t } from "@/i18n/es";
import { BloqueSnippet } from "./BloqueSnippet";

export interface IdeaIntegracionProps {
  idea: Idea;
}

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-1">
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="[overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

function ListaDeTextos({ items }: { items: string[] }) {
  if (items.length === 0) return <>{t("comun.sinDato")}</>;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <li key={i} className="min-w-0 max-w-full">
          <Badge variant="secondary" className="h-auto max-w-full whitespace-normal py-1 text-left">
            <bdi dir="auto" className="[overflow-wrap:anywhere]">{item}</bdi>
          </Badge>
        </li>
      ))}
    </ul>
  );
}

/**
 * Una idea de integración. Todo el contenido es externo: se muestra como texto aislado (`<bdi>`/`<pre>`), el
 * snippet nunca contiene enlaces (AM-05) y la insignia «Revisada» depende solo del booleano `revisada` (AM-04, MU-12):
 * un «✔ Revisada» escrito dentro de los datos no la produce.
 */
export function IdeaIntegracion({ idea }: IdeaIntegracionProps) {
  const sinDato = t("comun.sinDato");
  const copiable = idea.snippet !== null && !idea.snippetExcedeLimite;
  const avisoId = useId();
  // Copia exactamente el texto mostrado. Si el portapapeles no está disponible, lanza y el botón lo avisa.
  const copiar = async () => {
    if (idea.snippet !== null) await navigator.clipboard.writeText(idea.snippet);
  };
  return (
    <article className="min-w-0 space-y-5 rounded-2xl border border-border p-5">
      <header className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{idea.tipo === null ? sinDato : t(`idea.tipo.${idea.tipo}`)}</Badge>
        {idea.revisada && (
          <Badge variant="secondary" className="text-salud-alta">
            <BadgeCheck aria-hidden="true" />
            {t("idea.revisada")}
          </Badge>
        )}
      </header>
      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <Campo etiqueta={t("idea.disparadores")}>
          <ListaDeTextos items={idea.disparadores} />
        </Campo>
        <Campo etiqueta={t("idea.stack")}>
          <ListaDeTextos items={idea.stack} />
        </Campo>
        <Campo etiqueta={t("idea.dificultad")}>{idea.dificultad === null ? sinDato : t(`dificultad.${idea.dificultad}`)}</Campo>
      </dl>
      <div className="min-w-0 space-y-3">
        <h4 className="text-sm font-semibold">{t("idea.snippet")}</h4>
        {/* El aviso va pegado al bloque (AM-04): nunca lejos del código que advierte. */}
        {!idea.revisada && (
          <p id={avisoId} role="note" className="flex items-start gap-2 rounded-lg bg-salud-media-fondo p-3 text-sm text-salud-media">
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {t("idea.noRevisada")}
          </p>
        )}
        {idea.snippet === null ? (
          <p className="text-sm text-muted-foreground">{sinDato}</p>
        ) : (
          <>
            {idea.snippetExcedeLimite && (
              <p role="note" className="text-sm text-muted-foreground">
                {t("snippet.excede")}
              </p>
            )}
            <BloqueSnippet codigo={idea.snippet} copiable={copiable} onCopiar={copiar} avisoId={idea.revisada ? undefined : avisoId} />
          </>
        )}
      </div>
    </article>
  );
}
