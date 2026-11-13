// Panel del asistente (feature 002 · A06; RF-11, RNF-04). Presentacional: todo texto externo
// (salida del modelo incluida) se renderiza como texto de React; los enlaces son solo a fichas internas.
import Link from "next/link";
import { useEffect, useId, useRef, type FormEvent } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import { LogoRepo } from "@/components/marca/LogoRepo";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { t, type ClaveTexto } from "@/i18n/es";
import { MAX_CONSULTA, rutaFicha, type CodigoErrorCliente, type RespuestaCliente } from "@/lib/asistente/cliente";

export type EstadoPanel =
  | { tipo: "inicial" }
  | { tipo: "cargando" }
  | { tipo: "respuesta"; respuesta: RespuestaCliente }
  | { tipo: "error"; codigo: CodigoErrorCliente };

export interface PanelAsistenteProps {
  id: string;
  consulta: string;
  estado: EstadoPanel;
  onCambiar: (consulta: string) => void;
  onEnviar: () => void;
  /** Consulta de ejemplo: el padre la pone en el campo y la envía. */
  onEjemplo: (consulta: string) => void;
  onCerrar: () => void;
}

const MENSAJE_ERROR: Record<CodigoErrorCliente, ClaveTexto> = {
  limite: "asistente.error.limite",
  entrada: "asistente.error.entrada",
  "no-disponible": "asistente.error.noDisponible",
  interno: "asistente.error.interno",
};

// Consultas de ejemplo (RF-23): textos propios del producto, nunca datos externos.
const EJEMPLOS: ClaveTexto[] = ["asistente.ejemplo1", "asistente.ejemplo2", "asistente.ejemplo3"];

const conRol = (rol: string) => `${t("asistente.separadorRol")}${rol}`;
const contador = (largo: number) => `${largo} / ${MAX_CONSULTA} ${t("asistente.caracteres")}`;

function EnlaceFicha({ id, nombre }: { id: string; nombre: string }) {
  const ruta = rutaFicha(id);
  if (ruta === null) return <span>{nombre}</span>;
  return (
    <Link href={ruta} className="catalogo-foco rounded-sm font-medium text-primary underline-offset-4 hover:underline [overflow-wrap:anywhere]">
      {nombre}
    </Link>
  );
}

function Resultado({ respuesta }: { respuesta: RespuestaCliente }) {
  if (respuesta.estado === "sin-contexto") return <p className="text-sm">{t("asistente.sinContexto")}</p>;
  if (respuesta.estado === "crudo") {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-destructive">{t("asistente.crudo")}</p>
        <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap [overflow-wrap:anywhere]">{respuesta.salida}</pre>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">{t("asistente.stack")}</h3>
        <ul className="space-y-1 text-sm">
          {respuesta.stack.map((item) => (
            <li key={item.id} className="flex items-center gap-2 [overflow-wrap:anywhere]">
              <LogoRepo id={item.id} className="size-6 rounded-md" />
              <span>
                <EnlaceFicha id={item.id} nombre={item.nombre} />
                {item.rol.length > 0 && <span className="text-muted-foreground">{conRol(item.rol)}</span>}
              </span>
            </li>
          ))}
        </ul>
      </section>
      {respuesta.justificacion.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{t("asistente.justificacion")}</h3>
          <p className="text-sm whitespace-pre-line [overflow-wrap:anywhere]">{respuesta.justificacion}</p>
        </section>
      )}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">{t("asistente.citados")}</h3>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {respuesta.citados.map((c) => (
            <li key={c.id}>
              <EnlaceFicha id={c.id} nombre={c.nombre} />
            </li>
          ))}
        </ul>
      </section>
      <p className="text-xs text-muted-foreground">{t("asistente.aviso")}</p>
    </div>
  );
}

export function PanelAsistente({ id, consulta, estado, onCambiar, onEnviar, onEjemplo, onCerrar }: PanelAsistenteProps) {
  const idCampo = useId();
  const campo = useRef<HTMLTextAreaElement>(null);
  // Al abrirse, el foco va al campo: quien abre el panel con el teclado sigue escribiendo sin buscarlo (RF-20, RF-26).
  useEffect(() => {
    campo.current?.focus();
  }, []);
  const idAyuda = useId();
  const cargando = estado.tipo === "cargando";
  const largo = Array.from(consulta).length;

  const enviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (!cargando && consulta.trim().length > 0) onEnviar();
  };

  return (
    <section
      id={id}
      aria-labelledby={`${id}-titulo`}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCerrar();
      }}
      className="absolute inset-x-0 top-full z-40 border-b border-border bg-background shadow-lg"
    >
      <div className="catalogo-contenedor max-h-[75vh] space-y-5 overflow-y-auto py-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 id={`${id}-titulo`} className="text-lg font-semibold">
              {t("asistente.titulo")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("asistente.descripcion")}</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onCerrar} aria-label={t("asistente.cerrar")} className="catalogo-foco min-h-11 min-w-11">
            <X aria-hidden="true" />
          </Button>
        </div>
        <form onSubmit={enviar} className="space-y-2">
          <Label htmlFor={idCampo}>{t("asistente.etiqueta")}</Label>
          <textarea
            id={idCampo}
            ref={campo}
            value={consulta}
            maxLength={MAX_CONSULTA}
            rows={3}
            aria-describedby={idAyuda}
            placeholder={t("asistente.placeholder")}
            onChange={(e) => onCambiar(e.target.value)}
            className="catalogo-foco w-full resize-y rounded-lg border border-input bg-background px-4 py-3 text-base"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p id={idAyuda} className="text-xs text-muted-foreground">
              {contador(largo)}
            </p>
            <Button type="submit" disabled={cargando || consulta.trim().length === 0} className="catalogo-foco min-h-11 gap-2 rounded-full px-5">
              {cargando && <Loader2 aria-hidden="true" className="animate-spin motion-reduce:animate-none" />}
              {t(cargando ? "asistente.cargando" : "asistente.enviar")}
            </Button>
          </div>
        </form>
        <div className="space-y-2">
          <p id={`${id}-ejemplos`} className="text-sm font-medium text-muted-foreground">
            {t("asistente.ejemplos")}
          </p>
          <ul aria-labelledby={`${id}-ejemplos`} className="flex flex-wrap gap-2">
            {EJEMPLOS.map((clave) => (
              <li key={clave}>
                <button
                  type="button"
                  disabled={cargando}
                  onClick={() => onEjemplo(t(clave))}
                  className="catalogo-foco inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-secondary px-4 text-left text-sm font-medium transition-colors hover:bg-secundario-hover disabled:cursor-default disabled:opacity-50"
                >
                  <Sparkles aria-hidden="true" className="size-4 shrink-0" />
                  {t(clave)}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div aria-live="polite" className="space-y-4">
          {cargando && (
            <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
              {t("asistente.buscando")}
            </p>
          )}
          {estado.tipo === "error" && <p className="text-sm text-destructive">{t(MENSAJE_ERROR[estado.codigo])}</p>}
          {estado.tipo === "respuesta" && <Resultado respuesta={estado.respuesta} />}
        </div>
      </div>
    </section>
  );
}
