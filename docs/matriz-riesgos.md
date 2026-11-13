# Matriz de riesgos — OpenBridge

**Versión:** 0.1 · **Fecha:** 2026-10-30 · Escala 1–3; nivel = probabilidad × impacto (≥ 6 alto).
Funciones NIST CSF 2.0: GV Gobernar · ID Identificar · PR Proteger · DE Detectar · RS Responder · RC Recuperar.
OWASP: A0x = Top 10 web (edición 2021) · LLM0x = Top 10 para LLM (2025). Si adoptamos la edición web 2025, se renumera.

| ID | Riesgo | P | I | Nivel | Control | Requisito | Prueba | CSF | OWASP |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-01 | Filtración del token de GitHub o API key del LLM | 2 | 3 | 6 | Env vars, Gitleaks en CI, push protection, rotación. Falsos positivos solo por fingerprint en `.gitleaksignore`, verificados y registrados en SECURITY.md (2026-11-10: token ficticio de `test_sanitizer.py:86`) | RNF-01 | CI verde; runbook en SECURITY.md | PR, RS | — |
| R-02 | Prompt injection indirecta vía README de un repo | 2 | 3 | 6 | Separar datos de instrucciones (`<datos_no_confiables>` + reglas en el system prompt), neutralizar delimitadores en datos y consulta, salida con esquema JSON validado con zod | RNF-03 | `docs/red-team.md` (MU-13, MU-18, MU-19) + test del prompt con repo envenenado. 2026-11-12: 9/10 bloqueados; **MU-19 abierto** (la justificación obedeció un role-play, sin fuga ni ejecución) | PR, ID | LLM01 |
| R-03 | El asistente recomienda repos inexistentes o abandonados | 3 | 2 | 6 | Grounding solo en el índice: ids fuera del índice se descartan; sin repos válidos → «sin contexto»; nombres y enlaces salen del índice, nunca del modelo. Umbral de health score: pendiente de 003 | RNF-09 | `docs/red-team.md` (MU-15) + `asistente-nucleo.test.ts` | PR | LLM09 |
| R-04 | Abuso del endpoint del asistente (costo, DoS) | 2 | 2 | 4 | 10/min por IP + tope global de 60/min, cuerpo ≤ 4 KB, consulta ≤ 500, timeout de 60 s a Ollama. Residual: `X-Forwarded-For` falsificable fuera de un proxy de confianza (lo acota el tope global) | RNF-05, RNF-20 | Test 429 (`asistente-route.test.ts`) + MU-22 | PR, DE | LLM10 |
| R-05 | Escritura no autorizada en la BD con la anon key | 2 | 3 | 6 | RLS, rol de servicio solo en el pipeline | RNF-02 | Intento de escritura falla | PR | A01 |
| R-06 | Rate limit de GitHub deja datos desactualizados | 3 | 1 | 3 | Backoff, requests condicionales, GraphQL por lotes | RNF-06, RNF-08 | Corrida completa | PR, RC | — |
| R-07 | XSS por descripciones/snippets de GitHub o salida del LLM | 2 | 3 | 6 | Render como texto, sin HTML crudo, CSP, links con allowlist; en el asistente además se quitan URLs y etiquetas de la salida y los enlaces son solo a `/herramientas/{id}` | RNF-04 | Fixtures MU-01..12 (001); MU-16, MU-17 (002) | PR | A03 / LLM05 |
| R-08 | Recomendar librería con licencia incompatible o sin mantenimiento | 2 | 2 | 4 | Licencia visible, nivel de mantenimiento | RNF-13 | Revisión de fichas | GV, ID | — |
| R-09 | Dependencia vulnerable en nuestro proyecto | 2 | 2 | 4 | Dependabot, npm audit | RNF-14 | 0 críticas abiertas | PR | A06 |
| R-10 | Un integrante no puede seguir (equipo ya bajó a 2) | 2 | 3 | 6 | Repo documentado, specs, tareas chicas | RNF-11 | — | GV | — |
| R-11 | Backend o pipeline entrega datos malformados o envenenados que rompen o engañan a la interfaz (incluye una idea no revisada que se hace pasar por revisada) | 2 | 2 | 4 | Validación zod en la frontera del adaptador, datos inválidos → "Sin dato" u omisión con log, `revisada` falla cerrado (solo `true` estricto cuenta) | RNF-04 | Fixtures MU-09, MU-12 (001) | PR, DE | A08 / A04 |
| R-12 | Payload desmedido (descripciones o listas enormes) degrada el navegador o el filtrado | 2 | 1 | 2 | Cotas de longitud y cantidad en el contrato, truncado con indicación, límite de tamaño y timeout en el adaptador | RNF-07 | Fixtures MU-04 + medición RNF-07 (001) | PR | A04 |
| R-13 | Cabeceras de seguridad ausentes o debilitadas por un cambio de configuración (CSP, frame-ancestors, nosniff) | 2 | 2 | 4 | Prueba E2E de cabeceras contra el build de producción en cada PR | RNF-04 | Test de cabeceras (001) | PR, DE | A05 |
| R-14 | Trojan Source: caracteres invisibles (bidi y de ancho cero) en el código fuente introducidos por un agente de IA, que hacen que el código se vea distinto de lo que ejecuta (CVE-2021-42574) | 2 | 3 | 6 | Dos capas: hook local `.githooks/pre-commit` (rechaza el commit con el contenido en staging) y chequeo de CI `check:invisibles` sobre `apps/web/src`, `tests` y `scripts` (falla ante cualquier carácter crudo); escapes `\uXXXX` en el código; `texto.ts` los elimina de los datos externos | — | Paso de CI probado plantando U+202E, U+FEFF y U+200B (2026-11-10); hook probado plantando U+202E en un archivo staged: commit rechazado | PR, DE | A08 |
| R-15 | Fuga del system prompt del asistente | 2 | 2 | 4 | Canario en el prompt; salida con el canario o fragmentos del prompt se descarta; el prompt no contiene secretos | RNF-19 | MU-14 + test unitario | PR, DE | LLM07 |
| R-16 | El modo sin guardrails del red-team queda activo en producción | 1 | 3 | 3 | `REDTEAM_SIN_GUARDRAILS` se ignora con `NODE_ENV=production`; el script se niega a correr en producción | RNF-21 | Test de configuración y del handler | PR | A05 |

