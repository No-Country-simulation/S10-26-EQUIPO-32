// Enlaces externos del sitio (ui-brief §11.3). Son constantes del proyecto: ninguno se arma con datos del catálogo,
// del usuario ni del LLM. Todos apuntan al repositorio público del equipo en GitHub.
export const URL_REPOSITORIO = "https://github.com/No-Country-simulation/S10-26-EQUIPO-32";

/** Archivo del repositorio en la rama principal. `ruta` es siempre una constante de este módulo. */
const archivo = (ruta: string) => `${URL_REPOSITORIO}/blob/main/${ruta}`;
const carpeta = (ruta: string) => `${URL_REPOSITORIO}/tree/main/${ruta}`;

export const ENLACES = {
  repositorio: URL_REPOSITORIO,
  security: archivo("SECURITY.md"),
  redTeam: archivo("docs/red-team.md"),
  owasp: archivo("docs/owasp.md"),
  nist: archivo("docs/perfil-nist-csf.md"),
  specs: carpeta("specs"),
  fotos: archivo("apps/web/public/imagenes/fuentes.json"),
  equipo: `${URL_REPOSITORIO}#equipo-y-roles`,
  csp: archivo("apps/web/src/lib/seguridad/csp.ts"),
  contrato: archivo("apps/web/src/lib/catalogo/contrato.ts"),
  guardrails: archivo("specs/002-asistente-rag/spec.md"),
  supplyChain: `${archivo("SECURITY.md")}#controles-vigentes`,
} as const;
