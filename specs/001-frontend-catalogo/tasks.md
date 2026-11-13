# Tareas 001 — Frontend del catálogo

**Plan:** `./plan.md` · **Spec:** `./spec.md` · **Estado:** aprobado · **Fecha:** 2026-10-30
**Presupuesto MVP:** 24.75 h (antes 44.25 h; ver plan 8.7) · **Tareas:** 42 (38 + TI1-TI4) · **Tamaño:** 0.5 a 2 h cada una

> **Recorte MVP 2026-11-10 (P8):** entrega y exposición el viernes 13/11. Estimaciones, acumulados y alcance reestimados según plan 8.7; B1 ≤ 6 h hoy y toda la UI ≤ 8 h mañana. Fuera: axe, rendimiento, Playwright extendido (T30-T33), B9 (T36-T38) y tandas de UI externas; CSP con nonce (T25) opcional. Las horas «antes» quedan en el resumen como línea base.

> **Revisión 2026-11-02:** tema claro único y fidelidad Mobbin (RNF-18), con portada en UI-1. Estimaciones y acumulados conservados como línea base histórica; pendiente reestimar el incremento de TI1/T13/T34 y conciliar el presupuesto del plan. No representa trabajo implementado ni verificado.

## Cómo se usa este documento

- Una tarea por vez, en el orden de la tabla (camino crítico del plan 8.6: B0 → B1 → B2 → B3 → B4 → B5 → B6 → B7 → B8 → B10 → B9). La numeración T01… sigue ese orden de ejecución, por eso B10 (T35) va antes que B9 (T36-T38).
- Al terminar una tarea: se marca `[x]`, se completan las **horas reales** y se commitea en el mismo commit (ver "Commits" al final).
- Una tarea está terminada solo si cumple su **criterio de terminado** y la Definition of Done de la constitución (§5): referencia su RF/RNF, no introduce secretos, la documentación afectada está actualizada y pasa la revisión del otro integrante en el PR.
- Las horas son **estimaciones** del plan (sección 8). Las reales se anotan tal cual, sin redondear a favor (P7).
- Si aparece algo fuera de alcance, se frena y vuelve al **spec** primero (`CLAUDE.md`).
- **UI delegada (D-19):** las tareas `TI1`-`TI4` integran los PR de `ui/astra-v1` (componentes presentacionales según `ui-brief.md`). Van **primero** en su bloque, antes de las tareas de lógica que cablean esos componentes. Se numeran aparte para no renumerar T01-T38. Si el PR de una tanda no llegó, el bloque se frena en ese punto: no se escribe una UI propia sin volver al plan.
- Estados: `[ ]` pendiente · `[~]` en curso · `[x]` terminada · `[!]` bloqueada.
- Columna **Acum.**: horas acumuladas planificadas, para comparar contra las reales en el checkpoint.

## Reglas del brief y su cobertura (D-19)

Qué reglas de `ui-brief.md` hace cumplir el lint de T02 y cuáles no se pueden automatizar. Esta tabla se completa al terminar T02 con la regla exacta que atrapó cada caso.

| Regla del brief | ¿Automatizable con lint? | Cómo se cubre |
| --- | --- | --- |
| §5.1 Sin `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function` | **Sí** | `react/no-danger`, `no-eval`, `no-implied-eval`, `no-new-func`, `no-restricted-properties`. Más el grep de CI de T26. |
| §5.1 Sin parsers de Markdown o HTML | **Parcial** | Es una regla de dependencias: el brief prohíbe agregarlas y lo comprueba el diff de `package.json`/lockfile en cada TI. Chequeo de CI contra la tabla 3 (T05). |
| §5.2 Texto externo como texto de React | **Sí** (que no se inyecte HTML) | `react/no-danger`. El **aspecto** (cortes, `overflow-wrap`, bidi) **no** es automatizable: `mu.spec` (guarda común), revisión manual de T34 con MU-03/04 y la demo local en TI2. |
| §5.3 Sin recursos externos | **Parcial** | Lint: elementos `img`/`iframe`/`script`/`link`/…, `next/image`, literales `http(s)://` en `src`/`href`/`action`. **No** cubre `url(...)` en CSS ni URLs armadas en tiempo de ejecución: CSP (`img-src`, `font-src`, `connect-src 'self'`) + guarda de `mu.spec` (request a otro host) + grep de CI sobre `globals.css`. |
| §5.4 Sin `<script>` en línea ni `style` armado con datos | **Sí** (prohibido `style` en `src/components/catalogo`) | `no-restricted-syntax`. Es más estricto que el brief: si una tanda lo necesitara, se pide excepción por escrito. |
| §5.5 Enlace solo con `urlRepo` ya validado y con `rel` | **Parcial** | El `rel` sí: `react/jsx-no-target-blank`. Que el enlace desaparezca con `null` y que `urlRepo` venga validado: `validarUrlRepo` (Vitest) + `mu.spec` (MU-08). |
| §5.6 Snippet como texto, URLs no clickeables, «Copiar» solo con `copiable` | **No** | `mu.spec` (sin `<a>` dentro de `<pre>`, copiar exacto, snippet largo sin botón) y TI3. |
| §5.7 Aviso de no revisada pegado; insignia solo del booleano | **No** | Vitest de `contrato.ts` (fallo cerrado) + `mu.spec` (MU-12) + TI3. |
| §6 Ningún texto literal; todo por `t()` | **Parcial** | `react/jsx-no-literals` (`noStrings`) y `no-restricted-syntax` para `aria-label`/`title`/`placeholder`/`alt`. **No** detecta textos en constantes u objetos de TypeScript (p. ej. un arreglo de etiquetas): revisión del PR en cada TI y T34. |
| §10 Ningún `fetch` ni variable de entorno en componentes | **Sí** | `no-restricted-globals` y `process.env` prohibidos en `src/components`. |
| §10 Cero dependencias nuevas | **Sí** (CI) | Chequeo de dependencias de T05 contra la tabla 3 + diff de lockfile en cada TI. |
| §10 Sin marca, logo ni textos de Mobbin | **No** | Revisión humana en cada TI y T34. |
| §7 Accesibilidad (foco, contraste, labels) | **No** (lint) | **axe es T31 (B7), después de las TI.** Durante TI1-TI3 solo hay revisión manual y, si ya está disponible, una pasada puntual. El control con axe del PR llega recién en T31: por eso T33 puede encontrar correcciones en componentes que ya integramos. |

**Resultado de T02 (regla que atrapó cada caso, archivos temporales ya borrados):** `dangerouslySetInnerHTML` → `react/no-danger` · `innerHTML` → `no-restricted-properties` · `eval` → `no-eval` · `<img>` y `<link>` → `no-restricted-syntax` (elementos) · `href="https://…"` y `href="//…"` → `no-restricted-syntax` (URL literal) · `target="_blank"` sin `rel` (href dinámico) → `react/jsx-no-target-blank` · texto como hijo → `react/jsx-no-literals` · `aria-label` literal → `no-restricted-syntax` · `style={{…}}` → `no-restricted-syntax` (solo `src/components/catalogo`) · `fetch` → `no-restricted-globals` · `process.env` → `no-restricted-syntax`. Hallazgos: `jsx-no-target-blank` no marca enlaces relativos con href literal (solo externos o dinámicos), y `jsx-no-literals` va con `ignoreProps: true` porque `className`/`lang` son literales legítimos; los literales de `aria-label`, `title`, `placeholder` y `alt` los cubre `no-restricted-syntax`. Horas reales: no medido.

