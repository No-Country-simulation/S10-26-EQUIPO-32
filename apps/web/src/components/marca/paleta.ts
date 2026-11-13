// Paleta de 8 colores fuertes (ui-brief §12.2): violeta, azul eléctrico, verde lima, naranja, rosa, cian, amarillo y rojo.
// Son superficie decorativa: el texto nunca va sobre estos colores salvo `texto`, que tiene su contraste verificado.
export interface Color {
  nombre: string;
  /** Inicio y fin del gradiente. */
  desde: string;
  hasta: string;
  /** Tono suave para fondos de pantallas de preview. */
  suave: string;
}

export const PALETA: readonly Color[] = [
  { nombre: "violeta", desde: "#6d28d9", hasta: "#a855f7", suave: "#f3e8ff" },
  { nombre: "azul", desde: "#1d4ed8", hasta: "#3b82f6", suave: "#dbeafe" },
  { nombre: "lima", desde: "#4d7c0f", hasta: "#a3e635", suave: "#ecfccb" },
  { nombre: "naranja", desde: "#c2410c", hasta: "#fb923c", suave: "#ffedd5" },
  { nombre: "rosa", desde: "#be185d", hasta: "#f472b6", suave: "#fce7f3" },
  { nombre: "cian", desde: "#0e7490", hasta: "#22d3ee", suave: "#cffafe" },
  { nombre: "amarillo", desde: "#a16207", hasta: "#facc15", suave: "#fef9c3" },
  { nombre: "rojo", desde: "#b91c1c", hasta: "#f87171", suave: "#fee2e2" },
];

/** FNV-1a de 32 bits: determinista, sin dependencias. Solo se aplica al `id` (ASCII estricto del contrato). */
export function hashId(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export interface RasgosMarca {
  color: Color;
  acento: Color;
  forma: number;
  giro: 0 | 90 | 180 | 270;
}

export const FORMAS = 6;

export function rasgos(id: string): RasgosMarca {
  const h = hashId(id);
  const i = h % PALETA.length;
  const j = (i + 1 + ((h >>> 3) % (PALETA.length - 1))) % PALETA.length; // acento siempre distinto del color
  return {
    color: PALETA[i]!,
    acento: PALETA[j]!,
    forma: (h >>> 7) % FORMAS,
    giro: ([0, 90, 180, 270] as const)[(h >>> 11) % 4]!,
  };
}
