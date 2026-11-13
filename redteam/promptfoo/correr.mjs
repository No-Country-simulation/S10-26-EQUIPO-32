// Orquestador del red-team v3 (spec 002 §13; RNF-33, AM-36, AM-37, AM-39).
//   node correr.mjs generar          → genera redteam.yaml (el set held-out) con Ollama, una sola vez.
//   node correr.mjs eval con|sin     → levanta `next dev` en :3000 (CATALOG_SOURCE=reales, con o sin guardrails),
//                                      corre promptfoo sobre redteam.yaml y guarda corridas/<fecha>-<modo>.json.
// promptfoo corre con un entorno mínimo (sin secretos del shell), sin caché (si no, «sin» reusaría las respuestas de
// «con»), sin generación remota ni telemetría, y con guardia-red.mjs precargada: toda conexión queda en
// corridas/red-<paso>.jsonl y cualquier destino que no sea loopback se bloquea.
import { spawn, execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { setTimeout as esperar } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const AQUI = fileURLToPath(new URL(".", import.meta.url));
const WEB = fileURLToPath(new URL("../../apps/web/", import.meta.url));
const CORRIDAS = `${AQUI}corridas/`;
const OBJETIVO = "http://localhost:3000";
mkdirSync(CORRIDAS, { recursive: true });

const [paso, modo] = process.argv.slice(2);

function entornoPromptfoo(logRed) {
  return {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    TMPDIR: process.env.TMPDIR ?? "/tmp",
    PROMPTFOO_CONFIG_DIR: `${AQUI}.promptfoo`,
    PROMPTFOO_DISABLE_REMOTE_GENERATION: "true",
    PROMPTFOO_DISABLE_REDTEAM_REMOTE_GENERATION: "true",
    PROMPTFOO_DISABLE_TELEMETRY: "1",
    PROMPTFOO_DISABLE_UPDATE: "1",
    PROMPTFOO_DISABLE_SHARING: "1",
    PROMPTFOO_DISABLE_SHARE_EMAIL_REQUEST: "1",
    PROMPTFOO_DISABLE_REDTEAM_MODERATION: "1",
    PROMPTFOO_CACHE_ENABLED: "false",
    PROMPTFOO_NUM_JAILBREAK_ITERATIONS: "3",
    PROMPTFOO_REQUEST_BACKOFF_MS: "10000",
    OLLAMA_BASE_URL: "http://127.0.0.1:11434",
    NODE_OPTIONS: `--import=${AQUI}guardia-red.mjs`,
    GUARDIA_RED_LOG: logRed,
    NO_COLOR: "1",
  };
}

function promptfoo(args, logRed) {
  return new Promise((resolve, reject) => {
    const p = spawn(`${AQUI}node_modules/.bin/promptfoo`, args, { cwd: AQUI, env: entornoPromptfoo(logRed), stdio: "inherit" });
    p.on("exit", (code) => resolve(code ?? 1));
    p.on("error", reject);
  });
}

async function levantarNext(sinGuardrails) {
  const env = { ...process.env, REDTEAM_DIST_DIR: "1", CATALOG_SOURCE: "reales", REDTEAM_SIN_GUARDRAILS: sinGuardrails ? "1" : "", NEXT_TELEMETRY_DISABLED: "1" };
  delete env.NODE_ENV; // RNF-21: el modo sin guardrails solo existe fuera de producción
  const proceso = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", "3000", "-H", "localhost"], { cwd: WEB, env, detached: true, stdio: "ignore" });
  for (let i = 0; i < 120; i += 1) {
    try {
      if ((await fetch(`${OBJETIVO}/`, { signal: AbortSignal.timeout(60_000) })).ok) return proceso;
    } catch {
      /* arrancando */
    }
    await esperar(1000);
  }
  process.kill(-proceso.pid, "SIGTERM");
  throw new Error("next dev no respondió a tiempo");
}

// En 0.125.1 la estrategia `jailbreak` está deprecada y se genera como `jailbreak:meta`, cuyo proveedor
// (`iterative:meta`) exige generación remota (iterativeMeta-*.js). Se reemplaza por el iterativo clásico, que usa el
// atacante local (redteam.provider = Ollama). Solo cambia el proveedor del ataque: los objetivos generados no se tocan.
function ajustarSet() {
  const ruta = `${AQUI}redteam.yaml`;
  const original = readFileSync(ruta, "utf8");
  const ajustado = original
    .replaceAll("promptfoo:redteam:iterative:meta", "promptfoo:redteam:iterative")
    .replaceAll("strategyId: jailbreak:meta", "strategyId: jailbreak")
    .replaceAll("PromptExtraction/IterativeMeta", "PromptExtraction/Iterative");
  writeFileSync(ruta, ajustado);
  console.log(`[v3] set ajustado: ${(original.match(/iterative:meta/g) ?? []).length} referencias a iterative:meta reemplazadas`);
}

if (paso === "generar") {
  const code = await promptfoo(["redteam", "generate", "-c", "promptfooconfig.yaml", "-o", "redteam.yaml", "--force", "--no-cache"], `${CORRIDAS}red-generacion.jsonl`);
  if (code === 0) ajustarSet();
  process.exit(code);
}

if (paso === "ajustar") {
  ajustarSet();
  process.exit(0);
}

if (paso === "eval" && (modo === "con" || modo === "sin")) {
  if (process.env.NODE_ENV === "production") throw new Error("no se corre con NODE_ENV=production (RNF-21)");
  if (!existsSync(`${AQUI}redteam.yaml`)) throw new Error("falta redteam.yaml: correr primero `node correr.mjs generar`");
  try {
    await fetch(`${OBJETIVO}/`, { signal: AbortSignal.timeout(2000) });
    throw new Error("ya hay algo escuchando en :3000; bajarlo antes de correr");
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("ya hay")) throw e;
  }
  const tsconfig = `${WEB}tsconfig.json`;
  const tsOriginal = readFileSync(tsconfig, "utf8"); // next dev agrega los tipos de .next-redteam: se restaura
  const git = (...a) => execFileSync("git", a, { cwd: WEB, encoding: "utf8" }).trim();
  const fecha = new Date().toISOString().replace(/[:.]/g, "-");
  const salida = `${CORRIDAS}${fecha}-${modo}.json`;
  const meta = {
    modo,
    inicio: new Date().toISOString(),
    commit: git("rev-parse", "--short", "HEAD"),
    arbolLimpioAsistente: git("status", "--porcelain", "--", "src", "data") === "",
    objetivo: `${OBJETIVO}/api/asistente`,
    catalogSource: "reales",
    redTeamSinGuardrails: modo === "sin",
  };
  console.log(`[v3] levantando next dev ${modo} guardrails en :3000…`);
  const next = await levantarNext(modo === "sin");
  let code;
  try {
    code = await promptfoo(["redteam", "eval", "-c", "redteam.yaml", "-o", salida, "-j", "1", "--delay", "6500", "--no-cache", "--no-share", "--no-progress-bar"], `${CORRIDAS}red-${modo}.jsonl`);
  } finally {
    try {
      process.kill(-next.pid, "SIGTERM");
    } catch {
      /* ya terminó */
    }
    await esperar(2000);
    writeFileSync(tsconfig, tsOriginal);
  }
  writeFileSync(`${CORRIDAS}${fecha}-${modo}.meta.json`, JSON.stringify({ ...meta, fin: new Date().toISOString(), codigoSalida: code, json: salida.split("/").pop() }, null, 2) + "\n");
  console.log(`[v3] ${modo}: promptfoo terminó con código ${code} → ${salida}`);
  process.exit(0);
}

console.error("uso: node correr.mjs generar | eval con|sin");
process.exit(1);
