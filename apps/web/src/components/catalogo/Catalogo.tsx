"use client";

import { useMemo, useState } from "react";
import type { Categoria } from "@/lib/catalogo/categorias";
import type { HerramientaResumen } from "@/lib/catalogo/contrato";
import { filtrarPorCategoria } from "@/lib/catalogo/filtros";
import { GrillaHerramientas } from "./GrillaHerramientas";
import { NavCategorias } from "./NavCategorias";

export interface CatalogoProps {
  /** Lista ya validada por el contrato en el servidor. El catálogo completo viaja una vez y se filtra acá. */
  herramientas: HerramientaResumen[];
}

/** Estado de la categoría elegida. B4 suma filtros y búsqueda, y T20 lo sincroniza con la URL. */
export function Catalogo({ herramientas }: CatalogoProps) {
  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const visibles = useMemo(() => filtrarPorCategoria(herramientas, categoria), [herramientas, categoria]);
  return (
    <div className="space-y-6">
      <NavCategorias activa={categoria} onElegir={setCategoria} />
      <GrillaHerramientas herramientas={visibles} total={visibles.length} />
    </div>
  );
}
