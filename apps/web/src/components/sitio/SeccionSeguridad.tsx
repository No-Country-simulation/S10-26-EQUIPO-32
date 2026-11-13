import { ArrowUpRight } from "lucide-react";
import { IconoPropio, type NombreIcono } from "@/components/marca/Iconos";
import { t, type ClaveTexto } from "@/i18n/es";
import { FotoSitio } from "./FotoSitio";
import { EnlaceExterno, type DestinoExterno } from "./EnlaceExterno";

interface Control {
  clave: "csp" | "contrato" | "guardrails" | "redTeam" | "supplyChain" | "nist";
  icono: NombreIcono;
}

const CONTROLES: Control[] = [
  { clave: "csp", icono: "escudo" },
  { clave: "contrato", icono: "candado" },
  { clave: "guardrails", icono: "llave" },
  { clave: "redTeam", icono: "radar" },
  { clave: "supplyChain", icono: "cadena" },
  { clave: "nist", icono: "diana" },
];

const titulo = (c: Control["clave"]) => `seguridad.${c}.titulo` as ClaveTexto;
const texto = (c: Control["clave"]) => `seguridad.${c}.texto` as ClaveTexto;

/**
 * «Seguridad por diseño» (ui-brief §11.2 #6): 6 tiles, cada uno enlaza a su documento en el repositorio.
 * Las URLs son constantes de `enlaces.ts` (nunca datos); el enlace cubre el tile y abre en pestaña nueva.
 */
export function SeccionSeguridad({ id }: { id: string }) {
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className="catalogo-contenedor pb-24 sm:pb-32">
      <div className="max-w-2xl">
        <h2 id={`${id}-titulo`} className="text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
          {t("seguridad.titulo")}
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">{t("seguridad.subtitulo")}</p>
      </div>
      <div className="mt-12 aspect-[16/9] overflow-hidden rounded-[2rem] bg-secondary ring-1 ring-border sm:aspect-[3/1]">
        <FotoSitio id="seguridad" sizes="(min-width: 1024px) 72rem, 100vw" className="object-[50%_30%]" />
      </div>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CONTROLES.map(({ clave, icono }) => {
          const destino: DestinoExterno = clave;
          return (
            <li key={clave} className="group/tile relative flex min-h-56 flex-col rounded-3xl bg-secondary p-6 transition-colors hover:bg-secundario-hover sm:p-7">
              <IconoPropio nombre={icono} className="size-12 drop-shadow-sm" />
              <h3 className="mt-6 text-lg font-semibold">
                <EnlaceExterno destino={destino} className="rounded-sm after:absolute after:inset-0 after:rounded-3xl">
                  {t(titulo(clave))}
                </EnlaceExterno>
              </h3>
              <p className="mt-2 text-[0.95rem] text-muted-foreground">{t(texto(clave))}</p>
              <span aria-hidden="true" className="mt-auto flex items-center gap-1 pt-6 text-sm font-medium">
                {t("seguridad.verDoc")}
                <ArrowUpRight className="size-4 transition-transform group-hover/tile:translate-x-0.5 group-hover/tile:-translate-y-0.5" />
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
