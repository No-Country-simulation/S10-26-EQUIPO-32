import { PresentacionCatalogo } from "@/components/catalogo/PresentacionCatalogo";
import { t } from "@/i18n/es";

// Destino interno del enlace principal de la portada. T16 monta acá el catálogo.
const ID_CATALOGO = "catalogo";

export default function Inicio() {
  return (
    <>
      <PresentacionCatalogo idCatalogo={ID_CATALOGO} />
      <section id={ID_CATALOGO} aria-labelledby="titulo-catalogo" className="catalogo-contenedor pb-20">
        <h2 id="titulo-catalogo" className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("catalogo.titulo")}
        </h2>
      </section>
    </>
  );
}
