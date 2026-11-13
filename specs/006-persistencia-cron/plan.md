# Plan 006 — Persistencia real y pipeline automatizado

**Spec:** `./spec.md` · **Estado:** aprobado

## 1. Chequeo contra la constitución
| Principio | ¿Cumple? | Nota |
| --- | --- | --- |
| P2 Security by design | Sí | Amenazas en §5 antes del código |
| P3 Mínimo privilegio | Sí | anon solo lee el catálogo; el backend opera como `service_role` sin ser superusuario; permisos mínimos del workflow |
| P4 Cero secretos | Sí | Solo entorno; `.env.example` sin valores; el compose exige las variables (`${VAR:?}`) |
| P5 Externo no confiable | Sí | Búsqueda y filtros como parámetros; los datos de GitHub siguen pasando por el sanitizer de Ángel |
| P9 Revisión cruzada | EX-01 | Ángel revisa post-merge; el PR separa su código del mío |

## 2. Arquitectura
`DatabaseClient` (memoria, de Ángel) y `PostgresDatabaseClient` (nuevo, mismo contrato público) se eligen en `create_db_client()` según `DATABASE_URL`. Las rutas y el pipeline no cambian. `docker-compose.yml` levanta `pgvector/pgvector` por digest con tres scripts de init: shim de roles (`00-roles.sh`), `schema.sql` de Ángel (`01`) y GRANT (`02-grants.sql`). El scheduler es un hilo opcional que llama al mismo pipeline. El workflow de ingesta corre el modo `--solo-metadatos` del script del frontend.

## 3. Qué es de Ángel y qué es mío
| De Ángel (no se cambió la lógica) | Mío (capa de datos y automatización) |
| --- | --- |
| `schema.sql`, health score, sanitizer, rutas, pipeline, `DatabaseClient` en memoria | `postgres_client.py`, `create_db_client()` y 2 líneas de configuración (`database_url`, `ingest_schedule_hours`), `list_all_repositories()` en el store en memoria, `scheduler.py` + su arranque en `lifespan`, `docker-compose.yml`, `backend/db/init/`, tests nuevos, workflow, `--solo-metadatos`, docs |

## 4. Amenazas y controles
| Amenaza | Control | RNF | Riesgo |
| --- | --- | --- | --- |
| Inyección SQL (A03, MU-33) | Todo con parámetros; `LIKE` escapado; sin f-strings con valores | RNF-35 | R-30 |
| Escritura anónima / lectura de lo interno (A01, MU-34) | RLS sin cambios + GRANT mínimos; login del backend no superusuario; pruebas con un login `anon` real | RNF-34 | R-30 |
| Credenciales de la base (A02, MU-35) | Solo entorno; el DSN fuera de `repr` y logs; solo loopback | RNF-35 | R-29 |
| Workflow con permisos de escritura (A08, MU-36) | Permisos mínimos, acciones por SHA, sin `pull_request`, rama propia y PR revisado | RNF-36 | R-31 |
| Token de ingesta con más alcance que lectura | `GITHUB_TOKEN` efímero en Actions; por entorno en local | RNF-36 | R-32 |
| `clear()` en una base real (A04) | Deshabilitado salvo `allow_clear=True` | RNF-35 | R-29 |

## 5. Pruebas
`test_postgres_client.py` (14: CRUD, upsert, filtros, inyección, `clear`, `repr`, RLS), `test_scheduler.py` (3), prueba de reinicio con 108 repos y del frontend con `CATALOG_SOURCE=backend`. Sin `TEST_DATABASE_URL` las pruebas de base se saltan.