R-11 a R-13 agregados el 2026-10-30 desde el plan 001 (P y I son mi estimación inicial; revisar con Ángel).

**R-14 (2026-11-10), incidente real:** al escribir `texto.ts` (T06), el agente de IA insertó en el código fuente caracteres bidi y de ancho cero crudos (en el regex y en los tests) en lugar de escapes. Los tests pasaban igual; se detectó en la revisión del código y se corrigió antes del PR. El mismo día volvió a ocurrir en el script del propio chequeo, y el chequeo lo detectó. P y I son estimación inicial (P = 2 porque ya ocurrió dos veces con un agente), a revisar con Ángel; A08 es una asignación mía.

R-15 y R-16 agregados el 2026-11-12 desde la feature 002 (P e I: estimación inicial, revisar con Ángel). **R-14, 2026-11-12:** volvió a ocurrir dos veces al escribir los tests de 002 (U+202E, U+200B crudos); el hook de pre-commit rechazó ambos commits y se corrigió con escapes.

## Excepciones a la constitución

Una excepción documenta una decisión explícita de no cumplir un principio, con su riesgo residual, sus controles compensatorios y cómo se cierra. Se registra antes o en el mismo momento del desvío, nunca después de olvidarlo.

| ID | Qué | Por qué | Aprueba | Riesgo residual | Controles compensatorios | Cierre | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| EX-01 | Merge a `main` sin la revisión cruzada que exige P9. **Alcance:** PR #2 (feature 001), PR #4 (feature 002), PR #5 (este registro) y los PRs de cierre de entrega del 13/11 mergeados **hasta las 22:00** (documentación, README, integración con el backend y mitigación de MU-19). Incluye configurar la protección de `main` **sin aprobación obligatoria** mientras dure la excepción | Fecha límite de entrega hoy, 13/11 23:59; el revisor (Ángel) no respondió desde el 12/11. Una aprobación obligatoria bloquearía todos los merges | Jerónimo Núñez, 2026-11-13 (ampliación del alcance: misma fecha) | Un defecto que una segunda revisión habría detectado | Cada PR: CI completo en verde (check:deps, check:invisibles, lint, tsc, Vitest, build, Playwright, npm audit, Gitleaks); red-team con resultados (`docs/red-team.md`); autorrevisión del diff. `main`: checks obligatorios `Lint, tipos, pruebas y build` y `Gitleaks (secret scanning)`, sin push directo ni force push | Ángel revisa cada PR después del merge; los hallazgos se corrigen en PRs nuevos. Cuando Ángel vuelva se activa 1 aprobación obligatoria en `main` y EX-01 se cierra. Un PR fuera del alcance o mergeado después de las 22:00 del 13/11 no está cubierto | Abierta |

Pendiente: revisar con Ángel; completar R-xx del backend (feature 003).
