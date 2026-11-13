"use client";
// Estado del asistente (feature 002 · A06; RF-11). El pedido lo hace lib/asistente/cliente.
// Un solo panel, que abren dos disparadores de la cabecera: «Asistente» y el CTA «Probar el asistente» (ui-brief §12.2 #5c).
import { useId, useState } from "react";
import { consultarAsistente } from "@/lib/asistente/cliente";
import { PanelAsistente, type EstadoPanel } from "./PanelAsistente";

export function useAsistente() {
  const id = useId();
  const [abierto, setAbierto] = useState(false);
  const [consulta, setConsulta] = useState("");
  const [estado, setEstado] = useState<EstadoPanel>({ tipo: "inicial" });

  const enviar = async () => {
    setEstado({ tipo: "cargando" });
    const r = await consultarAsistente(consulta);
    setEstado(r.tipo === "ok" ? { tipo: "respuesta", respuesta: r.respuesta } : { tipo: "error", codigo: r.codigo });
  };

  const panel = abierto ? (
    <PanelAsistente
      id={id}
      consulta={consulta}
      estado={estado}
      onCambiar={setConsulta}
      onEnviar={() => void enviar()}
      onCerrar={() => setAbierto(false)}
    />
  ) : null;

  return { id, abierto, alternar: () => setAbierto((a) => !a), panel };
}
