import Link from "next/link";
import { ArrowLeft, FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n/es";

export function EstadoNoEncontrado() {
  return (
    <section aria-label={t("estado.noEncontrado.titulo")} className="catalogo-estado">
      <FileQuestion aria-hidden="true" className="mb-6 size-8 text-muted-foreground" />
      <h2 className="catalogo-estado-titulo">{t("estado.noEncontrado.titulo")}</h2>
      <p className="catalogo-estado-texto">{t("estado.noEncontrado.texto")}</p>
      <Button asChild className="catalogo-accion">
        <Link href="/">
          <ArrowLeft aria-hidden="true" />
          {t("estado.volver")}
        </Link>
      </Button>
    </section>
  );
}