## B0 · Andamiaje (5.0 h)

| # | Tarea | Implementa | Criterio de terminado | Est. h | Acum. | Reales | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T01 | Crear la app Next.js (App Router, TypeScript, Tailwind) en `apps/web`. Fijar versiones con lockfile. Agregar `CATALOG_SOURCE` a `.env.example` (sin valor). | D-01, RNF-14, RNF-01 | `npm ci && npm run build` pasan en limpio. Lockfile commiteado. `.env.example` lista `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `CATALOG_SOURCE` sin valores. TypeScript 5.9.3 fijado (D-18); `npm ci` y build pasan en limpio. | 1.0 | 1 | no medido | [x] |
| T02 | Configurar ESLint 9 con las reglas de seguridad y de textos, **incluidas las del `ui-brief.md` §5, §6 y §10** (ver «Reglas del brief y su cobertura»): `react/no-danger` (error), `react/jsx-no-target-blank` (`enforceDynamicLinks: always`), `react/jsx-no-literals` con `noStrings: true` en `src/app` y `src/components`; `no-eval`, `no-implied-eval`, `no-new-func` y `no-restricted-properties` para `innerHTML`/`outerHTML`/`insertAdjacentHTML`; `no-restricted-syntax` para (a) elementos `img`, `iframe`, `script`, `link`, `video`, `audio`, `object`, `embed` y el import de `next/image`, (b) atributos `src`/`href`/`action` con literal `http(s)://` o `//`, (c) literales en `aria-label`, `title`, `placeholder`, `alt`, (d) la prop `style` en `src/components/catalogo`; `no-restricted-globals` (`fetch`, `XMLHttpRequest`, `WebSocket`) y `process.env` prohibidos en `src/components`. Crear `i18n/es.ts` mínimo con la función `t` tipada y `<html lang="es">`. | RNF-04, AM-01, AM-12, AM-16, RNF-17, RNF-16 (3.1.1), D-19 | El lint falla, uno por uno, con: `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `<img>`, `<link>`, `src="https://…"`, `target="_blank"` sin `rel`, un texto literal como hijo, un `aria-label` literal, `style={{…}}` y un `fetch`/`process.env` dentro de `src/components` (archivos temporales que se borran; se anota qué regla atrapó cada caso). El lint pasa en el repo limpio. `<html lang="es">` presente. «Reglas del brief y su cobertura» dice qué regla NO es automatizable y con qué se cubre. | 1.5 | 2.5 | no medido | [x] |
| T03 | Inicializar shadcn y copiar solo Button, Badge, Card, Input y Label. | D-02, RNF-14 | Solo esos 5 archivos en `components/ui`. Las dependencias de runtime coinciden con la tabla 3 del plan (`@radix-ui/react-slot`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`); nada de `react-dialog` ni `tw-animate-css`. | 0.5 | 3 | no medido | [x] |
| T04 | Configurar Vitest y Playwright. Playwright arranca el **build de producción** con `CATALOG_SOURCE=fixtures`. Scripts `test` y `test:e2e`. | D-13, P7 | `npm test` y `npm run test:e2e` corren con una prueba mínima cada uno (la de Playwright carga `/` contra el build de producción). | 1.0 | 4 | no medido | [x] |
| T05 | Crear `.github/workflows/web.yml` (con `actions/setup-node` y `node-version-file: .nvmrc`): `npm ci` → lint → `tsc --noEmit` → Vitest → build → Playwright → `npm audit --audit-level=critical`. Más un **chequeo de dependencias**: compara las `dependencies`/`devDependencies` de `package.json` contra la lista permitida de la tabla 3 del plan, que vive en **`apps/web/allowed-deps.json`** (nombre → versión exacta; se genera a partir de la tabla 3 y solo cambia en el mismo commit que la tabla; `apps/web/` está bajo CODEOWNERS) y falla si aparece una nueva. | RNF-14, R-09, AM-14 | El workflow corre verde en el PR, el chequeo de dependencias falla al agregar una dependencia que no está en la tabla 3 (probado en una rama descartable) y falla si se rompe el lint o se planta un test rojo (probado en una rama descartable). **T05 hecha (`144eafb`):** `allowed-deps.json` es lista de nombres (desvío aprobado); pruebas de falla hechas el 2026-11-02 en rama descartable. **Pendiente:** marcar los checks como requeridos en la rama protegida (Settings), lo hace Jero.  Original: marcar los checks como requeridos (Settings): lo intenta Jero; si no tiene permisos, queda **pendiente para Ángel** y se anota acá. | 1.0 | 5 | no medido | [x] |

### Riesgo conocido en T05: `npm audit` (2026-11-02)

`npm audit` en `apps/web` informa **16 vulnerabilidades moderadas, 0 altas y 0 críticas**. `npm audit --omit=dev` informa **0**: ninguna llega a producción. Son **una sola** advisory contada 16 veces por propagación: `minimatch` < 11.0.1, *denial of service por amplificación de globparts* ([GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249), CWE-405). Está presente `minimatch` 3.1.5 (6 copias, en la cadena de ESLint) y 10.2.6; todas las entradas son la cadena de `eslint` / `eslint-config-next` fijada por D-18.

| Paquete | Directa / transitiva | Desarrollo / runtime | Origen |
| --- | --- | --- | --- |
| `eslint` | directa | desarrollo | Hereda de `minimatch` (a través de sus dependencias) |
| `eslint-config-next` | directa | desarrollo | Hereda de `minimatch` (a través de sus dependencias) |
| `minimatch` | transitiva | desarrollo | **Causa raíz**: `minimatch` < 11.0.1 |
| `@eslint-community/eslint-utils` | transitiva | desarrollo | Hereda de `minimatch` |
| `@eslint/config-array` | transitiva | desarrollo | Hereda de `minimatch` |
| `@eslint/eslintrc` | transitiva | desarrollo | Hereda de `minimatch` |
| `@next/eslint-plugin-next` | transitiva | desarrollo | Hereda de `minimatch` |
| `@typescript-eslint/eslint-plugin` | transitiva | desarrollo | Hereda de `minimatch` |
| `@typescript-eslint/parser` | transitiva | desarrollo | Hereda de `minimatch` |
| `@typescript-eslint/type-utils` | transitiva | desarrollo | Hereda de `minimatch` |
| `@typescript-eslint/typescript-estree` | transitiva | desarrollo | Hereda de `minimatch` |
| `@typescript-eslint/utils` | transitiva | desarrollo | Hereda de `minimatch` |
| `eslint-plugin-import` | transitiva | desarrollo | Hereda de `minimatch` |
| `eslint-plugin-jsx-a11y` | transitiva | desarrollo | Hereda de `minimatch` |
| `eslint-plugin-react` | transitiva | desarrollo | Hereda de `minimatch` |
| `typescript-eslint` | transitiva | desarrollo | Hereda de `minimatch` |

