import { Catalogo } from "@/components/catalogo/Catalogo";
import { PresentacionCatalogo } from "@/components/catalogo/PresentacionCatalogo";
import { parsearEstadoUrl, serializarEstadoUrl } from "@/lib/catalogo/estado-url";
import { derivarOpciones } from "@/lib/catalogo/filtros";
import { obtenerRepositorio } from "@/lib/catalogo/repositorio";
import { t } from "@/i18n/es";

// Los datos se piden en el servidor en cada request; el navegador nunca habla con el origen (plan 2.1, D-09).
export const dynamic = "force-dynamic";

// Destino interno del enlace principal de la portada.
const ID_CATALOGO = "catalogo";

export default async function Inicio({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Si el repositorio falla, el error sube a src/app/error.tsx: mensaje genérico y «Reintentar».
  const repositorio = await obtenerRepositorio();
  const { herramientas } = await repositorio.listarHerramientas();
  // Todo valor de la URL es no confiable (MU-05, MU-06): se valida antes de usarlo; lo inválido se ignora.
  const estadoInicial = parsearEstadoUrl(await searchParams, derivarOpciones(herramientas));

  return (
    <>
      <PresentacionCatalogo idCatalogo={ID_CATALOGO} />
      <section id={ID_CATALOGO} aria-labelledby="titulo-catalogo" className="catalogo-contenedor space-y-6 pb-20">
        <h2 id="titulo-catalogo" className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("catalogo.titulo")}
        </h2>
        {/* La clave reinicia el estado si el servidor entrega otra URL (p. ej. el logo hacia «/»). */}
        <Catalogo key={serializarEstadoUrl(estadoInicial)} herramientas={herramientas} estadoInicial={estadoInicial} />
      </section>
    </>
  );
}
