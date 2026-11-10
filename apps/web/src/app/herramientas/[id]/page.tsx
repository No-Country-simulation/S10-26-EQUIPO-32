import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FichaHerramienta } from "@/components/catalogo/FichaHerramienta";
import { esIdValido } from "@/lib/catalogo/contrato";
import { validarUrlRepo } from "@/lib/catalogo/enlaces";
import { obtenerRepositorio } from "@/lib/catalogo/repositorio";
import { t } from "@/i18n/es";

// Datos en el servidor y en cada request, como el catálogo (plan 2.1).
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: t("sitio.nombre") };

export default async function Ficha({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // El id de la URL es no confiable (MU-05): se valida con la expresión estricta antes de buscar.
  if (!esIdValido(id)) notFound();
  const repositorio = await obtenerRepositorio();
  const herramienta = await repositorio.obtenerHerramienta(id);
  if (herramienta === null) notFound();
  return (
    <div className="catalogo-contenedor py-10 pb-20">
      {/* Defensa en profundidad: el contrato ya valida la URL; acá se vuelve a validar y, si falla, no hay enlace (AM-03). */}
      <FichaHerramienta herramienta={{ ...herramienta, urlRepo: validarUrlRepo(herramienta.urlRepo) }} />
    </div>
  );
}