- **Por qué es aceptable por ahora:** solo corre al hacer lint en desarrollo y en CI, con patrones de glob que escribimos nosotros; no procesa entrada externa. El paso de CI de T05 usa `--audit-level=critical`, por lo que **no bloquea**; se informan también las moderadas.
- **No aplicar `npm audit fix --force`:** propone *bajar* a `eslint@4.0.0` y `eslint-config-next@12.0.4`, que rompe D-18 y las reglas de T02.
- **Estado:** sin corregir (decisión del 2026-11-02). Reevaluar cuando haya una versión de ESLint 9 / `eslint-config-next` con `minimatch` ≥ 11.0.1, o al revisar D-18 después de la entrega. Si T05 pasa a bloquear `high`, esto no cambia.

### Riesgo conocido en T05: ESLint 9.39.5 sin soporte (2026-11-02)

`npm ci` avisa y `npm view eslint@9.39.5 deprecated` confirma: «This version is no longer supported». Es la última de la serie 9 fijada por D-18 (compatibilidad con Next 16 y `eslint-config-next`). **Riesgo aceptado:** es una herramienta de desarrollo y de CI, no llega al navegador ni a producción; ya no recibirá correcciones, lo que se suma a la advisory de `minimatch` de arriba. **Reevaluación:** la migración a ESLint 10 se decide después de la entrega (ver nota junto a D-18 en la sección 7 del plan). No se actualiza ahora.

## B1 · Contrato de datos y datos de prueba (5.5 h)

| # | Tarea | Implementa | Criterio de terminado | Est. h | Acum. | Reales | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T06 | `lib/catalogo/texto.ts`: normalización NFC, eliminación de controles, caracteres bidi y de ancho cero, colapso de espacios, corte a cota; variante que conserva `\n` y `\t` para snippets y descripciones. Tests Vitest. | AM-06, AM-07, MU-03, MU-04 | Tests pasan para: bidi (U+202A-202E, U+2066-2069), ancho cero, controles C0/C1, NFC, cortes exactos, snippet con saltos de línea intactos. | 0.75 | 5.75 | no medido | [x] |
| T07 | `lib/catalogo/enlaces.ts`: `validarUrlRepo` con `new URL()`, `https`, hostname exactamente `github.com`, sin credenciales ni puerto. Tests Vitest. | AM-03, MU-08, RF-02 (e) | Pasan todos los casos de 6.1: válido `https://github.com/o/r`; inválidos `http://`, `javascript:`, `data:`, `github.com.evil.io`, `githuh.com`, `evil.io/?github.com`, con credenciales, con puerto, vacío. | 0.5 | 6.25 | no medido | [x] |
| T08 | `lib/catalogo/contrato.ts`: esquemas zod de Herramienta (lista y detalle) e Idea con las reglas de 4.2: identidad inválida → omitir, métricas → `null`, licencia → `null`, `revisada` falla cerrado, `snippetExcedeLimite`, máximo de ideas, `omitidas`. Tipos exportados desde el esquema. Tests Vitest. | AM-10, AM-05, AM-04, MU-09, MU-12, RF-05 (f, g), R-11 | Un test por cada regla de la tabla 4.2 con un valor inválido. `revisada` con `"true"`, `1`, `null`, `{}` → `false`. Un snippet de 4 001 caracteres marca `snippetExcedeLimite`. Una herramienta sin categorías válidas se omite. | 1.75 | 8 | no medido | [x] |
| T09 | `lib/catalogo/repositorio.ts`: interfaz `RepositorioCatalogo` (solo lectura), `ErrorCatalogo` con mensaje genérico, selección por `CATALOG_SOURCE` **sin valor por defecto en producción**. Suite de contrato de adaptador reutilizable. | P5, P3, AM-13, RNF-02 | Arrancar en modo producción sin `CATALOG_SOURCE` falla con error claro. La interfaz no tiene ningún método de escritura. La suite de contrato corre y está lista para que la usen todos los adaptadores. | 0.75 | 8.75 | no medido | [x] |
| T10 | `scripts/generar-dataset.mjs` (PRNG con semilla fija) + `data/sintetico.json` + adaptador sintético. | Spec §9 (dataset), RNF-07, RF-01, RNF-13 | 150 herramientas. Cumple la distribución mínima de 4.6 (6 categorías, ≥ 15 con 2 categorías, ≥ 8 lenguajes, ≥ 6 licencias, 3 niveles, ≥ 5 sin licencia, ≥ 10 sin descripción, ≥ 20 sin ideas, ideas revisadas y no revisadas). Salida validada con `contrato.ts` **desde un test de Vitest** que corre en CI (sin `tsx` ni dependencias nuevas; el script `.mjs` no importa TypeScript). Re-ejecutar el script no cambia el archivo. **MVP:** dataset sintético reducido (≥ 30 herramientas, misma variedad de casos); ya no se exigen 150 (RNF-07 fuera). | 0.75 | 9.5 | no medido | [x] |
| T11 | `tests/fixtures/mu.json` (MU-01 a MU-12 + casos borde) y modo `CATALOG_SOURCE=fixtures` (sintético + fixtures, y `mu-forzar-error`). Correr la suite de contrato del adaptador contra `mu.json`. | MU-01..12, Spec §9 (fixtures), AM-10 | Cada MU tiene al menos un fixture con `mu` y `esperado`. Hay casos borde de: campos faltantes, categoría vacía, valores fuera de rango, tipos incorrectos, descripción de 300 KB, 500 disparadores, `id` con caracteres especiales, una herramienta sin licencia. La suite de contrato pasa: ningún campo inválido sale del adaptador. **MVP:** 6 fixtures (XSS, bidi, enlace malicioso, payload grande, tipos inválidos, revisada); el resto de MU se cubre en Vitest. | 1 | 10.5 | no medido | [x] |

## B2 · Base visual (1.5 h)

