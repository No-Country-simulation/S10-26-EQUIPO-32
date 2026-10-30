# Tareas 001 — Frontend del catálogo

**Plan:** `./plan.md` · **Spec:** `./spec.md` · **Estado:** aprobado · **Fecha:** 2026-10-30
**Presupuesto:** 45.5 h (42.5 h sin B9) · **Tareas:** 38 · **Tamaño:** 0.5 a 2 h cada una

## Cómo se usa este documento

- Una tarea por vez, en el orden de la tabla (camino crítico del plan 8.6: B0 → B1 → B2 → B3 → B4 → B5 → B6 → B7 → B8 → B10 → B9). La numeración T01… sigue ese orden de ejecución, por eso B10 (T35) va antes que B9 (T36-T38).
- Al terminar una tarea: se marca `[x]`, se completan las **horas reales** y se commitea en el mismo commit (ver "Commits" al final).
- Una tarea está terminada solo si cumple su **criterio de terminado** y la Definition of Done de la constitución (§5): referencia su RF/RNF, no introduce secretos, la documentación afectada está actualizada y pasa la revisión del otro integrante en el PR.
- Las horas son **estimaciones** del plan (sección 8). Las reales se anotan tal cual, sin redondear a favor (P7).
- Si aparece algo fuera de alcance, se frena y vuelve al **spec** primero (`CLAUDE.md`).
- Estados: `[ ]` pendiente · `[~]` en curso · `[x]` terminada · `[!]` bloqueada.
- Columna **Acum.**: horas acumuladas planificadas, para comparar contra las reales en el checkpoint.

## B0 · Andamiaje (4 h)

