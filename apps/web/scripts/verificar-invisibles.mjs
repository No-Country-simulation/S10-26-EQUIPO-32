// Falla si el código fuente contiene caracteres bidi o de ancho cero crudos
// (Trojan Source, CVE-2021-42574; R-14). Se escriben como escapes \uXXXX.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = fileURLToPath(new URL("..", import.meta.url));
const carpetas = ["src", "tests", "scripts"];
const IGNORAR = new Set(["node_modules", ".next", "test-results", "playwright-report"]);
// Bidi U+202A-202E y U+2066-2069; ancho cero U+200B-200D y U+FEFF.
// También U+200E, U+200F, U+061C y U+2060, que texto.ts elimina por la misma razón.
const INVISIBLE = /[\u202A-\u202E\u2066-\u2069\u200B-\u200D\uFEFF\u200E\u200F\u061C\u2060]/u;

function* archivos(dir) {
  for (const nombre of readdirSync(dir)) {
    if (IGNORAR.has(nombre)) continue;
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) yield* archivos(ruta);
    else yield ruta;
  }
}

const hallazgos = [];
for (const carpeta of carpetas) {
  const dir = join(raiz, carpeta);
  try {
    statSync(dir);
  } catch {
    continue;
  }
  for (const ruta of archivos(dir)) {
    const buffer = readFileSync(ruta);
    if (buffer.includes(0)) continue; // binario
    buffer
      .toString("utf8")
      .split("\n")
      .forEach((linea, i) => {
        const m = INVISIBLE.exec(linea);
        if (m) {
          const cp = m[0].codePointAt(0).toString(16).toUpperCase().padStart(4, "0");
          hallazgos.push(`${relative(raiz, ruta)}:${i + 1} carácter invisible U+${cp}`);
        }
      });
  }
}

if (hallazgos.length > 0) {
  console.error(hallazgos.join("\n"));
  console.error("Usá escapes \\uXXXX en lugar del carácter crudo (R-14, CVE-2021-42574).");
  process.exit(1);
}
console.log("Sin caracteres bidi ni de ancho cero crudos en src, tests y scripts.");
