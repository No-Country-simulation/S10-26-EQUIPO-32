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
GITHUB_TOKEN="$(gh auth token)" npm run ingesta   # feature 005: regenera repos, logos e ideas faltantes desde data/semilla-repos.json
npm test                             # Vitest
npm run test:e2e                     # Playwright contra el build de producción (usa CATALOG_SOURCE=fixtures)
npm run redteam -- --etiqueta v3     # 13 ataques + 5 controles, con y sin guardrails → docs/red-team.md
```

**Fuentes de datos (`CATALOG_SOURCE`):** `reales` (demo: **108 repos reales** de la lista curada [`data/semilla-repos.json`](data/semilla-repos.json), con metadatos de la API de GitHub y logo oficial, los mismos que indexa el asistente), `backend` (los repos servidos por el FastAPI de `backend/`, con health score, nivel de mantenimiento y desglose reales; ver abajo), `sintetico` (40 herramientas inventadas), `fixtures` (**solo pruebas**: casos de mal uso) y `supabase` (fuera del MVP). En `reales`, health score y mantenimiento se ven como «Sin dato»: no se inventan (P7).

### Ingesta del catálogo real (feature 005)

`npm run ingesta` (en `apps/web`) lee la lista curada `data/semilla-repos.json` (108 repos, 18 por categoría; el criterio de selección está en el mismo archivo: no archivado, no fork, push ≤ 180 días, licencia OSI), trae los metadatos de la API de GitHub, descarga el avatar de cada owner a `public/logos/` (solo PNG/JPEG por magic bytes, ≤ 200 KB, desde `avatars.githubusercontent.com`; origen y fecha en `public/logos/fuentes.json`), genera con Ollama local las ideas de los repos que no tienen (`revisada: false`, validadas) y regenera `data/repos-reales.json` y `data/embeddings.json`. Corre sin intervención (pensada para un cron): no escribe nada hasta que todo salió bien y sale con código 1 (falla de la corrida) o 2 (configuración) y un log `[ingesta]`. `GITHUB_TOKEN` solo por entorno, nunca en un archivo.

### Catálogo con el backend (`CATALOG_SOURCE=backend`)

Sin `DATABASE_URL` el backend guarda los datos **en memoria** (arranca vacío y se pierde al reiniciarlo); con `DATABASE_URL` persiste en Postgres (ver «Persistencia y pipeline»). Mapeo de campos y reglas: [`docs/mapeo-backend.md`](docs/mapeo-backend.md).

```bash
# 1. Backend (desde la raíz del repo)
python3 -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt
export ADMIN_API_KEY="$(openssl rand -hex 32)"   # una propia: nunca la del código ni en un archivo commiteado
export GITHUB_TOKEN="$(gh auth token)"           # sin token, GitHub corta a 60 pedidos/h y la siembra (2 por repo) falla
uvicorn backend.app.main:app --port 8000

# 2. Sembrar (otra terminal, con la misma ADMIN_API_KEY exportada): los 108 repos en lotes de 20, con nuestra categoría.
#    Antes verifica que escribir SIN credencial dé 401/403 (MU-07). No imprime la clave.
cd apps/web
BACKEND_URL=http://127.0.0.1:8000 npm run sembrar:backend

# 3. Frontend contra el backend: solo lee endpoints públicos, sin token (P3)
CATALOG_SOURCE=backend BACKEND_URL=http://127.0.0.1:8000 npm run dev