| # | Tarea | Implementa | Criterio de terminado | Est. h | Acum. | Reales | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TI1 | **Integrar la tanda UI-1** (PR de `ui/astra-v1`: tokens y escala en `globals.css`, fuentes con `next/font`, `Cabecera`, `PresentacionCatalogo`, `EstadoVacio`, `EstadoError`, `EstadoNoEncontrado`). Revisar el PR contra el checklist de `ui-brief.md` §10 y los controles (lint de T02, `tsc`, Gitleaks); aceptar solo los archivos que el brief permite; sumar las claves nuevas a `i18n/es.ts`; ajustar nombres de tipos al contrato; recibir `demo/demo-ui/page.tsx` fuera de `src/app` y definir su montaje solo en desarrollo, sin ruta `/demo-ui` en producción. Cabecera y portada a revisión visual de Jerónimo (RNF-18); casos extremos en sección separada de la demo. | D-19, D-11, D-14, RNF-15, RNF-16 (1.4.3, 1.4.11), RNF-17, P9 | `package.json` y lockfile sin cambios respecto de la tabla 3. Lint, `tsc` y build pasan. El contraste de cada par de tokens queda comentado junto al token (≥ 4.5:1 texto, ≥ 3:1 controles). Las fuentes salen de `/_next/static`. Con el sistema en claro y en oscuro la interfaz se ve clara. Toda violación del checklist §10 se devuelve al PR con el motivo. axe completo es T31 (ver nota de «Reglas del brief»). **MVP:** UI hecha por Claude Code integrando los componentes de Codex, en una sola pasada y sin ciclo de PR por tanda; el checklist del brief §10 se aplica igual. | 0.75 | 11.25 | no medido | [x] |
| T12 | Base técnica del tema: `color-scheme: light` fijo (sin selector ni proveedor de tema), variables de `next/font` conectadas en el layout raíz y comprobación de que no hay recursos de terceros. *(Valores de tokens, escala tipográfica y familias: del brief, entran en TI1.)* | RNF-15, D-11, D-14 | No existe control de tema. Con el sistema en claro y en oscuro el fondo calculado es blanco. En la pestaña Red no hay requests a dominios de fuentes de terceros. | 0.25 | 11.5 | no medido | [x] |
| T13 | Montar el layout raíz con `Cabecera`, la portada `PresentacionCatalogo` en la entrada del catálogo con destino interno real, y cablear el asistente: «Asistente — próximamente» (texto del diccionario) deshabilitado, sin `<input>` y sin requests. *(El diseño de la cabecera es del brief, entra en TI1.)* | Spec §9 (asistente), RF-01 (a), RNF-17 | El botón está deshabilitado: no hay `<input>` ni se hace ningún request al hacer clic. Sin logo, texto ni imagen de Mobbin. | 0.25 | 11.75 | no medido | [x] |
| T14 | Cablear `error.tsx` (mensaje genérico sin detalle interno y «Reintentar» con `reset`) y `not-found` con los componentes de estado de TI1. *(El aspecto de `EstadoVacio`/`EstadoError`/`EstadoNoEncontrado` es del brief.)* | RF-01 (d, e), RF-02 (d), AM-13 | `error` muestra un mensaje genérico y un botón «Reintentar» que funciona. `not-found` se ve en una ruta inexistente. `EstadoVacio` acepta título, texto y acción. | 0.25 | 12 | no medido | [x] |

> **Nota TI1 (2026-11-10):** `~/Desktop/codex-snapshot/` ya no existía; se usó `~/Downloads/openbridge-estado-actual-2026-11-09.zip` (mismo snapshot: su `frontend-mobbin.patch` coincide con el aplicado), y solo estas rutas: `src/components/catalogo/` (Cabecera, EstadoVacio, EstadoError, EstadoNoEncontrado), las claves de `src/i18n/es.ts`, la fuente de `src/app/layout.tsx` y `demo/demo-ui/page.tsx`. **El snapshot no traía** `PresentacionCatalogo` (UI-1) ni nada de UI-2: los escribe Claude Code según `ui-brief.md` §8. Los tokens y las clases `catalogo-*` de `globals.css` también son nuestros (ese archivo no estaba entre los autorizados). La demo se adaptó (portada y casos extremos en `<details>`); el chequeo de caracteres invisibles (R-14) ahora también cubre `demo/`.

## B3 · Catálogo por categoría (1.5 h)

| # | Tarea | Implementa | Criterio de terminado | Est. h | Acum. | Reales | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TI2 | **Integrar la tanda UI-2** (PR de `ui/astra-v1`: `TarjetaHerramienta`, `IndicadorSalud`, `GrillaHerramientas`, `NavCategorias`). Mismo procedimiento que TI1. Verificar con la demo local el aislamiento del texto externo (`bdi`/`unicode-bidi: isolate`, `overflow`, `line-clamp`). | D-19, RF-01 (c), RNF-13, AM-06, AM-12 | Sin dependencias nuevas; lint, `tsc` y build pasan. En la demo local, `<script>alert(1)</script>`, el nombre con bidi y la descripción enorme se ven como texto y no desordenan a las vecinas. El nivel de mantenimiento tiene texto además de color. Valores del brief que difieran del contrato (p. ej. `inactivo` vs `abandonado`) se ajustan al contrato. **MVP:** ver TI1. | 0.5 | 12.5 | no medido | [x] |
| T15 | `textoLicencia` (única fuente del texto de licencia) y conexión de `TarjetaHerramienta` a los tipos del contrato: `id` ASCII visible junto al nombre, `null` → «Sin dato». *(El aspecto de la tarjeta es del brief, entra en TI2.)* | RF-01 (c), RNF-13, AM-15, AM-06 | Test Vitest: sobre las 150 herramientas `textoLicencia` siempre devuelve texto no vacío y `null` → «Sin licencia declarada». La tarjeta muestra todos los campos; un campo `null` dice «Sin dato». Ningún texto externo se inserta como HTML. | 0.5 | 13 | no medido | [x] |
| T16 | `app/page.tsx` que obtiene los datos en el servidor vía el repositorio, `filtros.ts` con el filtro de categoría (T17 lo completa) y cableado de `NavCategorias` y `GrillaHerramientas` a sus props. *(El aspecto de ambos es del brief, entra en TI2.)* | RF-01 (a, b, d, e), D-09 | Las 6 categorías están visibles. Elegir una categoría muestra todas las herramientas que la incluyen, aunque tengan otras. Categoría sin herramientas muestra `EstadoVacio`. Si el repositorio falla se ve la página de error. | 0.5 | 13.5 | no medido | [x] |

## B4 · Filtros, búsqueda y estado en URL (3 h, incluye TI4)

| # | Tarea | Implementa | Criterio de terminado | Est. h | Acum. | Reales | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TI4 | **Integrar la tanda UI-4** (PR de `ui/astra-v1`: `PanelFiltros`, `Buscador`, `ChipsFiltros`; el `Buscador` sale de `Cabecera`). Mismo procedimiento que TI1; tipos exactos de `ui-brief.md` §8. | D-19, RF-03 (b, c, d), RF-04, D-08, D-16, RNF-10 | Sin dependencias nuevas; lint, `tsc` y build pasan. Todos los controles con `label`, `<select>` nativos, panel en `<details>` en pantallas chicas, sin `style`. Demo local a 360/768/1280 px sin scroll horizontal. **MVP:** ver TI1. | 0.5 | 14 | no medido | [x] |
| T17 | Completar `filtros.ts`: filtros combinados con AND, métrica `null` no cumple el filtro, búsqueda con `toLowerCase()`/`includes` sobre nombre y descripción, sin `RegExp`. Tests Vitest. | RF-03 (a, b), RF-04 (a, b, c), AM-02 | Tests: cada filtro por separado, una combinación, métricas `null`, categoría múltiple, búsqueda sin distinción de mayúsculas, entradas `.*[(` tratadas como texto literal. | 0.75 | 14.75 | no medido | [x] |
| T18 | `estado-url.ts`: parseo y serialización validada de `categoria`, `lenguaje`, `licencia`, `mantenimiento`, `stars`, `q` según 4.4. Tests Vitest. | RF-03 (e, f), MU-05, MU-06, AM-02 | Tests: cada parámetro inválido se ignora o se recorta según 4.4; parámetros repetidos toman el primero; `q` de 5 000 caracteres queda en 100; ida y vuelta serializar→parsear. | 0.75 | 15.5 | no medido | [x] |
| T19 | **Cableado** de `PanelFiltros`, `Buscador` y `ChipsFiltros` (TI4): opciones de lenguaje y licencia derivadas de los datos, stars mínimos, nivel de mantenimiento, contador, chips de filtros activos con quitar uno / todos y «Limpiar». *(El diseño es del brief, entra en TI4.)* | RF-03 (b, c, d), RF-04 (b, d, e), D-08, D-16, RNF-10 | Todos los controles tienen `label`. Los selects ofrecen solo valores presentes en los datos. Se ve la cantidad de resultados y los filtros activos; "Limpiar" restablece. Combinación sin resultados muestra `EstadoVacio` con la acción de limpiar. | 0.5 | 16 | no medido | [x] |
| T20 | Integración: estado en memoria ⇄ URL con `history.replaceState`; render inicial en el servidor desde `searchParams` validados; mensaje "sin resultados para «…»" como texto. | RF-03 (f), RF-04, MU-05, D-06 | Recargar o abrir un enlace con filtros muestra la misma selección. Cambiar un filtro no dispara una navegación (sin viaje al servidor). Una URL manipulada (categoría inexistente, `stars=-5`, `q=<svg onload=x>`) carga sin error y muestra el texto literal. | 0.5 | 16.5 | no medido | [x] |

