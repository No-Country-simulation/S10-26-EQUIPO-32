import { COMPONENTES_SALUD, MAXIMOS_SALUD, type DesgloseSalud as Desglose } from "@/lib/catalogo/contrato";
import { t } from "@/i18n/es";

const formatoPuntos = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });

/**
 * Desglose del health score en sus 5 componentes con su máximo (spec 001 §10, RF-15).
 * Todo o nada: si el contrato lo anuló, solo se lee «Sin dato» (nunca un desglose parcial).
 */
export function DesgloseSalud({ desglose }: { desglose: Desglose | null }) {
  return (
    <section aria-labelledby="titulo-desglose" className="space-y-3">
      <h2 id="titulo-desglose" className="text-lg font-semibold tracking-tight">
        {t("salud.desglose")}
      </h2>
      {desglose === null ? (
        <p className="text-sm text-muted-foreground">{t("comun.sinDato")}</p>
      ) : (
        <>
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
            {COMPONENTES_SALUD.map((c) => (
              <div key={c} className="min-w-0 space-y-1" data-componente={c}>
                <dt className="text-xs text-muted-foreground">{t(`salud.componente.${c}`)}</dt>
                <dd className="font-medium">
                  {formatoPuntos.format(desglose[c])} {t("salud.desglose.de")} {MAXIMOS_SALUD[c]}
                </dd>
              </div>
            ))}
          </dl>
          {desglose.penalizacionArchivado ? <p className="text-sm text-muted-foreground">{t("salud.penalizacionArchivado")}</p> : null}
        </>
      )}
    </section>
  );
}
