import { t } from "@/i18n/es";

/** Única fuente del texto de licencia (RNF-13): nunca devuelve vacío; sin dato dice «Sin licencia declarada». */
export function textoLicencia(licencia: string | null): string {
  return licencia !== null && licencia.trim().length > 0 ? licencia : t("comun.sinLicencia");
}
