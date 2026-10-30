# Plan 001 — Frontend del catálogo

**Spec:** `./spec.md` · **Estado:** aprobado · **Fecha:** 2026-10-30
**Referencias:** `docs/srs.md` (RF/RNF) · `docs/matriz-riesgos.md` (R-xx) · `specs/constitution.md` (P1-P10)

> CÓMO se construye lo que el spec define. Cada decisión se justifica y las alternativas descartadas están en la sección 7.
> Esta versión incorpora las decisiones del 2026-10-30 (sección 0). La estrategia de prueba (6) y el esfuerzo (8) están dimensionados para 45.5 h (42.5 h sin el adaptador de Supabase) **sin tocar ningún control de seguridad**.

## 0. Decisiones tomadas

| # | Tema | Decisión | Efecto en el plan |
| --- | --- | --- | --- |
| 1 | CSP | Nonce por request emitido por el proxy de Next; resto de headers estáticos en `next.config`. Se acepta el render dinámico. | 5.2, D-05 |
| 2 | RNF-08 | Fuera de 001, pasa a 003. | `docs/srs.md` actualizado. 001 solo muestra la fecha de las métricas y el estado de error. |
| 3 | RF-05 / RF-02 | "≥ 1 idea por repo" es requisito de **datos** (003); el frontend maneja 0..N con estado vacío. RF-02 incluye categorías, mantenedor activo y enlace al repo. | `docs/srs.md` actualizado. |
| 4 | Despliegue | Vercel. HSTS se declara igual en `next.config`. | 5.2. `CATALOG_SOURCE` se define de forma explícita en Production (4.1). |
| 5 | RF-03 | No se recorta (sale del orden de recorte). | 8.5 |
| 6 | Fallo cerrado de `revisada` y snippets largos | Aprobados. | 4.2, AM-04, AM-05 |
| 7 | Riesgos nuevos | R-11, R-12 y R-13 agregados. | `docs/matriz-riesgos.md` actualizado (P e I son estimación inicial, a revisar con Ángel). |
| 8 | Presupuesto | 40-45 h para el frontend (después vienen 002 y el red-team; entrega 16/11). | Secciones 6 y 8. Total 45.5 h (ver 8.4). |
| 9 | Alcance de Playwright | Se aceptan tres desvíos: axe en `a11y.spec`, RNF-07 como test E2E y dos aserciones extra en `headers.spec` (tema oscuro, asistente deshabilitado). | 6.2, 8.1 |
| 10 | `next/font` | Se recupera del recorte de extras visuales (≈ 0.5 h en B2). Sirve las fuentes desde nuestro servidor, compatible con `font-src 'self'`. Animaciones, esqueletos y microinteracciones siguen fuera. | D-14, 8.1, 8.2 |

## 1. Chequeo contra la constitución

| Principio | ¿Cumple? | Nota |
| --- | --- | --- |
| P1 Spec primero | Sí | Spec aprobado. Los desvíos entre SRS y spec ya se resolvieron (sección 0). |
| P2 Security by design | Sí | Amenazas STRIDE + OWASP Top 10 web en la sección 5, con control, RNF y riesgo de la matriz. OWASP Top 10 para LLM: la feature no llama a ningún LLM, pero **muestra salida de un LLM** (ideas de integración), por eso se cubre LLM05 (manejo inadecuado de salida). |
| P3 Mínimo privilegio | Sí | El frontend solo hace lecturas (GET) con la clave pública. El adaptador de datos no tiene operaciones de escritura en su interfaz. La clave de servicio no existe en `apps/web` y CI lo verifica. RLS lo aporta la feature 003 (dependencia, ver 2.4). |
| P4 Cero secretos | Sí | Solo `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` (públicas por diseño). Se documentan en `.env.example` (ya existe). Gitleaks ya corre en CI (`.github/workflows/security.yml`). |
| P5 Externo no confiable | Sí | Validación con zod y normalización en **un único punto** (la frontera del adaptador, 4.2). Render solo como texto (5.1). Los parámetros de la URL también se validan. |
| P6 El asistente no inventa | N/A | No hay asistente en esta feature. Análogo aplicable: la UI **nunca inventa un dato**; un dato faltante o inválido se muestra "Sin dato". |
| P7 Métricas reales | Sí | RNF-07 y la auditoría de accesibilidad se miden con scripts reproducibles y los valores reales se registran en `tasks.md`. **Las limitaciones de cada medición también se registran** (8.3). Las horas de la sección 8 son estimaciones y están rotuladas así. |
| P8 Simple antes que completo | Sí | Dependencias mínimas (tabla 3), recortes explícitos con su ahorro (8.2) y orden de recorte ante desvíos (8.5). Nunca se recortan P3, P4, P5 ni P6. |
| P9 Revisión cruzada | Sí | Un PR por feature con la plantilla; lo revisa Ángel. El contrato 4.1 queda revisado por él antes de las tareas con datos reales. |
| P10 Trazabilidad | Sí | Cada control de la sección 5 y cada prueba de la sección 6 referencian RF/RNF/R/MU. R-11 a R-13 ya están en la matriz. |

## 2. Arquitectura

### 2.1 Componentes y fronteras de confianza

```
 ┌──────────── Navegador del usuario (NO confiable: URL, clicks, extensiones) ───────────┐
 │  Componentes de cliente: filtros, búsqueda, copiar snippet                            │
 │  Estado en memoria ⇄ URL (history.replaceState)  ← TODO valor de la URL se valida    │
 └───────────────▲───────────────────────────────────────────────────────────────────────┘
                 │ HTML + JSON ya validado (nunca HTML de terceros)
 ════════════════╪═══════════ Frontera 1: respuesta del servidor Next.js ════════════════
 ┌───────────────┴──────── Servidor Next.js (apps/web) ─────────────────────────────────┐
 │  proxy: CSP con nonce por request                                                     │
 │  Server Components: app/page.tsx · app/herramientas/[id]/page.tsx                     │
 │          │ pide datos a                                                               │
 │  ┌───────▼─────────────────────────────────┐                                         │
 │  │ interfaz RepositorioCatalogo (puerto)   │   ← la UI solo conoce esta interfaz     │
 │  └───────┬──────────────┬──────────────────┘                                         │
 │  adaptador sintético   adaptador Supabase (solo GET, sin supabase-js)                 │
 │  + fixtures            │                                                              │
 │          │             │                                                              │
 │  ┌───────▼─────────────▼──────────────────┐                                         │
 │  │ contrato.ts: zod + normalización        │ ← FRONTERA 2: dato externo → dato seguro│
 │  └─────────────────────────────────────────┘                                         │
 └───────────────────────────────────────────────┬───────────────────────────────────────┘
 ═══════════ Frontera 3: red hacia el backend ═══╪═══════════════════════════════════════
                                                  │ HTTPS, GET, clave pública
                          Supabase (RLS) ◄── feature 003 (Ángel) ◄── GitHub / LLM
                          Datos NO confiables: nombres, descripciones, licencias, ideas
```

Fronteras:
1. **Navegador ⇄ servidor.** Los parámetros de la URL son no confiables (MU-05, MU-06). Se validan en el servidor para el render inicial y en el cliente al leer/escribir.
2. **Adaptador ⇄ resto de la app.** Ningún dato crudo cruza esta frontera. Todo pasa por `contrato.ts`; lo que sale son tipos ya validados y normalizados. Es la aplicación concreta de P5.
3. **Servidor ⇄ backend.** Solo lectura. El backend puede estar comprometido o malformado (actor "fuente comprometida" del spec): la frontera 2 existe para eso.

