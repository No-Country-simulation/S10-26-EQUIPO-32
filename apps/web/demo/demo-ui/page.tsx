"use client";

import { useState } from "react";
import { Cabecera } from "@/components/catalogo/Cabecera";
import { EstadoVacio } from "@/components/catalogo/EstadoVacio";
import { EstadoError } from "@/components/catalogo/EstadoError";
import { EstadoNoEncontrado } from "@/components/catalogo/EstadoNoEncontrado";
import { PresentacionCatalogo } from "@/components/catalogo/PresentacionCatalogo";
import { t } from "@/i18n/es";

// Fixtures deliberadamente crudos: prueban presentación, no el contrato de datos.
// Fuera de src/app. Se monta solo en desarrollo desde src/app/demo-ui/page.tsx (en producción responde 404).
const extremos = {
  nombre: "Puente \u202Eorbita\u202C \u2067אבג\u2069",
  html: "<script>alert(1)</script>",
  enorme: "Arquitectura".repeat(30_000),
};

export default function DemoUI() {
  const [reintentado, setReintentado] = useState(false);
  const [restablecido, setRestablecido] = useState(false);

  return (
    <>
      <Cabecera />
      <main>
        <PresentacionCatalogo idCatalogo="catalogo-demo" />
        <section id="catalogo-demo" aria-label={t("demo.catalogoRegion")} className="catalogo-contenedor space-y-8 pb-16">
          <div className="max-w-2xl space-y-3">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("demo.titulo")}</h2>
            <p className="text-muted-foreground">{t("demo.descripcion")}</p>
          </div>
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
      </main>
    </>
  );
}
