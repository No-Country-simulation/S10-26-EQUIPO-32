// Se ejecuta una vez al arrancar el servidor de Next (plan 4.1).
// En producción, sin CATALOG_SOURCE el servidor no arranca.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return; // el build no necesita la fuente
  const { resolverFuente } = await import("./lib/catalogo/repositorio");
  resolverFuente(process.env);
}
