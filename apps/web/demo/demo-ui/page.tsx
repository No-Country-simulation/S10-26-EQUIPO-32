"use client";

import { useState } from "react";
import { EstadoVacio } from "@/components/catalogo/EstadoVacio";
import { EstadoError } from "@/components/catalogo/EstadoError";
import { EstadoNoEncontrado } from "@/components/catalogo/EstadoNoEncontrado";
import { GrillaHerramientas } from "@/components/catalogo/GrillaHerramientas";
import { NavCategorias } from "@/components/catalogo/NavCategorias";
import { PresentacionCatalogo } from "@/components/catalogo/PresentacionCatalogo";
import type { Categoria } from "@/lib/catalogo/categorias";
import type { HerramientaResumen } from "@/lib/catalogo/contrato";
import { t } from "@/i18n/es";

// Datos inventados con el tipo del contrato (sin casts): los null solo donde el tipo los permite.
const RLO = String.fromCodePoint(0x202e);
const PDF = String.fromCodePoint(0x202c);
const base: HerramientaResumen = {
  id: "ejemplo",
  nombre: "Ejemplo",
  descripcion: "Herramienta de ejemplo para revisar la presentación.",
  descripcionTruncada: false,
  categorias: ["autenticacion"],
  lenguaje: "TypeScript",
  licencia: "MIT",
  stars: 12840,
  ultimaActualizacion: "2026-10-30T00:00:00Z",
  issuesAbiertos: 42,
  mantenedorActivo: true,
  nivelMantenimiento: "activo",
  healthScore: 88,
  metricasTomadasEn: "2026-11-09T00:00:00Z",
  urlRepo: null,
};
const normales: HerramientaResumen[] = [
  { ...base, id: "aurora-acceso", nombre: "Aurora Acceso", categorias: ["autenticacion", "pagos"] },
  { ...base, id: "brisa-datos", nombre: "Brisa Datos", categorias: ["base-de-datos"], lenguaje: "Go", licencia: "Apache-2.0", stars: 3120, nivelMantenimiento: "moderado", healthScore: 56 },
  { ...base, id: "cobalto-mente", nombre: "Cobalto Mente", categorias: ["ia"], lenguaje: "Python", licencia: "BSD-3-Clause", stars: 540, nivelMantenimiento: "abandonado", healthScore: 21 },
  { ...base, id: "delta-metrica", nombre: "Delta Métrica", categorias: ["analitica", "busqueda"], licencia: null, descripcion: null },
  { ...base, id: "eco-indice", nombre: "Eco Índice", categorias: ["busqueda"], lenguaje: null, stars: null, nivelMantenimiento: null, healthScore: null },
];
const extremosGrilla: HerramientaResumen[] = [
  { ...base, id: "xss", nombre: "<script>alert(1)</script>", descripcion: "<img src=x onerror=alert(1)> ![p](https://rastreo.test/p.png)" },
  { ...base, id: "bidi", nombre: `Puente ${RLO}orbita${PDF} seguro`, descripcion: `Texto con inversion ${RLO}atrás${PDF} que no debe mover a las vecinas.` },
  { ...base, id: "sin-cortes", nombre: "NombreSinEspaciosNiCortes".repeat(4), descripcion: "Arquitectura".repeat(25), descripcionTruncada: true, lenguaje: "LenguajeMuyLargoSinEspacios".repeat(2), licencia: "Licencia-".repeat(7) },
];

// Fixtures deliberadamente crudos: prueban presentación, no el contrato de datos.
// La cabecera y <main> los pone el layout raíz. Fuera de src/app. Se monta solo en desarrollo desde src/app/demo-ui/page.tsx (en producción responde 404).
const extremos = {
  nombre: "Puente \u202Eorbita\u202C \u2067אבג\u2069",
  html: "<script>alert(1)</script>",
  enorme: "Arquitectura".repeat(30_000),
};

export default function DemoUI() {
  const [reintentado, setReintentado] = useState(false);
  const [restablecido, setRestablecido] = useState(false);
  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const visibles = categoria === null ? normales : normales.filter((h) => h.categorias.includes(categoria));

  return (
    <>
      <PresentacionCatalogo idCatalogo="catalogo-demo" />
      <section id="catalogo-demo" aria-label={t("demo.catalogoRegion")} className="catalogo-contenedor space-y-8 pb-16">
        <div className="max-w-2xl space-y-3">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("demo.titulo")}</h2>
          <p className="text-muted-foreground">{t("demo.descripcion")}</p>
        </div>
        <NavCategorias activa={categoria} onElegir={setCategoria} />
        <GrillaHerramientas herramientas={visibles} total={visibles.length} />
        <EstadoVacio
          titulo={t("estado.vacio.titulo")}
          texto={t("estado.vacio.texto")}
          accion={{ etiqueta: t("demo.restablecer"), onClick: () => setRestablecido(true) }}
        />
        <p role="status" className="text-sm text-muted-foreground">
          {restablecido ? t("demo.restablecido") : t("demo.accionPendiente")}
        </p>
      </section>
      <details id="casos-extremos" className="catalogo-contenedor space-y-8 pb-16">
        <summary className="catalogo-foco cursor-pointer text-lg font-semibold">{t("demo.extremos")}</summary>
        <div className="space-y-8 pt-8">
          <GrillaHerramientas herramientas={extremosGrilla} total={extremosGrilla.length} />
          <EstadoError onReintentar={() => setReintentado(true)} />
          <p role="status" className="text-sm text-muted-foreground">
            {reintentado ? t("demo.reintentado") : t("demo.reintentoPendiente")}
          </p>
          <EstadoError />
          <EstadoNoEncontrado />
          <EstadoVacio titulo={extremos.nombre} texto={extremos.html} />
          <EstadoVacio titulo={t("demo.textoLargo")} texto={extremos.enorme} />
          <EstadoVacio titulo={extremos.enorme} texto={t("demo.tituloLargo")} />
          <EstadoVacio titulo={t("demo.sinDato")} texto={t("comun.sinDato")} />
        </div>
      </details>
    </>
  );
}