## B5 · Ficha técnica e ideas de integración (2 h)

| # | Tarea | Implementa | Criterio de terminado | Est. h | Acum. | Reales | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TI3 | **Integrar la tanda UI-3** (PR de `ui/astra-v1`: `FichaHerramienta`, `IdeaIntegracion`, `BloqueSnippet`). Mismo procedimiento que TI1. Verificar con la demo local: snippet en `<pre><code>` sin enlaces, «Copiar» solo con `copiable`, aviso de no revisada pegado al bloque, insignia «Revisada» separada del contenido externo. | D-19, RF-02, RF-05, AM-03, AM-04, AM-05 | Sin dependencias nuevas; lint, `tsc` y build pasan. Ninguna URL dentro de un snippet es un enlace. `target="_blank"` siempre con `rel="noopener noreferrer"`. Un «✔ Revisada» dentro de los datos no produce la insignia. `demo-ui` no entra al build de producción. **MVP:** ver TI1. | 0.5 | 17 | no medido | [x] |
| T21 | Ruta `/herramientas/[id]`: validación estricta del `id`, `not-found` si no existe, y props a `FichaHerramienta` con `urlRepo` solo si `validarUrlRepo` lo acepta (si no, `null`). Fecha de métricas, categorías y «Sin dato» donde falte. *(El aspecto de la ficha es del brief, entra en TI3.)* | RF-02 (a-e), RNF-13, AM-03, AM-16, MU-08 | La ficha se recarga en su propia dirección. Una ficha sin licencia dice «Sin licencia declarada». Un `id` inválido o inexistente muestra `not-found`. Con URL inválida no aparece enlace. El enlace válido tiene `target` y `rel` correctos. | 0.5 | 17.5 | no medido | [x] |
| T22 | Mapear cada idea del contrato a las props de `IdeaIntegracion`/`BloqueSnippet`: `revisada` solo desde el booleano, `copiable = !snippetExcedeLimite`, aviso de no revisada, estado «sin ideas» y «Sin dato» en campos faltantes. *(El aspecto es del brief, entra en TI3.)* | RF-05 (a, c, d, e, f, g), AM-04, AM-05, MU-02, MU-12 | Ninguna URL dentro de un snippet es un enlace. La insignia depende solo del booleano `revisada`. Una herramienta sin ideas muestra el estado vacío. Un campo faltante dice «Sin dato». | 0.5 | 18 | no medido | [x] |
| T23 | Botón "Copiar": copia exactamente el texto del snippet, muestra "Copiado" en el propio botón, aviso de no revisada pegado al botón, deshabilitado si `snippetExcedeLimite` (con aviso de snippet demasiado largo). | RF-05 (b), AM-04, MU-04, MU-10 | Lo copiado es idéntico al snippet mostrado. Con un snippet largo no hay botón de copiar y se ve el aviso. Una idea no revisada muestra el aviso junto al botón. | 0.5 | 18.5 | no medido | [x] |

### ⛳ CHECKPOINT tras B5

Acumulado planificado: **18.5 h** (MVP 2026-11-10; antes 28.25 h) hasta T23 incluida TI4. El umbral de 35 h de abajo es de la versión anterior: con el MVP no aplica y se usa el orden de plan 8.7. Sumar la columna "Reales" de T01-T23 **y TI1-TI4** y anotarla acá.

| Horas reales acumuladas (T01-T23 y TI1-TI4) | Decisión |
| --- | --- |
| **≤ 35 h** | Seguir con B6. |
| **> 35 h** | Aplicar el orden de recorte del plan 8.5, **en ese orden**: (1) RNF-17b ya está fuera; (2) posponer B9 (T36-T38) y dejar RNF-02 "pendiente de verificación"; (3) evaluar RF-04 búsqueda; (4) último recurso, pasar `teclado.spec` (T30) a revisión manual y bajar axe (T31) a 3 estados, informándolo en esta tabla. **Nunca** se recortan P3, P4, P5, P6, RF-01/02/03/05, B1, B6 ni `mu.spec`. |

Horas reales acumuladas: ______ · Decisión: ______ · Fecha: ______

## B6 · Cabeceras de seguridad y CSP (2.5 h; T25 opcional)

| # | Tarea | Implementa | Criterio de terminado | Est. h | Acum. | Reales | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T24 | `next.config.ts`: headers estáticos (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`, HSTS, `Cross-Origin-Opener-Policy`) y `poweredByHeader: false`. | AM-11, AM-13, RNF-04, R-13 | `curl -I` contra el build de producción muestra todos los headers de 5.2 y no muestra `X-Powered-By`. | 0.5 | 19 | no medido | [x] |
| T25 | `proxy.ts`: CSP con nonce por request (sin `unsafe-inline` ni `unsafe-eval` en `script-src` en producción; `unsafe-eval` solo en `development`). Aplicar el nonce a los scripts de Next. Navegar `/` y una ficha sin violaciones. | AM-01, AM-11, AM-12, RNF-04, R-07, R-13, D-05 | En el build de producción, `/` y una ficha cargan y funcionan (filtros, copiar) con **0 violaciones de CSP** en la consola. El nonce cambia entre dos requests. La CSP coincide con la de 5.2. **MVP:** opcional, timebox hasta el miércoles 11/11. Si no entra: headers estáticos de T24 y riesgo aceptado en plan 5.3 (plan 8.7). | 1.5 | 20.5 | no medido | [x] |
| T26 | Verificaciones de CI: `grep` que falla si aparece `dangerouslySetInnerHTML` en `src/` o `SUPABASE_SERVICE_ROLE_KEY`, `GITHUB_TOKEN`, `LLM_` en `apps/web/src` y en `.next/static`. | RNF-02, AM-01, AM-09, R-01 | El paso de CI está en `web.yml` y falla cuando se planta cualquiera de esas cadenas (probado en una rama descartable); pasa en limpio. | 0.5 | 21 |  | [ ] fuera del cierre: el paso de `grep` no está en `web.yml`; lo cubren en parte `react/no-danger` y Gitleaks |

