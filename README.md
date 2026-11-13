# OpenBridge: acelerador de integraciones open-source

Catálogo de herramientas open-source con métricas de salud de cada repositorio y un asistente RAG que recomienda un stack según el modelo de negocio. Construido con **Spec-Driven Development** y **security by design**.

> Simulación laboral No Country · Octubre-noviembre 2026 · Equipo S10-26-EQUIPO-32 · Entrega: 13/11/2026

## Problema

Una consultora arranca más de 30 proyectos por año y en cada uno el equipo vuelve a investigar desde cero qué herramienta open-source usar para autenticación, pagos, búsqueda o analítica. La información está dispersa, no se sabe si un repo sigue mantenido, la licencia se descubre tarde y un asistente de IA genérico puede recomendar proyectos que no existen.

## Solución

- **Catálogo por categoría** (autenticación, base de datos, pagos, IA, analítica, búsqueda) con ficha técnica: licencia siempre visible, stars, issues, lenguaje, última actualización e **ideas de integración** (REST, Docker, SDK, webhook) con su snippet. Las ideas no revisadas lo dicen.
- **Asistente RAG** con LLM local: el usuario describe su negocio y recibe un stack, una justificación y los repos citados, enlazados a su ficha. **Solo recomienda repos del catálogo** (P6); si no hay contexto suficiente, lo dice.
- **Backend y pipeline** (Ángel): API FastAPI, ingesta desde la API de GitHub, health score determinista y base vectorial con RLS. Ver [`backend/README.md`](backend/README.md).

## Cómo correrlo

