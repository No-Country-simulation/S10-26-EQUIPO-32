// Guardia de red para el red-team v3 (spec 002 §13; RNF-33, AM-37).
// Se precarga con `node --import ./guardia-red.mjs` (vía NODE_OPTIONS, así la heredan los procesos hijos).
// Intercepta TODA conexión TCP/TLS del proceso (fetch/undici, http, https, net y tls pasan por
// net.Socket.prototype.connect): registra el destino y BLOQUEA cualquiera que no sea loopback.
// Si promptfoo intentara generación remota, telemetría o un chequeo de versión, falla y queda en el log.
import dns from "node:dns";
import { appendFileSync } from "node:fs";
import net from "node:net";

const LOG = process.env.GUARDIA_RED_LOG ?? "";
const PERMITIDOS = new Set(["127.0.0.1", "::1", "localhost", "::ffff:127.0.0.1"]);

function registrar(evento) {
  if (!LOG) return;
  try {
    appendFileSync(LOG, `${JSON.stringify({ t: new Date().toISOString(), pid: process.pid, ...evento })}\n`);
  } catch {
    /* sin log no se rompe la guardia: igual bloquea */
  }
}

export const esLoopback = (host) => PERMITIDOS.has(String(host).toLowerCase()) || /^127\./.test(String(host));

function destino(args) {
  const [a, b] = args;
  if (Array.isArray(a)) return destino(a); // forma interna normalizada [options, cb]
  if (a !== null && typeof a === "object") {
    // Sin host ni puerto ni ruta (p. ej. un socket sobre un fd ya abierto): no hay destino de red nuevo.
    if (a.host === undefined && a.port === undefined && a.path === undefined) return { ruta: `(sin destino: ${Object.keys(a).join(",")})` };
    return { host: a.host ?? "localhost", puerto: a.port, ruta: a.path };
  }
  if (typeof a === "string" && Number.isNaN(Number(a))) return { ruta: a }; // socket Unix / pipe
  return { host: typeof b === "string" ? b : "localhost", puerto: a };
}

const conectarOriginal = net.Socket.prototype.connect;
net.Socket.prototype.connect = function connect(...args) {
  const d = destino(args);
  if (d.ruta !== undefined && d.host === undefined) {
    registrar({ tipo: "ipc", ruta: d.ruta, permitido: true });
    return conectarOriginal.apply(this, args);
  }
  const permitido = esLoopback(d.host);
  registrar({ tipo: "tcp", host: d.host, puerto: d.puerto, permitido });
  if (!permitido) {
    const error = Object.assign(new Error(`guardia-red: conexión bloqueada a ${d.host}:${d.puerto} (solo loopback)`), { code: "EGUARDIARED" });
    process.nextTick(() => this.destroy(error));
    return this;
  }
  return conectarOriginal.apply(this, args);
};

// Resolver un nombre externo ya revela intención: también se registra y se bloquea.
const lookupOriginal = dns.lookup;
dns.lookup = function lookup(hostname, ...resto) {
  const cb = resto[resto.length - 1];
  if (!esLoopback(hostname)) {
    registrar({ tipo: "dns", host: hostname, permitido: false });
    const error = Object.assign(new Error(`guardia-red: resolución bloqueada de ${hostname}`), { code: "EGUARDIARED" });
    if (typeof cb === "function") process.nextTick(() => cb(error));
    return undefined;
  }
  return lookupOriginal.call(this, hostname, ...resto);
};
const lookupPromesaOriginal = dns.promises.lookup;
dns.promises.lookup = async function lookup(hostname, ...resto) {
  if (!esLoopback(hostname)) {
    registrar({ tipo: "dns", host: hostname, permitido: false });
    throw Object.assign(new Error(`guardia-red: resolución bloqueada de ${hostname}`), { code: "EGUARDIARED" });
  }
  return lookupPromesaOriginal.call(this, hostname, ...resto);
};

registrar({ tipo: "inicio", argv: process.argv.slice(1, 3).map((a) => a.split("/").slice(-2).join("/")) });