La obtención de datos se hace **en el servidor**. Consecuencias buenas: el navegador no habla con Supabase (CSP `connect-src 'self'`, ver 5.2), la clave pública no se ejecuta en JS de cliente y el contrato se valida una sola vez.

### 2.2 Rutas

| Ruta | Contenido | RF |
| --- | --- | --- |
| `/` | Catálogo: navegación por categorías, filtros, búsqueda, grilla. Estado en query: `categoria`, `lenguaje`, `licencia`, `mantenimiento`, `stars`, `q`. | RF-01, 03, 04 |
| `/herramientas/[id]` | Ficha técnica + ideas de integración. `id` se valida con una expresión estricta antes de buscar. | RF-02, 05 |
| `not-found` | "Herramienta no encontrada" (RF-02 d) y rutas inexistentes. | RF-02 |
| `error` | Estado de error con "Reintentar" (RF-01 e). Mensaje genérico, sin detalles internos (A09). | RF-01 |

Categoría como **parámetro de filtro**, no como ruta propia: una herramienta puede estar en varias categorías (spec, pregunta 6) y la categoría es un filtro más (RF-03), así el enlace compartido y el estado quedan en un solo mecanismo.

### 2.3 Estructura de `apps/web`

```
apps/web/
├── next.config.ts            headers estáticos de seguridad
├── src/
│   ├── proxy.ts              CSP con nonce (nombre exacto según la versión de Next instalada)
│   ├── app/                  layout, page, herramientas/[id], error, not-found
│   ├── components/
│   │   ├── ui/               componentes shadcn (código nuestro, copiado al repo)
│   │   └── catalogo/         NavCategorias, PanelFiltros, Buscador, GrillaHerramientas,
│   │                         TarjetaHerramienta, FichaTecnica, IdeaIntegracion,
│   │                         BloqueSnippet, EntradaAsistente
│   ├── i18n/es.ts            diccionario único (RNF-17)
│   └── lib/catalogo/
│       ├── contrato.ts       esquemas zod + normalización  ← frontera de confianza
│       ├── texto.ts          limpieza de texto (Unicode engañoso, control, largos)
│       ├── enlaces.ts        validación de URL del repo (allowlist)
│       ├── filtros.ts        lógica pura de filtrado y búsqueda
│       ├── estado-url.ts     parseo/serialización validada de la query
│       ├── repositorio.ts    interfaz RepositorioCatalogo + selección del adaptador
│       └── adaptadores/      sintetico.ts · supabase.ts
├── scripts/generar-dataset.mjs   genera data/sintetico.json (semilla fija)
├── data/sintetico.json           150 herramientas sintéticas (salida del script)
└── tests/
    ├── unit/                 Vitest
    ├── e2e/                  Playwright: mu · headers · teclado · a11y · rnf07
    └── fixtures/mu.json      payloads MU-01 a MU-12 y casos borde
```

### 2.4 Dependencias externas de esta feature

| Depende de | Qué necesitamos | Cuándo | Si no llega |
| --- | --- | --- | --- |
| Ángel (003) | Validar la sección 4.1 del spec (contrato) | Antes de las tareas que consumen datos reales (B9) | Todo lo demás avanza con el sintético; el adaptador Supabase queda bloqueado. |
| Ángel (003) | Políticas RLS: lectura pública, escritura solo con rol de servicio | Para probar MU-07 (RNF-02, R-05) | MU-07 queda como prueba pendiente y se registra como tal en `tasks.md`; no se declara RNF-02 verificado sin ella. |

## 3. Stack y dependencias

Criterio de inclusión: cada dependencia debe justificar su presencia; si se puede evitar con la plataforma, se evita (R-09, RNF-14). Versiones y licencias consultadas con `npm view` el **2026-10-30**; "Mantenida" = hubo publicación en los últimos 12 meses (es un indicador, no una auditoría). Las versiones se fijan con el lockfile y `npm ci`.

**Runtime (lo que llega a producción)**

| Dependencia | Para qué | Licencia | Mantenida |
| --- | --- | --- | --- |
| `next` 16.x | Framework (App Router), render en servidor, headers, proxy | MIT | Sí — publicada 2026-10-30 |
| `react`, `react-dom` 19.x | UI. React escapa el texto por defecto: base de RNF-04 | MIT | Sí — 2026-10-30 |
| `zod` 4.x | Validar y normalizar todo dato externo en la frontera (P5) | MIT | Sí — 2026-10-12 |
| `@radix-ui/react-slot` | Composición de `Button` de shadcn | MIT | Sí — 2026-10-12 |
| `class-variance-authority` | Variantes de componentes shadcn | Apache-2.0 | **Estable pero sin publicaciones recientes** — última 0.7.1 (2024-11-26). Es una función de 1 archivo sin dependencias; si se vuelve problema, se reemplaza por un `switch`. |
| `clsx`, `tailwind-merge` | Composición de clases (requeridas por shadcn) | MIT | Sí — 2026-09-18 / 2026-10-23 |
| `lucide-react` | Íconos SVG inline (sin imágenes remotas; compatible con `img-src 'self'`) | ISC | Sí — 2026-10-30 |

**Desarrollo y pruebas (no llegan a producción)**

| Dependencia | Para qué | Licencia | Mantenida |
| --- | --- | --- | --- |
| `typescript` | Tipado estricto | Apache-2.0 | Sí — 2026-10-30. **Nota:** la última es la 7.0.x; la primera tarea confirma que Next 16 + ESLint compilan con la versión que instale `create-next-app`. Si no, se fija 5.x. |
| `tailwindcss` 4.x, `@tailwindcss/postcss` | Estilos y tokens del tema oscuro | MIT | Sí — 2026-10-19 |
| `shadcn` (CLI) | Copia el código de los componentes al repo; **no es dependencia de runtime** | MIT | Sí — 2026-10-27 |
| `vitest` | Pruebas unitarias de lógica | MIT | Sí — 2026-10-19 |
| `@playwright/test` | E2E: fixtures MU, headers, teclado, RNF-07 | Apache-2.0 | Sí — 2026-10-30 |
| `@axe-core/playwright` | Auditoría de accesibilidad (RNF-16) | **MPL-2.0** | Sí — 2026-10-30. Solo en desarrollo, no se distribuye ni se modifica; la licencia no impone obligaciones sobre nuestro código. |
| `eslint`, `eslint-config-next` | Reglas que hacen cumplir RNF-04 y RNF-17 (ver 5.1) | MIT | Sí — 2026-10-30 |

**Deliberadamente NO se incluyen:** `supabase-js` (se usa `fetch` GET, D-03), librería de i18n (diccionario propio, D-07), `faker` (PRNG de 10 líneas en el script), `tsx` (el script es `.mjs`), librerías de sanitización HTML (no renderizamos HTML), `sonner`/toasts, `@radix-ui/react-dialog` y `tw-animate-css` (el panel móvil usa `<details>` nativo, D-16), `radix select` (se usa `<select>` nativo, D-08), librería de gráficos, librería de estado global.

**Controles de la cadena de suministro (RNF-14, R-09):** Dependabot ya configurado para `/apps/web`; `npm audit --audit-level=critical` como paso bloqueante en CI (se reporta también `high`); `npm ci` con lockfile commiteado; revisión manual de cada dependencia nueva en el PR.

## 4. Modelo de datos / contratos

### 4.1 Interfaz del repositorio (puerto)

