# Spec 005 — Catálogo de 100+ repos reales

**Dueño:** Jero · **Estado:** aprobado (consigna del 2026-11-13) · **Fecha:** 2026-11-13

> Qué y por qué. El cómo va en `plan.md`.

## 1. Problema y objetivo

La consigna pide un catálogo de **al menos 100 repos reales**. Hoy hay 30 (RF-12), armados a mano. El objetivo es llegar a ≥ 100 repos reales, activos y con licencia aprobada por la OSI, repartidos en las 6 categorías, con métricas reales de GitHub, ideas de integración marcadas como no revisadas, el logo oficial de cada organización y un asistente que siga sin inventar (P6) ni regresionar en el red-team.

Se cumple cuando: el catálogo y el índice del asistente tienen ≥ 100 repos que pasan el contrato, la ingesta corre sola (apta para un cron), y el red-team v2 sobre el índice nuevo no empeora respecto de v2 con 30.

## 2. Usuarios y actores

- **Visitante:** recorre el catálogo, abre fichas y consulta al asistente.
- **Cron de ingesta (sin intervención humana):** regenera el dataset, los logos y los embeddings.
- **API de GitHub y `avatars.githubusercontent.com`:** fuentes externas **no confiables** (P5).
- **LLM local (Ollama):** genera ideas de integración; su salida es **no confiable**.
- **Backend (feature 003):** fuente alternativa del catálogo, con límite de 60 requests/min por IP.
- **Atacante:** controla la descripción, el nombre o el avatar de un repo de GitHub, o intenta inyectar instrucciones en el texto que lee el LLM.

## 3. Historias de usuario

- Como visitante, quiero ver más de 100 herramientas reales con su logo, para reconocerlas de un vistazo.
- Como visitante, quiero que el asistente elija entre más opciones sin inventar repos.
- Como equipo, queremos una lista curada y versionada de repos, para que frontend y backend ingieran lo mismo.
- Como equipo, queremos que la ingesta corra en un cron sin intervención y falle con un código de error y un log claro.

## 4. Requisitos funcionales

| ID | Requisito | Prioridad | Criterio de aceptación |
| --- | --- | --- | --- |
| RF-16 | Lista curada y versionada de ≥ 100 repos reales (`data/semilla-repos.json`: `owner/repo`, id, nombre y categorías; la primera es la principal) con el criterio de selección documentado en el mismo archivo. Cada repo: no archivado, no fork, último push ≤ 180 días y licencia OSI | M | Test: ≥ 100 entradas, ≥ 15 por categoría principal, ids únicos y válidos. La ingesta rechaza los que no cumplen el criterio contra la API |
| RF-17 | Ingesta sin intervención: lee la semilla, trae metadatos reales de la API de GitHub (token solo por entorno), conserva lo curado de los repos ya existentes, genera ideas para los nuevos con el LLM local (validadas por el contrato, `revisada: false`), regenera `repos-reales.json` y los embeddings. Sale con código ≠ 0 y un log claro ante cualquier falla, sin escribir un dataset a medias | M | Corrida real registrada en `tasks.md`; test de las funciones puras (criterio, mapeo, validación de ideas) |
| RF-18 | Logo oficial de cada repo: el avatar de la organización u owner, guardado como archivo propio del sitio y listado en `public/logos/fuentes.json` con origen y fecha. Se muestra en tarjetas, ficha, carrusel, asistente y los íconos de la portada; si falta, se usa la marca generativa | M | Test del componente (con y sin logo) y de la validación de la imagen |
| RF-19 | Con `CATALOG_SOURCE=backend`, la grilla no pide desgloses: usa el health score de la lista. El desglose se pide solo al abrir una ficha. El nivel de mantenimiento en la grilla queda «Sin dato» con esa fuente (documentado en `docs/mapeo-backend.md`) | M | `adaptador-backend.test.ts`: cargar la grilla con 108 repos hace ≤ 2 requests; abrir una ficha hace 1 más |

## 5. Requisitos no funcionales

| ID | Tipo | Requisito | Cómo se verifica |
| --- | --- | --- | --- |
| RNF-26 | Producto · Seguridad | Logos: solo desde `https://avatars.githubusercontent.com`, sin seguir redirecciones; solo PNG o JPEG verificados por magic bytes (nunca SVG); ≤ 200 KB; nombre de archivo derivado del id validado por el contrato; CSP sin cambios (`img-src 'self'`) | Tests de `validarLogo` + `headers.spec` sin cambios |
| RNF-27 | Producto · Seguridad | Las ideas generadas por el LLM son datos no confiables: pasan el contrato, se guardan con `revisada: false` y nunca se ejecutan ni se renderizan como HTML | Test de la validación de ideas + `repos-reales.test.ts` |
| RNF-28 | Producto · Disponibilidad | El catálogo con fuente backend no supera el límite de 60 requests/min del backend sin subirlo | Test del adaptador (requests por carga) + R-21 en la matriz |
| RNF-29 | Producto · Seguridad | El asistente con el índice de ≥ 100 repos no regresiona: la batería del red-team v2 da el mismo resultado o mejor que v2 con 30 | `docs/red-team.md` actualizado con la corrida real |

