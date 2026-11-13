"use client";
// Estado del asistente (feature 002 · A06; RF-11) compartido por todos los disparadores (feature 007, RF-20):
// «Asistente» y «Probar el asistente» de la cabecera, el CTA de la portada y el de la sección del asistente.
// Un solo panel, que se dibuja en la cabecera. El pedido lo hace lib/asistente/cliente.
import { createContext, useCallback, useContext, useId, useMemo, useState, type ReactNode } from "react";
import { consultarAsistente } from "@/lib/asistente/cliente";
import { PanelAsistente, type EstadoPanel } from "./PanelAsistente";

interface ContextoAsistente {
  id: string;
  abierto: boolean;
  alternar: () => void;
  /** Abre el panel (y lleva el foco al campo). Idempotente. */
  abrir: () => void;
  panel: ReactNode;
}

const Contexto = createContext<ContextoAsistente | null>(null);

export function AsistenteProvider({ children }: { children: ReactNode }) {
  const id = useId();
  const [abierto, setAbierto] = useState(false);
  const [consulta, setConsulta] = useState("");
  const [estado, setEstado] = useState<EstadoPanel>({ tipo: "inicial" });

  const enviar = useCallback(
    async (texto: string) => {
      if (estado.tipo === "cargando" || texto.trim().length === 0) return;
      setEstado({ tipo: "cargando" });
      const r = await consultarAsistente(texto);
      setEstado(r.tipo === "ok" ? { tipo: "respuesta", respuesta: r.respuesta } : { tipo: "error", codigo: r.codigo });
    },
    [estado.tipo],
  );

  const valor = useMemo<ContextoAsistente>(() => {
    const panel = abierto ? (
      <PanelAsistente
        id={id}
        consulta={consulta}
        estado={estado}
        onCambiar={setConsulta}
        onEnviar={() => void enviar(consulta)}
        onEjemplo={(texto) => {
          setConsulta(texto);
          void enviar(texto);
        }}
        onCerrar={() => setAbierto(false)}
      />
    ) : null;
    return { id, abierto, alternar: () => setAbierto((a) => !a), abrir: () => setAbierto(true), panel };
  }, [abierto, consulta, enviar, estado, id]);

  return <Contexto value={valor}>{children}</Contexto>;
}

export function useAsistente(): ContextoAsistente {
  const contexto = useContext(Contexto);
  if (contexto === null) throw new Error("useAsistente requiere <AsistenteProvider>.");
  return contexto;
}