```ts
interface RepositorioCatalogo {
  listarHerramientas(): Promise<ResultadoLista>;            // { herramientas, omitidas }
  obtenerHerramienta(id: string): Promise<HerramientaDetalle | null>;
}
```

- **Solo lectura por construcción:** no existe ningún método de escritura. Es la primera línea de RNF-02.
- Devuelve únicamente tipos que salieron de `contrato.ts`. Un adaptador que no pase por ahí no cumple la prueba de contrato (6.1).
- Si el origen falla, lanza un `ErrorCatalogo` con un mensaje genérico; el detalle va al log del servidor y nunca a la UI (A09).
- Selección del adaptador por la variable **de servidor** `CATALOG_SOURCE` = `sintetico` | `fixtures` (sintético + MU, solo para pruebas) | `supabase`. Nunca lleva prefijo `NEXT_PUBLIC_`. **En producción no hay valor por defecto:** si falta, el servidor falla al arrancar. En Vercel Production se define explícitamente (`sintetico` para la demo previa al backend, `supabase` después); `fixtures` jamás.

### 4.2 Contrato de datos (implementa la sección 4.1 del spec)

Regla de tratamiento de datos inválidos (cierra la ambigüedad "Sin dato u omitir" de MU-09):

| Tipo de campo | Si es inválido | Por qué |
| --- | --- | --- |
| **Identidad:** `id`, `nombre`, `categorias` | Se **omite la herramienta**, se cuenta en `omitidas` y se registra en el log del servidor | Sin identidad no se puede mostrar ni distinguir de forma segura (MU-03). |
| **Métricas:** stars, última actualización, issues, mantenedor, nivel, health score, fecha de métricas | Valor `null` → la UI muestra **"Sin dato"** | Nunca se inventa un valor (P6 análogo). |
| **Licencia** | `null` → **"Sin licencia declarada"** | RNF-13: siempre hay algo visible. |
| **Texto opcional:** descripción, lenguaje | `null` → "Sin dato" | — |
| **URL del repositorio** | `null` → no se muestra enlace | MU-08. |
| **Idea: `revisada`** | Cualquier valor que no sea el booleano `true` → `false` | **Falla cerrado**: ante la duda, la idea se muestra con el aviso de no revisada (MU-12). |
| **Idea: otros campos** | `null` → "Sin dato" en ese campo | RF-05 e. |

Campos y reglas (`C` = cota de longitud aplicada tras normalizar):

| Entidad.campo | Regla | Salida |
| --- | --- | --- |
| Herramienta.`id` | `^[a-z0-9][a-z0-9._-]{0,99}$` (ASCII estricto) | string |
| Herramienta.`nombre` | string, normalizado, 1-100 | string |
| Herramienta.`urlRepo` | pasa `validarUrlRepo` (5.1); si no, `null` | string \| null |
| Herramienta.`descripcion` | string, normalizado, C=2000; si excede se corta y `descripcionTruncada=true` | string \| null |
| Herramienta.`categorias` | array de `autenticacion` \| `base-de-datos` \| `pagos` \| `ia` \| `analitica` \| `busqueda`; se descartan valores desconocidos y duplicados; si queda vacío → se omite la herramienta | enum[] (1-6) |
| Herramienta.`stars` | entero ≥ 0 y ≤ 10⁹ | number \| null |
| Herramienta.`ultimaActualizacion` | ISO 8601 válido, no posterior a *ahora + 1 día* | string \| null |
| Herramienta.`licencia` | string no vacío, normalizado, C=64 | string \| null |
| Herramienta.`lenguaje` | string no vacío, normalizado, C=40 | string \| null |
| Herramienta.`issuesAbiertos` | entero ≥ 0 | number \| null |
| Herramienta.`mantenedorActivo` | booleano estricto | boolean \| null |
| Herramienta.`nivelMantenimiento` | `activo` \| `moderado` \| `abandonado` | enum \| null |
| Herramienta.`healthScore` | entero 0-100 | number \| null |
| Herramienta.`metricasTomadasEn` | ISO 8601 válido | string \| null |
| Idea.`tipo` | `rest` \| `docker` \| `sdk` \| `webhook` | enum \| null |
| Idea.`disparadores` | hasta 10 ítems, cada uno normalizado, C=200 | string[] |
| Idea.`snippet` | string normalizado conservando saltos de línea y tabs, C=4000. **Si excede C, no se corta en silencio:** `snippetExcedeLimite=true`, se muestra el inicio con aviso y **se deshabilita "Copiar"** (un comando copiado a medias puede ser peligroso). | string \| null |
| Idea.`stack` | hasta 10 ítems, C=60 | string[] |
| Idea.`dificultad` | `baja` \| `media` \| `alta` | enum \| null |
| Idea.`revisada` | ver tabla anterior | boolean |
| Herramienta.`ideas` (solo detalle) | máximo 10 ideas; el resto se descarta. 0 ideas es válido (estado vacío, RF-05 d) | Idea[] |

**Lista vs. detalle:** la grilla recibe una versión liviana (sin `ideas`, descripción cortada a 300 caracteres para la tarjeta). El detalle trae descripción completa (hasta C) e ideas. Esto mantiene chico el JSON que viaja al navegador (MU-04, RNF-07).

### 4.3 Normalización de texto (`texto.ts`) — MU-03, MU-04

Se aplica a todo string externo, en este orden:
1. `normalize('NFC')`.
2. Se eliminan controles C0/C1 (excepto `\n` y `\t` en descripciones y snippets).
3. Se eliminan caracteres de **dirección de texto** (U+202A-202E, U+2066-2069, U+200E, U+200F, U+061C) y de **ancho cero** (U+200B-200D, U+2060, U+FEFF). Incluye los snippets: es la defensa contra "Trojan Source" (código que se ve distinto a lo que ejecuta).
4. `trim` y colapso de espacios (fuera de snippets).
5. Corte a la cota C del campo.

Lo que **no** se puede resolver por normalización son los homoglifos (letras de otro alfabeto que parecen latinas). Mitigación: el `id` se restringe a ASCII y **siempre se muestra junto al nombre** en tarjeta y ficha; además cada celda de texto externo se aísla visualmente (`unicode-bidi: isolate`, `overflow: hidden`) para que no altere a sus vecinas. Riesgo residual documentado en 5.3.

### 4.4 Estado en la URL (`estado-url.ts`) — RF-03 f, MU-05, MU-06

| Parámetro | Validación | Si es inválido |
| --- | --- | --- |
| `categoria` | uno de los 6 valores | se ignora |
| `lenguaje`, `licencia` | string ≤ 64 que **exista entre los valores presentes en los datos** | se ignora |
| `mantenimiento` | `activo` \| `moderado` \| `abandonado` | se ignora |
| `stars` | entero decimal 0 ≤ n ≤ 10⁷ | se ignora |
| `q` | string, normalizado como texto, recortado a 100 caracteres | se recorta |

- Parámetros repetidos: se toma el primero. Parámetros desconocidos: se ignoran y no se reescriben en la URL.
- El estado vive en memoria y se refleja en la URL con `history.replaceState` (sin navegación ni ida y vuelta al servidor: clave para RNF-07). La URL se **serializa** siempre con `URLSearchParams`, nunca concatenando.
- `q` nunca se inserta como HTML; el mensaje "sin resultados para «…»" lo escapa React como texto.

### 4.5 Filtrado y búsqueda (`filtros.ts`)