## B7 · Pruebas E2E (2 h; solo `mu.spec` con 6 fixtures y `headers.spec`)

| # | Tarea | Implementa | Criterio de terminado | Est. h | Acum. | Reales | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T27 | `mu.spec` (parte 1): recorrer `mu.json` con la guarda común en grilla y ficha: falla ante `dialog`, violación de CSP en consola, request a otro host o elementos inesperados (`<script>`, `<img>`, `<svg>`) donde debería haber texto. | MU-01..12, RNF-04, R-07 | Corre contra el build de producción. Cada fixture de MU-01 a MU-12 pasa la guarda. Se comprueba que la guarda **detecta** un caso (inyectando a propósito un `<img>` en una prueba temporal que se borra). **MVP:** solo 6 fixtures (ver T11). | 1 | 22 | no medido | [x] |
| T28 | `mu.spec` (parte 2): aserciones específicas de 6.2: texto literal con `<` `>` visible (01, 05, 11); sin `<a>` en `<pre>` y copiar exacto con aviso (02, 10); snippet largo sin copiar (04); 5 URLs manipuladas (06); enlaces al repo (08); inválidos omitidos o "Sin dato" (09); "✔ Revisada" falso no quita el aviso (12); ficha sin licencia (RNF-13). | MU-02, 04, 05, 06, 08, 09, 10, 11, 12, RNF-13 | Todas las aserciones pasan. MU-07 **no** está en este archivo (ver T37). **MVP:** solo las aserciones de las 6 fixtures; el resto en Vitest. | 0.5 | 22.5 | no medido | [x] |
| T29 | `headers.spec`: headers de 5.2 en `/` y en una ficha; CSP sin `unsafe-eval` ni `unsafe-inline` en `script-src`; nonce distinto entre dos requests. Más: con `colorScheme: 'light'` y `'dark'` el fondo es blanco y no hay control de tema; el botón del asistente está deshabilitado y no genera requests. | R-13, AM-11, RNF-15, Spec §9 (asistente) | Pasa. Si se quita un header de `next.config.ts`, la prueba falla (verificado una vez y revertido). **MVP:** si T25 no entra, las aserciones de CSP se ajustan a lo emitido. | 0.5 | 23 | no medido | [x] |
| T30 | `teclado.spec`: guion solo con teclado (categoría → filtro → quitar filtro → búsqueda → abrir ficha → copiar snippet → volver) con foco visible en cada parada y sin trampa de foco. | RNF-16 (2.1.1, 2.1.2, 2.4.3, 2.4.7) | Pasa. En cada paso el elemento enfocado tiene un contorno de foco calculado distinto de `none`. `Tab` recorre la página hasta salir. **FUERA DEL MVP (2026-11-10):** el teclado se revisa a mano en T34. | 0 (antes 1.25) | 23 |  | [ ] fuera del MVP (2026-11-10) |
| T31 | `a11y.spec`: axe sobre los 5 estados del spec (grilla, panel de filtros abierto, ficha con ideas, estado vacío, estado de error con `mu-forzar-error`). Bloquean las violaciones con etiquetas `wcag143`, `wcag1411`, `wcag211`, `wcag212`, `wcag243`, `wcag247`, `wcag332`, `wcag412`, `wcag311`; el resto se lista. | RNF-16, D-17 | El spec corre y **imprime** el conteo de violaciones en alcance y fuera de alcance por estado (se copian a la tabla de validación). Se confirma que bloquea: se planta una violación en alcance (p. ej. un botón sin nombre) y falla. **FUERA DEL MVP (2026-11-10):** sin axe; RNF-16 por revisión manual. | 0 (antes 1.75) | 23 |  | [ ] fuera del MVP (2026-11-10) |
| T32 | `rnf07.spec`: con las 150 herramientas, 20 repeticiones alternando un cambio de filtro y un texto de búsqueda; mide con `performance.now()` + `MutationObserver` hasta que la grilla refleja el resultado. | RNF-07, AM-07, R-12 | Imprime mínimo, mediana y máximo reales. Pasa si el máximo es < 1000 ms. Los números y la limitación (una máquina, sin limitar CPU) se copian a la tabla de validación. **FUERA DEL MVP (2026-11-10):** RNF-07 pendiente de verificación. | 0 (antes 1.0) | 23 |  | [ ] fuera del MVP (2026-11-10) |

## B8 · Revisión manual (1 h; axe fuera del MVP)

| # | Tarea | Implementa | Criterio de terminado | Est. h | Acum. | Reales | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T33 | Corregir **todo lo que corresponda a los criterios de RNF-16** (hallazgos de axe y de la prueba de teclado) hasta tener 0 bloqueantes. Lo que esté fuera de alcance solo se registra, sin corregirlo. | RNF-16 | `a11y.spec` y `teclado.spec` en verde. Los hallazgos fuera de alcance quedan listados en la tabla de validación (RNF-16). **Si T33 supera 2 h reales, cuenta para el checkpoint:** se vuelve a evaluar el orden de recorte de 8.5 con las horas reales acumuladas a esa fecha. *Es la tarea más variable: depende de lo que encuentre T31.* **FUERA DEL MVP (2026-11-10):** depende de T31. | 0 (antes 1.0) | 23 | Pendiente (fuera del MVP) | [ ] fuera del MVP (2026-11-10) |
| T34 | Revisión manual de 6.3: grilla, panel de filtros y una ficha a 360, 768 y 1280 px **con las fixtures MU-03/MU-04 cargadas**; 10 min de teclado a mano; revisión visual en claro con el sistema en ambos modos; confirmar `react/jsx-no-literals` sin hallazgos y `lang="es"`. | RNF-10, RNF-15, RNF-16, RNF-17, MU-03, MU-04 | Aprobación visual de Jerónimo de cabecera, portada y catálogo (RNF-18, spec §1.2). Resultado escrito en la tabla de validación para cada punto: sin scroll horizontal, textos largos o bidi contenidos en su tarjeta, sin elementos sin estilo. **MVP:** incluye la revisión manual de teclado/foco que sustituye a T30/T31. | 1 | 24 |  | [ ] pendiente: revisión manual de Jerónimo no registrada |

## B10 · Cierre documental (0.75 h)

| # | Tarea | Implementa | Criterio de terminado | Est. h | Acum. | Reales | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T35 | Completar la tabla de validación con evidencia real, registrar las limitaciones de 8.3, escribir un README breve de `apps/web` (cómo correr, variables, `CATALOG_SOURCE`) y revisar que `.env.example`, SRS y matriz estén al día. Abrir el PR con `.github/pull_request_template.md`. | P7, P10, RNF-11 | Cada fila de "Validación" tiene resultado y evidencia o dice explícitamente "pendiente" con motivo. El PR referencia RF/RNF y riesgos. | 0.75 | 24.75 | no medido | [x] 2026-11-13: validación completa con evidencia; README en la raíz (incluye `apps/web`); `.env.example`, SRS y matriz al día |

