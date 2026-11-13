// Ingesta del catálogo real (feature 005; RF-16, RF-17, RF-18, RNF-26, RNF-27). Pensada para un cron: sin
// intervención, con log claro y código de salida. No escribe nada hasta que todo salió bien (sin datasets a medias).
//
// Uso: GITHUB_TOKEN=... npm run ingesta   (el token solo por entorno; nunca en un archivo ni en el log)
//   Lee   ../../data/semilla-repos.json  (lista curada, versionada)
//   Lee   data/repos-reales.json         (lo curado se conserva: descripción e ideas de los repos que ya estaban)
//   Pide  api.github.com/repos/{owner}/{repo}, el avatar del owner y, para repos sin ideas, Ollama local
//   Escribe data/repos-reales.json, data/embeddings.json, public/logos/<id>.(png|jpg) y public/logos/fuentes.json
//
// Capturas de producto (feature 007, RF-24, RNF-30): `npm run ingesta -- --solo-capturas` corre solo ese paso sobre
// data/repos-reales.json (sin token, sin Ollama): lee el README de cada repo desde raw.githubusercontent.com.
//   Escribe public/capturas/<id>.(png|jpg|webp) y public/capturas/fuentes.json (origen y licencia del repo).
//
// Códigos de salida: 0 ok · 1 falla durante la corrida (red, API, LLM, embeddings) · 2 configuración o semilla inválida.
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { calcularEmbeddings, urlOllama } from "./generar-embeddings.mjs";
import {
  FORMATO_IDEAS,
  MAX_CAPTURA_BYTES,
  MAX_LOGO_BYTES,
  MAX_README_BYTES,
  MAX_SALTOS,
  archivoCaptura,
  archivoLogo,
  candidatasCaptura,
  mapearRepo,
  mensajesIdeas,
  motivoExclusion,
  tipoCaptura,
  tipoImagen,
  urlAvatar,
  urlCaptura,
  validarIdeaGenerada,
  validarSemilla,
} from "./ingesta-lib.mjs";

const SEMILLA = new URL("../../../data/semilla-repos.json", import.meta.url);
const REALES = new URL("../data/repos-reales.json", import.meta.url);
const EMBEDDINGS = new URL("../data/embeddings.json", import.meta.url);
const LOGOS = new URL("../public/logos/", import.meta.url);
const CAPTURAS = new URL("../public/capturas/", import.meta.url);
const NOMBRES_README = ["README.md", "readme.md", "Readme.md", "README.markdown"];
const MODELO_IDEAS = process.env.INGESTA_MODELO_IDEAS?.trim() || "llama3.1:8b";
const CONCURRENCIA_GITHUB = 6;
const INTENTOS_IDEAS = 3;
const TIMEOUT_MS = 20_000;

class ErrorConfig extends Error {}
const log = (nivel, mensaje) => console[nivel === "error" ? "error" : "log"](`[ingesta] ${nivel.toUpperCase()} ${mensaje}`);

function token() {
  const t = process.env.GITHUB_TOKEN?.trim();
  if (!t) throw new ErrorConfig("falta GITHUB_TOKEN en el entorno (token de solo lectura, sin scopes).");
  return t;
}

async function enParalelo(items, limite, f) {
  const salida = new Array(items.length);
  let siguiente = 0;
  const trabajador = async () => {
    while (siguiente < items.length) {
      const i = siguiente++;
      salida[i] = await f(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limite, items.length) }, trabajador));
  return salida;
}

/** Metadatos de un repo. 404 → null (se excluye con aviso); cualquier otro fallo corta la corrida. */
async function metadatos(fullName, tk) {
  const [owner, repo] = fullName.split("/");
  const r = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${tk}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "openbridge-ingesta",
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  // Un repo renombrado redirige dentro de la API; fuera de api.github.com no se acepta.
  if (new URL(r.url).hostname !== "api.github.com") throw new Error(`${fullName}: redirección fuera de api.github.com`);
  if (r.status === 404) return null;
  if (r.status !== 200) throw new Error(`${fullName}: GitHub respondió ${r.status}`);
  return r.json();
}