- Función pura `filtrar(herramientas, estado)`; todos los filtros se combinan con AND; la categoría coincide si está **incluida** en las del repo.
- Una herramienta con métrica `null` **no cumple** los filtros de esa métrica (por ejemplo, sin `stars` no pasa "stars ≥ 100"). Es la opción conservadora: no mostrar como válido lo que no sabemos.
- Búsqueda: `toLowerCase()` + `includes` sobre `nombre` y `descripcion`. No se usa `RegExp` con la entrada del usuario (evita ReDoS y escapes).
- Las opciones de lenguaje y licencia se derivan de los datos (RF-03 b).
- Todo se hace sobre el arreglo en memoria, con `useMemo`. Con ~150-500 ítems es del orden de milisegundos; se mide, no se asume (6.2).

### 4.6 Dataset sintético y fixtures

- `scripts/generar-dataset.mjs`: PRNG con semilla fija → siempre el mismo `data/sintetico.json`. 150 herramientas con nombres inventados (no se usan marcas reales ni datos de GitHub reales para no inducir a error: P7). Distribución mínima intencional: las 6 categorías, ≥ 15 herramientas con 2 categorías, ≥ 8 lenguajes, ≥ 6 licencias, los 3 niveles, ≥ 5 sin licencia, ≥ 10 sin descripción, ≥ 20 sin ideas, ideas revisadas y no revisadas. La salida se **valida con `contrato.ts` desde un test de Vitest** que corre en CI y falla si hay una herramienta inválida (el script `.mjs` no importa TypeScript: sin `tsx` ni dependencias nuevas).
- `tests/fixtures/mu.json`: objetos *crudos* (pensados para romper), cada uno con `mu` (ID) y `esperado`. Cubre MU-01 a MU-12 más casos borde: campos faltantes, categoría vacía, valores fuera de rango, tipos incorrectos, 300 KB de descripción, 500 disparadores, `id` con caracteres especiales.
- `CATALOG_SOURCE=fixtures` mezcla ambos. Solo en este modo, pedir el id `mu-forzar-error` lanza un `ErrorCatalogo`: permite probar el estado de error (RF-01 e) sin código de prueba en el camino de producción.
- Riesgo de que `fixtures` se active en producción: bajo (son texto inerte) y 4.1 obliga a definir la variable de forma explícita (5.3).

## 5. Amenazas y controles

### 5.1 Tabla de amenazas

STRIDE: S suplantación · T manipulación · R repudio · I divulgación · D denegación · E elevación. Riesgos de `docs/matriz-riesgos.md`.

| # | Amenaza (STRIDE / OWASP) | Componente | Control | RNF | Riesgo | MU |
| --- | --- | --- | --- | --- | --- | --- |
| AM-01 | **XSS almacenado** por nombre/descripción/licencia/ideas con HTML o script (T, I · A03 Inyección, LLM05) | Render de tarjetas, ficha, ideas | (1) Todo contenido externo se renderiza como **nodo de texto** de React. (2) **`dangerouslySetInnerHTML` prohibido**: regla ESLint `react/no-danger` en `error` + paso de CI que falla si el texto aparece en `src/`. (3) No se usa Markdown ni parser de HTML. (4) CSP con nonce (5.2) como segunda capa. | RNF-04 | R-07 | 01, 11 |
| AM-02 | **XSS reflejado / DOM** por `q` o parámetros de URL (T · A03) | Buscador, estado de URL | Validación con zod y recorte (4.4); sin `RegExp` con entrada del usuario; el término solo se muestra como texto; la URL se serializa con `URLSearchParams`. | RNF-04 | R-07 | 05, 06 |
| AM-03 | **Enlace malicioso** en el repo o `javascript:` / `data:` / dominio parecido (S, T · A03, A05) | Enlace "Ver repositorio" | `validarUrlRepo`: se parsea con `new URL()`; se exige `protocol === 'https:'`, `hostname === 'github.com'` (comparación exacta, sin subdominios), sin credenciales (`username/password` vacíos), sin puerto. Si falla → `null` y no hay enlace. El enlace usa `target="_blank"` con `rel="noopener noreferrer"`. | RNF-04 | R-07 | 08 |
| AM-04 | **Links y comandos en snippets** (T, R · A03, LLM05) | `BloqueSnippet` | Se renderiza dentro de `<pre><code>` como texto: ninguna URL del snippet es clickeable (no se autolinkea). "Copiar" copia `textContent`. Las ideas **no revisadas** muestran el aviso "Generada automáticamente, revisala antes de usarla" pegado al bloque y al botón copiar. Snippet que excede C: sin botón copiar. | RNF-04 | R-07 | 02, 10 |
| AM-05 | **Falsificar el estado "revisada"** desde el contenido (S · A04 Diseño inseguro) | `IdeaIntegracion` | La insignia sale **solo** del campo booleano `revisada`, con fallo cerrado (4.2). Se renderiza en un contenedor propio, visualmente separado del contenido externo, y el texto de la insignia no se toma de ningún dato. | RNF-04 | R-07, R-11 | 12 |
| AM-06 | **Suplantación por Unicode engañoso** (S · A04) | Tarjeta, ficha | Normalización (4.3); `id` ASCII siempre visible junto al nombre; aislamiento bidi y `overflow` por celda. | RNF-04 | R-07 | 03 |
| AM-07 | **Denegación por payload enorme** (D · A04) | Adaptador, grilla, ficha | Cotas de longitud y de cantidad en el contrato (4.2); descripción de tarjeta a 300; truncado con indicación visual; máximo 10 ideas; cuerpo de respuesta del backend limitado (el adaptador Supabase aborta si la respuesta excede un tamaño máximo y usa *timeout*). | RNF-07 | R-12 | 04 |
| AM-08 | **Escritura con la clave pública** (E, T · A01 Control de acceso roto) | Adaptador Supabase, base | (1) La interfaz no ofrece escritura. (2) El adaptador usa un único `fetch` envuelto que **solo permite `GET`**. (3) RLS en la base (feature 003). (4) Prueba de integración: un `POST`/`PATCH`/`DELETE` con la clave pública devuelve error. | RNF-02 | R-05 | 07 |
| AM-09 | **Fuga de secretos al cliente** (I · A02 Fallas criptográficas / A05) | Build, bundle | Solo las dos variables `NEXT_PUBLIC_` públicas. `SUPABASE_SERVICE_ROLE_KEY`, `GITHUB_TOKEN`, `LLM_*` no se leen en `apps/web`. CI: (a) `grep` de esos nombres en `apps/web/src` y en `.next/static` → 0 coincidencias; (b) Gitleaks (ya activo). | RNF-01, RNF-02 | R-01, R-05 | — |
| AM-10 | **Datos malformados o envenenados desde el backend** (T · A08 Integridad de datos, A04) | `contrato.ts` | Validación zod de **todo** dato, reglas de 4.2, omisión + log de lo inválido, `omitidas` visible en el log. Prueba de contrato para cada adaptador. | RNF-04 | R-07, R-11 | 09 |
| AM-11 | **Clickjacking / embebido; headers debilitados** (T · A05 Configuración insegura) | Respuesta HTTP | `frame-ancestors 'none'` en CSP + `X-Frame-Options: DENY` (compatibilidad). Prueba de headers en cada PR. | RNF-04 | R-07, R-13 | — |
| AM-12 | **Carga de recursos remotos / rastreo** por imágenes o CSS en datos (I · A05) | Respuesta HTTP | No hay ningún `<img>` ni estilo derivado de datos externos; CSP `img-src 'self'`, `connect-src 'self'`, `font-src 'self'`. | RNF-04 | R-07, R-13 | 11 |
| AM-13 | **Fuga de información en errores** (I · A09 Fallas de registro y monitoreo / A05) | `error.tsx`, adaptadores | Mensajes genéricos en la UI; detalle (URL del backend, status, stack) solo al log del servidor, sin la clave. `poweredByHeader: false`. | RNF-02 | R-01 | — |
| AM-14 | **Dependencia vulnerable o comprometida** (T · A06 Componentes vulnerables, A08) | `package.json` | Tabla 3 (mínimo), `npm ci`, lockfile, `npm audit` bloqueante en crítico, Dependabot, revisión de cada dependencia nueva. | RNF-14 | R-09 | — |
| AM-15 | **Licencia no visible → decisión legal errónea** (R · A04) | Tarjeta, ficha | `licencia === null` renderiza "Sin licencia declarada" mediante una única función `textoLicencia` usada por tarjeta y ficha (no hay otro lugar donde se pueda omitir). Prueba Vitest sobre las 150 y ficha sin licencia en E2E. | RNF-13 | R-08 | — |
| AM-16 | **Reverse tabnabbing** (E · A05) | Enlace externo | `rel="noopener noreferrer"` en todo `target="_blank"` (regla ESLint `react/jsx-no-target-blank`) + `Referrer-Policy`. | RNF-04 | R-07 | 08 |

