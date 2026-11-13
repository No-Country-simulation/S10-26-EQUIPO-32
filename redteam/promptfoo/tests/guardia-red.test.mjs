// Test de la guardia de red (spec 002 §13; RNF-33, AM-37): loopback pasa, todo lo demás se bloquea y se registra.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const GUARDIA = fileURLToPath(new URL("../guardia-red.mjs", import.meta.url));

function correrConGuardia(codigo) {
  const log = join(mkdtempSync(join(tmpdir(), "guardia-")), "red.jsonl");
  const salida = execFileSync(process.execPath, ["--import", GUARDIA, "--input-type=module", "-e", codigo], {
    env: { ...process.env, GUARDIA_RED_LOG: log },
    encoding: "utf8",
  });
  const eventos = readFileSync(log, "utf8").trim().split("\n").map((l) => JSON.parse(l));
  return { salida: salida.trim(), eventos };
}

test("bloquea fetch a un host externo (por nombre y por IP) y lo registra", () => {
  const { salida, eventos } = correrConGuardia(`
    const r = [];
    for (const u of ["https://api.promptfoo.app/x", "http://93.184.215.14/", "https://us.i.posthog.com/e"]) {
      try { await fetch(u, { signal: AbortSignal.timeout(5000) }); r.push("salió"); }
      catch (e) { r.push(String(e.cause?.code ?? e.code ?? e.name)); }
    }
    console.log(r.join(","));`);
  assert.equal(salida, "EGUARDIARED,EGUARDIARED,EGUARDIARED");
  const bloqueados = eventos.filter((e) => e.permitido === false).map((e) => e.host);
  assert.ok(bloqueados.includes("api.promptfoo.app"));
  assert.ok(bloqueados.includes("93.184.215.14"));
  assert.ok(bloqueados.includes("us.i.posthog.com"));
});

test("bloquea http.request y net.connect directos", () => {
  const { salida } = correrConGuardia(`
    import http from "node:http"; import net from "node:net";
    const a = await new Promise((res) => http.get("http://example.com/", () => res("salió")).on("error", (e) => res(e.code)));
    const b = await new Promise((res) => net.connect(443, "8.8.8.8", () => res("salió")).on("error", (e) => res(e.code)));
    console.log(a + "," + b);`);
  assert.equal(salida, "EGUARDIARED,EGUARDIARED");
});

test("deja pasar loopback (127.0.0.1 y localhost)", async () => {
  const servidor = createServer((_, res) => res.end("ok"));
  await new Promise((res) => servidor.listen(0, "127.0.0.1", res));
  const { port } = servidor.address();
  try {
    const { salida, eventos } = await new Promise((resolve, reject) => {
      // execFileSync bloquearía el event loop y el servidor no respondería: se usa un proceso asíncrono.
      import("node:child_process").then(({ execFile }) => {
        const log = join(mkdtempSync(join(tmpdir(), "guardia-")), "red.jsonl");
        execFile(
          process.execPath,
          ["--import", GUARDIA, "--input-type=module", "-e", `const a = await (await fetch("http://127.0.0.1:${port}/")).text(); const b = await (await fetch("http://localhost:${port}/")).text(); console.log(a + "," + b);`],
          { env: { ...process.env, GUARDIA_RED_LOG: log }, encoding: "utf8" },
          (err, stdout) => {
            if (err) return reject(err);
            resolve({ salida: stdout.trim(), eventos: readFileSync(log, "utf8").trim().split("\n").map((l) => JSON.parse(l)) });
          },
        );
      }, reject);
    });
    assert.equal(salida, "ok,ok");
    assert.ok(eventos.filter((e) => e.tipo === "tcp").every((e) => e.permitido === true));
  } finally {
    servidor.close();
  }
});