## 6. Casos de mal uso

| ID | El atacante intenta… | Resultado esperado del sistema |
| --- | --- | --- |
| MU-25 | Cambiar su avatar por un SVG con script, un HTML disfrazado o un archivo enorme | La ingesta lo descarta (magic bytes / tamaño); la interfaz muestra la marca generativa |
| MU-26 | Que la URL del avatar apunte a otro host o redirija a uno interno | Se descarta: solo `avatars.githubusercontent.com` por https y sin redirecciones |
| MU-27 | Poner instrucciones en la descripción del repo para que el LLM genere una idea con un snippet malicioso o un enlace | La idea pasa el contrato, queda `revisada: false`, se muestra como texto y nunca se ejecuta; si no valida, se descarta |
| MU-28 | Renombrar o archivar un repo de la semilla | La ingesta usa el `owner/repo` canónico de la API; un repo que deja de cumplir el criterio se excluye con un aviso en el log |

## 7. Fuera de alcance

- Revisar a mano las ideas generadas (quedan `revisada: false`).
- Cambiar el backend, su rate limit, `docker-compose` o los workflows de CI (los trabaja otra sesión).
- Configurar el cron (la ingesta queda lista para uno).
- Traducir las descripciones de GitHub: los repos nuevos usan la descripción real del repo, en su idioma.

## 8. Preguntas abiertas (clarificación)

Respondidas por la consigna del 2026-11-13; las decisiones que la consigna no fija quedan marcadas como **D** y se avisan en el PR.

| # | Pregunta | Respuesta | Fecha |
| --- | --- | --- | --- |
| 1 | ¿Cuántos repos y cómo se reparten? | ≥ 100 reales en las 6 categorías, activos y con licencia OSI. Si no se llega, el número real, sin sintéticos | 2026-11-13 |
| 2 | ¿Dónde vive la lista? | `data/semilla-repos.json` en la raíz del repo, compartida con el backend; se mergea primero en un PR chico | 2026-11-13 |
| 3 | ¿Qué es «activo» y qué es «licencia OSI»? | **D:** activo = no archivado, no fork y último push ≤ 180 días. OSI = SPDX de la lista OSI informado por GitHub; los repos open-core (partes con licencia no OSI) quedan afuera aunque el núcleo sea OSI. Excepción documentada: pgvector (PostgreSQL License que GitHub no detecta) | 2026-11-13 |
| 4 | ¿Se quitan repos de los 30 actuales? | **D:** sí, los que no cumplen el criterio (supertokens-core, medusa, posthog, metabase, meilisearch: open-core). Se reemplazan por repos que sí cumplen; quedan en `excluidos` de la semilla | 2026-11-13 |
| 5 | ¿Qué script genera el dataset? | No había script para los 30 (se armaron a mano). **D:** se crea `scripts/ingestar-repos.mjs`, que conserva lo curado de los 30 (descripción en español e ideas) | 2026-11-13 |
| 6 | ¿Qué modelo genera las ideas? | Ollama local, el modelo de chat del asistente; validadas por el contrato y `revisada: false` | 2026-11-13 |
| 7 | ¿Extensión de los logos? | **D:** `<id>.png` o `<id>.jpg` según los magic bytes, para que el tipo servido coincida con el contenido (`nosniff`) | 2026-11-13 |
| 8 | ¿Mantenimiento en la grilla con backend? | Sin desglose en la grilla: «Sin dato» con esa fuente; la ficha lo muestra con el desglose | 2026-11-13 |

## 9. Criterios de aceptación de la feature

- [ ] `data/semilla-repos.json` con ≥ 100 repos y criterio documentado, mergeado antes que el resto.
- [ ] `repos-reales.json` y `embeddings.json` regenerados por la ingesta con ≥ 100 repos que pasan el contrato.
- [ ] Logos en `public/logos/` con `fuentes.json`; fallback a la marca generativa.
- [ ] Grilla con backend en ≤ 2 requests; desglose solo en la ficha.
- [ ] Red-team v2 sobre el índice nuevo registrado en `docs/red-team.md`, sin regresión.
- [ ] Tests, README, SRS y matriz actualizados; CI en verde.
