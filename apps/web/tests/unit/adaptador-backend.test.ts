// Adaptador backend (spec 001 §10, plan §9; RF-15, RNF-24, MU-23, MU-24, AM-30..33, AM-35).
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AdaptadorBackend,
  idPara,
  nombrePara,
  nivelPorCommits,
  resolverBackendUrl,
  TIMEOUT_BACKEND_MS,
  type Fetch,
} from "@/lib/catalogo/adaptadores/backend";
import { ErrorCatalogo, ErrorConfiguracion } from "@/lib/catalogo/repositorio";
import { ejecutarSuiteContratoAdaptador } from "./suite-adaptador";

const BASE = "http://backend.test";

const item = (extra: Record<string, unknown> = {}) => ({
  id: "6b0f3c1e-0000-4000-8000-000000000001",
  full_name: "keycloak/keycloak",
  owner: "keycloak",
  name: "keycloak",
  description: "Open Source Identity and Access Management",
  html_url: "https://github.com/keycloak/keycloak",
  category: "autenticacion",
  language: "Java",
  license_spdx: "Apache-2.0",
  stars_count: 37836,
  forks_count: 8000,
  open_issues_count: 3547,
  is_archived: false,
  health_score: 78.5,
  github_id: 1,
  created_at: "2026-11-13T15:20:00.123456+00:00",
  updated_at: "2026-11-13T15:20:00.123456+00:00",
  ...extra,
});

const breakdown = (extra: Record<string, unknown> = {}) => ({
  commit_frequency_score: 25,
  issue_resolution_score: 3,
  license_score: 20,
  community_score: 20,
  documentation_score: 10.5,
  total_score: 78.5,
  penalty_archived: false,
  id: "m1",
  repository_id: "r1",
  calculated_at: "2026-11-13T15:20:01.5+00:00",
  ...extra,
});

const json = (cuerpo: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(cuerpo), { status: 200, headers: { "content-type": "application/json" }, ...init });

type Ruta = (url: string, init: RequestInit) => Response | Promise<Response>;

/** Backend simulado: lista + detalle por full_name. Registra cada llamada para verificar método y cabeceras. */
function backendFalso({ items = [item()], detalles = {} as Record<string, unknown>, lista, detalle }: { items?: unknown[]; detalles?: Record<string, unknown>; lista?: Ruta; detalle?: Ruta } = {}) {
  const llamadas: Array<{ url: string; init: RequestInit }> = [];
  const fetchFn = vi.fn(async (url: string, init: RequestInit) => {
    llamadas.push({ url, init });
    const u = new URL(url);
    if (u.pathname === "/api/v1/repositories") return lista ? lista(url, init) : json({ total: items.length, limit: 100, offset: 0, items });
    const slug = decodeURIComponent(u.pathname.replace("/api/v1/repositories/", ""));
    if (detalle) return detalle(url, init);
    const encontrado = (items as Array<{ full_name?: string }>).find((i) => i.full_name === slug);
    if (encontrado === undefined) return json({ detail: "no" }, { status: 404 });
    return json({ repository: encontrado, health_breakdown: slug in detalles ? detalles[slug] : breakdown() });
  }) as unknown as Fetch & ReturnType<typeof vi.fn>;
  return { fetchFn, llamadas };
}

const crear = (fetchFn: Fetch, extra: { timeoutMs?: number; ahora?: () => number } = {}) => new AdaptadorBackend({ baseUrl: BASE, fetchFn, ...extra });

afterEach(() => vi.restoreAllMocks());
const silenciar = () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
};

// La misma suite que corren todos los adaptadores (solo lectura, todo sale del contrato).
ejecutarSuiteContratoAdaptador("backend (simulado)", () =>
  crear(
    backendFalso({
      items: [item(), item({ full_name: "ory/kratos", name: "kratos", html_url: "https://github.com/ory/kratos", health_score: 61 })],
    }).fetchFn,
  ),
);

