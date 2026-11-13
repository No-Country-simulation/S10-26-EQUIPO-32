// Genera data/sintetico.json de forma determinista (PRNG con semilla fija; plan 4.6, T10).
// Nombres e identificadores inventados: no son marcas ni repositorios reales (P7). Las URLs apuntan a un
// espacio de nombres ficticio y los snippets usan el dominio reservado .test.
// Uso: node scripts/generar-dataset.mjs [--salida ruta]
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TOTAL = 40; // MVP 2026-11-10: dataset reducido (RNF-07 fuera); la variedad se mantiene.
const SEMILLA = 20261110;
const REFERENCIA = Date.UTC(2026, 10, 1); // 2026-11-01: las fechas no dependen del reloj
const METRICAS_EN = "2026-11-09T00:00:00Z";

// mulberry32: PRNG pequeño y determinista.
function crearPrng(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const azar = crearPrng(SEMILLA);
const entero = (min, max) => min + Math.floor(azar() * (max - min + 1));
const elegir = (lista) => lista[Math.floor(azar() * lista.length)];

const CATEGORIAS = ["autenticacion", "base-de-datos", "pagos", "ia", "analitica", "busqueda"];
const SUFIJOS = {
  autenticacion: ["Acceso", "Llave", "Identidad"],
  "base-de-datos": ["Datos", "Registro", "Tabla"],
  pagos: ["Pago", "Cobro", "Caja"],
  ia: ["Mente", "Modelo", "Agente"],
  analitica: ["Metrica", "Panel", "Traza"],
  busqueda: ["Busca", "Indice", "Rastro"],
};
const PREFIJOS = ["Aurora", "Brisa", "Cobalto", "Delta", "Eco", "Faro", "Gema", "Halo", "Ibis", "Jade", "Kora", "Luma", "Mica", "Nodo", "Onda", "Pixel", "Quark", "Rumbo", "Sendero", "Tallo"];
const ETIQUETA = {
  autenticacion: "autenticación",
  "base-de-datos": "bases de datos",
  pagos: "pagos",
  ia: "inteligencia artificial",
  analitica: "analítica",
  busqueda: "búsqueda",
};
const LENGUAJES = ["TypeScript", "Python", "Go", "Rust", "Java", "Ruby", "PHP", "C#", "Kotlin"];
const LICENCIAS = ["MIT", "Apache-2.0", "BSD-3-Clause", "GPL-3.0", "MPL-2.0", "ISC", "AGPL-3.0"];
const NIVELES = ["activo", "moderado", "abandonado"];
const TIPOS = ["rest", "docker", "sdk", "webhook"];
const DIFICULTADES = ["baja", "media", "alta"];
const STACKS = ["node", "python", "go", "java", "ruby", "docker", "kubernetes", "postgres"];
const DISPARADORES = [
  "cuando un usuario se registra",
  "al recibir un pago",
  "cada vez que se publica un documento",
  "cuando falla una tarea programada",
  "al terminar un proceso por lotes",
  "cuando cambia el estado de un pedido",
];

const slug = (s) => s.toLowerCase();

function snippetPara(tipo, id) {
  switch (tipo) {
    case "rest":
      return `curl -X POST https://api.${id}.test/v1/eventos \\\n  -H "Content-Type: application/json" \\\n  -d '{"evento": "ejemplo"}'`;
    case "docker":
      return `docker run --rm -p 8080:8080 imagen-sintetica/${id}:latest`;
    case "sdk":
      return `import { crearCliente } from "${id}-sdk";\n\nconst cliente = crearCliente({ servidor: "https://api.${id}.test" });\nawait cliente.enviar({ evento: "ejemplo" });`;
    default:
      return `POST /webhooks/${id} HTTP/1.1\nHost: tu-servicio.test\nContent-Type: application/json\n\n{"evento": "ejemplo"}`;
  }
}

function crearIdeas(id, cuantas, indice) {
  const ideas = [];
  for (let k = 0; k < cuantas; k += 1) {
    const tipo = TIPOS[(indice + k) % TIPOS.length];
    ideas.push({
      tipo,
      disparadores: Array.from({ length: entero(1, 3) }, () => elegir(DISPARADORES)).filter((d, i, a) => a.indexOf(d) === i),
      snippet: snippetPara(tipo, id),
      stack: Array.from({ length: entero(1, 3) }, () => elegir(STACKS)).filter((d, i, a) => a.indexOf(d) === i),
      dificultad: DIFICULTADES[(indice + k) % DIFICULTADES.length],
      // Mezcla intencional de revisadas y no revisadas.
      revisada: (indice + k) % 3 !== 0,
    });
  }
  return ideas;
}

function generar() {
  const herramientas = [];
  const usados = new Set();
  for (let i = 0; i < TOTAL; i += 1) {
    const principal = CATEGORIAS[i % CATEGORIAS.length];
    const categorias = [principal];
    if (i % 5 < 2) categorias.push(CATEGORIAS[(i + 1 + (i % 4)) % CATEGORIAS.length]); // 16 con dos categorías
    const unicas = [...new Set(categorias)];

    let nombre;
    for (let intento = 0; ; intento += 1) {
      nombre = `${PREFIJOS[(i + intento * 7) % PREFIJOS.length]} ${SUFIJOS[principal][(i + intento) % 3]}`;
      if (!usados.has(nombre)) break;
    }
    usados.add(nombre);
    const id = slug(nombre).replace(/ /g, "-");

    const nivel = i < 3 ? NIVELES[i] : azar() < 0.5 ? "activo" : azar() < 0.6 ? "moderado" : "abandonado";
    const salud = nivel === "activo" ? entero(70, 98) : nivel === "moderado" ? entero(40, 69) : entero(5, 39);
    const sinSalud = i % 17 === 9; // algunas métricas faltan: la interfaz dirá «Sin dato»
    const dias = nivel === "activo" ? entero(0, 40) : nivel === "moderado" ? entero(60, 300) : entero(400, 1200);

    const larga = i % 9 === 2; // descripciones largas para ejercitar el corte de la tarjeta
    const descripcion =
      i % 4 === 1
        ? undefined // 10 sin descripción
        : larga
          ? `${nombre} resuelve un problema habitual del dominio de ${ETIQUETA[principal]}. `.repeat(8).trim()
          : `${nombre}: componente de ${ETIQUETA[principal]} pensado para integrarse con servicios existentes.`;

    herramientas.push({
      id,
      nombre,
      urlRepo: i % 12 === 7 ? null : `https://github.com/ejemplo-sintetico/${id}`,
      ...(descripcion === undefined ? {} : { descripcion }),
      categorias: unicas,
      stars: i % 11 === 5 ? 0 : Math.round(Math.exp(azar() * 10.5)),
      ultimaActualizacion: new Date(REFERENCIA - dias * 86400000).toISOString().replace(".000Z", "Z"),
      licencia: i % 7 === 3 ? null : LICENCIAS[i % LICENCIAS.length], // 6 sin licencia
      lenguaje: i % 13 === 0 ? null : LENGUAJES[i % LENGUAJES.length],
      issuesAbiertos: entero(0, 400),
      mantenedorActivo: nivel !== "abandonado",
      nivelMantenimiento: sinSalud ? null : nivel,
      healthScore: sinSalud ? null : salud,
      metricasTomadasEn: METRICAS_EN,
      ideas: i % 2 === 0 ? [] : crearIdeas(id, 1 + (i % 3), i), // 20 sin ideas
    });
  }
  return `${JSON.stringify(herramientas, null, 2)}\n`;
}

const aqui = dirname(fileURLToPath(import.meta.url));
const idx = process.argv.indexOf("--salida");
const destino = idx >= 0 && process.argv[idx + 1] ? resolve(process.argv[idx + 1]) : resolve(aqui, "../data/sintetico.json");
mkdirSync(dirname(destino), { recursive: true });
writeFileSync(destino, generar(), "utf8");
console.log(`Dataset sintético escrito en ${destino} (${TOTAL} herramientas).`);
