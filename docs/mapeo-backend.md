# Mapeo backend → catálogo (`CATALOG_SOURCE=backend`)

**Fecha:** 2026-11-13 · **Feature:** 001, B9 (spec §10, plan §9) · **Backend:** `backend/` (FastAPI de Ángel, commit `fe1f22a`) · **Adaptador:** `apps/web/src/lib/catalogo/adaptadores/backend.ts`

El backend es una fuente **no confiable** (P5): cada respuesta pasa por un sobre validado con zod y después por `contrato.ts`. Si algo no valida, el adaptador **falla cerrado**: error genérico del catálogo o «Sin dato», nunca un valor inventado ni datos de otra fuente.

## Endpoints que usa el frontend

| Endpoint | Acceso | Para qué |
| --- | --- | --- |
| `GET /api/v1/repositories?limit=100` | Público | Grilla |
| `GET /api/v1/repositories/{owner}/{repo}` | Público | Desglose y nivel de mantenimiento de cada repo |

Ninguno lleva credenciales (P3). `POST /api/v1/ingestion/batch` (con `ADMIN_API_KEY`) solo lo usa la herramienta de operación `npm run sembrar:backend`, nunca el runtime.

Controles del cliente HTTP: solo `GET`, `redirect: 'error'`, timeout de 3 s, respuesta ≤ 1 MB, `Content-Type` JSON, `BACKEND_URL` solo de servidor (origen http(s) sin credenciales ni ruta).

## Campos

| Catálogo | Backend | Regla |
| --- | --- | --- |
| `id` | `full_name` | El id de `data/repos-reales.json` si el repo está ahí (los enlaces del asistente siguen valiendo); si no, `owner--repo` en minúsculas. Un id inválido → el repo se omite. |
| `nombre` | `name` | El nombre curado de `data/repos-reales.json` cruzando por `full_name`, sin distinguir mayúsculas («Prisma ORM» en vez de «orm»). Si el repo no está ahí, el nombre del backend, que igual valida el contrato. Se usa en la grilla y en la ficha. |
| `urlRepo` | `html_url` | Solo `https://github.com/...`; si no, sin enlace. |
| `descripcion` | `description` | Tal cual (en inglés). |
| `categorias` | `category` | Debe ser una de las 6 del catálogo; si no, el repo se omite. |
| `stars` / `issuesAbiertos` | `stars_count` / `open_issues_count` | Enteros ≥ 0; si no, «Sin dato». Un string no se convierte. |
| `licencia` | `license_spdx` | `NOASSERTION` → «Sin licencia declarada». |
| `lenguaje` | `language` | — |
| **Indicador de salud** | `health_score` | Número en [0, 100], redondeado a entero; si no, «Sin dato». |
| **Nivel de mantenimiento** | `health_breakdown.commit_frequency_score` | Ver abajo. |
| **Desglose (ficha)** | `health_breakdown.*` | Ver abajo. |
| `metricasTomadasEn` | `health_breakdown.calculated_at` | Fecha de ingesta (cuándo se leyó GitHub). |
| Última actualización, mantenedor activo | — | «Sin dato»: la API no los expone. |
| Ideas de integración | — | Estado vacío: el backend no tiene ideas. |

## Nivel de mantenimiento

Se deriva de la actividad de commits que calcula el backend (`_score_commit_recency`, máximo 25):

| `commit_frequency_score` | Significa (según el backend) | Nivel |
| --- | --- | --- |
| 25 | Último push hace ≤ 30 días | **Activo** |
| ≥ 15 (20 o 15) | ≤ 90 o ≤ 180 días | **Moderado** |
| < 15 (8, 5 o 2) | ≤ 365 días, fecha ilegible o más de un año | **Bajo** |
| Desglose ausente o inválido | — | «Sin dato» |

«Abandonado» no se deriva del backend: no expone una señal de abandono (archivado aparece como penalización en el desglose). El nivel solo se calcula si el desglose completo es válido.

## Desglose del health score (ficha)

| Componente | Campo del backend | Máximo |
| --- | --- | --- |
| Actividad de commits | `commit_frequency_score` | 25 |
| Gestión de issues | `issue_resolution_score` | 20 |
| Licencia | `license_score` | 20 |
| Comunidad | `community_score` | 20 |
| Documentación | `documentation_score` | 15 |
| Penalización por archivado | `penalty_archived` | booleano |

Todo o nada: si un componente falta, no es numérico, es negativo o supera su máximo, no se muestra ningún componente («Sin dato»). Los máximos se fijan en el frontend y no se toman del backend.

## Límites conocidos

- **Rate limit (R-21, mitigado):** el backend permite 60 pedidos/min por IP y la lista no trae el desglose, así que cada tanda cuesta 1 + 30 pedidos. El adaptador guarda en memoria del servidor, durante 60 s, la lista y los desgloses; las cargas concurrentes comparten la misma tanda y los errores no se guardan. Medido con el backend real: 4 cargas seguidas → 31 pedidos, 0 respuestas 429. El 429 que se vio antes vino de varias corridas del e2e seguidas (cada una levanta un servidor nuevo, con su caché vacía). Sugerencia para el backend: incluir el desglose (o el nivel) en la lista.
- **Store en memoria:** si el backend se reinicia, la lista vuelve vacía y el catálogo muestra el estado «No encontramos herramientas» hasta volver a sembrar (R-19).