describe("adaptador backend · respuesta válida", () => {
  it("mapea al contrato: id del asistente, salud redondeada, nivel por commits, licencia y sin datos inventados", async () => {
    const { herramientas, omitidas } = await crear(backendFalso().fetchFn).listarHerramientas();
    expect(omitidas).toBe(0);
    expect(herramientas[0]).toMatchObject({
      id: "keycloak",
      nombre: "Keycloak", // curado de data/repos-reales.json
      urlRepo: "https://github.com/keycloak/keycloak",
      categorias: ["autenticacion"],
      stars: 37836,
      issuesAbiertos: 3547,
      licencia: "Apache-2.0",
      lenguaje: "Java",
      healthScore: 79,
      nivelMantenimiento: "activo",
      ultimaActualizacion: null,
      mantenedorActivo: null,
    });
  });
  it("la ficha trae el desglose de los 5 componentes y la fecha de cálculo", async () => {
    const h = await crear(backendFalso().fetchFn).obtenerHerramienta("keycloak");
    expect(h?.desgloseSalud).toEqual({ commits: 25, issues: 3, licencia: 20, comunidad: 20, documentacion: 10.5, penalizacionArchivado: false });
    expect(h?.metricasTomadasEn).toBe("2026-11-13T15:20:01.5+00:00");
    expect(h?.ideas).toEqual([]);
  });
  it("un repo fuera del dataset del asistente usa owner--repo; un id inexistente → null", async () => {
    const otro = item({ full_name: "Foo-Org/Bar.js", name: "Bar.js", html_url: "https://github.com/Foo-Org/Bar.js" });
    const a = crear(backendFalso({ items: [otro] }).fetchFn);
    expect((await a.listarHerramientas()).herramientas.map((h) => h.id)).toEqual(["foo-org--bar.js"]);
    expect(await a.obtenerHerramienta("no-existe")).toBeNull();
    expect(await a.obtenerHerramienta("../../etc")).toBeNull();
  });
  it("NOASSERTION → sin licencia declarada", async () => {
    const { herramientas } = await crear(backendFalso({ items: [item({ license_spdx: "NOASSERTION" })] }).fetchFn).listarHerramientas();
    expect(herramientas[0]?.licencia).toBeNull();
  });
});

describe("nivel de mantenimiento por commit_frequency_score (docs/mapeo-backend.md)", () => {
  const d = (commits: number) => ({ commits, issues: 0, licencia: 0, comunidad: 0, documentacion: 0, penalizacionArchivado: false });
  it.each([
    [25, "activo"],
    [20, "moderado"],
    [15, "moderado"],
    [14.99, "bajo"],
    [8, "bajo"],
    [2, "bajo"],
  ])("%s → %s", (commits, nivel) => expect(nivelPorCommits(d(commits))).toBe(nivel));
  it("sin desglose válido → null (no se inventa)", () => expect(nivelPorCommits(null)).toBeNull());
  it("desglose inválido en el backend → nivel y desglose null, el repo sigue visible", async () => {
    const { fetchFn } = backendFalso({ detalles: { "keycloak/keycloak": breakdown({ commit_frequency_score: 99 }) } });
    const a = crear(fetchFn);
    expect((await a.listarHerramientas()).herramientas[0]?.nivelMantenimiento).toBeNull();
    expect((await a.obtenerHerramienta("keycloak"))?.desgloseSalud).toBeNull();
  });
});

describe("adaptador backend · respuesta malformada (MU-23) → falla cerrado", () => {
  it.each([
    ["items no es lista", json({ items: "x" })],
    ["sin items", json({ total: 1 })],
    ["no es JSON", new Response("<html>hola</html>", { status: 200, headers: { "content-type": "application/json" } })],
    ["Content-Type no JSON", new Response("{}", { status: 200, headers: { "content-type": "text/html" } })],
    ["más de 100 ítems", json({ items: Array.from({ length: 101 }, () => item()) })],
    ["error 500", json({ error: "x" }, { status: 500 })],
    ["429 del backend", json({ detail: "x" }, { status: 429 })],
  ])("%s → ErrorCatalogo", async (_n, respuesta) => {
    silenciar();
    await expect(crear(backendFalso({ lista: () => respuesta }).fetchFn).listarHerramientas()).rejects.toBeInstanceOf(ErrorCatalogo);
  });
  it("respuesta de más de 1 MB → ErrorCatalogo", async () => {
    silenciar();
    const enorme = json({ items: [item({ description: "x".repeat(1_100_000) })] });
    await expect(crear(backendFalso({ lista: () => enorme }).fetchFn).listarHerramientas()).rejects.toBeInstanceOf(ErrorCatalogo);
  });
  it("detalle con otro full_name que el pedido → ErrorCatalogo", async () => {
    silenciar();
    const { fetchFn } = backendFalso({ detalle: () => json({ repository: item({ full_name: "evil/evil" }), health_breakdown: breakdown() }) });
    await expect(crear(fetchFn).listarHerramientas()).rejects.toBeInstanceOf(ErrorCatalogo);
  });
  it("un ítem con identidad inválida se omite y se cuenta; los demás siguen", async () => {
    silenciar();
    const items = [item(), item({ full_name: "x/y", name: "y", category: "Developer Tools" }), { basura: true }, item({ full_name: "../etc" })];
    const { herramientas, omitidas } = await crear(backendFalso({ items }).fetchFn).listarHerramientas();
    expect(herramientas.map((h) => h.id)).toEqual(["keycloak"]);
    expect(omitidas).toBe(3);
  });
  it("métricas con tipo incorrecto → Sin dato (null), nunca coaccionadas", async () => {
    const items = [item({ stars_count: "37836", health_score: "80", open_issues_count: -1 })];
    const { herramientas } = await crear(backendFalso({ items }).fetchFn).listarHerramientas();
    expect(herramientas[0]).toMatchObject({ stars: null, healthScore: null, issuesAbiertos: null });
  });
  it("el log lleva solo un código, nunca contenido del backend", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(crear(backendFalso({ lista: () => json({ items: "<script>x</script>" }) }).fetchFn).listarHerramientas()).rejects.toThrow();
    expect(error.mock.calls.flat().join(" ")).toBe("[catalogo] backend: sobre-lista");
  });
});

