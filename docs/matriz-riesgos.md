# Matriz de riesgos — OpenBridge

**Versión:** 0.1 · **Fecha:** 2026-10-30 · Escala 1–3; nivel = probabilidad × impacto (≥ 6 alto).
Funciones NIST CSF 2.0: GV Gobernar · ID Identificar · PR Proteger · DE Detectar · RS Responder · RC Recuperar.
OWASP: A0x = Top 10 web (edición 2021) · LLM0x = Top 10 para LLM (2025). Si adoptamos la edición web 2025, se renumera.

| ID | Riesgo | P | I | Nivel | Control | Requisito | Prueba | CSF | OWASP |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-01 | Filtración del token de GitHub o API key del LLM | 2 | 3 | 6 | Env vars, Gitleaks en CI, push protection, rotación | RNF-01 | CI verde; runbook en SECURITY.md | PR, RS | — |
| R-02 | Prompt injection indirecta vía README de un repo | 2 | 3 | 6 | Separar datos de instrucciones, sanitizar contexto, validar salida | RNF-03 | Red-team 002 | PR, ID | LLM01 |
| R-03 | El asistente recomienda repos inexistentes o abandonados | 3 | 2 | 6 | Grounding solo en BD + umbral de health score | RNF-09 | Set de prueba 002 | PR | LLM09 |
| R-04 | Abuso del endpoint del asistente (costo, DoS) | 2 | 2 | 4 | Rate limit + tope de longitud de input | RNF-05 | Test 429 | PR, DE | LLM10 |
| R-05 | Escritura no autorizada en la BD con la anon key | 2 | 3 | 6 | RLS, rol de servicio solo en el pipeline | RNF-02 | Intento de escritura falla | PR | A01 |
| R-06 | Rate limit de GitHub deja datos desactualizados | 3 | 1 | 3 | Backoff, requests condicionales, GraphQL por lotes | RNF-06, RNF-08 | Corrida completa | PR, RC | — |
| R-07 | XSS por descripciones/snippets de GitHub o salida del LLM | 2 | 3 | 6 | Render como texto, sin HTML crudo, CSP, links con allowlist | RNF-04 | Fixtures MU-01..12 (001) | PR | A03 / LLM05 |
| R-08 | Recomendar librería con licencia incompatible o sin mantenimiento | 2 | 2 | 4 | Licencia visible, nivel de mantenimiento | RNF-13 | Revisión de fichas | GV, ID | — |
| R-09 | Dependencia vulnerable en nuestro proyecto | 2 | 2 | 4 | Dependabot, npm audit | RNF-14 | 0 críticas abiertas | PR | A06 |
| R-10 | Un integrante no puede seguir (equipo ya bajó a 2) | 2 | 3 | 6 | Repo documentado, specs, tareas chicas | RNF-11 | — | GV | — |
| R-11 | Backend o pipeline entrega datos malformados o envenenados que rompen o engañan a la interfaz (incluye una idea no revisada que se hace pasar por revisada) | 2 | 2 | 4 | Validación zod en la frontera del adaptador, datos inválidos → "Sin dato" u omisión con log, `revisada` falla cerrado (solo `true` estricto cuenta) | RNF-04 | Fixtures MU-09, MU-12 (001) | PR, DE | A08 / A04 |
| R-12 | Payload desmedido (descripciones o listas enormes) degrada el navegador o el filtrado | 2 | 1 | 2 | Cotas de longitud y cantidad en el contrato, truncado con indicación, límite de tamaño y timeout en el adaptador | RNF-07 | Fixtures MU-04 + medición RNF-07 (001) | PR | A04 |
| R-13 | Cabeceras de seguridad ausentes o debilitadas por un cambio de configuración (CSP, frame-ancestors, nosniff) | 2 | 2 | 4 | Prueba E2E de cabeceras contra el build de producción en cada PR | RNF-04 | Test de cabeceras (001) | PR, DE | A05 |

R-11 a R-13 agregados el 2026-10-30 desde el plan 001 (P y I son mi estimación inicial; revisar con Ángel).

Pendiente: revisar con Ángel; completar R-xx del backend (feature 003).
