import { Catalogo } from "@/components/catalogo/Catalogo";
import { PresentacionCatalogo } from "@/components/catalogo/PresentacionCatalogo";
import { Carrusel, type ItemCarrusel } from "@/components/sitio/Carrusel";
import { SeccionAsistente, type RepoCitado } from "@/components/sitio/SeccionAsistente";
import { SeccionSeguridad } from "@/components/sitio/SeccionSeguridad";
import type { Categoria } from "@/lib/catalogo/categorias";
import type { HerramientaResumen } from "@/lib/catalogo/contrato";
import { parsearEstadoUrl, serializarEstadoUrl } from "@/lib/catalogo/estado-url";
import { derivarOpciones } from "@/lib/catalogo/filtros";
import { obtenerRepositorio } from "@/lib/catalogo/repositorio";
import { t } from "@/i18n/es";

// Los datos se piden en el servidor en cada request; el navegador nunca habla con el origen (plan 2.1, D-09).
export const dynamic = "force-dynamic";

// Destinos internos de los enlaces de la portada y de la cabecera.
const ID_CATALOGO = "catalogo";
const ID_SEGURIDAD = "seguridad";
const ID_ASISTENTE = "asistente";

// Categorías de la consulta de ejemplo de la sección «Asistente» (login, cobros y visitas).
const CATEGORIAS_EJEMPLO: Categoria[] = ["autenticacion", "pagos", "analitica"];

const porSalud = (lista: HerramientaResumen[]) => [...lista].sort((x, y) => (y.healthScore ?? -1) - (x.healthScore ?? -1));

/** Las 12 herramientas con mejor salud dan las marcas de los tiles del titular (solo nombre e id). */
function destacadas(herramientas: HerramientaResumen[]) {
  return porSalud(herramientas)
    .slice(0, 12)
    .map(({ id, nombre }) => ({ id, nombre }));
}

/** Carrusel: las 8 de mejor salud, con su categoría principal para la pantalla de preview. */
function destacadasCarrusel(herramientas: HerramientaResumen[]): ItemCarrusel[] {
  return porSalud(herramientas)
    .slice(0, 8)
    .flatMap(({ id, nombre, descripcion, categorias }) => (categorias[0] === undefined ? [] : [{ id, nombre, descripcion, categoria: categorias[0] }]));
}

/** Para cada categoría del ejemplo, la herramienta real con mejor salud (P6: solo repos que están en la base). */
function citadosDelEjemplo(herramientas: HerramientaResumen[]): RepoCitado[] {
  const ordenadas = porSalud(herramientas);
  const citados: RepoCitado[] = [];
  for (const categoria of CATEGORIAS_EJEMPLO) {
    const elegida = ordenadas.find((h) => h.categorias.includes(categoria) && !citados.some((c) => c.id === h.id));
    if (elegida) citados.push({ id: elegida.id, nombre: elegida.nombre, categoria });
  }
  return citados;
}

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
      <PresentacionCatalogo idCatalogo={ID_CATALOGO} idSeguridad={ID_SEGURIDAD} destacadas={destacadas(herramientas)} />
      <Carrusel id="destacadas" items={destacadasCarrusel(herramientas)} />
      <section id={ID_CATALOGO} aria-labelledby="titulo-catalogo" className="catalogo-contenedor pb-24">
        <h2 id="titulo-catalogo" className="sr-only">
          {t("catalogo.titulo")}
        </h2>
        {/* La clave reinicia el estado si el servidor entrega otra URL (p. ej. el logo hacia «/»). */}
        <Catalogo key={serializarEstadoUrl(estadoInicial)} herramientas={herramientas} estadoInicial={estadoInicial} />
      </section>
      <SeccionAsistente id={ID_ASISTENTE} citados={citadosDelEjemplo(herramientas)} />
      <SeccionSeguridad id={ID_SEGURIDAD} />
    </>
  );
}