describe("adaptador backend · campo extra", () => {
  it("los campos desconocidos (incluido HTML) se descartan y no llegan a la interfaz", async () => {
    const a = crear(backendFalso({ items: [item({ html_extra: "<img src=x onerror=alert(1)>", admin_api_key: "no" })] }).fetchFn);
    const h = (await a.listarHerramientas()).herramientas[0]!;
    const d = (await a.obtenerHerramienta("keycloak"))!;
    for (const obj of [h, d]) {
      expect(JSON.stringify(obj)).not.toContain("onerror");
      expect(obj).not.toHaveProperty("html_extra");
      expect(obj).not.toHaveProperty("full_name");
    }
  });
});

describe("adaptador backend · timeout, caído y redirección (MU-24)", () => {
  it("el timeout por defecto es 3 s", () => expect(TIMEOUT_BACKEND_MS).toBe(3000));
  it("un backend colgado → ErrorCatalogo al vencer el timeout", async () => {
    silenciar();
    const colgado: Fetch = (_u, init) =>
      new Promise((_r, rechazar) => init.signal?.addEventListener("abort", () => rechazar(init.signal!.reason)));
    const inicio = Date.now();
    await expect(crear(colgado, { timeoutMs: 50 }).listarHerramientas()).rejects.toBeInstanceOf(ErrorCatalogo);
    expect(Date.now() - inicio).toBeLessThan(1000);
  });
  it("backend caído (conexión rechazada) → error controlado, sin datos de otra fuente", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const caido: Fetch = async () => {
      throw new TypeError("fetch failed");
    };
    const a = crear(caido);
    await expect(a.listarHerramientas()).rejects.toBeInstanceOf(ErrorCatalogo);
    await expect(a.obtenerHerramienta("keycloak")).rejects.toBeInstanceOf(ErrorCatalogo);
    expect(error).toHaveBeenCalledWith("[catalogo] backend: red");
  });
  it("un fallo no queda en caché: si el backend vuelve, el siguiente pedido funciona", async () => {
    silenciar();
    let caido = true;
    const { fetchFn } = backendFalso();
    const a = crear(async (u, i) => {
      if (caido) throw new TypeError("fetch failed");
      return fetchFn(u, i);
    });
    await expect(a.listarHerramientas()).rejects.toThrow();
    caido = false;
    expect((await a.listarHerramientas()).herramientas).toHaveLength(1);
  });
  it("todos los pedidos son GET, con redirect: 'error', con timeout y sin credenciales", async () => {
    const { fetchFn, llamadas } = backendFalso();
    await crear(fetchFn).obtenerHerramienta("keycloak");
    expect(llamadas.length).toBeGreaterThan(0);
    for (const { url, init } of llamadas) {
      expect(url.startsWith(`${BASE}/api/v1/repositories`)).toBe(true);
      expect(init.method).toBe("GET");
      expect(init.redirect).toBe("error");
      expect(init.signal).toBeInstanceOf(AbortSignal);
      expect(JSON.stringify(init.headers ?? {}).toLowerCase()).not.toContain("authorization");
      expect(init.body).toBeUndefined();
    }
  });
  it("una redirección (fetch la rechaza por redirect: 'error') → ErrorCatalogo", async () => {
    silenciar();
    const redirige: Fetch = async (_u, init) => {
      if (init.redirect === "error") throw new TypeError("unexpected redirect");
      return new Response(null, { status: 302, headers: { location: "http://169.254.169.254/" } });
    };
    await expect(crear(redirige).listarHerramientas()).rejects.toBeInstanceOf(ErrorCatalogo);
  });
});

