# Revisión OWASP: OpenBridge

**Versión:** 1.0 · **Fecha:** 2026-11-13 · **Ediciones:** OWASP Top 10 web 2021 y OWASP Top 10 para LLM 2025 · **Alcance:** `apps/web` (catálogo + asistente). El backend tiene su propia revisión en `backend/README.md`.
**Estado:** ● mitigado con evidencia · ◐ parcial · ○ abierto · — no aplica.

## Top 10 web (2021)

| ID | Riesgo | Control | Evidencia | Estado |
| --- | --- | --- | --- | --- |
| A01 | Control de acceso roto | Frontend solo lectura: el puerto del catálogo no tiene métodos de escritura; sin cuentas ni endpoints de escritura | `repositorio.ts`; R-05 | ◐ MU-07 pendiente (Supabase fuera del MVP) |
| A02 | Fallas criptográficas | Sin secretos en el cliente; solo variables de servidor; HSTS | Gitleaks en CI; `next.config.ts` | ● |
| A03 | Inyección (XSS) | Todo texto externo y la salida del LLM se renderizan como texto de React; sin `dangerouslySetInnerHTML`; URLs con lista permitida; la búsqueda no usa `RegExp` con la entrada | `mu.spec.ts` (MU-01..12), `asistente-panel.test.tsx`, lint `react/no-danger` | ● |
| A04 | Diseño inseguro | Threat model por feature (STRIDE); cotas de tamaño; `revisada` falla cerrado; rate limit | Plan 001 AM-01..16, spec 002 AM-17..26; `contrato.ts` | ● |
| A05 | Configuración insegura | CSP con nonce sin `unsafe-*` en `script-src`; `frame-ancestors 'none'`; sin `X-Powered-By`; errores genéricos; modo red-team ignorado en producción | `headers.spec.ts`, `config.ts` (RNF-21) | ● |
| A06 | Componentes vulnerables | Lista cerrada de dependencias con versión exacta; `npm audit` bloqueante en críticas; Dependabot | `check:deps`, `web.yml`, `allowed-deps.json` | ● |
| A07 | Fallas de autenticación | — | Sin autenticación en el MVP (catálogo público) | — |
| A08 | Integridad de datos y software | Validación zod en la frontera; lockfile + `npm ci`; chequeo de caracteres invisibles (Trojan Source) | `contrato.ts`, `check:invisibles`, hook de pre-commit (R-14) | ● |
| A09 | Fallas de registro y monitoreo | Logs sin datos del usuario (solo códigos y contadores) | `route.ts`, `asistente.ts`, `memoria.ts` | ◐ sin alertas |
| A10 | SSRF | `OLLAMA_URL` solo de servidor, validada (http(s), sin credenciales) y nunca proviene del usuario | `config.ts` + `asistente-nucleo.test.ts` | ● |

## Top 10 para LLM (2025)

| ID | Riesgo | Control | Evidencia | Estado |
| --- | --- | --- | --- | --- |
| LLM01 | Prompt injection | Datos recuperados entre `<datos_no_confiables>`; reglas en el system prompt; delimitadores inyectados neutralizados; salida con esquema | `docs/red-team.md`: 9/10 bloqueados con guardrails (3/10 sin) | ◐ **MU-19 abierto**: la justificación obedeció un role-play |
| LLM02 | Divulgación de información sensible | LLM local; el prompt no contiene secretos; la consulta no se registra | MU-21 bloqueado; RNF-22 | ● |
| LLM03 | Cadena de suministro | Modelos oficiales de Ollama, fijados por nombre; sin SDK (solo `fetch`) | `ollama.ts` | ◐ sin verificación de hash del modelo |
| LLM04 | Envenenamiento de datos y modelo | Dataset curado y validado por contrato; `revisada: false` en todas las ideas | `repos-reales.test.ts` | ◐ los READMEs no se indexan todavía |
| LLM05 | Manejo inadecuado de la salida | zod; solo ids del índice; nombres y enlaces salen del índice; URLs y etiquetas eliminadas; render como texto | MU-16 y MU-17 bloqueados; `asistente-nucleo.test.ts` | ● |
| LLM06 | Agencia excesiva | El modelo no tiene herramientas ni acciones: solo devuelve texto | `asistente.ts` | ● |
| LLM07 | Fuga del system prompt | Canario + detección de fragmentos; la salida que los contiene se descarta | MU-14 bloqueado; 0 fugas con guardrails | ● |
| LLM08 | Debilidades de vectores y embeddings | Índice local precalculado; los vectores solo entran si su `id` pasa el contrato y la dimensión coincide | `indice.ts` + test | ● |
| LLM09 | Desinformación | Grounding estricto: sin repos válidos responde «sin contexto»; aviso visible en el panel | MU-15 bloqueado; 0 repos fuera del índice | ◐ 6/10 ataques recibieron una recomendación saneada en lugar de «sin contexto»; falta un umbral de health score (R-03) |
| LLM10 | Consumo ilimitado | 10/min por IP + tope global de 60/min; 500 caracteres; cuerpo de 4 KB; timeout de 60 s; `num_predict` acotado | MU-22 bloqueado; `asistente-route.test.ts` (429) | ● |
