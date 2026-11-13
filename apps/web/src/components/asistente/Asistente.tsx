"use client";
// Botón de la cabecera + panel del asistente (feature 002 · A06; RF-11). El pedido lo hace lib/asistente/cliente.
import { useId, useState } from "react";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      <Button
        type="button"
        variant="secondary"
        aria-expanded={abierto}
        aria-controls={id}
        onClick={() => setAbierto((a) => !a)}
        className="catalogo-foco lg:ml-auto min-h-11 max-w-full gap-2 rounded-full px-5 whitespace-normal"
      >
        <Bot aria-hidden="true" />
        {t("cabecera.asistente")}
      </Button>
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