> A01-A10 son de OWASP Top 10 web edición 2021, igual que la matriz de riesgos. Si el equipo adopta la edición 2025, se renumera en ambos documentos. A07 (autenticación) y A10 (SSRF) no aplican: no hay login (spec, pregunta 1) y el servidor solo consulta una URL fija configurada por entorno, nunca una derivada de datos o de la URL del usuario. OWASP LLM: solo LLM05 aplica (salida del LLM mostrada al usuario); LLM01-04 y LLM06-10 pertenecen a la feature 002/003.

### 5.2 Headers de seguridad

**Estáticos (`next.config.ts`, aplican a todas las rutas):**

| Header | Valor | Motivo |
| --- | --- | --- |
| `X-Content-Type-Options` | `nosniff` | Evita que el navegador reinterprete tipos MIME. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | No filtra rutas ni consultas a `github.com` al abrir el enlace. |
| `X-Frame-Options` | `DENY` | Respaldo de `frame-ancestors` para navegadores viejos. |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()`; `clipboard-write=(self)` | La app solo necesita escribir en el portapapeles. |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` | Se declara siempre (Vercel como destino). Solo tiene efecto sobre HTTPS; el navegador la ignora en `http://localhost`. |
| `Cross-Origin-Opener-Policy` | `same-origin` | Aísla el contexto de navegación. |

**Content-Security-Policy (emitida por el proxy con un nonce nuevo por request):**

```
default-src 'self';
script-src 'self' 'nonce-<nonce>' 'strict-dynamic';
style-src 'self' 'unsafe-inline';
img-src 'self';
font-src 'self';
connect-src 'self';
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
upgrade-insecure-requests          (solo producción)
```

- **Sin `unsafe-inline` ni `unsafe-eval` en `script-src`** en producción. En desarrollo, Next necesita `unsafe-eval` para recarga en caliente: se agrega **solo** si `NODE_ENV === 'development'`, y las pruebas E2E corren contra el build de producción.
- **`style-src 'unsafe-inline'` es una concesión deliberada:** shadcn y Tailwind aplican estilos en línea (`style=""`) que un nonce no cubre. Riesgo bajo porque ningún estilo se construye con datos externos y `img-src`/`connect-src`/`font-src` cierran la exfiltración por CSS. Queda registrado como riesgo residual en 5.3.
- **Consecuencia técnica (aceptada):** una CSP con nonce obliga a render dinámico (las páginas no se pueden servir estáticas desde CDN). Para un catálogo de este tamaño es aceptable; la caché de datos se resuelve en el `fetch` del adaptador (`revalidate` de 5 min), no en la página.
- `connect-src 'self'` es posible porque **el navegador nunca llama a Supabase** (2.1).

### 5.3 Riesgos residuales aceptados

