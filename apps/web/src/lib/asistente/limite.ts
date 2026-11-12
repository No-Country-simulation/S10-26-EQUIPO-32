// Rate limit en memoria, ventana fija (feature 002; RNF-05, AM-22, AM-23, D-24).
// Por IP y además un tope global: falsificar X-Forwarded-For no deja superar el global.

export interface OpcionesLimite {
  maxPorClave: number;
  maxGlobal: number;
  ventanaMs: number;
  /** Cota de memoria: con más claves vivas que esto se rechaza a las nuevas (AM-22). */
  maxClaves: number;
}

export type ResultadoLimite = { permitido: true } | { permitido: false; reintentarEnS: number };

export const LIMITE_ASISTENTE: OpcionesLimite = { maxPorClave: 10, maxGlobal: 60, ventanaMs: 60_000, maxClaves: 10_000 };

interface Ventana {
  inicio: number;
  cuenta: number;
}

export class Limitador {
  private readonly porClave = new Map<string, Ventana>();
  private global: Ventana = { inicio: 0, cuenta: 0 };

  constructor(
    private readonly opciones: OpcionesLimite = LIMITE_ASISTENTE,
    private readonly ahora: () => number = Date.now,
  ) {}

  consumir(clave: string): ResultadoLimite {
    const t = this.ahora();
    const { ventanaMs, maxPorClave, maxGlobal, maxClaves } = this.opciones;
    const espera = (v: Ventana) => ({ permitido: false as const, reintentarEnS: Math.max(1, Math.ceil((v.inicio + ventanaMs - t) / 1000)) });

    if (t - this.global.inicio >= ventanaMs) this.global = { inicio: t, cuenta: 0 };
    let v = this.porClave.get(clave);
    if (v === undefined || t - v.inicio >= ventanaMs) {
      if (v === undefined && this.porClave.size >= maxClaves) {
        this.purgar(t);
        if (this.porClave.size >= maxClaves) return espera(this.global);
      }
      v = { inicio: t, cuenta: 0 };
      this.porClave.set(clave, v);
    }
    if (v.cuenta >= maxPorClave) return espera(v);
    if (this.global.cuenta >= maxGlobal) return espera(this.global);
    v.cuenta += 1;
    this.global.cuenta += 1;
    return { permitido: true };
  }

  private purgar(t: number): void {
    for (const [k, v] of this.porClave) if (t - v.inicio >= this.opciones.ventanaMs) this.porClave.delete(k);
  }
}

/** IP del cliente según el proxy. Fuera de un proxy de confianza es falsificable: lo cubre el tope global (AM-23). */
export function obtenerIp(headers: Headers): string {
  const candidata = headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip")?.trim() || "";
  return /^[0-9a-fA-F:.]{2,45}$/.test(candidata) ? candidata : "anonima";
}