## B9 · Datos reales — FUERA DEL MVP 2026-11-10 (antes 3 h, 🔒 bloqueado)

> **No empezar hasta que se cumplan las dos condiciones** (plan 2.4). Mientras tanto la feature se entrega con el dataset sintético; RNF-02 **no se declara verificado** sin T37.
>
> - [ ] **Ángel validó el contrato de la sección 4.1 del spec** (incluye la escala del health score, los tres niveles de mantenimiento, la URL del repo, el estado de revisión y los valores de dificultad). Fecha: ______
> - [ ] **Ángel tiene RLS activo:** lectura pública del catálogo y escritura solo con el rol de servicio. Fecha: ______

| # | Tarea | Implementa | Criterio de terminado | Est. h | Acum. | Reales | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T36 | Adaptador Supabase: `fetch` envuelto que **solo permite `GET`** contra la API de lectura, mapeo al contrato 4.1, paso por `contrato.ts`, límite de tamaño de respuesta, *timeout* y errores genéricos. | RF-01..05, RNF-02, AM-07, AM-08, AM-13, D-03 | La suite de contrato de T09 pasa con este adaptador. Test: el wrapper lanza error ante cualquier método distinto de `GET`. Con `CATALOG_SOURCE=supabase` la app lista herramientas del entorno de Ángel. Una respuesta mayor al límite se aborta. **FUERA DEL MVP (2026-11-10).** | 0 (antes 1.75) | 24.75 |  | [!] |
| T37 | Script de integración MU-07: `POST`, `PATCH` y `DELETE` con la clave pública deben ser rechazados. Registrar el resultado. | RNF-02, AM-08, MU-07, R-05 | Las tres operaciones devuelven error de autorización; la evidencia (comandos y respuestas, **sin la clave**) queda en la tabla de validación. Recién entonces RNF-02 puede marcarse verificado. **FUERA DEL MVP (2026-11-10).** | 0 (antes 0.75) | 24.75 |  | [!] |
| T38 | Prueba con datos reales: recorrer el catálogo real, revisar el log de `omitidas` y ajustar el contrato (con Ángel y pasando primero por el spec si cambia el alcance) si difiere de 4.1. | RF-01..05, AM-10, R-11 | Catálogo real visible sin errores. `omitidas` revisado y explicado. Diferencias con 4.1 registradas en el spec. **FUERA DEL MVP (2026-11-10).** | 0 (antes 0.5) | 24.75 |  | [!] |

## Resumen de horas

Recorte MVP 2026-11-10 (plan 8.7). Entrega y exposición: viernes 13/11.

| Bloque | Plan MVP (h) | Antes (h) | Reales (h) |
| --- | --- | --- | --- |
| B0 | 5.0 | 5.0 | |
| B1 (objetivo ≤ 6 h, hoy) | 5.5 | 7.5 | |
| B2 | 1.5 | 2.5 | |
| B3 | 1.5 | 3.0 | |
| B4 | 3.0 | 5.5 | |
| B5 | 2.0 | 4.75 | |
| *Toda la UI, B2-B5 (objetivo ≤ 8 h, mañana)* | *8.0* | *15.75* | |
| *Checkpoint (T01-T23 y TI1-TI4)* | *18.5* | *28.25* | |
| B6 | 2.5 | 3.0 | |
| B7 | 2.0 | 7.0 | |
| B8 | 1.0 | 2.0 | |
| B10 | 0.75 | 1.0 | |
| **Total MVP** | **24.75** | 41.25 | |
| B9 | fuera | 3.0 | |

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
feat(web): integrar tanda UI-2 del brief (TI2, D-19)
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
| Existe un script que genera 150 herramientas sintéticas que respetan el contrato de 4.1, con ideas revisadas y no revisadas y herramientas en varias categorías. | Cumple con recorte MVP | `scripts/generar-dataset.mjs` determinista (test «re-ejecutar no cambia el archivo»); genera **40** herramientas (recorte MVP 2026-11-10, antes 150) que pasan el contrato sin omitidas (`dataset.test.ts`). |
| Existe un archivo de fixtures separado con los payloads de MU-01 a MU-12 y los casos borde (campos faltantes, al menos una herramienta sin licencia, categoría vacía, valores fuera de rango). | Cumple parcial | `tests/fixtures/mu.json` con 6 fixtures (MU-01, 03, 04, 08, 09, 12) y casos borde; el resto de MU se prueba con Vitest o E2E propios (ver detalle por MU). |
| La sección 4.1 fue validada con Ángel antes de empezar las tareas que consumen datos reales. | Pendiente (Ángel) | B9 fuera del MVP; la demo usa `CATALOG_SOURCE=reales` (feature 002), que pasa por el mismo `contrato.ts`. |
| RF-01 a RF-05 cumplen sus criterios de aceptación con el conjunto de prueba. | Cumple | Ver detalle por RF. |
| RNF-02, RNF-04, RNF-07, RNF-10, RNF-13, RNF-15 y RNF-16 verificados según la sección 5, con resultados reales registrados en `tasks.md`. | Cumple parcial | RNF-04, RNF-13 y RNF-15 cumplen; RNF-02, RNF-07, RNF-10 y RNF-16 pendientes (ver detalle por RNF). |
| RNF-17: todos los textos de la interfaz están en el diccionario y la interfaz se entrega en español. El inglés no es requisito para cerrar la feature. | Cumple | Lint `react/jsx-no-literals` en verde en CI; `i18n.test.ts`; `<html lang="es">` en `layout.tsx`. |
| Los casos MU-01 a MU-12 se probaron con datos de prueba y dieron el resultado esperado. | Cumple, salvo MU-07 | 11 de 12 con prueba automática en verde; MU-07 pendiente de B9 (ver detalle por MU). |
| El punto de entrada al asistente RAG se ve como un elemento deshabilitado "Asistente — próximamente": no acepta texto, no envía nada y no llama a ningún servicio. | Reemplazado por 002 | La feature 002 habilitó el asistente (RF-11); `headers.spec.ts` prueba ahora que el botón abre el panel y no hace pedidos hasta enviar. |
| La interfaz no usa marca, textos ni imágenes de Mobbin. | Cumple | `grep -ri mobbin apps/web/src` sin resultados (2026-11-13). |
| Sin secretos en el repo; secret scanning en verde. | Cumple | Gitleaks en CI en verde en todos los PR; un falso positivo triado por fingerprint (SECURITY.md). |
| Todas las preguntas de la sección 8 respondidas y reflejadas en este spec. | **Cumple** | `spec.md` §8: las 10 respuestas registradas (2026-10-30) y decisiones finales aprobadas. |

### Detalle por requisito funcional

