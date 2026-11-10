import { Catalogo } from "@/components/catalogo/Catalogo";
import { PresentacionCatalogo } from "@/components/catalogo/PresentacionCatalogo";
import { obtenerRepositorio } from "@/lib/catalogo/repositorio";
import { t } from "@/i18n/es";

// Los datos se piden en el servidor en cada request; el navegador nunca habla con el origen (plan 2.1, D-09).
export const dynamic = "force-dynamic";

// Destino interno del enlace principal de la portada.
const ID_CATALOGO = "catalogo";

export default async function Inicio() {
  // Si el repositorio falla, el error sube a src/app/error.tsx: mensaje genérico y «Reintentar».
  const repositorio = await obtenerRepositorio();
  const { herramientas } = await repositorio.listarHerramientas();

  return (
    <>
      <PresentacionCatalogo idCatalogo={ID_CATALOGO} />
      <section id={ID_CATALOGO} aria-labelledby="titulo-catalogo" className="catalogo-contenedor space-y-6 pb-20">
        <h2 id="titulo-catalogo" className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("catalogo.titulo")}
        </h2>
        <Catalogo herramientas={herramientas} />
      </section>
    </>
  );
}
