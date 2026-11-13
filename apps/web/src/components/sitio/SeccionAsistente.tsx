import Link from "next/link";
import { Bot, Sparkles } from "lucide-react";
import type { Categoria } from "@/lib/catalogo/categorias";
import { LogoRepo } from "@/components/marca/LogoRepo";
import { BotonAsistente } from "./BotonAsistente";
import { t } from "@/i18n/es";

export interface RepoCitado {
  id: string;
  nombre: string;
  categoria: Categoria;
}

export interface SeccionAsistenteProps {
  id: string;
  /** Herramientas reales del catálogo cargado (P6): el ejemplo nunca cita un repo que no está en la base. */
  citados: RepoCitado[];
}

/**
 * Sección «Asistente» (ui-brief §11.2 #5): consulta de ejemplo y respuesta ESTÁTICA. No llama a la API ni
 * usa salida del modelo; los nombres citados son datos del catálogo y van como texto de React con <bdi>.
 */
export function SeccionAsistente({ id, citados }: SeccionAsistenteProps) {
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className="catalogo-contenedor py-24 sm:py-32">
      <div className="mx-auto max-w-2xl text-center">
        <span aria-hidden="true" className="mx-auto mb-5 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Sparkles className="size-6" />
        </span>
        <h2 id={`${id}-titulo`} className="text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
          {t("seccionAsistente.titulo")}
        </h2>
        <p className="mt-4 text-lg text-balance text-muted-foreground">{t("seccionAsistente.subtitulo")}</p>
        <BotonAsistente className="mt-8 bg-primary text-primary-foreground hover:bg-primary/85" />
      </div>

      <div className="mt-12 rounded-[2rem] bg-secondary p-3 sm:p-8 lg:p-12">
        <div className="mx-auto max-w-3xl space-y-6 rounded-3xl bg-background p-5 shadow-sm sm:p-8">
          <div className="flex justify-end">
            <p className="max-w-[85%] rounded-3xl rounded-br-lg bg-primary px-5 py-3 text-[0.95rem] text-primary-foreground">
              {t("seccionAsistente.consulta")}
            </p>
          </div>
          <div className="flex gap-3">
            <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary">
              <Bot className="size-5" />
            </span>
            <div className="min-w-0 flex-1 space-y-5">
              <p className="text-[0.95rem]">{t("seccionAsistente.respuesta")}</p>
              {citados.length > 0 && (
                <div>
                  <h3 className="mb-3 text-sm font-medium text-muted-foreground">{t("asistente.citados")}</h3>
                  <ul className="grid gap-2 sm:grid-cols-3">
                    {citados.map((repo) => (
                      <li key={repo.id} className="min-w-0">
                        <Link
                          href={`/herramientas/${encodeURIComponent(repo.id)}`}
                          className="catalogo-foco flex min-w-0 items-center gap-3 rounded-2xl border border-border p-3 transition-colors hover:bg-secondary"
                        >
                          <LogoRepo id={repo.id} className="size-10" />
                          <span className="min-w-0">
                            <bdi dir="auto" className="block truncate text-sm font-medium">
                              {repo.nombre}
                            </bdi>
                            <span className="block truncate text-xs text-muted-foreground">{t(`categoria.${repo.categoria}`)}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
        <p className="mx-auto mt-5 max-w-3xl text-center text-sm text-muted-foreground">{t("seccionAsistente.leyenda")}</p>
      </div>
    </section>
  );
}
