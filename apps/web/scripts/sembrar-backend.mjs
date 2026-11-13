// Siembra del backend (spec 001 §10, T43; RNF-25, MU-07, AM-34). Herramienta de OPERACIÓN: el frontend en runtime
// nunca usa token (solo lee endpoints públicos, P3).
// Ingesta los repos de data/repos-reales.json (108 desde la feature 005) en lotes de 15 (≤ 20, límite del backend), con NUESTRA categoría en cada uno.
// Lee BACKEND_URL y ADMIN_API_KEY del entorno: nunca se escriben en archivos ni se imprimen.
// Antes de sembrar verifica que una escritura SIN credencial sea rechazada (MU-07 contra el backend).
// Uso: BACKEND_URL=http://127.0.0.1:8000 ADMIN_API_KEY=... npm run sembrar:backend
import { readFileSync } from "node:fs";

const TAMANO_LOTE = 15;
const TIMEOUT_LOTE_MS = 180_000; // el backend lee GitHub por cada repo del lote

function salir(mensaje) {
  console.error(`[sembrar] ${mensaje}`);
  process.exit(1);
}

function origenBackend(valor) {
  let url;
  try {
    url = new URL(valor ?? "");
  } catch {
    salir("falta BACKEND_URL o no es una URL válida.");
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    salir("BACKEND_URL debe ser un origen http(s) sin credenciales, ruta ni query.");
  }
  return url.origin;
}

const BASE = origenBackend(process.env.BACKEND_URL);
const CLAVE = process.env.ADMIN_API_KEY ?? "";
if (CLAVE.trim().length < 24) salir("falta ADMIN_API_KEY (mínimo 24 caracteres). Generá una propia; no la escribas en archivos.");

const repos = JSON.parse(readFileSync(new URL("../data/repos-reales.json", import.meta.url), "utf8"));
const pedidos = repos.map((r) => ({ repo_url_or_slug: r.urlRepo, category: r.categorias[0] }));
const lotes = [];
for (let i = 0; i < pedidos.length; i += TAMANO_LOTE) lotes.push(pedidos.slice(i, i + TAMANO_LOTE));

/** Texto del backend para la consola: una línea, sin controles y corto (no es confiable). */
const limpio = (t) => String(t).replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/gu, " ").slice(0, 140);

async function postBatch(repositories, conCredencial) {
  const headers = { "Content-Type": "application/json" };
  if (conCredencial) headers.Authorization = `Bearer ${CLAVE}`;
  return fetch(`${BASE}/api/v1/ingestion/batch`, {
    method: "POST",
    headers,
    body: JSON.stringify({ repositories }),
    redirect: "error",
    signal: AbortSignal.timeout(TIMEOUT_LOTE_MS),
  });
}

// 1. MU-07: escribir sin credencial debe fallar con 401/403.
const sinToken = await postBatch([], false).catch(() => salir("el backend no responde en BACKEND_URL."));
if (sinToken.status !== 401 && sinToken.status !== 403) salir(`una escritura SIN credencial devolvió HTTP ${sinToken.status}: se aborta.`);
console.log(`[sembrar] escritura sin credencial rechazada: HTTP ${sinToken.status} (MU-07)`);

// 2. Ingesta en lotes.
let ok = 0;
const fallidos = [];
for (const [i, lote] of lotes.entries()) {
  const inicio = Date.now();
  const r = await postBatch(lote, true).catch((e) => salir(`lote ${i + 1}: sin respuesta (${e?.name ?? "error"}).`));
  if (r.status !== 200) salir(`lote ${i + 1}: HTTP ${r.status}.`);
  const resultados = await r.json();
  if (!Array.isArray(resultados)) salir(`lote ${i + 1}: respuesta inesperada.`);
  for (const res of resultados) {
    if (res?.success === true) ok += 1;
    else fallidos.push(`${limpio(res?.full_name)}: ${limpio(res?.message)}`);
  }
  console.log(`[sembrar] lote ${i + 1}/${lotes.length}: ${resultados.filter((x) => x?.success === true).length}/${lote.length} ingestados (${Math.round((Date.now() - inicio) / 1000)} s)`);
}

// 3. Verificación por la API pública (la misma que lee el frontend).
const lista = await (await fetch(`${BASE}/api/v1/repositories?limit=100`, { redirect: "error", signal: AbortSignal.timeout(10_000) })).json();
const categorias = new Map(pedidos.map((p) => [p.repo_url_or_slug.replace("https://github.com/", "").toLowerCase(), p.category]));
const conOtraCategoria = (lista.items ?? []).filter((it) => categorias.get(String(it.full_name).toLowerCase()) !== it.category).length;
console.log(`[sembrar] ${ok}/${pedidos.length} ingestados · la API pública lista ${lista.total} · con categoría distinta de la pedida: ${conOtraCategoria}`);
for (const f of fallidos) console.log(`[sembrar] fallo: ${f}`);
if (ok !== pedidos.length || conOtraCategoria > 0) process.exit(1);
