// Iniciales para los tiles y placeholders (ui-brief §11.2): glifos propios en lugar de logos de terceros.
// El nombre es texto externo: solo se toman letras o dígitos y se muestran como texto de React.
const LETRA_O_DIGITO = /[\p{L}\p{N}]/u;

export function iniciales(nombre: string, id: string): string {
  const letras = nombre
    .split(/\s+/)
    .map((palabra) => LETRA_O_DIGITO.exec(palabra)?.[0] ?? "")
    .filter(Boolean)
    .slice(0, 2)
    .join("");
  // El id es ASCII estricto (contrato): sirve de respaldo si el nombre no tiene letras.
  return (letras || id.slice(0, 2)).toLocaleUpperCase("es");
}
