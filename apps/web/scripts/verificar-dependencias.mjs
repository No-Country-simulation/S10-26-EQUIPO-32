// Falla si package.json declara una dependencia que no está en allowed-deps.json
// (tabla 3 del plan) o si alguna versión no es exacta (RNF-14, R-09, AM-14).
import { readFileSync } from "node:fs";

const leer = (ruta) => JSON.parse(readFileSync(new URL(ruta, import.meta.url), "utf8"));
const pkg = leer("../package.json");
const permitidas = leer("../allowed-deps.json");

const errores = [];
for (const seccion of ["dependencies", "devDependencies"]) {
  const lista = new Set(permitidas[seccion] ?? []);
  for (const [nombre, version] of Object.entries(pkg[seccion] ?? {})) {
    if (!lista.has(nombre)) {
      errores.push(`${seccion}: «${nombre}» no está en allowed-deps.json (tabla 3 del plan).`);
    }
    if (!/^\d+\.\d+\.\d+$/.test(version)) {
      errores.push(`${seccion}: «${nombre}» tiene la versión «${version}»; debe ser exacta (x.y.z).`);
    }
  }
}
for (const seccion of ["optionalDependencies", "peerDependencies"]) {
  for (const nombre of Object.keys(pkg[seccion] ?? {})) {
    errores.push(`${seccion}: «${nombre}» no está permitida.`);
  }
}

if (errores.length > 0) {
  console.error(errores.join("\n"));
  process.exit(1);
}
console.log("Dependencias: todas están en la lista permitida y con versión exacta.");