/** Ideas nuevas con el LLM local. Hasta INTENTOS_IDEAS intentos; si ninguna idea valida, corta la corrida. */
async function generarIdeas(repo, ollama) {
  for (let intento = 1; intento <= INTENTOS_IDEAS; intento += 1) {
    const r = await fetch(`${ollama}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODELO_IDEAS,
        messages: mensajesIdeas(repo),
        format: FORMATO_IDEAS,
        stream: false,
        options: { temperature: intento === 1 ? 0.2 : 0.5, num_predict: 700 },
      }),
      signal: AbortSignal.timeout(180_000),
    });
    if (!r.ok) throw new Error(`Ollama respondió ${r.status} (${MODELO_IDEAS})`);
    let ideas = [];
    try {
      const crudo = JSON.parse((await r.json())?.message?.content ?? "");
      ideas = (Array.isArray(crudo?.ideas) ? crudo.ideas : []).slice(0, 2).map(validarIdeaGenerada).filter(Boolean);
    } catch {
      ideas = [];
    }
    if (ideas.length > 0) return ideas;
    log("warn", `${repo.id}: ideas inválidas en el intento ${intento}`);
  }
  throw new Error(`${repo.id}: el LLM no generó ninguna idea válida en ${INTENTOS_IDEAS} intentos`);
}

/** Avatar del owner, validado (RNF-26). Cualquier problema → null: la interfaz usa la marca generativa. */
async function descargarLogo(id, avatar) {
  const url = urlAvatar(avatar);
  if (url === null) return { error: "url de avatar no permitida" };
  let r;
  try {
    r = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(TIMEOUT_MS), headers: { "User-Agent": "openbridge-ingesta" } });
  } catch {
    return { error: "red o redirección" };
  }
  if (r.status !== 200) return { error: `HTTP ${r.status}` };
  if (Number(r.headers.get("content-length") ?? "0") > MAX_LOGO_BYTES) return { error: "más de 200 KB" };
  const lector = r.body?.getReader();
  if (!lector) return { error: "sin cuerpo" };
  const partes = [];
  let total = 0;
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_LOGO_BYTES) {
      await lector.cancel();
      return { error: "más de 200 KB" };
    }
    partes.push(value);
  }
  const bytes = new Uint8Array(total);
  let i = 0;
  for (const p of partes) {
    bytes.set(p, i);
    i += p.byteLength;
  }
  const tipo = tipoImagen(bytes); // magic bytes: el content-type del servidor no se cree
  if (tipo === null) return { error: "no es PNG ni JPEG" };
  const archivo = archivoLogo(id, tipo.extension);
  if (archivo === null) return { error: "id inválido" };
  const origen = new URL(url);
  return { archivo, bytes, tipo: tipo.tipo, origen: `${origen.origin}${origen.pathname}` };
}

/** Lee el cuerpo hasta `max` bytes; si lo pasa, corta y devuelve `null`. */
async function leerAcotado(r, max) {
  if (Number(r.headers.get("content-length") ?? "0") > max) return null;
  const lector = r.body?.getReader();
  if (!lector) return null;
  const partes = [];
  let total = 0;
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await lector.cancel();
      return null;
    }
    partes.push(value);
  }
  const bytes = new Uint8Array(total);
  let i = 0;
  for (const p of partes) {
    bytes.set(p, i);
    i += p.byteLength;
  }
  return bytes;
}

/**
 * GET acotado: solo hosts de `urlCaptura`, https, y las redirecciones se siguen a mano validando CADA salto contra
 * la misma lista (RNF-30, MU-29). El primer salto, si es de raw.githubusercontent.com, debe ser del propio repo.
 */
async function bajar(urlInicial, fullName, max) {
  let url = urlCaptura(urlInicial, fullName);
  if (url === null) return { error: "url no permitida" };
  for (let salto = 0; salto <= MAX_SALTOS; salto += 1) {
    let r;
    try {
      r = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(TIMEOUT_MS), headers: { "User-Agent": "openbridge-ingesta" } });
    } catch {
      return { error: "red" };
    }
    if ([301, 302, 303, 307, 308].includes(r.status)) {
      let siguiente = null;
      try {
        siguiente = urlCaptura(new URL(r.headers.get("location") ?? "", url).href);
      } catch {
        siguiente = null;
      }
      if (siguiente === null) return { error: "redirección fuera de los hosts permitidos" };
      url = siguiente;
      continue;
    }
    if (r.status !== 200) return { error: `HTTP ${r.status}` };
    const bytes = await leerAcotado(r, max);
    return bytes === null ? { error: "más del máximo" } : { bytes, url };
  }
  return { error: "demasiadas redirecciones" };
}

/** Primera captura válida del README de un repo (RF-24). Todo problema → `{ error }`: queda la pantalla de preview. */
async function capturaDe(repo) {
  const fullName = new URL(repo.urlRepo).pathname.slice(1);
  let markdown = null;
  for (const nombre of NOMBRES_README) {
    const r = await bajar(`https://raw.githubusercontent.com/${fullName}/HEAD/${nombre}`, fullName, MAX_README_BYTES);
    if (r.bytes) {
      markdown = new TextDecoder("utf-8").decode(r.bytes);
      break;
    }
  }
  if (markdown === null) return { error: "sin README.md" };
  const candidatas = candidatasCaptura(markdown, fullName);
  if (candidatas.length === 0) return { error: "sin imagen candidata" };
  for (const candidata of candidatas) {
    const r = await bajar(candidata, fullName, MAX_CAPTURA_BYTES);
    if (r.error) continue;
    const tipo = tipoCaptura(r.bytes); // magic bytes: el content-type del servidor no se cree
    if (tipo === null) continue;
    const archivo = archivoCaptura(repo.id, tipo.extension);
    if (archivo === null) return { error: "id inválido" };
    const origen = new URL(r.url);
    return { id: repo.id, archivo, bytes: r.bytes, tipo: tipo.tipo, origen: `${origen.origin}${origen.pathname}`, repo: repo.urlRepo, licencia: repo.licencia ?? null };
  }
  return { error: "ninguna candidata válida" };
}

/** Capturas de toda la lista. Una imagen idéntica en dos repos no es evidencia de ninguno: se descartan las dos (RNF-32). */
async function capturas(repos) {
  const resultados = await enParalelo(repos, CONCURRENCIA_GITHUB, (repo) => capturaDe(repo));
  const buenas = [];
  resultados.forEach((c, i) => {
    if (c.error) log("info", `sin captura ${repos[i].id}: ${c.error}`);
    else buenas.push({ ...c, sha256: createHash("sha256").update(c.bytes).digest("hex") });
  });
  const cuenta = new Map();
  for (const c of buenas) cuenta.set(c.sha256, (cuenta.get(c.sha256) ?? 0) + 1);
  return buenas.filter((c) => {
    if ((cuenta.get(c.sha256) ?? 0) > 1) log("warn", `captura repetida en varios repos, descartada: ${c.id}`);
    return (cuenta.get(c.sha256) ?? 0) === 1;
  });
}

function escribirCapturas(lista, ahoraIso) {
  mkdirSync(CAPTURAS, { recursive: true });
  const archivos = new Set(lista.map((c) => c.archivo));
  for (const f of readdirSync(CAPTURAS)) {
    if (/^[a-z0-9][a-z0-9._-]*\.(png|jpg|webp)$/.test(f) && !archivos.has(f)) unlinkSync(new URL(f, CAPTURAS));
  }
  for (const c of lista) writeFileSync(new URL(c.archivo, CAPTURAS), c.bytes);
  const fuentes = {
    descripcion:
      "Capturas de producto tomadas del README de cada repo (feature 007, RF-24). Validadas por magic bytes (PNG, JPEG o WebP), ≤ 600 KB, desde hosts de GitHub. Cada archivo es del repo que la declara; la licencia es la del repo.",
    generadoEn: ahoraIso,
    capturas: lista.map((c) => ({
      id: c.id,
      archivo: c.archivo,
      tipo: c.tipo,
      bytes: c.bytes.byteLength,
      sha256: c.sha256,
      origen: c.origen,
      repo: c.repo,
      licencia: c.licencia,
      descargadoEn: ahoraIso,
    })),
  };
  escribirAtomico(new URL("fuentes.json", CAPTURAS), `${JSON.stringify(fuentes, null, 2)}\n`);
}

async function soloCapturas() {
  const inicio = Date.now();
  const ahoraIso = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  let repos;
  try {
    repos = JSON.parse(readFileSync(REALES, "utf8"));
  } catch {
    throw new ErrorConfig("no se pudo leer data/repos-reales.json.");
  }
  const lista = await capturas(repos);
  escribirCapturas(lista, ahoraIso);
  log("info", `ok: ${lista.length} de ${repos.length} repos con captura real, ${Math.round((Date.now() - inicio) / 1000)} s`);
}

function escribirAtomico(url, contenido) {
  const tmp = new URL(`${url.href}.tmp`);
  writeFileSync(tmp, contenido);
  renameSync(tmp, url);
}

async function main() {
  if (process.argv.includes("--solo-capturas")) return soloCapturas();
  const inicio = Date.now();
  const ahora = new Date();
  const ahoraIso = ahora.toISOString().replace(/\.\d{3}Z$/, "Z");
  const tk = token();
  let semilla;
  try {
    semilla = validarSemilla(JSON.parse(readFileSync(SEMILLA, "utf8")));
  } catch (e) {
    throw new ErrorConfig(`semilla: ${e instanceof Error ? e.message : "ilegible"}`);
  }
  const ollama = urlOllama();
  let previos = [];
  try {
    previos = JSON.parse(readFileSync(REALES, "utf8"));
  } catch {
    log("warn", "no hay repos-reales.json previo: todas las ideas se generan");
  }
  const previoPorId = new Map((Array.isArray(previos) ? previos : []).map((r) => [r.id, r]));
  log("info", `semilla: ${semilla.length} repos; modelo de ideas ${MODELO_IDEAS}`);

  // 1. Metadatos reales y criterio de la semilla.
  const metas = await enParalelo(semilla, CONCURRENCIA_GITHUB, (e) => metadatos(e.repo, tk));
  const aceptados = [];
  semilla.forEach((entrada, i) => {
    const motivo = metas[i] === null ? "no existe (404)" : motivoExclusion(metas[i], entrada.licencia, ahora);
    if (motivo !== null) log("warn", `excluido ${entrada.repo}: ${motivo}`);
    else aceptados.push({ entrada, meta: metas[i] });
  });

  // 2. Ideas: las curadas o ya generadas se conservan; solo se generan las que faltan.
  const repos = [];
  let generadas = 0;
  for (const { entrada, meta } of aceptados) {
    const previo = previoPorId.get(entrada.id);
    const ideasPrevias = (Array.isArray(previo?.ideas) ? previo.ideas : []).filter((x) => x && typeof x === "object");
    const base = mapearRepo(entrada, meta, previo, [], ahoraIso);
    let ideas = ideasPrevias.map((x) => ({ ...x, revisada: x.revisada === true }));
    if (ideas.length === 0) {
      ideas = await generarIdeas(base, ollama);
      generadas += 1;
      log("info", `ideas generadas para ${entrada.id} (${generadas})`);
    }
    repos.push({ ...base, ideas });
  }

  // 3. Logos (no bloquean: si falla uno, la interfaz usa MarcaRepo).
  const logos = await enParalelo(aceptados, CONCURRENCIA_GITHUB, ({ entrada, meta }) => descargarLogo(entrada.id, meta.owner?.avatar_url));
  const conLogo = [];
  logos.forEach((l, i) => {
    if (l.error) log("warn", `sin logo ${aceptados[i].entrada.id}: ${l.error}`);
    else conLogo.push({ id: aceptados[i].entrada.id, ...l });
  });

  // 3b. Capturas de producto (no bloquean: sin captura válida la interfaz usa PantallaPreview).
  const conCaptura = await capturas(repos);

  // 4. Embeddings del dataset nuevo.
  const embeddings = await calcularEmbeddings(repos, ollama);

  // 5. Escritura: recién acá se toca el disco.
  mkdirSync(LOGOS, { recursive: true });
  const archivos = new Set(conLogo.map((l) => l.archivo));
  for (const f of readdirSync(LOGOS)) {
    if (/^[a-z0-9][a-z0-9._-]*\.(png|jpg)$/.test(f) && !archivos.has(f)) unlinkSync(new URL(f, LOGOS));
  }
  for (const l of conLogo) writeFileSync(new URL(l.archivo, LOGOS), l.bytes);
  const fuentes = {
    descripcion: "Logos oficiales: avatar de la organización u owner en GitHub (feature 005, RF-18). Validados por magic bytes, ≤ 200 KB.",
    generadoEn: ahoraIso,
    logos: conLogo.map((l) => ({
      id: l.id,
      archivo: l.archivo,
      tipo: l.tipo,
      bytes: l.bytes.byteLength,
      sha256: createHash("sha256").update(l.bytes).digest("hex"),
      origen: l.origen,
      descargadoEn: ahoraIso,
    })),
  };
  escribirCapturas(conCaptura, ahoraIso);
  escribirAtomico(new URL("fuentes.json", LOGOS), `${JSON.stringify(fuentes, null, 2)}\n`);
  escribirAtomico(EMBEDDINGS, `${JSON.stringify(embeddings)}\n`);
  escribirAtomico(REALES, `${JSON.stringify(repos, null, 2)}\n`);

  const segundos = Math.round((Date.now() - inicio) / 1000);
  log(
    "info",
    `ok: ${repos.length} repos (${semilla.length - repos.length} excluidos), ${generadas} con ideas nuevas, ` +
      `${conLogo.length} logos, ${conCaptura.length} capturas, ${embeddings.items.length} embeddings, ${segundos} s`,
  );
  if (repos.length < 100) log("warn", `quedaron ${repos.length} repos, menos de 100: revisar la semilla`);
}

main().catch((e) => {
  // Solo el mensaje propio: nunca el token ni cuerpos de respuesta externos (A09).
  log("error", e instanceof Error ? e.message : "error desconocido");
  process.exit(e instanceof ErrorConfig ? 2 : 1);
});