describe("adaptador backend · caché de 60 s (R-21, AM-35)", () => {
  const tres = () =>
    backendFalso({
      items: [
        item(),
        item({ full_name: "ory/kratos", name: "kratos", html_url: "https://github.com/ory/kratos" }),
        item({ full_name: "prisma/orm", name: "orm", html_url: "https://github.com/prisma/orm", category: "base-de-datos" }),
      ],
    });
  it("dos cargas seguidas (grilla + ficha, dos veces) → una sola tanda: 1 lista + 1 detalle por repo", async () => {
    const { fetchFn, llamadas } = tres();
    const a = crear(fetchFn, { ahora: () => 0 });
    for (let carga = 0; carga < 2; carga += 1) {
      await a.listarHerramientas();
      await a.obtenerHerramienta("prisma");
    }
    expect(fetchFn).toHaveBeenCalledTimes(4);
    expect(llamadas.filter((l) => new URL(l.url).pathname === "/api/v1/repositories")).toHaveLength(1);
  });
  it("dos cargas concurrentes comparten la misma tanda", async () => {
    const { fetchFn } = tres();
    const a = crear(fetchFn, { ahora: () => 0 });
    await Promise.all([a.listarHerramientas(), a.listarHerramientas(), a.obtenerHerramienta("kratos")]);
    expect(fetchFn).toHaveBeenCalledTimes(4);
  });
  it("el fallo de una instantánea vencida no borra la vigente", async () => {
    silenciar();
    let t = 0;
    const { fetchFn } = backendFalso();
    let rechazarVieja: (e: Error) => void = () => {};
    let primera = true;
    const a = crear(
      (u, i) => {
        if (primera) {
          primera = false;
          return new Promise<Response>((_r, rechazar) => (rechazarVieja = rechazar));
        }
        return fetchFn(u, i);
      },
      { ahora: () => t },
    );
    const vieja = a.listarHerramientas(); // queda colgada
    t = 61_000;
    await a.listarHerramientas(); // nueva instantánea: 1 lista + 1 detalle
    rechazarVieja(new TypeError("fetch failed"));
    await expect(vieja).rejects.toBeInstanceOf(ErrorCatalogo);
    t = 61_001;
    await a.listarHerramientas();
    expect(fetchFn).toHaveBeenCalledTimes(2); // la vigente sigue en caché
  });

  it("dentro de la ventana no vuelve a pedir; al vencer, sí", async () => {
    let t = 0;
    const { fetchFn } = backendFalso();
    const a = crear(fetchFn, { ahora: () => t });
    await a.listarHerramientas();
    await a.obtenerHerramienta("keycloak");
    expect(fetchFn).toHaveBeenCalledTimes(2); // lista + 1 detalle
    t = 61_000;
    await a.listarHerramientas();
    expect(fetchFn).toHaveBeenCalledTimes(4);
  });
});

describe("BACKEND_URL (solo servidor, sin valor por defecto)", () => {
  it("acepta un origen http(s)", () => {
    expect(resolverBackendUrl({ BACKEND_URL: "http://127.0.0.1:8000" })).toBe("http://127.0.0.1:8000");
    expect(resolverBackendUrl({ BACKEND_URL: "https://api.ejemplo.test/" })).toBe("https://api.ejemplo.test");
  });
  it.each([undefined, "", "ftp://x", "http://u:p@x", "http://x/api", "http://x?a=1", "no es url", "javascript:alert(1)"])("rechaza %s", (v) => {
    expect(() => resolverBackendUrl({ BACKEND_URL: v })).toThrow(ErrorConfiguracion);
  });
  it("nombrePara: el curado por full_name (sin distinguir mayúsculas) y, si no está, el del backend", () => {
    expect(nombrePara("prisma/orm", "orm")).toBe("Prisma ORM");
    expect(nombrePara("PRISMA/ORM", "orm")).toBe("Prisma ORM");
    expect(nombrePara("plausible/analytics", "analytics")).toBe("Plausible Analytics");
    expect(nombrePara("foo/bar", "bar")).toBe("bar");
  });
  it("un repo fuera del dataset curado con nombre inválido se omite (el fallback también pasa por el contrato)", async () => {
    silenciar();
    const otro = item({ full_name: "foo/bar", name: "   ", html_url: "https://github.com/foo/bar" });
    const { herramientas, omitidas } = await crear(backendFalso({ items: [otro] }).fetchFn).listarHerramientas();
    expect(herramientas).toHaveLength(0);
    expect(omitidas).toBe(1);
  });
  it("idPara: ids del asistente y fallback owner--repo", () => {
    expect(idPara("prisma/orm")).toBe("prisma");
    expect(idPara("ggml-org/llama.cpp")).toBe("llama-cpp");
    expect(idPara("PostHog/posthog")).toBe("posthog");
    expect(idPara("a/b")).toBe("a--b");
  });
});
