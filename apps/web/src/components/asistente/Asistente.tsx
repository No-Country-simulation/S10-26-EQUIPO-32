"use client";
// Botón de la cabecera + panel del asistente (feature 002 · A06; RF-11). El pedido lo hace lib/asistente/cliente.
import { useId, useState } from "react";
import { t } from "@/i18n/es";
import { consultarAsistente } from "@/lib/asistente/cliente";
import { PanelAsistente, type EstadoPanel } from "./PanelAsistente";

export function Asistente() {
  const id = useId();
  const [abierto, setAbierto] = useState(false);
  const [consulta, setConsulta] = useState("");
  const [estado, setEstado] = useState<EstadoPanel>({ tipo: "inicial" });

  const enviar = async () => {
    setEstado({ tipo: "cargando" });
    const r = await consultarAsistente(consulta);
    setEstado(r.tipo === "ok" ? { tipo: "respuesta", respuesta: r.respuesta } : { tipo: "error", codigo: r.codigo });
  };

  return (
    <>
      {/* Mismo aspecto que los enlaces de la cabecera, pero es un botón: abre el panel (2.4.7, 4.1.2). */}
      <button
        type="button"
        aria-expanded={abierto}
        aria-controls={id}
        onClick={() => setAbierto((a) => !a)}
        className="catalogo-foco inline-flex min-h-11 cursor-pointer items-center rounded-full px-3 text-[0.95rem] font-medium text-foreground transition-colors hover:bg-secondary aria-expanded:bg-secondary"
      >
        {t("cabecera.asistente")}
      </button>
      {abierto && (
        <PanelAsistente
          id={id}
          consulta={consulta}
          estado={estado}
          onCambiar={setConsulta}
          onEnviar={() => void enviar()}
          onCerrar={() => setAbierto(false)}
        />
      )}
    </>
  );
}