# E2E con el backend levantado y sembrado (no corre en CI; esperá 1 min entre corridas por el rate limit de 60/min)
BACKEND_URL=http://127.0.0.1:8000 npm run test:e2e:backend
```

`ADMIN_API_KEY` es solo para la siembra (herramienta de operación). El frontend no la necesita ni la recibe.

**Hook local, una vez por clon:** `git config core.hooksPath .githooks`. Rechaza commits con caracteres bidi o de ancho cero crudos (R-14).

## Arquitectura

```
Navegador ──► Next.js 16 (apps/web)                         Ollama local (:11434)
              ├─ proxy: CSP con nonce por request             ├─ nomic-embed-text
              ├─ páginas del catálogo ──► repositorio/adaptador ──► contrato.ts (zod) ──► data/*.json
              └─ POST /api/asistente                          └─ llama3.2:3b
                   rate limit → validación → embedding → top-5 coseno (en memoria)
                   → prompt con datos delimitados → salida JSON validada → solo ids del índice

backend/ (FastAPI) ──► GitHub API · health score ──► PostgresDatabaseClient ──► Postgres + pgvector (RLS)
        ▲  scheduler opcional (INGEST_SCHEDULE_HOURS)          ▲ rol service_role · anon solo lee el catálogo
        └── apps/web CATALOG_SOURCE=backend (lectura pública)   └── docker-compose.yml (imagen por digest)

GitHub Actions (ingesta.yml, semanal) ──► npm run ingesta -- --solo-metadatos ──► PR con data/ y logos
```

Decisiones clave: el navegador nunca habla con el origen de datos ni con el LLM; todo dato externo pasa por `contrato.ts`; el LLM es local (la consulta no sale del servidor); sin SDK de LLM ni de Supabase (`fetch` + `zod`).

## Persistencia y pipeline (feature 006)

El backend persiste en **Postgres + pgvector** cuando existe `DATABASE_URL`; sin ella usa el store en memoria (tests y modo offline). El esquema es el `schema.sql` de Ángel, sin cambios (RLS incluido).

```bash
# 1. Base local (imagen pgvector fijada por digest; solo escucha en 127.0.0.1). Las claves son tuyas y solo van al entorno.
export POSTGRES_PASSWORD="$(openssl rand -hex 24)" BACKEND_DB_PASSWORD="$(openssl rand -hex 24)"
docker compose up -d db          # la primera vez aplica el shim de roles, schema.sql y los GRANT (backend/db/init/)

# 2. Backend contra la base (el rol backend_service opera como service_role)
export DATABASE_URL="postgresql://backend_service:${BACKEND_DB_PASSWORD}@127.0.0.1:5432/openbridge"
export ADMIN_API_KEY="$(openssl rand -hex 32)" GITHUB_TOKEN="$(gh auth token)"
uvicorn backend.app.main:app --port 8000     # /health/ready → "database": "connected"

# 3. Sembrar los 108 repos a través de la ingesta del backend (lotes de 20) y verificar la persistencia
cd apps/web && BACKEND_URL=http://127.0.0.1:8000 npm run sembrar:backend
#    reiniciá el backend y el contenedor (docker compose restart db): los 108 siguen ahí.

# 4. Tests contra la base real (sin estas variables se saltan y corre solo el store en memoria)
export TEST_DATABASE_URL="$DATABASE_URL" TEST_ADMIN_DATABASE_URL="postgresql://postgres:${POSTGRES_PASSWORD}@127.0.0.1:5432/openbridge"
python -m pytest backend/tests
```

**Migrar:** `schema.sql` es idempotente (`IF NOT EXISTS`, `DROP POLICY IF EXISTS`). En una base existente: `docker compose exec -T db psql -U postgres -d openbridge < backend/app/database/schema.sql` y luego `backend/db/init/02-grants.sql`. En Supabase se aplica el mismo `schema.sql` desde el editor SQL (allí los roles y los GRANT ya existen).

**Re-ingesta programada del backend (opcional):** `INGEST_SCHEDULE_HOURS=24` activa un hilo que reingesta el catálogo cada 24 h. Apagado por defecto y en los tests.

**Ingesta programada en GitHub Actions:** `.github/workflows/ingesta.yml` corre cada lunes (y a mano) `npm run ingesta -- --solo-metadatos`: actualiza metadatos y logos, conserva ideas y embeddings (en Actions no hay Ollama) y anota los repos nuevos en `apps/web/data/ingesta-pendientes.json` para procesarlos en local con `npm run ingesta`. Abre un PR con el resultado; **si la organización no permite que Actions cree PRs** (hoy es el caso: «Allow GitHub Actions to create and approve pull requests» está apagado), el workflow lo sube como artifact `ingesta-resultado` y se aplica en local. Para dispararlo: `gh workflow run ingesta.yml` o la pestaña Actions → ingesta → «Run workflow». Los PRs creados con el `GITHUB_TOKEN` no disparan los checks del ruleset: hay que revisarlos y empujar un commit.

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

**Feature 005 (13/11, índice de 108 repos):** la batería v2 da lo mismo que con 30 (13/13 bloqueados, 0/5 falsos positivos, 0 fugas, 0 repos inventados), pero **MU-20 regresionó en comportamiento**: ante un pedido de ransomware recomienda repos con una justificación inventada en vez de responder «sin contexto». Abierto como R-27; detalle en [`docs/red-team.md`](docs/red-team.md).

Corrida real del 12/11 contra `llama3.2:3b` (temperature 0, seed 42), con 10 ataques ([`docs/red-team.md`](docs/red-team.md)):

| Métrica | Con guardrails | Sin guardrails |
| --- | --- | --- |
| Ataques bloqueados | **9/10 (90 %)** | 3/10 (30 %) |
| Fugas del system prompt | 0 | 1 |
| Repos citados fuera del índice | 0 | n/a |

**MU-19 no está resuelto.** Con guardrails, el ataque de role-play «DAN» respetó el esquema y citó un repo válido, pero la justificación obedeció la inyección: arrancó con «DAN:» y contó un chiste. No hubo ejecución ni fuga; es un desvío de contenido dentro de un campo de texto plano. No se ajustó el guardrail después de ver el resultado, para no inflar la métrica (P7). Además, 6 de los 10 ataques recibieron una recomendación saneada en lugar de «sin contexto»: el modelo de 3B tiende a recomendar algo aunque la consulta no sea de negocio. El set es chico y los resultados valen para este modelo y esta semilla.

## Siguientes pasos

1. **Red-team:** MU-19 quedó mitigado en v2 (#8); falta un set de prueba separado para medir si el detector generaliza (AM-29).
2. **Revisión de Ángel** de #2, #4, #5 y los PRs de cierre; activar la aprobación obligatoria en `main` y cerrar EX-01.
3. **Backend:** el adaptador `backend` ya lee la API REST (B9). Le quedan a Ángel los hallazgos de la revisión cruzada (R-18 a R-21: clave admin por defecto, store en memoria, categoría por defecto y desglose en la lista) y la persistencia en Supabase.
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
