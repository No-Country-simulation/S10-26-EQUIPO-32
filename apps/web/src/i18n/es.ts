// Diccionario de textos de la interfaz (RNF-17). Los componentes no llevan texto literal: usan t('clave').
export const es = {
  "sitio.nombre": "OpenBridge",
  "sitio.descripcion": "Catálogo de herramientas open-source para arquitectos de software",
} as const;

export type ClaveTexto = keyof typeof es;

export function t(clave: ClaveTexto): string {
  return es[clave];
}
