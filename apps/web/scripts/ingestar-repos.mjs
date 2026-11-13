// Ingesta del catálogo real (feature 005; RF-16, RF-17, RF-18, RNF-26, RNF-27). Pensada para un cron: sin
// intervención, con log claro y código de salida. No escribe nada hasta que todo salió bien (sin datasets a medias).
//
// Uso: GITHUB_TOKEN=... npm run ingesta   (el token solo por entorno; nunca en un archivo ni en el log)
//   Lee   ../../data/semilla-repos.json  (lista curada, versionada)
//   Lee   data/repos-reales.json         (lo curado se conserva: descripción e ideas de los repos que ya estaban)
//   Pide  api.github.com/repos/{owner}/{repo}, el avatar del owner y, para repos sin ideas, Ollama local
//   Escribe data/repos-reales.json, data/embeddings.json, public/logos/<id>.(png|jpg) y public/logos/fuentes.json
//
// Códigos de salida: 0 ok · 1 falla durante la corrida (red, API, LLM, embeddings) · 2 configuración o semilla inválida.
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { calcularEmbeddings, urlOllama } from "./generar-embeddings.mjs";
import {
  FORMATO_IDEAS,
  MAX_LOGO_BYTES,
  archivoLogo,
  mapearRepo,
  mensajesIdeas,
  motivoExclusion,
  tipoImagen,
  urlAvatar,
  validarIdeaGenerada,
  validarSemilla,
} from "./ingesta-lib.mjs";

const SEMILLA = new URL("../../../data/semilla-repos.json", import.meta.url);
const REALES = new URL("../data/repos-reales.json", import.meta.url);
const EMBEDDINGS = new URL("../data/embeddings.json", import.meta.url);
const LOGOS = new URL("../public/logos/", import.meta.url);
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

function escribirAtomico(url, contenido) {
  const tmp = new URL(`${url.href}.tmp`);
  writeFileSync(tmp, contenido);
  renameSync(tmp, url);
}

async function main() {
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
  escribirAtomico(new URL("fuentes.json", LOGOS), `${JSON.stringify(fuentes, null, 2)}\n`);
  escribirAtomico(EMBEDDINGS, `${JSON.stringify(embeddings)}\n`);
  escribirAtomico(REALES, `${JSON.stringify(repos, null, 2)}\n`);

  const segundos = Math.round((Date.now() - inicio) / 1000);
  log(
    "info",
    `ok: ${repos.length} repos (${semilla.length - repos.length} excluidos), ${generadas} con ideas nuevas, ` +
      `${conLogo.length} logos, ${embeddings.items.length} embeddings, ${segundos} s`,
  );
  if (repos.length < 100) log("warn", `quedaron ${repos.length} repos, menos de 100: revisar la semilla`);
}

main().catch((e) => {
  // Solo el mensaje propio: nunca el token ni cuerpos de respuesta externos (A09).
  log("error", e instanceof Error ? e.message : "error desconocido");
  process.exit(e instanceof ErrorConfig ? 2 : 1);
});