| # | Tarea | Implementa | Criterio de terminado | Est. h | Acum. | Reales | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T01 | Crear la app Next.js (App Router, TypeScript, Tailwind) en `apps/web`. Fijar versiones con lockfile. Confirmar que el toolchain compila con la versión de TypeScript instalada; si no, fijar 5.x. Agregar `CATALOG_SOURCE` a `.env.example` (sin valor). | D-01, RNF-14, RNF-01 | `npm ci && npm run build` pasan en limpio. Lockfile commiteado. `.env.example` lista `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `CATALOG_SOURCE` sin valores. La versión de TypeScript elegida queda anotada en el commit. | 1.0 | 1.0 | | [ ] |
| T02 | Configurar ESLint con las reglas de seguridad y de textos: `react/no-danger` (error), `react/jsx-no-target-blank`, `react/jsx-no-literals` en `src/app` y `src/components`. Crear `i18n/es.ts` mínimo con la función `t` tipada y `<html lang="es">`. | RNF-04, AM-01, AM-16, RNF-17, RNF-16 (3.1.1) | El lint falla con un `dangerouslySetInnerHTML`, un `target="_blank"` sin `rel` y un texto literal de prueba (se verifica con un archivo temporal que se borra). El lint pasa en el repo limpio. `<html lang="es">` presente. | 1.0 | 2.0 | | [ ] |
| T03 | Inicializar shadcn y copiar solo Button, Badge, Card, Input y Label. | D-02, RNF-14 | Solo esos 5 archivos en `components/ui`. Las dependencias de runtime coinciden con la tabla 3 del plan (`@radix-ui/react-slot`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`); nada de `react-dialog` ni `tw-animate-css`. | 0.5 | 2.5 | | [ ] |
| T04 | Configurar Vitest y Playwright. Playwright arranca el **build de producción** con `CATALOG_SOURCE=fixtures`. Scripts `test` y `test:e2e`. | D-13, P7 | `npm test` y `npm run test:e2e` corren con una prueba mínima cada uno (la de Playwright carga `/` contra el build de producción). | 1.0 | 3.5 | | [ ] |
| T05 | Crear `.github/workflows/web.yml`: `npm ci` → lint → `tsc --noEmit` → Vitest → build → Playwright → `npm audit --audit-level=critical`. | RNF-14, R-09, AM-14 | El workflow corre verde en el PR y falla si se rompe el lint o se planta un test rojo (probado en una rama descartable). Marcar los checks como requeridos en la rama protegida (Settings): lo intenta Jero; si no tiene permisos, queda **pendiente para Ángel** y se anota acá. | 0.5 | 4.0 | | [ ] |

## B1 · Contrato de datos y datos de prueba (7.5 h)

| # | Tarea | Implementa | Criterio de terminado | Est. h | Acum. | Reales | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T06 | `lib/catalogo/texto.ts`: normalización NFC, eliminación de controles, caracteres bidi y de ancho cero, colapso de espacios, corte a cota; variante que conserva `\n` y `\t` para snippets y descripciones. Tests Vitest. | AM-06, AM-07, MU-03, MU-04 | Tests pasan para: bidi (U+202A-202E, U+2066-2069), ancho cero, controles C0/C1, NFC, cortes exactos, snippet con saltos de línea intactos. | 1.0 | 5.0 | | [ ] |
| T07 | `lib/catalogo/enlaces.ts`: `validarUrlRepo` con `new URL()`, `https`, hostname exactamente `github.com`, sin credenciales ni puerto. Tests Vitest. | AM-03, MU-08, RF-02 (e) | Pasan todos los casos de 6.1: válido `https://github.com/o/r`; inválidos `http://`, `javascript:`, `data:`, `github.com.evil.io`, `githuh.com`, `evil.io/?github.com`, con credenciales, con puerto, vacío. | 0.75 | 5.75 | | [ ] |
| T08 | `lib/catalogo/contrato.ts`: esquemas zod de Herramienta (lista y detalle) e Idea con las reglas de 4.2: identidad inválida → omitir, métricas → `null`, licencia → `null`, `revisada` falla cerrado, `snippetExcedeLimite`, máximo de ideas, `omitidas`. Tipos exportados desde el esquema. Tests Vitest. | AM-10, AM-05, AM-04, MU-09, MU-12, RF-05 (f, g), R-11 | Un test por cada regla de la tabla 4.2 con un valor inválido. `revisada` con `"true"`, `1`, `null`, `{}` → `false`. Un snippet de 4 001 caracteres marca `snippetExcedeLimite`. Una herramienta sin categorías válidas se omite. | 2.0 | 7.75 | | [ ] |
| T09 | `lib/catalogo/repositorio.ts`: interfaz `RepositorioCatalogo` (solo lectura), `ErrorCatalogo` con mensaje genérico, selección por `CATALOG_SOURCE` **sin valor por defecto en producción**. Suite de contrato de adaptador reutilizable. | P5, P3, AM-13, RNF-02 | Arrancar en modo producción sin `CATALOG_SOURCE` falla con error claro. La interfaz no tiene ningún método de escritura. La suite de contrato corre y está lista para que la usen todos los adaptadores. | 1.0 | 8.75 | | [ ] |
| T10 | `scripts/generar-dataset.mjs` (PRNG con semilla fija) + `data/sintetico.json` + adaptador sintético. | Spec §9 (dataset), RNF-07, RF-01, RNF-13 | 150 herramientas. Cumple la distribución mínima de 4.6 (6 categorías, ≥ 15 con 2 categorías, ≥ 8 lenguajes, ≥ 6 licencias, 3 niveles, ≥ 5 sin licencia, ≥ 10 sin descripción, ≥ 20 sin ideas, ideas revisadas y no revisadas). Salida validada con `contrato.ts` **desde un test de Vitest** que corre en CI (sin `tsx` ni dependencias nuevas; el script `.mjs` no importa TypeScript). Re-ejecutar el script no cambia el archivo. | 1.25 | 10.0 | | [ ] |
| T11 | `tests/fixtures/mu.json` (MU-01 a MU-12 + casos borde) y modo `CATALOG_SOURCE=fixtures` (sintético + fixtures, y `mu-forzar-error`). Correr la suite de contrato del adaptador contra `mu.json`. | MU-01..12, Spec §9 (fixtures), AM-10 | Cada MU tiene al menos un fixture con `mu` y `esperado`. Hay casos borde de: campos faltantes, categoría vacía, valores fuera de rango, tipos incorrectos, descripción de 300 KB, 500 disparadores, `id` con caracteres especiales, una herramienta sin licencia. La suite de contrato pasa: ningún campo inválido sale del adaptador. | 1.5 | 11.5 | | [ ] |

## B2 · Base visual (3.5 h)

| # | Tarea | Implementa | Criterio de terminado | Est. h | Acum. | Reales | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T12 | Tokens del tema oscuro (variables CSS, `color-scheme: dark`, sin selector de tema), escala tipográfica y `next/font` con dos familias libres (texto y monoespaciada). Relación de contraste de cada par texto/fondo comentada junto al token. | RNF-15, RNF-16 (1.4.3), D-11, D-14 | Con el sistema operativo en modo claro la interfaz se ve oscura. Los tokens documentan su contraste (≥ 4.5:1 texto, ≥ 3:1 controles). En la pestaña Red del navegador no hay requests a dominios de fuentes de terceros: las fuentes salen de `/_next/static`. | 1.5 | 13.0 | | [ ] |
| T13 | Layout raíz, cabecera con marca propia en texto y `EntradaAsistente` deshabilitada. | Spec §9 (asistente), RF-01 (a), RNF-17 | El botón "Asistente — próximamente" (texto del diccionario) está deshabilitado: no hay `<input>` ni se hace ningún request al hacer clic. Sin logo, texto ni imagen de Mobbin. | 1.0 | 14.0 | | [ ] |
| T14 | Páginas `error` y `not-found` y componente reutilizable `EstadoVacio`; todo con textos del diccionario. | RF-01 (d, e), RF-02 (d), AM-13 | `error` muestra un mensaje genérico (sin detalle interno) y un botón "Reintentar" que funciona. `not-found` se ve en una ruta inexistente. `EstadoVacio` acepta título, texto y acción. | 1.0 | 15.0 | | [ ] |

## B3 · Catálogo por categoría (3.5 h)

| # | Tarea | Implementa | Criterio de terminado | Est. h | Acum. | Reales | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T15 | `textoLicencia` (única fuente del texto de licencia) y `TarjetaHerramienta`: nombre con `id` ASCII visible, descripción corta, stars, lenguaje, licencia, health score, nivel con texto además de color. Texto externo aislado (`bdi`/`unicode-bidi: isolate`, `overflow: hidden`). | RF-01 (c), RNF-13, AM-15, AM-06 | Test Vitest: sobre las 150 herramientas `textoLicencia` siempre devuelve texto no vacío y `null` → "Sin licencia declarada". La tarjeta muestra todos los campos; un campo `null` dice "Sin dato". Ningún texto externo se inserta como HTML. | 2.0 | 17.0 | | [ ] |
| T16 | `GrillaHerramientas`, `NavCategorias` (6 botones con `aria-pressed`) y `app/page.tsx` que obtiene los datos en el servidor vía el repositorio. `filtros.ts` se crea con el filtro de categoría; T17 lo completa. | RF-01 (a, b, d, e), D-09 | Las 6 categorías están visibles. Elegir una categoría muestra todas las herramientas que la incluyen, aunque tengan otras. Categoría sin herramientas muestra `EstadoVacio`. Si el repositorio falla se ve la página de error. | 1.5 | 18.5 | | [ ] |

## B4 · Filtros, búsqueda y estado en URL (5.5 h)

| # | Tarea | Implementa | Criterio de terminado | Est. h | Acum. | Reales | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T17 | Completar `filtros.ts`: filtros combinados con AND, métrica `null` no cumple el filtro, búsqueda con `toLowerCase()`/`includes` sobre nombre y descripción, sin `RegExp`. Tests Vitest. | RF-03 (a, b), RF-04 (a, b, c), AM-02 | Tests: cada filtro por separado, una combinación, métricas `null`, categoría múltiple, búsqueda sin distinción de mayúsculas, entradas `.*[(` tratadas como texto literal. | 1.5 | 20.0 | | [ ] |
| T18 | `estado-url.ts`: parseo y serialización validada de `categoria`, `lenguaje`, `licencia`, `mantenimiento`, `stars`, `q` según 4.4. Tests Vitest. | RF-03 (e, f), MU-05, MU-06, AM-02 | Tests: cada parámetro inválido se ignora o se recorta según 4.4; parámetros repetidos toman el primero; `q` de 5 000 caracteres queda en 100; ida y vuelta serializar→parsear. | 1.25 | 21.25 | | [ ] |
| T19 | `PanelFiltros` con `<select>` nativos (opciones de lenguaje y licencia derivadas de los datos), campo de stars mínimos, nivel de mantenimiento, `Buscador`, contador de resultados, chips de filtros activos con quitar uno / todos. En pantallas chicas el panel va dentro de `<details>`. | RF-03 (b, c, d), RF-04 (b, d, e), D-08, D-16, RNF-10 | Todos los controles tienen `label`. Los selects ofrecen solo valores presentes en los datos. Se ve la cantidad de resultados y los filtros activos; "Limpiar" restablece. Combinación sin resultados muestra `EstadoVacio` con la acción de limpiar. | 2.0 | 23.25 | | [ ] |
| T20 | Integración: estado en memoria ⇄ URL con `history.replaceState`; render inicial en el servidor desde `searchParams` validados; mensaje "sin resultados para «…»" como texto. | RF-03 (f), RF-04, MU-05, D-06 | Recargar o abrir un enlace con filtros muestra la misma selección. Cambiar un filtro no dispara una navegación (sin viaje al servidor). Una URL manipulada (categoría inexistente, `stars=-5`, `q=<svg onload=x>`) carga sin error y muestra el texto literal. | 0.75 | 24.0 | | [ ] |

## B5 · Ficha técnica e ideas de integración (5.5 h)

| # | Tarea | Implementa | Criterio de terminado | Est. h | Acum. | Reales | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T21 | Ruta `/herramientas/[id]` con `FichaTecnica`: todos los campos de RF-02 (a), "Sin dato" donde falte, categorías, fecha de métricas, validación estricta del `id`, `not-found` si no existe y enlace al repo solo si `validarUrlRepo` lo acepta (`target="_blank"`, `rel="noopener noreferrer"`). | RF-02 (a-e), RNF-13, AM-03, AM-16, MU-08 | La ficha se recarga en su propia dirección. Una ficha sin licencia dice "Sin licencia declarada". Un `id` inválido o inexistente muestra `not-found`. Con URL inválida no aparece enlace. El enlace válido tiene `target` y `rel` correctos. | 2.0 | 26.0 | | [ ] |
| T22 | `IdeaIntegracion` y `BloqueSnippet`: tipo, disparadores, stack compatible y dificultad; insignia "revisada" en contenedor propio separado del contenido externo; aviso "Generada automáticamente, revisala antes de usarla" para las no revisadas; estado de "sin ideas". Snippet en `<pre><code>` como texto. | RF-05 (a, c, d, e, f, g), AM-04, AM-05, MU-02, MU-12 | Ninguna URL dentro de un snippet es un enlace. La insignia depende solo del booleano `revisada`. Una idea sin ideas muestra el estado vacío. Un campo faltante dice "Sin dato". | 2.0 | 28.0 | | [ ] |
| T23 | Botón "Copiar": copia exactamente el texto del snippet, muestra "Copiado" en el propio botón, aviso de no revisada pegado al botón, deshabilitado si `snippetExcedeLimite` (con aviso de snippet demasiado largo). | RF-05 (b), AM-04, MU-04, MU-10 | Lo copiado es idéntico al snippet mostrado. Con un snippet largo no hay botón de copiar y se ve el aviso. Una idea no revisada muestra el aviso junto al botón. | 1.5 | 29.5 | | [ ] |

### ⛳ CHECKPOINT tras B5

Acumulado planificado: **29.5 h**. Sumar la columna "Reales" de T01-T23 y anotarla acá.

| Horas reales acumuladas (T01-T23) | Decisión |
| --- | --- |
| **≤ 35 h** | Seguir con B6. |
| **> 35 h** | Aplicar el orden de recorte del plan 8.5, **en ese orden**: (1) RNF-17b ya está fuera; (2) posponer B9 (T36-T38) y dejar RNF-02 "pendiente de verificación"; (3) evaluar RF-04 búsqueda; (4) último recurso, pasar `teclado.spec` (T30) a revisión manual y bajar axe (T31) a 3 estados, informándolo en esta tabla. **Nunca** se recortan P3, P4, P5, P6, RF-01/02/03/05, B1, B6 ni `mu.spec`. |

Horas reales acumuladas: ______ · Decisión: ______ · Fecha: ______

## B6 · Cabeceras de seguridad y CSP (3 h)

| # | Tarea | Implementa | Criterio de terminado | Est. h | Acum. | Reales | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T24 | `next.config.ts`: headers estáticos (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`, HSTS, `Cross-Origin-Opener-Policy`) y `poweredByHeader: false`. | AM-11, AM-13, RNF-04, R-13 | `curl -I` contra el build de producción muestra todos los headers de 5.2 y no muestra `X-Powered-By`. | 0.75 | 30.25 | | [ ] |
| T25 | `proxy.ts`: CSP con nonce por request (sin `unsafe-inline` ni `unsafe-eval` en `script-src` en producción; `unsafe-eval` solo en `development`). Aplicar el nonce a los scripts de Next. Navegar `/` y una ficha sin violaciones. | AM-01, AM-11, AM-12, RNF-04, R-07, R-13, D-05 | En el build de producción, `/` y una ficha cargan y funcionan (filtros, copiar) con **0 violaciones de CSP** en la consola. El nonce cambia entre dos requests. La CSP coincide con la de 5.2. | 1.75 | 32.0 | | [ ] |
| T26 | Verificaciones de CI: `grep` que falla si aparece `dangerouslySetInnerHTML` en `src/` o `SUPABASE_SERVICE_ROLE_KEY`, `GITHUB_TOKEN`, `LLM_` en `apps/web/src` y en `.next/static`. | RNF-02, AM-01, AM-09, R-01 | El paso de CI está en `web.yml` y falla cuando se planta cualquiera de esas cadenas (probado en una rama descartable); pasa en limpio. | 0.5 | 32.5 | | [ ] |

## B7 · Pruebas E2E (7 h)

| # | Tarea | Implementa | Criterio de terminado | Est. h | Acum. | Reales | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T27 | `mu.spec` (parte 1): recorrer `mu.json` con la guarda común en grilla y ficha: falla ante `dialog`, violación de CSP en consola, request a otro host o elementos inesperados (`<script>`, `<img>`, `<svg>`) donde debería haber texto. | MU-01..12, RNF-04, R-07 | Corre contra el build de producción. Cada fixture de MU-01 a MU-12 pasa la guarda. Se comprueba que la guarda **detecta** un caso (inyectando a propósito un `<img>` en una prueba temporal que se borra). | 1.25 | 33.75 | | [ ] |
| T28 | `mu.spec` (parte 2): aserciones específicas de 6.2: texto literal con `<` `>` visible (01, 05, 11); sin `<a>` en `<pre>` y copiar exacto con aviso (02, 10); snippet largo sin copiar (04); 5 URLs manipuladas (06); enlaces al repo (08); inválidos omitidos o "Sin dato" (09); "✔ Revisada" falso no quita el aviso (12); ficha sin licencia (RNF-13). | MU-02, 04, 05, 06, 08, 09, 10, 11, 12, RNF-13 | Todas las aserciones pasan. MU-07 **no** está en este archivo (ver T37). | 1.0 | 34.75 | | [ ] |
| T29 | `headers.spec`: headers de 5.2 en `/` y en una ficha; CSP sin `unsafe-eval` ni `unsafe-inline` en `script-src`; nonce distinto entre dos requests. Más: con `colorScheme: 'light'` el fondo es oscuro y no hay control de tema; el botón del asistente está deshabilitado y no genera requests. | R-13, AM-11, RNF-15, Spec §9 (asistente) | Pasa. Si se quita un header de `next.config.ts`, la prueba falla (verificado una vez y revertido). | 0.75 | 35.5 | | [ ] |
| T30 | `teclado.spec`: guion solo con teclado (categoría → filtro → quitar filtro → búsqueda → abrir ficha → copiar snippet → volver) con foco visible en cada parada y sin trampa de foco. | RNF-16 (2.1.1, 2.1.2, 2.4.3, 2.4.7) | Pasa. En cada paso el elemento enfocado tiene un contorno de foco calculado distinto de `none`. `Tab` recorre la página hasta salir. | 1.25 | 36.75 | | [ ] |
| T31 | `a11y.spec`: axe sobre los 5 estados del spec (grilla, panel de filtros abierto, ficha con ideas, estado vacío, estado de error con `mu-forzar-error`). Bloquean las violaciones con etiquetas `wcag143`, `wcag1411`, `wcag211`, `wcag212`, `wcag243`, `wcag247`, `wcag332`, `wcag412`, `wcag311`; el resto se lista. | RNF-16, D-17 | El spec corre y **imprime** el conteo de violaciones en alcance y fuera de alcance por estado (se copian a la tabla de validación). Se confirma que bloquea: se planta una violación en alcance (p. ej. un botón sin nombre) y falla. | 1.75 | 38.5 | | [ ] |
| T32 | `rnf07.spec`: con las 150 herramientas, 20 repeticiones alternando un cambio de filtro y un texto de búsqueda; mide con `performance.now()` + `MutationObserver` hasta que la grilla refleja el resultado. | RNF-07, AM-07, R-12 | Imprime mínimo, mediana y máximo reales. Pasa si el máximo es < 1000 ms. Los números y la limitación (una máquina, sin limitar CPU) se copian a la tabla de validación. | 1.0 | 39.5 | | [ ] |

## B8 · Accesibilidad y revisión manual (2 h)

| # | Tarea | Implementa | Criterio de terminado | Est. h | Acum. | Reales | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T33 | Corregir **todo lo que corresponda a los criterios de RNF-16** (hallazgos de axe y de la prueba de teclado) hasta tener 0 bloqueantes. Lo que esté fuera de alcance solo se registra, sin corregirlo. | RNF-16 | `a11y.spec` y `teclado.spec` en verde. Los hallazgos fuera de alcance quedan listados en la tabla de validación (RNF-16). **Si T33 supera 2 h reales, cuenta para el checkpoint:** se vuelve a evaluar el orden de recorte de 8.5 con las horas reales acumuladas a esa fecha. *Es la tarea más variable: depende de lo que encuentre T31.* | 1.0 | 40.5 | | [ ] |
| T34 | Revisión manual de 6.3: grilla, panel de filtros y una ficha a 360, 768 y 1280 px **con las fixtures MU-03/MU-04 cargadas**; 10 min de teclado a mano; revisión visual en oscuro con el sistema en claro; confirmar `react/jsx-no-literals` sin hallazgos y `lang="es"`. | RNF-10, RNF-15, RNF-16, RNF-17, MU-03, MU-04 | Resultado escrito en la tabla de validación para cada punto: sin scroll horizontal, textos largos o bidi contenidos en su tarjeta, sin elementos sin estilo. | 1.0 | 41.5 | | [ ] |

## B10 · Cierre documental (1 h)

| # | Tarea | Implementa | Criterio de terminado | Est. h | Acum. | Reales | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T35 | Completar la tabla de validación con evidencia real, registrar las limitaciones de 8.3, escribir un README breve de `apps/web` (cómo correr, variables, `CATALOG_SOURCE`) y revisar que `.env.example`, SRS y matriz estén al día. Abrir el PR con `.github/pull_request_template.md`. | P7, P10, RNF-11 | Cada fila de "Validación" tiene resultado y evidencia o dice explícitamente "pendiente" con motivo. El PR referencia RF/RNF y riesgos. | 1.0 | 42.5 | | [ ] |

## B9 · Datos reales (3 h) — 🔒 BLOQUEADO

> **No empezar hasta que se cumplan las dos condiciones** (plan 2.4). Mientras tanto la feature se entrega con el dataset sintético; RNF-02 **no se declara verificado** sin T37.
>
> - [ ] **Ángel validó el contrato de la sección 4.1 del spec** (incluye la escala del health score, los tres niveles de mantenimiento, la URL del repo, el estado de revisión y los valores de dificultad). Fecha: ______
> - [ ] **Ángel tiene RLS activo:** lectura pública del catálogo y escritura solo con el rol de servicio. Fecha: ______

| # | Tarea | Implementa | Criterio de terminado | Est. h | Acum. | Reales | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T36 | Adaptador Supabase: `fetch` envuelto que **solo permite `GET`** contra la API de lectura, mapeo al contrato 4.1, paso por `contrato.ts`, límite de tamaño de respuesta, *timeout* y errores genéricos. | RF-01..05, RNF-02, AM-07, AM-08, AM-13, D-03 | La suite de contrato de T09 pasa con este adaptador. Test: el wrapper lanza error ante cualquier método distinto de `GET`. Con `CATALOG_SOURCE=supabase` la app lista herramientas del entorno de Ángel. Una respuesta mayor al límite se aborta. | 1.75 | 44.25 | | [!] |
| T37 | Script de integración MU-07: `POST`, `PATCH` y `DELETE` con la clave pública deben ser rechazados. Registrar el resultado. | RNF-02, AM-08, MU-07, R-05 | Las tres operaciones devuelven error de autorización; la evidencia (comandos y respuestas, **sin la clave**) queda en la tabla de validación. Recién entonces RNF-02 puede marcarse verificado. | 0.75 | 45.0 | | [!] |
| T38 | Prueba con datos reales: recorrer el catálogo real, revisar el log de `omitidas` y ajustar el contrato (con Ángel y pasando primero por el spec si cambia el alcance) si difiere de 4.1. | RF-01..05, AM-10, R-11 | Catálogo real visible sin errores. `omitidas` revisado y explicado. Diferencias con 4.1 registradas en el spec. | 0.5 | 45.5 | | [!] |

## Resumen de horas

| Bloque | Plan (h) | Reales (h) |
| --- | --- | --- |
| B0 | 4.0 | |
| B1 | 7.5 | |
| B2 | 3.5 | |
| B3 | 3.5 | |
| B4 | 5.5 | |
| B5 | 5.5 | |
| *Checkpoint (T01-T23)* | *29.5* | |
| B6 | 3.0 | |
| B7 | 7.0 | |
| B8 | 2.0 | |
| B10 | 1.0 | |
| *Subtotal sin B9* | *42.5* | |
| B9 | 3.0 | |
| **Total** | **45.5** | |

## Commits

**Recomendación: un commit por tarea** (son de 0.5 a 2 h y cada una tiene su criterio de terminado, así el historial queda trazable por ID, P10). Las excepciones razonables:

- Tareas de configuración mínima que no se pueden usar por separado se pueden juntar: **T03 con T02**.
- Una tarea de código y su test van **siempre en el mismo commit** (T06 a T08, T17, T18).
- El cambio de estado en `tasks.md` (`[x]` y horas reales) va en el commit de la tarea; no hace falta un commit aparte.
- El checkpoint lleva su propio commit.
- **Un solo PR por feature** (`CLAUDE.md`), con la plantilla del repo. Revisión cruzada de Ángel antes de mergear (P9).

Formato: Conventional Commits con el ID de la tarea y los IDs de requisito/amenaza que implementa. Rama: `001-frontend-catalogo` (nunca `main`).

```
chore(web): andamiaje de Next.js con Tailwind y lockfile (T01, RNF-14)
chore(web): reglas de lint de seguridad y diccionario base (T02, RNF-04, RNF-17)
feat(web): normalización de texto y bloqueo de Unicode engañoso (T06, AM-06, MU-03)
feat(web): validación de enlaces del repositorio (T07, AM-03, MU-08)
feat(web): contrato zod y normalización (T08, AM-10)
feat(data): generador del dataset sintético de 150 herramientas (T10, RNF-07)
test(data): fixtures MU-01..12 y casos borde (T11, MU-01..12)
feat(web): tarjeta de herramienta con licencia siempre visible (T15, RNF-13, AM-15)
feat(web): filtros, búsqueda y estado validado en la URL (T17, T18, RF-03, RF-04)
feat(web): ficha técnica con enlace validado (T21, RF-02, AM-03)
feat(web): snippet como texto, copiar y aviso de no revisada (T23, RF-05, AM-04, MU-10)
chore(tasks): checkpoint tras B5 (horas reales: <n>)
feat(security): CSP con nonce en el proxy (T25, AM-11, RNF-04)
ci(web): verificación de secretos y dangerouslySetInnerHTML (T26, RNF-02, AM-09)
test(web): recorrido E2E de MU-01..12 contra el build de producción (T27, T28, RNF-04)
test(web): medición de RNF-07 sobre 150 herramientas (T32, RNF-07)
fix(web): correcciones de accesibilidad de axe y teclado (T33, RNF-16)
docs(web): validación de la feature 001 con evidencia (T35)
feat(web): adaptador Supabase de solo lectura (T36, RNF-02, AM-08)
test(web): MU-07 escritura con clave pública rechazada (T37, RNF-02, R-05)
```

## Validación

Se completa en la etapa 7. **Resultado:** `Cumple` · `No cumple` · `Pendiente (motivo)`. **Evidencia:** archivo, comando y salida reales, o enlace; nada estimado (P7).

### Criterios de aceptación de la feature (spec §9)

| Criterio de aceptación (spec §9) | Resultado | Evidencia |
| --- | --- | --- |
| Existe un script que genera 150 herramientas sintéticas que respetan el contrato de 4.1, con ideas revisadas y no revisadas y herramientas en varias categorías. | | |
| Existe un archivo de fixtures separado con los payloads de MU-01 a MU-12 y los casos borde (campos faltantes, al menos una herramienta sin licencia, categoría vacía, valores fuera de rango). | | |
| La sección 4.1 fue validada con Ángel antes de empezar las tareas que consumen datos reales. | | |
| RF-01 a RF-05 cumplen sus criterios de aceptación con el conjunto de prueba. | | Ver detalle por RF. |
| RNF-02, RNF-04, RNF-07, RNF-10, RNF-13, RNF-15 y RNF-16 verificados según la sección 5, con resultados reales registrados en `tasks.md`. | | Ver detalle por RNF. |
| RNF-17: todos los textos de la interfaz están en el diccionario y la interfaz se entrega en español. El inglés no es requisito para cerrar la feature. | | |
| Los casos MU-01 a MU-12 se probaron con datos de prueba y dieron el resultado esperado. | | Ver detalle por MU. |
| El punto de entrada al asistente RAG se ve como un elemento deshabilitado "Asistente — próximamente": no acepta texto, no envía nada y no llama a ningún servicio. | | |
| La interfaz no usa marca, textos ni imágenes de Mobbin. | | |
| Sin secretos en el repo; secret scanning en verde. | | |
| Todas las preguntas de la sección 8 respondidas y reflejadas en este spec. | **Cumple** | `spec.md` §8: las 10 respuestas registradas (2026-10-30) y decisiones finales aprobadas. |

### Detalle por requisito funcional

| RF | Tareas | Prueba | Resultado | Evidencia |
| --- | --- | --- | --- | --- |
| RF-01 Catálogo por categoría | T14, T15, T16 | Manual + `mu.spec` | | |
| RF-02 Ficha técnica | T21 | `mu.spec`, T34 | | |
| RF-03 Filtros | T17, T18, T19, T20 | Vitest + `rnf07.spec` | | |
| RF-04 Búsqueda | T17, T19, T20 | Vitest + `mu.spec` (MU-05) | | |
| RF-05 Ideas de integración | T22, T23 | `mu.spec` | | |

### Detalle por requisito no funcional

| RNF | Tareas | Prueba (spec §5) | Resultado | Evidencia (valores reales) |
| --- | --- | --- | --- | --- |
| RNF-02 | T09, T26, T36, T37 | Revisión de código + CI + MU-07 | | MU-07 **pendiente** hasta B9 |
| RNF-04 | T02, T08, T25, T27, T28 | `mu.spec` | | |
| RNF-07 | T10, T32 | `rnf07.spec` | | mín: ___ ms · mediana: ___ ms · máx: ___ ms (20 repeticiones, 150 herramientas, esta máquina, sin limitar CPU) |
| RNF-10 | T19, T34 | Revisión manual a 360/768/1280 px | | |
| RNF-13 | T15, T21, T28 | Vitest (150) + `mu.spec` + revisión | | |
| RNF-15 | T12, T29, T34 | `headers.spec` + revisión | | |
| RNF-16 | T30, T31, T33, T34 | axe + teclado + revisión manual | | Violaciones en alcance por estado: ___ · fuera de alcance (lista): ___ |
| RNF-17 | T02, T34 | Lint `jsx-no-literals` + `lang="es"` | | |

### Detalle por caso de mal uso

| MU | Prueba | Tareas | Resultado | Evidencia |
| --- | --- | --- | --- | --- |
| MU-01 | `mu.spec` | T11, T27, T28 | | |
| MU-02 | `mu.spec` | T22, T28 | | |
| MU-03 | Vitest `texto` + revisión manual | T06, T34 | | |
| MU-04 | `mu.spec` + revisión manual | T06, T23, T28 | | |
| MU-05 | Vitest `estado-url` + `mu.spec` | T18, T20, T28 | | |
| MU-06 | Vitest + `mu.spec` (5 URLs) | T18, T28 | | |
| MU-07 | Script de integración | T37 | **Pendiente** (B9) | |
| MU-08 | Vitest `enlaces` + `mu.spec` | T07, T21, T28 | | |
| MU-09 | Vitest `contrato` + `mu.spec` | T08, T28 | | |
| MU-10 | `mu.spec` | T23, T28 | | |
| MU-11 | `mu.spec` | T27, T28 | | |
| MU-12 | Vitest `contrato` + `mu.spec` | T08, T22, T28 | | |

### Limitaciones a registrar (plan 8.3, P7)

Se completa con lo que realmente ocurra; no se omite ninguna.

| Limitación | Estado real |
| --- | --- |
| Aislamiento visual de MU-03/04 verificado a ojo, no automáticamente | |
| RNF-07 medido en una máquina y sin limitar la CPU | |
| RNF-13 no recorre 150 fichas renderizadas | |
| RNF-10 es revisión manual | |
| Menor profundidad en teclado y axe que la versión sin recortes | |
| Hallazgos de axe fuera de alcance de RNF-16 (lista) | |
