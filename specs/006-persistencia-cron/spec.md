# Spec 006 — Persistencia real y pipeline automatizado

**Dueño:** Jero (capa de datos y automatización) · **Código de Ángel:** health score, sanitizer, rutas y esquema (no se tocan) · **Estado:** aprobado (consigna del 2026-11-13, timebox 19:30) · **Fecha:** 2026-11-13

> Qué y por qué. El cómo va en `plan.md`.

## 1. Problema y objetivo

El backend hoy guarda todo en memoria: al reiniciar se pierde el catálogo (R-19). `schema.sql` ya define tablas, pgvector y RLS, y `psycopg2-binary` está en los requirements, pero nadie lo usa. Y la ingesta de `apps/web` se corre a mano.

Se cumple cuando: (1) el backend persiste en Postgres con pgvector y RLS activo (lectura pública del catálogo; escritura solo con el rol de servicio), (2) los 108 repos sobreviven a un reinicio y el frontend con `CATALOG_SOURCE=backend` los muestra, (3) la ingesta de metadatos corre sola cada semana y deja el resultado en un PR, y (4) el backend puede reingestar solo, de forma opcional.

## 2. Actores

- **Backend (Ángel):** conserva su lógica; solo cambia la capa de datos que elige `DATABASE_URL`.
- **Base de datos:** Postgres + pgvector. **Fuente confiable pero con credenciales sensibles.**
- **Atacante anónimo:** tiene la clave pública (rol `anon`) e intenta escribir o leer lo interno.
- **GitHub Actions:** corre la ingesta programada con el `GITHUB_TOKEN` del workflow.
- **Mantenedor:** revisa el PR que abre el workflow.

## 3. Requisitos funcionales

| ID | Requisito | Prioridad | Criterio de aceptación |
| --- | --- | --- | --- |
| RF-27 | Persistencia: con `DATABASE_URL` el backend usa `PostgresDatabaseClient` (misma interfaz que el store en memoria, queries parametrizadas); sin ella queda el store en memoria (tests y modo offline). Base local con `docker-compose.yml` (imagen fijada por digest) y un shim de roles `anon`/`authenticated`/`service_role` para que el RLS de `schema.sql` funcione igual que en Supabase | M | Tests de CRUD, upsert, filtros e inyección SQL contra una base real; los 108 repos siguen tras reiniciar el backend y la base; el frontend con `CATALOG_SOURCE=backend` los muestra |
| RF-28 | Ingesta programada: `.github/workflows/ingesta.yml` (semanal + `workflow_dispatch`) corre `npm run ingesta -- --solo-metadatos` (metadatos y logos; conserva ideas y embeddings; anota los repos nuevos en `data/ingesta-pendientes.json`) y abre un PR con el resultado; si Actions no puede crear PRs, sube un artifact | M | Corrida manual del workflow con su resultado; el modo es idempotente (una segunda corrida sin cambios no produce diff) |
| RF-29 | Scheduler opcional del backend: con `INGEST_SCHEDULE_HOURS` > 0 reingesta el catálogo cada N horas con un hilo, sin dependencias nuevas; apagado por defecto y en los tests | S | Tests: apagado por defecto, reingesta conservando la categoría, un fallo no corta la corrida, detención limpia |

## 4. Requisitos no funcionales

| ID | Tipo | Requisito | Cómo se verifica |
| --- | --- | --- | --- |
| RNF-34 | Seguridad | RLS activo y sin debilitar: el rol anónimo lee el catálogo público y **no puede escribir** ni leer `repository_embeddings` ni `audit_logs`; el login del backend no es superusuario ni salta el RLS y opera como `service_role` | Tests negativos con un login `anon` real (incluido uno donde un GRANT filtrado igual queda frenado por la política) |
| RNF-35 | Seguridad | Todo SQL con parámetros (nunca f-strings con valores); `LIKE` con comodines escapados; `clear()` deshabilitado salvo en bases de prueba; el DSN nunca sale en `repr` ni en logs | Test de inyección en búsqueda y filtros; test de `clear` y `repr` |
| RNF-36 | Seguridad · Cadena de suministro | El workflow tiene `permissions` mínimos (`contents: write`, `pull-requests: write`), acciones fijadas por SHA y usa el `GITHUB_TOKEN` del propio workflow; ningún secreto en el repo (`.env.example` sin valores) | Revisión del YAML + Gitleaks |

## 5. Casos de mal uso

| ID | El atacante intenta… | Resultado esperado |
| --- | --- | --- |
| MU-33 | Inyectar SQL por el texto de búsqueda, la categoría o la licencia (`'; DROP TABLE …`) | El texto es un dato: 0 resultados y la tabla intacta |
| MU-34 | Con la clave pública (`anon`), insertar, modificar o borrar repos, o leer embeddings y audit logs | Rechazado por permisos y por RLS; el catálogo no cambia |
| MU-35 | Robar credenciales de la base desde el log, el `repr` o el repo | El DSN no se imprime; solo hay variables de entorno; `.env.example` sin valores |
| MU-36 | Aprovechar un workflow con permisos de escritura (PR malicioso que lo modifique o secuestre el token) | Permisos mínimos, acciones por SHA, rama propia + PR revisado; el workflow no se dispara por `pull_request` |

## 6. Fuera de alcance

- Cambiar la lógica de Ángel (health score, sanitizer, rutas, esquema). El PR dice qué es suyo y qué es mío y pide su revisión post-merge (EX-01).
- Desplegar la base en Supabase (queda el `docker-compose` y `DATABASE_URL`; Supabase usa el mismo `schema.sql`).
- El health score en la ingesta del frontend: lo calcula el backend; `--solo-metadatos` no lo toca.

## 7. Decisiones

- Docker estaba disponible: `docker-compose.yml` con `pgvector/pgvector:pg17` por digest (no Supabase CLI, que exige más imágenes y tiempo).
- Los metadatos de repos nuevos no entran al dataset sin ideas ni embedding: quedan anotados para procesarlos en local con Ollama.
