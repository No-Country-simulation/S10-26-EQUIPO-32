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
| A07 | Fallas de autenticación | Frontend sin autenticación (catálogo público); el runtime no envía credenciales al backend (P3) | `adaptador-backend.test.ts` (sin `Authorization`) | — en `apps/web`. **Backend: ○ R-18** (clave admin por defecto, CWE-798), ver abajo |
| A08 | Integridad de datos y software | Validación zod en la frontera (también para la respuesta del backend: sobre + `contrato.ts`, falla cerrado); lockfile + `npm ci`; chequeo de caracteres invisibles (Trojan Source) | `contrato.ts`, `adaptador-backend.test.ts` (malformada, campo extra), `check:invisibles`, hook de pre-commit (R-14) | ● |
| A09 | Fallas de registro y monitoreo | Logs sin datos del usuario (solo códigos y contadores) | `route.ts`, `asistente.ts`, `memoria.ts` | ◐ sin alertas |
| A10 | SSRF | `OLLAMA_URL` y `BACKEND_URL` solo de servidor, validadas (http(s), sin credenciales) y nunca provienen del usuario; el adaptador backend no sigue redirecciones (`redirect: 'error'`) | `config.ts` + `asistente-nucleo.test.ts`; `adaptador-backend.test.ts` (redirección, `BACKEND_URL`) | ● |

## Top 10 para LLM (2025)

| ID | Riesgo | Control | Evidencia | Estado |
| --- | --- | --- | --- | --- |
| LLM01 | Prompt injection | Datos recuperados entre `<datos_no_confiables>`; reglas en el system prompt (incluido rol fijo, RNF-23); delimitadores inyectados neutralizados; detector de cambio de rol/persona en la entrada, también en otro idioma u ofuscado; salida con esquema | `docs/red-team.md` (2026-11-13, 13 ataques + 5 controles): **v1 11/13 → v2 13/13** con guardrails (4/13 sin); 0/5 falsos positivos; 0 fugas; 0 repos inventados; `asistente-rol.test.ts` | ◐ MU-19 cerrado. Residual: el detector es heurístico y se escribió conociendo los ataques (AM-29), así que una redacción nueva puede pasarlo; el refuerzo del prompt no tiene efecto medido aislado |
| LLM02 | Divulgación de información sensible | LLM local; el prompt no contiene secretos; la consulta no se registra | MU-21 bloqueado; RNF-22 | ● |
| LLM03 | Cadena de suministro | Modelos oficiales de Ollama, fijados por nombre; sin SDK (solo `fetch`) | `ollama.ts` | ◐ sin verificación de hash del modelo |
| LLM04 | Envenenamiento de datos y modelo | Dataset curado y validado por contrato; `revisada: false` en todas las ideas | `repos-reales.test.ts` | ◐ los READMEs no se indexan todavía |
| LLM05 | Manejo inadecuado de la salida | zod; solo ids del índice; nombres y enlaces salen del índice; URLs y etiquetas eliminadas; render como texto | MU-16 y MU-17 bloqueados; `asistente-nucleo.test.ts` | ● |
| LLM06 | Agencia excesiva | El modelo no tiene herramientas ni acciones: solo devuelve texto | `asistente.ts` | ● |
| LLM07 | Fuga del system prompt | Canario + detección de fragmentos; la salida que los contiene se descarta | MU-14 bloqueado; 0 fugas con guardrails | ● |
| LLM08 | Debilidades de vectores y embeddings | Índice local precalculado; los vectores solo entran si su `id` pasa el contrato y la dimensión coincide | `indice.ts` + test | ● |
| LLM09 | Desinformación | Grounding estricto: sin repos válidos responde «sin contexto»; aviso visible en el panel | MU-15 bloqueado; 0 repos fuera del índice | ◐ en v2, 4/13 ataques (MU-14, 16, 17, 21) recibieron una recomendación saneada en lugar de «sin contexto»; falta un umbral de health score (R-03) |
| LLM10 | Consumo ilimitado | 10/min por IP + tope global de 60/min; 500 caracteres; cuerpo de 4 KB; timeout de 60 s; `num_predict` acotado | MU-22 bloqueado; `asistente-route.test.ts` (429) | ● |

## Revisión cruzada del backend (2026-11-13, B9)

Hallazgos de Jerónimo sobre `backend/` (commit `fe1f22a`). **No se modificó el código de Ángel**: la mitigación sugerida queda para él. El detalle y la evidencia están en `docs/matriz-riesgos.md` (sección «Revisión cruzada del backend»).

| OWASP | Hallazgo | Riesgo | Mitigación sugerida (Ángel) | Estado |
| --- | --- | --- | --- | --- |
| A07 · CWE-798 | `ADMIN_API_KEY` tiene un valor por defecto escrito en `config.py`. La guarda de producción solo actúa con `BACKEND_ENV=production`, que no es el valor por defecto. | R-18 | Sin default: fallar al arrancar si falta (en desarrollo, una aleatoria por proceso sin loguearla) y un test que lo verifique | ○ |
| A04 (disponibilidad) | Store en memoria: se vacía al reiniciar y no se comparte entre workers; el catálogo vacío no se distingue de un error. | R-19 | Persistir en Supabase o sembrar al arrancar; un solo worker; `/health/ready` que avise si el store está vacío | ○ |
| A04 (diseño) | Categoría por defecto inconsistente («Developer Tools» / «Other») y fuera de las 6 del catálogo. | R-20 | Enumeración única compartida; categoría obligatoria y validada en la ingesta | ○ |
| A04 (consumo) | La lista no trae el desglose, así que el frontend gasta 31 de los 60 pedidos/min de su IP. | R-21 | Desglose o nivel en `GET /repositories` | ◐ contenido con la instantánea de 60 s |

Lo que se verificó del lado del backend con una corrida real: la escritura sin credencial (`POST /api/v1/ingestion/batch` sin `Authorization`) devuelve **403** (MU-07).