| Riesgo residual | Motivo | Mitigación parcial |
| --- | --- | --- |
| Homoglifos en nombres (MU-03) | Ninguna normalización lo elimina. | `id` ASCII visible junto al nombre, aislamiento visual. |
| `style-src 'unsafe-inline'` | shadcn/Tailwind usan `style=""`. | Ningún estilo sale de datos externos; sin imágenes/fuentes/conexiones remotas. |
| El usuario copia y ejecuta un snippet de una idea **revisada** que igual es peligroso | Revisión humana falible; la interfaz no puede evaluar semántica. | Aviso de no revisada, snippet como texto, no se ejecuta nada. Es de la feature 003 el proceso de revisión. |
| `CATALOG_SOURCE=fixtures` activo por error en producción | Es una variable de entorno. | Sin valor por defecto en producción (4.1); los fixtures son texto inerte; checklist de despliegue en Vercel. |
| Dependencia de RLS de la feature 003 | El control real de escritura está en la base. | Prueba de integración MU-07 obligatoria antes de dar por verificado RNF-02. |
| Aislamiento visual de MU-03/MU-04 verificado solo a ojo | Recorte de presupuesto (8.2, #7). El control está implementado; falta la prueba automática de layout. | Revisión manual con las fixtures a 360/768/1280 px, registrada en `tasks.md`. |

### 5.4 Riesgos nuevos

R-11, R-12 y R-13 ya figuran en `docs/matriz-riesgos.md` (2026-10-30). Las referencias de la tabla 5.1 apuntan a ellos.

## 6. Estrategia de prueba

Principio de esta versión: **cada control de seguridad conserva su prueba automática** (MU-01..12, headers, contrato, enlaces, texto). Lo que se simplificó es la verificación de requisitos de producto (RNF-10, RNF-13, RNF-15, profundidad de RNF-07 y RNF-16), y en esos casos el propio spec ya habla de "revisión". Toda limitación se registra en `tasks.md` (P7).

Reparto: **Vitest** para lógica (rápido, barato, la mayor parte), **Playwright** para lo que solo se puede verificar en un navegador real contra el build de producción, **revisión manual** (≈ 1 h en total, con resultado escrito) para lo visual.

### 6.1 Vitest — lógica pura (`tests/unit`)

| Qué | Casos | Cubre |
| --- | --- | --- |
| `contrato.ts` | Un caso válido; cada regla de la tabla 4.2 con un valor inválido; omisión de herramienta; `revisada` con `"true"`, `1`, `null`, objeto → `false`; snippet que excede C | MU-09, MU-12, AM-10 |
| `texto.ts` | Bidi, ancho cero, controles, NFC, cortes, snippet con saltos de línea | MU-03, MU-04 |
| `enlaces.ts` | ✔ `https://github.com/o/r`. ✘: `http://`, `javascript:`, `data:`, `https://github.com.evil.io`, `https://githuh.com`, `https://evil.io/?github.com`, `https://user:pw@github.com`, `https://github.com:8443`, cadena vacía | MU-08 |
| `filtros.ts` | Cada filtro por separado; una combinación; métricas `null`; categoría múltiple; búsqueda sin distinción de mayúsculas; entradas `.*[(` | RF-03, RF-04 |
| `estado-url.ts` | Cada parámetro inválido de 4.4; repetidos; muy largos; ida y vuelta serializar→parsear | MU-05, MU-06 |
| Contrato del adaptador | Suite compartida que ejecutan **todos** los adaptadores con datos crudos de `mu.json`: nunca devuelven un campo inválido | P5 |
| `textoLicencia` | Sobre las 150 herramientas: siempre devuelve texto no vacío; `null` → "Sin licencia declarada" | RNF-13 |
| Dataset | El script valida su salida con `contrato.ts` y la distribución mínima de 4.6 | Spec §9 |
| `filtrar` (informativo) | 150 ítems, 20 corridas: tiempo de la función pura | RNF-07 (parte) |

### 6.2 Playwright — contra el build de producción, 5 archivos (`CATALOG_SOURCE=fixtures`)

| Archivo | Qué verifica | Cubre |
| --- | --- | --- |
| `mu.spec` | **Recorre `mu.json` (MU-01 a MU-12) con una guarda común:** falla si (a) se dispara un `dialog`, (b) aparece una violación de CSP en consola, (c) se pide un recurso de otro host, (d) el DOM del contenedor tiene elementos inesperados (`<script>`, `<img>`, `<svg>`) donde debería haber solo texto. Más aserciones específicas: texto literal visible con `<` y `>` (01, 05, 11); sin `<a>` dentro de `<pre>` y "Copiar" copia exactamente el snippet, con aviso visible si no está revisada (02, 10); snippet largo sin botón "Copiar" (04); 5 URLs manipuladas responden 200 sin errores (06); solo el enlace válido al repo aparece, con `rel="noopener noreferrer"` y `target="_blank"` (08); inválidos omitidos o "Sin dato", y una idea con "✔ Revisada" en el texto sigue mostrando el aviso (09, 12); ficha sin licencia muestra "Sin licencia declarada" (RNF-13) | RNF-04, R-07, R-11, R-12 |
| `headers.spec` | Headers de 5.2 presentes en `/` y en una ficha; la CSP no contiene `unsafe-eval` ni `unsafe-inline` en `script-src`; el nonce difiere entre dos requests. **Dos aserciones adicionales con la página ya cargada:** con `colorScheme: 'light'` el fondo calculado es oscuro y no hay control de tema (RNF-15); el botón "Asistente — próximamente" está deshabilitado y no hay `<input>` ni request al hacer clic (Spec §9) | R-13, AM-11, RNF-15 |
| `teclado.spec` | Guion con solo teclado: elegir categoría → aplicar y quitar un filtro → buscar → abrir una ficha → copiar el snippet → volver. Verifica foco visible en cada parada y que `Tab` recorre la página hasta salir (sin trampas) | RNF-16 (2.1.1, 2.1.2, 2.4.3, 2.4.7) |
| `a11y.spec` | axe sobre los **5 estados que define el spec**: grilla, panel de filtros abierto, ficha con ideas, estado vacío y estado de error (se fuerza con `mu-forzar-error`). Se recorre una lista de estados con el mismo código. **Bloquea** toda violación cuyas etiquetas de axe correspondan a los criterios de RNF-16 (`wcag143`, `wcag1411`, `wcag211`, `wcag212`, `wcag243`, `wcag247`, `wcag332`, `wcag412`, `wcag311`); el resto se lista en `tasks.md` sin bloquear | RNF-16 |
| `rnf07.spec` | Con las 150 herramientas, 20 repeticiones alternando un cambio de filtro y un texto de búsqueda; mide con `performance.now()` + `MutationObserver` hasta que la grilla refleja el resultado. Reporta mínimo, mediana y máximo. **Pasa si el máximo < 1000 ms** | RNF-07 |

**Fuera de Playwright:** MU-07 (script de integración aparte, necesita el backend de Ángel y se registra como **pendiente** hasta entonces), y los chequeos de CI de RNF-02/AM-01/AM-09.

### 6.3 Revisión manual (≈ 1 h, resultado escrito en `tasks.md`)

| Qué | Cómo | Cubre |
| --- | --- | --- |
| Responsivo | Grilla, panel de filtros y una ficha a 360, 768 y 1280 px: sin scroll horizontal y legibles. **Se hace con las fixtures MU-03/MU-04 cargadas**, así de paso se confirma que los textos largos o bidi no desordenan a sus vecinas | RNF-10, MU-03, MU-04 |
| Teclado | 10 minutos recorriendo el flujo de `teclado.spec` a mano | RNF-16 |
| Contraste y tema | Revisión visual de todas las pantallas en oscuro, con el sistema en modo claro | RNF-15, RNF-16 (1.4.3, 1.4.11) |
| RNF-17 | `react/jsx-no-literals` sin hallazgos en `src/components` y `src/app`; `<html lang="es">` | RNF-17 |

### 6.4 CI (`.github/workflows/web.yml`, nuevo)

`npm ci` → lint → `tsc --noEmit` → Vitest → build → Playwright (Chromium) con `CATALOG_SOURCE=fixtures` → greps de RNF-02/AM-01/AM-09 → `npm audit --audit-level=critical`. Gitleaks sigue en `security.yml`. Los checks se agregan como requeridos en la rama protegida (P9).

### 6.5 Medición de RNF-07: qué se puede afirmar

Se mide en la máquina de desarrollo, sin limitar la CPU, con una acción de cada tipo. El resultado permite afirmar: "con el dataset sintético de 150 herramientas, en esta máquina, el máximo de 20 repeticiones fue X ms". **No** permite afirmar nada sobre equipos lentos ni sobre catálogos mucho más grandes. Esa limitación se escribe junto al número en `tasks.md`.

## 7. Decisiones y alternativas descartadas

| ID | Decisión | Por qué | Alternativas descartadas |
| --- | --- | --- | --- |
| D-01 | **Next.js App Router + TypeScript + Tailwind** en `apps/web` | Stack acordado en la constitución (§4). TypeScript da tipos a la frontera de datos; App Router permite obtener datos en el servidor (2.1) y el proxy para la CSP. | *Pages Router*: patrón anterior, sin Server Components. *SPA con Vite*: contradice el stack acordado y obligaría a que el navegador hable con el backend. |
| D-02 | **Componentes shadcn/ui, solo cinco:** Button, Badge, Card, Input, Label | Pedido del equipo. El código se copia al repo (lo auditamos y lo poseemos) y cubre foco y roles → base de RNF-16. Se copian solo los que se usan. | *Radix directo*: más trabajo para el mismo resultado. *Material UI / Chakra*: más dependencias y CSS-in-JS que complican la CSP. *Todo a mano*: riesgo de errores de accesibilidad y más horas. |
| D-03 | **Patrón repositorio/adaptador + `fetch` GET propio** (sin `supabase-js`) | Se cambia de sintético a Supabase sin tocar la UI. `fetch` de solo GET es auditable de un vistazo (RNF-02) y quita una dependencia grande y su árbol (R-09). El frontend solo necesita leer. | *Llamar a Supabase directo desde los componentes*: acopla la UI al backend de Ángel (que aún no existe). *`supabase-js`*: expone métodos de escritura y suma dependencias que no usamos. *Cliente en el navegador*: obligaría a `connect-src` con el dominio de Supabase y ejecutar la clave en JS de cliente. |
| D-04 | **zod en la frontera**, un único `contrato.ts` | P5: todo dato externo se valida antes de usarse. Los tipos TypeScript salen del esquema (una sola fuente de verdad). | *Validación manual con `if`*: propensa a olvidos. *Confiar en los tipos de TS*: se borran en ejecución, no protegen. *Validar en cada componente*: dispersa el control. |
| D-05 | **CSP con nonce emitida por el proxy; el resto de headers en `next.config`** (decisión 1) | Una CSP estricta sin `unsafe-inline` en scripts requiere nonce por request. Costo aceptado: render dinámico. | *Todo en `next.config`*: obliga a `script-src 'unsafe-inline'`, que anula la mayor parte del valor de la CSP ante XSS. *CSP por `<meta>`*: no soporta `frame-ancestors`. *Sin CSP*: viola P2. |
| D-06 | **Estado de filtros en memoria + `history.replaceState`**; filtrado en el cliente sobre el arreglo cargado | Cumple RF-03 f sin viaje al servidor en cada cambio, clave para < 1 s (RNF-07). Con cientos de herramientas es trivial. | *`router.replace` con query*: dispara render del servidor por cada cambio. *Filtrado en el servidor/base*: latencia de red en cada tecla; hace falta si el catálogo crece a miles (ver D-10). *Librería de estado (zustand, nuqs)*: dependencia extra para ~80 líneas. |
| D-07 | **Diccionario propio** `i18n/es.ts` (objeto tipado + función `t`) | RNF-17 pide externalizar los textos, no internacionalizar con formato avanzado. Cero dependencias. La regla `react/jsx-no-literals` hace verificable que no queden textos sueltos. El inglés = otro objeto con las mismas claves. | *`next-intl` / `react-i18next`*: dependencias y enrutamiento por idioma que no necesitamos mientras se entregue solo español. *Textos directos en JSX*: viola RNF-17 y encarece sumar inglés. |
| D-08 | **`<select>` nativo** para lenguaje, licencia y nivel; `<input type="number">` para stars | Accesibilidad y teclado gratis, funciona bien en móvil, una dependencia (Radix Select) menos. | *Radix Select*: más pesado y con más casos de borde de foco. *Combobox con búsqueda*: útil si hubiera cientos de lenguajes; no es el caso. |
| D-09 | **Tarjeta = un enlace** a la ficha; **categorías = botones** con `aria-pressed` | Una sola acción por tarjeta → teclado simple. Las categorías son filtros, no navegación a otra página. | *Tarjeta con varios controles*: más paradas de `Tab` por tarjeta (150 tarjetas). |
| D-10 | **Catálogo completo cargado en el cliente** (lista liviana) | A ~150-500 herramientas el JSON es pequeño (cota de descripción a 300). | *Paginación / scroll infinito*: no necesario aún y complica filtros. **Límite explícito:** si el catálogo supera ~2 000 herramientas, hay que paginar o filtrar en el servidor; se re-evalúa con medición. |
| D-11 | **Tema oscuro único**: `color-scheme: dark`, clase fija, sin proveedor de tema | RNF-15. Menos código, un solo juego de tokens para auditar contraste. | *`next-themes` + selector*: dependencia y un segundo tema que habría que auditar (el spec lo dejó fuera). |
| D-12 | **Sintético por script con semilla fija** y fixtures en archivo aparte | Decisión de la clarificación 5. Reproducible (P7) y revisable en un PR. Los fixtures *crudos* permiten probar que la frontera rechaza lo inválido, cosa que el sintético "válido" no prueba. | *Generar con faker*: dependencia innecesaria. *Un solo archivo mezclado*: confunde datos de demo con casos de ataque. *Datos reales de GitHub*: licencias reales mal representadas, y rompe P7 si parecen métricas reales. |
| D-13 | **Playwright contra el build de producción** | La CSP y los headers de producción difieren de desarrollo (5.2); probar en dev daría falsa confianza. | *Probar contra `next dev`*: oculta problemas de CSP. *Cypress*: Playwright ya está en los lineamientos. |
| D-14 | **`next/font`** con dos familias (texto y monoespaciada para snippets), de licencia libre (OFL), pesos limitados | La tipografía es parte central de la dirección visual. `next/font` descarga las fuentes en el build y las sirve desde nuestro propio servidor: sin requests a terceros en tiempo de ejecución, compatible con `font-src 'self'`, sin dependencia nueva (viene con `next`) y sin saltos de layout. Costo ≈ 0.5 h en B2. | *Fuente de Google por `<link>`*: request externo, choca con `font-src 'self'`. *Solo fuentes del sistema*: ahorraba 0.5 h pero empobrece la jerarquía tipográfica. *`next/font/local` con archivos en el repo*: alternativa si el build en Vercel no pudiera descargar las fuentes; mismo resultado en ejecución. |
| D-15 | **Sin base de datos ni caché propia en el frontend** | El spec dice que solo lee. La caché es la del `fetch` (`revalidate`). | *Redis/Edge cache propios*: infraestructura sin necesidad medida. |
| D-16 | **Filtros en móvil con `<details>/<summary>` nativo** en lugar de un Sheet de Radix | Accesible por teclado sin código, sin trampa de foco posible, ahorra ≈ 2 h y dos dependencias (`@radix-ui/react-dialog`, `tw-animate-css`). | *Sheet/Drawer de shadcn*: mejor acabado visual pero más código de foco y animación; es un extra (recorte 1 y 2 en 8.2). |
| D-17 | **axe filtrado por etiquetas `wcagNNN`** en vez de un archivo propio de mapeo | Las reglas de axe ya traen la etiqueta del criterio WCAG; reproduce la partición alcance / fuera de alcance del spec con unas líneas. | *Archivo `reglas-en-alcance.ts` mantenido a mano*: más trabajo y se desactualiza. |

## 8. Esfuerzo (presupuesto 40-45 h)

**Son estimaciones mías en horas efectivas de una persona; no son una medición (P7).** La entrega es el 16/11/2026 (17 días desde hoy). La estimación inicial, sin recortes, era de 81 h.

### 8.1 Presupuesto por bloque

| Bloque | Contenido | RF/RNF | Horas |
| --- | --- | --- | --- |
| B0 | Andamiaje: `create-next-app`, Tailwind, 5 componentes shadcn, ESLint con reglas de seguridad, Vitest, Playwright, `web.yml`, headers estáticos, chequeo de TS, diccionario `es.ts` (RNF-17a) | RNF-14, RNF-17 | 4 |
| B1 | Contrato (`contrato.ts`, `texto.ts`, `enlaces.ts`), interfaz y adaptador sintético, script de dataset, `mu.json`, tests unitarios de seguridad | P5, RNF-04, MU-01..12 | 7.5 |
| B2 | Tokens del tema oscuro, `next/font` (2 familias), layout, cabecera, entrada deshabilitada del asistente, estados vacío/error/no encontrado | RNF-15 | 3.5 |
| B3 | Grilla y tarjetas, navegación por categorías, `textoLicencia` | RF-01, RNF-13 | 3.5 |
| B4 | Filtros, búsqueda, estado en URL, panel móvil con `<details>`, tests de `filtros` y `estado-url` | RF-03, RF-04, RNF-07 | 5.5 |
| B5 | Ficha técnica, ideas de integración, snippet con copiar, aviso de no revisada, enlace validado | RF-02, RF-05 | 5.5 |
| B6 | CSP con nonce (proxy), greps de CI | RNF-04, RNF-02 | 3 |
| B7 | Playwright: `mu`, `headers`, `teclado`, `a11y`, `rnf07` | RNF-04/07/15/16 | 7 |
| B8 | Correcciones de accesibilidad + revisión manual (6.3) + resultados en `tasks.md` | RNF-10, RNF-16 | 2 |
| B9 | Adaptador Supabase (solo GET + validación + límite de tamaño + timeout) y script MU-07 *(bloqueado por validación de 4.1 y RLS de 003)* | RF-01..05, RNF-02 | 3 |
| B10 | `tasks.md` con resultados, README mínimo de `apps/web` (SRS y matriz ya actualizados) | P10 | 1 |
| **Total** | | | **45.5** |
| Total sin B9 (si 003 no llega a tiempo) | | | **42.5** |
| RNF-17b (inglés + selector), **fuera del presupuesto** | | | 6 (opcional) |

Desglose de B7: `mu` 2.25 · `headers` 0.75 · `teclado` 1.25 · `a11y` 1.75 (incluye forzar el estado de error) · `rnf07` 1.0.
Acumulado planificado: B0 4 → B1 11.5 → B2 15 → B3 18.5 → B4 24 → B5 29.5 → B6 32.5 → B7 39.5 → B8 41.5 → B10 42.5 → B9 45.5.

### 8.2 Qué queda afuera y cuánto ahorra cada recorte (81 h → 45.5 h)

| # | Recorte | Ahorro | Qué queda afuera | Cómo se verifica ahora | ¿Toca seguridad? |
| --- | --- | --- | --- | --- | --- |
| 1 | Extras visuales | **3.5 h** | Animaciones, esqueletos de carga, microinteracciones. (`next/font` se recuperó: 0.5 h en B2) | — (no hay RF/RNF) | No |
| 2 | Panel móvil con `<details>` en vez de Sheet (D-16) | **2.0 h** (+2 dependencias menos) | Cajón animado con foco gestionado | `<details>` nativo; RNF-10 por revisión manual | No |
| 3 | RNF-10, RNF-13 y RNF-15 sin pruebas automáticas dedicadas | **2.5 h** | Test de 3 viewports, recorrido de 150 fichas renderizadas, spec propio de tema | RNF-10: revisión manual a 3 anchos. RNF-13: Vitest sobre `textoLicencia` en 150 + una única función usada por tarjeta y ficha + ficha sin licencia en `mu.spec`. RNF-15: 2 aserciones en `headers.spec`. El spec ya define estas verificaciones como "revisión" | No |
| 4 | RNF-07: corrida simple | **1.5 h** | CPU limitada 4×, p95, 1 000 ítems, varias acciones | 20 repeticiones sobre 150 ítems, mín/mediana/máx, en esta máquina (6.5) | No |
| 5 | axe más liviano | **2.0 h** | `not-found`, ficha sin ideas, archivo propio de mapeo de reglas, viewport de 360 px | Los 5 estados que pide el spec, partición por etiquetas (D-17) | No |
| 6 | Teclado más liviano | **1.0 h** | Aserción de contorno por cada paso y pasada manual larga | Guion de Playwright + 10 min manuales | No |
| 7 | MU más liviano | **2.0 h** | Comparación de posiciones de elementos vecinos (aislamiento de MU-03/04), 20 URLs de MU-06 | **Los 12 MU se ejecutan.** Aislamiento visual de MU-03/04 por revisión manual con las fixtures; MU-06: 5 URLs en E2E + el resto en Vitest | No (el control está; baja la prueba automática de layout) |
| 8 | Vitest focalizado | **2.0 h** | Combinaciones exhaustivas de filtros, benchmark de 1 000 ítems, hash del dataset | Todos los casos de seguridad se mantienen (6.1) | No |
| 9 | Documentación mínima | **2.0 h** | SRS y matriz ya actualizados en este paso; README de `apps/web` breve | — | No |
| 10 | Adaptador Supabase acotado | **3.0 h** | Reintentos, caché fina, paginación | Solo GET + validación + límite + timeout; MU-07 por script corto | No (el adaptador sigue de solo lectura) |
| 11 | **Re-estimación de implementación** (B0-B6) | **14.0 h** | Nada de alcance: estimación inicial re-hecha sin holgura | — | No |
| | **Total** | **35.5 h** | | | |

> **Sobre el recorte 11, para ser claros:** 21.5 h son recortes de alcance o de verificación (filas 1-10); las otras **14 h son mi estimación inicial re-hecha sin holgura**. Esa parte no baja trabajo: baja mi margen. Es el punto más optimista del plan y por eso existe el checkpoint de 8.4.

### 8.3 Controles de seguridad: intactos

| Control | Dónde queda | Prueba que lo sostiene |
| --- | --- | --- |
| Validación zod + normalización en la frontera | B1 (7.5 h, es el bloque más protegido) | Vitest `contrato`, `texto` + contrato del adaptador |
| Render solo como texto, `react/no-danger`, grep de CI | B3, B5, B0 | `mu.spec` (guarda común) + CI |
| Links seguros (`https://github.com`, `rel="noopener noreferrer"`) | B1, B5 | Vitest `enlaces` + `mu.spec` (MU-08) |
| CSP con nonce + headers estáticos + HSTS | B6 | `headers.spec` |
| Fixtures MU-01..12 | B1, B7 | `mu.spec` ejecuta los 12 |
| Fallo cerrado de `revisada`, snippet largo sin copiar | B1, B5 | Vitest `contrato` + `mu.spec` (MU-04, 10, 12) |
| Solo lectura, sin clave de servicio | B1, B9, B0 | Grep de CI + script MU-07 (pendiente de 003) |
| Cadena de suministro | B0 | `npm audit`, Dependabot, Gitleaks |

**Qué queda más débil que en la versión sin recortes (se registra en `tasks.md`):**
1. El aislamiento visual de MU-03/04 se verifica a ojo, no automáticamente.
2. RNF-07 se mide en una máquina y sin limitar la CPU.
3. RNF-13 no recorre 150 fichas renderizadas: se garantiza por construcción (una sola función) y por Vitest.
4. RNF-10 es revisión manual (como define el spec).
5. Menos profundidad en teclado y axe, aunque cubren lo que exige el spec.

### 8.4 Calidad de la estimación y checkpoint

- Central: **45.5 h**, es decir 0.5 h por encima del tope de 45 h por recuperar `next/font`. Con ±30 % el rango real es **32-59 h**; superar las 45 h es posible, no un caso raro. Sin B9 (42.5 h) queda dentro del tope.
- **Checkpoint al terminar B5** (acumulado planificado: 29.5 h). Si las horas reales superan **35 h**, se aplican los recortes de 8.5 en ese orden.
- Lo más riesgoso: B1 (modelo de datos y 12 fixtures), B6 (CSP con nonce y Next 16, versión muy reciente) y B7 (Playwright contra build de producción, tiempos de configuración).

### 8.5 Orden de recorte ante desvíos (P8)

1. **RNF-17b** (inglés): ya está fuera del presupuesto.
2. **B9, adaptador Supabase** (3 h): se posterga a después de 002. La demo corre con el sintético y **RNF-02 queda "pendiente de verificación"** (no se declara cumplido sin MU-07).
3. **RF-04, búsqueda** (≈ 2 h dentro de B4): es S. Se evalúa en último lugar porque HU-04 es el caso de "ya conozco la herramienta".
4. **Último recurso, debilita la verificación de un requisito M:** pasar `teclado.spec` a revisión solo manual (−1.25 h) y bajar axe a 3 estados (−0.5 h). Se informa explícitamente en `tasks.md`.

**Nunca se recortan:** P3, P4, P5, P6; RF-01, RF-02, RF-03 y RF-05; B1 (contrato), B6 (CSP/headers), `mu.spec` y la regla de solo-texto.

### 8.6 Camino crítico

B0 → B1 → (B2 ∥ B3) → B4 → B5 → B6 → B7 → B8 → B10. B9 depende de Ángel y puede hacerse después o en paralelo sin bloquear la demo con datos sintéticos.
