import Link from "next/link";
import { t, type ClaveTexto } from "@/i18n/es";
import { fotosConCredito } from "./FotoSitio";
import { EnlaceExterno, type DestinoExterno } from "./EnlaceExterno";

// En el fondo oscuro el foco usa el texto claro: el anillo por defecto (#141414) no se vería (2.4.7, 1.4.11).
const CLASE_ENLACE = "rounded-sm text-[0.95rem] text-pie-suave transition-colors hover:text-pie-texto focus-visible:outline-pie-texto";

type Item = { etiqueta: ClaveTexto } & ({ interno: string } | { externo: DestinoExterno });

const COLUMNAS: { titulo: ClaveTexto; items: Item[] }[] = [
  {
    titulo: "pie.producto",
    items: [
      { etiqueta: "cabecera.catalogo", interno: "/#catalogo" },
      { etiqueta: "cabecera.asistente", interno: "/#asistente" },
      { etiqueta: "cabecera.seguridad", interno: "/#seguridad" },
    ],
  },
  {
    titulo: "pie.seguridad",
    items: [
      { etiqueta: "pie.securityMd", externo: "security" },
      { etiqueta: "pie.redTeam", externo: "redTeam" },
      { etiqueta: "pie.owasp", externo: "owasp" },
      { etiqueta: "pie.nist", externo: "nist" },
    ],
  },
  {
    titulo: "pie.proyecto",
    items: [
      { etiqueta: "pie.repo", externo: "repositorio" },
      { etiqueta: "pie.specs", externo: "specs" },
      { etiqueta: "pie.equipo", externo: "equipo" },
    ],
  },
];

/** Footer oscuro (ui-brief §11.2 #7): superficie fija, no un modo oscuro. El wordmark gigante es decorativo. */
export function Pie() {
  return (
    <footer className="overflow-hidden bg-pie text-pie-texto">
      {/* Borde inferior redondeado de la página sobre el footer, como en la referencia. */}
      <div aria-hidden="true" className="h-12 rounded-b-[2.5rem] bg-background" />
      <div className="catalogo-contenedor grid grid-cols-2 gap-10 pt-16 pb-10 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div className="col-span-2 max-w-xs lg:col-span-1">
          <Link href="/" className="catalogo-foco rounded-sm text-xl font-bold tracking-tight focus-visible:outline-pie-texto">
            {t("sitio.nombre")}
          </Link>
          <p className="mt-3 text-[0.95rem] text-pie-suave">{t("sitio.descripcion")}</p>
        </div>
        {COLUMNAS.map(({ titulo, items }) => (
          <nav key={titulo} aria-label={t(titulo)}>
            <h2 className="text-sm font-medium text-pie-texto">{t(titulo)}</h2>
            <ul className="mt-4 space-y-3">
              {items.map((item) => (
                <li key={item.etiqueta}>
                  {"interno" in item ? (
                    <Link href={item.interno} className={`catalogo-foco ${CLASE_ENLACE}`}>
                      {t(item.etiqueta)}
                    </Link>
                  ) : (
                    <EnlaceExterno destino={item.externo} className={CLASE_ENLACE}>
                      {t(item.etiqueta)}
                    </EnlaceExterno>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="catalogo-contenedor">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t border-white/10 py-6 text-sm text-pie-suave">
          <p>{t("pie.leyenda")}</p>
          {/* Crédito de las fotos decorativas (RF-25): autor y fuente salen del manifiesto, como texto. */}
          <p>
            {t("pie.fotos")} {fotosConCredito().map((f) => f.autor).join(", ")} {t("pie.fotosFuente")}{" "}
            <EnlaceExterno destino="fotos" className={CLASE_ENLACE}>
              {t("pie.fotosDetalle")}
            </EnlaceExterno>
          </p>
        </div>
      </div>
      <p
        aria-hidden="true"
        className="-mb-[0.22em] text-center text-[20.5vw] leading-[0.8] font-bold tracking-[-0.06em] whitespace-nowrap text-pie-wordmark select-none"
      >
        {t("sitio.nombre")}
      </p>
    </footer>
  );
}
