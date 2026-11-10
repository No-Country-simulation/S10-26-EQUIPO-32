"use client";

import { startTransition } from "react";
import { useRouter } from "next/navigation";
import { EstadoError } from "@/components/catalogo/EstadoError";

// Límite de error del catálogo (RF-01 e, AM-13). Nunca muestra el mensaje ni el detalle del error:
// Next ya lo registra en el servidor con un `digest`; la UI solo ve el texto genérico del diccionario.
export default function ErrorPagina({ reset }: { reset: () => void }) {
  const router = useRouter();
  // Un error de datos nace en el servidor: hay que volver a pedir el segmento y recién después reintentar.
  const reintentar = () =>
    startTransition(() => {
      router.refresh();
      reset();
    });
  return (
    <div className="catalogo-contenedor py-16">
      <EstadoError onReintentar={reintentar} />
    </div>
  );
}