| RF | Tareas | Prueba | Resultado | Evidencia |
| --- | --- | --- | --- | --- |
| RF-01 Catálogo por categoría | T14, T15, T16 | Manual + `mu.spec` | Cumple | `filtros.test.ts`, `ficha.spec.ts`, `humo.spec.ts`; CI de PR #2 (run 42855548417) y de PR #4 (run 43435799012), en verde. |
| RF-02 Ficha técnica | T21 | `mu.spec`, T34 | Cumple | `ficha.test.tsx`, `ficha.spec.ts`; CI de PR #2 (run 42855548417) y de PR #4 (run 43435799012), en verde. |
| RF-03 Filtros | T17, T18, T19, T20 | Vitest + `rnf07.spec` | Cumple | `filtros.test.ts`, `filtros-ui.test.tsx`, `estado-url.test.ts`, `filtros-url.spec.ts`; CI de PR #2 (run 42855548417) y de PR #4 (run 43435799012), en verde. |
| RF-04 Búsqueda | T17, T19, T20 | Vitest + `mu.spec` (MU-05) | Cumple | `filtros.test.ts`, `filtros-ui.test.tsx`, `filtros-url.spec.ts`; CI de PR #2 (run 42855548417) y de PR #4 (run 43435799012), en verde. |
| RF-05 Ideas de integración | T22, T23 | `mu.spec` | Cumple | `ideas-mapeo.test.tsx`, `copiar.spec.ts`, `mu.spec.ts` (MU-12); CI de PR #2 (run 42855548417) y de PR #4 (run 43435799012), en verde. |

### Detalle por requisito no funcional

| RNF | Tareas | Prueba (spec §5) | Resultado | Evidencia (valores reales) |
| --- | --- | --- | --- | --- |
| RNF-02 | T09, T26, T36, T37 | Revisión de código + CI + MU-07 | Pendiente (B9) | Por construcción el puerto `RepositorioCatalogo` no tiene métodos de escritura; MU-07 (escritura con la clave pública) no se probó porque Supabase quedó fuera del MVP. |
| RNF-04 | T02, T08, T25, T27, T28 | `mu.spec` | Cumple | `mu.spec.ts` (guarda común + MU-01, 03, 04, 08, 09, 12), `headers.spec.ts` (CSP con nonce, sin `unsafe-*` en `script-src`), lint `react/no-danger`; en 002, `asistente-panel.test.tsx` con payload XSS. |
| RNF-07 | T10, T32 | `rnf07.spec` | Pendiente (fuera del MVP) | T32 (`rnf07.spec`) no se implementó: recorte 2026-11-10. Sin medición, no se declara (P7). |
| RNF-10 | T19, T34 | Revisión manual a 360/768/1280 px | Pendiente (revisión manual) | T34 no se registró. Playwright solo prueba escritorio. |
| RNF-13 | T15, T21, T28 | Vitest (150) + `mu.spec` + revisión | Cumple | `licencia.test.ts`, `ficha.test.tsx`, `mu.spec.ts`; licencia «Sin dato» visible cuando falta. |
| RNF-15 | T12, T29, T34 | `headers.spec` + revisión | Cumple | `headers.spec.ts`: fondo blanco y sin control de tema con el sistema en claro y en oscuro. |
| RNF-16 | T30, T31, T33, T34 | axe + teclado + revisión manual | | Violaciones en alcance por estado: ___ · fuera de alcance (lista): ___ |
| RNF-17 | T02, T34 | Lint `jsx-no-literals` + `lang="es"` | Cumple | Lint `jsx-no-literals` en CI + `i18n.test.ts` + `lang="es"`. |

### Detalle por caso de mal uso

| MU | Prueba | Tareas | Resultado | Evidencia |
| --- | --- | --- | --- | --- |
| MU-01 | `mu.spec` | T11, T27, T28 | Cumple | `mu.spec.ts`, `contrato.test.ts`. |
| MU-02 | `mu.spec` | T22, T28 | Cumple | `mu.spec.ts`, `ideas-mapeo.test.tsx`. |
| MU-03 | Vitest `texto` + revisión manual | T06, T34 | Cumple | `mu.spec.ts`, `fixtures-mu.test.ts` (aspecto visual: revisión manual pendiente). |
| MU-04 | `mu.spec` + revisión manual | T06, T23, T28 | Cumple | `mu.spec.ts`, `copiar.spec.ts`, `contrato.test.ts`. |
| MU-05 | Vitest `estado-url` + `mu.spec` | T18, T20, T28 | Cumple | `estado-url.test.ts`, `filtros-url.spec.ts`. |
| MU-06 | Vitest + `mu.spec` (5 URLs) | T18, T28 | Cumple | `estado-url.test.ts` (sin E2E de las 5 URLs). |
| MU-07 | Script de integración | T37 | **Pendiente** (B9) | Supabase fuera del MVP; sin prueba de escritura con la clave pública. |
| MU-08 | Vitest `enlaces` + `mu.spec` | T07, T21, T28 | Cumple | `enlaces.test.ts`, `ficha.spec.ts`, `mu.spec.ts`. |
| MU-09 | Vitest `contrato` + `mu.spec` | T08, T28 | Cumple | `mu.spec.ts`, `fixtures-mu.test.ts`. |
| MU-10 | `mu.spec` | T23, T28 | Cumple | `copiar.spec.ts`. |
| MU-11 | `mu.spec` | T27, T28 | Cumple | `mu.spec.ts` («MU-01: XSS y Markdown/HTML con imagen remota se ven como texto literal»). |
| MU-12 | Vitest `contrato` + `mu.spec` | T08, T22, T28 | Cumple | `mu.spec.ts`, `contrato.test.ts`, `ficha.test.tsx`. |

### Limitaciones a registrar (plan 8.3, P7)

Se completa con lo que realmente ocurra; no se omite ninguna.

| Limitación | Estado real |
| --- | --- |
| Aislamiento visual de MU-03/04 verificado a ojo, no automáticamente | Ocurrió: solo hay guarda automática de que todo es texto; la revisión a ojo (T34) no se registró. |
| RNF-07 medido en una máquina y sin limitar la CPU | No aplica: RNF-07 no se midió. |
| RNF-13 no recorre 150 fichas renderizadas | Ocurrió: se prueba con fixtures y la ficha de ejemplo, no las 40 fichas renderizadas. |
| RNF-10 es revisión manual | Ocurrió y la revisión quedó pendiente. |
| Menor profundidad en teclado y axe que la versión sin recortes | Ocurrió: sin teclado automatizado ni axe (T30, T31 fuera del MVP). |
| Hallazgos de axe fuera de alcance de RNF-16 (lista) | No hay lista: axe no se corrió. |

### Validación visual RNF-18 (revisión 2026-11-02)

- [ ] TI1: cabecera y portada revisadas por Jerónimo contra la referencia.
- [ ] TI2–TI4: composición del catálogo y detalle revisada por Jerónimo en cada integración.
- [ ] T34: evidencia a 360/768/1280 px, tema claro bajo ambas preferencias del sistema y aprobación visual de Jerónimo.
- [ ] Reestimar incremento de portada y revisión visual; conciliar plan y tareas.

**Estado (2026-11-13):** pendiente. La aprobación visual de Jerónimo (T34) no quedó registrada; no se declara RNF-18 cumplido. No se reutiliza la validación de la UI oscura anterior.