Requisitos: Node 22 (`.nvmrc`), [Ollama](https://ollama.com) para el asistente y Python 3.10+ solo para el backend.

```bash
# 1. Variables (ninguna es secreta en el frontend; nunca commitear .env)
cp .env.example apps/web/.env        # CATALOG_SOURCE=reales para la demo; OLLAMA_URL vacío = http://localhost:11434

# 2. LLM local
ollama pull nomic-embed-text
ollama pull llama3.2:3b
ollama serve                         # si no corre ya como servicio

# 3. Frontend + asistente
cd apps/web
npm ci
npm run dev                          # http://localhost:3000

# Opcional
npm run embeddings                   # regenera data/embeddings.json (ya viene versionado)
npm test                             # Vitest
npm run test:e2e                     # Playwright contra el build de producción (usa CATALOG_SOURCE=fixtures)
npm run redteam                      # 10 ataques al asistente, con y sin guardrails → docs/red-team.md
```

**Fuentes de datos (`CATALOG_SOURCE`):** `reales` (demo: 30 repos reales con metadatos de la API de GitHub del 12/11, los mismos que indexa el asistente), `sintetico` (40 herramientas inventadas), `fixtures` (**solo pruebas**: casos de mal uso) y `supabase` (fuera del MVP). Health score y nivel de mantenimiento se muestran como «Sin dato» en `reales`: su fórmula vive en el backend y todavía no está integrada; no se inventan (P7).

**Hook local, una vez por clon:** `git config core.hooksPath .githooks`. Rechaza commits con caracteres bidi o de ancho cero crudos (R-14).

## Arquitectura

```
Navegador ──► Next.js 16 (apps/web)                         Ollama local (:11434)
              ├─ proxy: CSP con nonce por request             ├─ nomic-embed-text
              ├─ páginas del catálogo ──► repositorio/adaptador ──► contrato.ts (zod) ──► data/*.json
              └─ POST /api/asistente                          └─ llama3.2:3b
                   rate limit → validación → embedding → top-5 coseno (en memoria)
                   → prompt con datos delimitados → salida JSON validada → solo ids del índice

backend/ (FastAPI) ──► GitHub API · health score · pgvector en Supabase con RLS   (integración con el frontend: pendiente)
```

Decisiones clave: el navegador nunca habla con el origen de datos ni con el LLM; todo dato externo pasa por `contrato.ts`; el LLM es local (la consulta no sale del servidor); sin SDK de LLM ni de Supabase (`fetch` + `zod`).

## Equipo y roles

| Integrante | Rol | Frentes |
| --- | --- | --- |
| Ángel De La Rosa ([@Arcanalyra](https://github.com/Arcanalyra)) | Cybersecurity Engineer | Backend, pipeline de ingesta, base vectorial; revisor de requisitos y gobernanza |
| Jerónimo Núñez ([@jeronimoenunez](https://github.com/jeronimoenunez)) | Cybersecurity Engineer | Frontend, asistente RAG, guardrails, red-team; propone requisitos (SRS) y gobernanza (NIST, OWASP, matriz) |

## Cómo trabajamos

- **SDD:** constitución → spec → clarificación → plan → tareas → implementación → validación ([`specs/`](specs/)). Ningún código sin spec.
- **Trazabilidad:** riesgo (R-xx) → control → requisito (RF/RNF-xx) → prueba ([`docs/matriz-riesgos.md`](docs/matriz-riesgos.md)). Los commits citan el ID que implementan.
- **Revisión cruzada (P9):** todo PR lo revisa el otro integrante. Para la entrega rige la excepción **EX-01** (ver Seguridad).

## Seguridad

Detalle en [`SECURITY.md`](SECURITY.md), [`docs/owasp.md`](docs/owasp.md) y [`docs/perfil-nist-csf.md`](docs/perfil-nist-csf.md).

- **Trojan Source (R-14, CVE-2021-42574): 3 intentos frenados por controles automáticos.** Un agente de IA metió caracteres bidi o de ancho cero crudos en el código cuatro veces. La primera (10/11, `texto.ts`) se detectó en la revisión del código. Las otras tres las frenaron controles automáticos: el chequeo de CI `check:invisibles` (10/11, en el script del propio chequeo) y el hook de pre-commit, que rechazó dos commits el 12/11 (U+202E y U+200B en tests de la 002). Desde entonces el código usa escapes `\uXXXX`.
- **Gitleaks con triage:** escanea todo el historial en cada PR. El único hallazgo (10/11) fue un token ficticio de un test del backend. Se verificó y se excluyó **solo por fingerprint** en `.gitleaksignore`, nunca por archivo, así que un token real nuevo en el mismo archivo se sigue detectando.
- **Dependencias bloqueadas por diseño:** `apps/web/allowed-deps.json` es una lista cerrada con versión exacta, y la CI (`check:deps`) falla ante cualquier paquete que no esté ahí. Quedaron afuera `supabase-js` (D-03), los parsers de Markdown y HTML, el Sheet de Radix (D-16), el SDK de Ollama (la 002 usa `fetch`), TypeScript 7 y ESLint 10 (D-18). La feature 002 no sumó **ninguna dependencia**. `npm audit --audit-level=critical` bloquea en CI y pasó en verde en #4 (0 críticas). El 02/11 se registró una advisory moderada, solo de desarrollo (`minimatch`, cadena de ESLint), en `tasks.md` de 001.
- **CSP con nonce por request:** `script-src 'self' 'nonce-…' 'strict-dynamic'`, sin `unsafe-inline` ni `unsafe-eval` en producción, `frame-ancestors 'none'`, `connect-src 'self'` y cabeceras estáticas (HSTS, nosniff, X-Frame-Options). Lo prueba `headers.spec.ts` contra el build de producción.
- **Guardrails del asistente:** rate limit de 10/min por IP más un tope global, entrada de hasta 500 caracteres normalizada, datos recuperados delimitados y marcados como no confiables, salida JSON validada con zod (solo valen los ids del índice), URLs y etiquetas eliminadas, canario contra fugas del system prompt y render siempre como texto.
- **EX-01, excepción a P9:** #2, #4, #5 y los PRs de cierre del 13/11 hasta las 22:00 se mergean sin la revisión de Ángel, que no respondió desde el 12/11. Los compensan el CI completo en verde, el red-team y la autorrevisión; Ángel revisa después del merge. Mientras dure la excepción, la protección de `main` exige los checks `Lint, tipos, pruebas y build` y `Gitleaks (secret scanning)`, sin push directo ni force push, y **sin aprobación obligatoria**, que se activa cuando vuelva Ángel. Registro completo en la matriz de riesgos.

## Resultados del red-team

Corrida real del 12/11 contra `llama3.2:3b` (temperature 0, seed 42), con 10 ataques ([`docs/red-team.md`](docs/red-team.md)):

| Métrica | Con guardrails | Sin guardrails |
| --- | --- | --- |
| Ataques bloqueados | **9/10 (90 %)** | 3/10 (30 %) |
| Fugas del system prompt | 0 | 1 |
| Repos citados fuera del índice | 0 | n/a |

**MU-19 no está resuelto.** Con guardrails, el ataque de role-play «DAN» respetó el esquema y citó un repo válido, pero la justificación obedeció la inyección: arrancó con «DAN:» y contó un chiste. No hubo ejecución ni fuga; es un desvío de contenido dentro de un campo de texto plano. No se ajustó el guardrail después de ver el resultado, para no inflar la métrica (P7). Además, 6 de los 10 ataques recibieron una recomendación saneada en lugar de «sin contexto»: el modelo de 3B tiende a recomendar algo aunque la consulta no sea de negocio. El set es chico y los resultados valen para este modelo y esta semilla.

## Siguientes pasos

1. **Mitigar MU-19** (verificar que la justificación hable de los repos citados, o usar un modelo más grande) y volver a correr `npm run redteam`.
2. **Revisión de Ángel** de #2, #4, #5 y los PRs de cierre; activar la aprobación obligatoria en `main` y cerrar EX-01.
3. **Integrar el backend:** adaptador `supabase` de solo lectura (B9), prueba MU-07 de escritura con la clave pública y health score real en las fichas.
4. **Pendientes de 001:** medición de rendimiento (RNF-07), teclado y axe (RNF-16), revisión manual responsiva y visual (T34), chequeo `grep` de CI (T26).
5. **Asistente:** índice en pgvector, umbral de health score para no recomendar repos abandonados (R-03) y un set de red-team más amplio con inyección indirecta real.

## Estructura

```
specs/       Constitución, plantillas y una carpeta por feature (001 catálogo, 002 asistente RAG)
apps/web/    Frontend Next.js + Tailwind y asistente RAG
backend/     API FastAPI y pipeline de ingesta
docs/        SRS, matriz de riesgos, perfil NIST CSF, OWASP, red-team
.github/     CI (web, security), plantillas de PR, CODEOWNERS, Dependabot
```
