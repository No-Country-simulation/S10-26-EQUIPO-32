# SRS — OpenBridge

**Versión:** 1.0 (cierre de entrega) · **Fecha:** 2026-10-30, actualizada 2026-11-13 · **Responsable:** Jerónimo Núñez (propone) · Ángel De La Rosa (revisa)
**Base:** ISO/IEC/IEEE 29148 (ex IEEE 830), versión reducida para la simulación.

> Regla: todo requisito es verificable (tiene un criterio finito para probarlo). Prioridad MoSCoW: M = Must, S = Should, C = Could.
> Los specs de cada feature (`specs/NNN-*/spec.md`) refinan estos requisitos; si hay diferencia, se actualiza este documento.

## 1. Propósito y alcance

OpenBridge centraliza un catálogo de ≥ 100 herramientas open-source con métricas de salud y un asistente RAG que recomienda un stack según el modelo de negocio. Usuarios: arquitectos y líderes técnicos de una consultora con 30+ proyectos/año.

## 2. Actores

| Actor | Tipo |
| --- | --- |
| Arquitecto / líder técnico | Humano (principal) |
| Admin del catálogo | Humano |
| Scheduler (cron / GitHub Action) | Sistema |
| GitHub API, proveedor LLM | Sistema externo |
| Atacante | Mal uso (para derivar casos de mal uso) |

## 3. Requisitos funcionales

| ID | Requisito | Prioridad | Criterio de verificación | Feature |
| --- | --- | --- | --- | --- |
| RF-01 | El sistema muestra el catálogo agrupado por categoría funcional (Auth, BD, Pagos, IA, Analítica, Búsqueda) | M | Cada categoría lista sus repos | 001 |
| RF-02 | Ficha técnica por repo: nombre, categorías, descripción, stars, última actualización, licencia, lenguaje, issues abiertos, mantenedor activo (sí/no), health score y enlace al repositorio original (solo `https://github.com`) | M | Ficha con los campos poblados; campo sin dato = "Sin dato"; enlace ausente si la URL no cumple la regla | 001 |
| RF-03 | Filtros por lenguaje, licencia, stars mínimos, categoría y nivel de mantenimiento | M | Cada filtro reduce el resultado correctamente | 001 |
| RF-04 | Búsqueda por texto libre | S | "auth" devuelve Keycloak / Auth.js | 001 |
| RF-05 | Ideas de integración estructuradas (tipo REST/Docker/SDK/webhook, disparadores, snippet, stack compatible, dificultad, estado de revisión). **Dato (003):** cada repo tiene ≥ 1 idea. **Interfaz (001):** muestra 0..N ideas; con 0 ideas, estado vacío explícito | M | Esquema validado, sin texto plano suelto. 003: 100 % de repos con ≥ 1 idea. 001: ficha con 0 ideas muestra el estado vacío sin errores | 001 / 003 |
| RF-06 | El usuario describe su negocio y el asistente devuelve un stack recomendado con justificación y repos citados | M | Solo cita repos existentes en el índice (`data/repos-reales.json` en el MVP; la BD en 003); sin contexto suficiente responde «sin contexto» | 002 |
| RF-07 | El pipeline consulta la GitHub API diariamente y actualiza metadatos y health score | M | Log de corrida diaria | 003 |
| RF-08 | El pipeline genera y guarda embeddings de cada repo | M | 100 % de repos con vector | 003 |
| RF-09 | Health score con fórmula documentada | M | Fórmula en README + tests | 003 |
| RF-10 | Un admin puede dar de alta o baja un repo | C | Alta/baja visible en catálogo | — |
| RF-11 | Panel del asistente desde la cabecera: campo de ≤ 500 caracteres, stack, justificación y repos citados enlazados a su ficha | M | Test del panel (`asistente-panel.test.tsx`) y E2E del botón | 002 |
| RF-12 | Dataset real de 30 repos (5 por categoría principal, ideas sin revisar; ampliado a ≥ 100 por RF-16) validado con el contrato del catálogo | M | `repos-reales.test.ts` | 002 |
| RF-13 | Embeddings precalculados por script y búsqueda por similitud coseno en memoria | M | `npm run embeddings` + test del índice | 002 |
| RF-14 | Set de red-team de 10 ataques y script que genera `docs/red-team.md` con y sin guardrails | M | Corrida real registrada en `docs/red-team.md` | 002 |
| RF-15 | Con `CATALOG_SOURCE=backend`, la ficha muestra el desglose del health score en sus 5 componentes con sus máximos (25/20/20/20/15) y la penalización por archivado; todo o nada | M | `ficha.test.tsx` + e2e con backend | 001 (B9) |
| RF-16 | Lista curada y versionada de ≥ 100 repos reales (`data/semilla-repos.json`), activos y con licencia OSI, repartidos en las 6 categorías, con el criterio de selección documentado | M | Test de la semilla (≥ 100, ≥ 15 por categoría, ids únicos) + criterio aplicado contra la API en la ingesta | 005 |
| RF-17 | Ingesta sin intervención (apta para cron): metadatos reales de la API de GitHub, ideas nuevas del LLM local validadas por el contrato con `revisada: false`, regenera `repos-reales.json` y embeddings; código de error y log claro ante una falla | M | Corrida real registrada en `specs/005-catalogo-100/tasks.md` + tests de las funciones puras | 005 |
| RF-18 | Logo oficial (avatar de la org u owner) en tarjetas, ficha, carrusel, asistente y portada, con la marca generativa como fallback | M | Test del componente con y sin logo | 005 |
| RF-20 | Todo CTA hace algo real (asistente, catálogo, footer a docs existentes); cards del carrusel y la grilla abren la ficha | M | `interacciones.spec.ts` | 007 |
| RF-21 | Las tabs Recientes y Mejor salud reordenan la grilla | M | `interacciones.spec.ts`, `orden.test.ts` | 007 |
| RF-22 | Carrusel con puntos de posición y arrastre con mouse o touch | M | `interacciones.spec.ts` | 007 |
| RF-23 | Consultas de ejemplo que se envían y estado de carga en el asistente | M | `interacciones.spec.ts` | 007 |
| RF-24 | Captura real de producto desde el README (solo si hay una válida), con origen y licencia; si no, `PantallaPreview` | M | `capturas.test.tsx` + corrida real | 007 |
| RF-25 | 3 a 5 fotos decorativas con crédito en el footer | S | `capturas.test.tsx`, `interacciones.spec.ts` | 007 |
| RF-26 | Teclado y `prefers-reduced-motion` en todo lo anterior | M | `interacciones.spec.ts` | 007 |
| RF-27 | Persistencia del backend en Postgres + pgvector con RLS (`DATABASE_URL`; sin ella, memoria) y base local por `docker-compose` | M | `test_postgres_client.py` + prueba de reinicio con 108 repos | 006 |
| RF-28 | Ingesta programada semanal (`--solo-metadatos`) que abre un PR con el resultado | M | Corrida del workflow + modo idempotente | 006 |
| RF-29 | Scheduler opcional del backend (`INGEST_SCHEDULE_HOURS`), apagado por defecto | S | `test_scheduler.py` | 006 |
| RF-19 | Con `CATALOG_SOURCE=backend` la grilla no pide desgloses (health score de la lista); el desglose se pide solo en la ficha | M | `adaptador-backend.test.ts` (requests por carga) | 005 |

## 4. Requisitos no funcionales

Clasificación: de producto, organizacionales y externos.

| ID | Tipo | Requisito | Prioridad | Verificación | Feature |
| --- | --- | --- | --- | --- | --- |
| RNF-01 | Producto · Seguridad | Ningún secreto en el repo; solo env / GitHub Secrets | M | Gitleaks en CI sin hallazgos | todas |
| RNF-02 | Producto · Seguridad | El frontend solo lee; solo el pipeline escribe (mínimo privilegio, RLS) | M | Escritura con anon key falla | 001 / 003 |
| RNF-03 | Producto · Seguridad | El asistente resiste prompt injection directa e indirecta | M | Set ≥ 10 ataques; % bloqueado documentado | 002 |
| RNF-04 | Producto · Seguridad | Contenido externo y salida del LLM nunca se renderizan como HTML/JS ejecutable | M | Payload XSS no se ejecuta | 001 / 002 |
| RNF-05 | Producto · Seguridad | Rate limiting en el endpoint del asistente | M | Request por encima del límite devuelve 429 | 002 |
| RNF-06 | Producto · Rendimiento | El pipeline respeta el rate limit de GitHub (backoff, headers de rate limit) | M | Corrida completa sin 403/429 | 003 |
| RNF-07 | Producto · Rendimiento | El catálogo filtra en < 1 s con 100+ repos | M | Medición sobre dataset sintético de 150 | 001 |
| RNF-08 | Producto · Confiabilidad | Si falla la ingesta, se conserva y se sirve el último dato válido con su fecha. (001 solo muestra la fecha de las métricas y un estado de error si no hay datos; la conservación del último dato es del pipeline) | S | Simular API caída | 003 |
| RNF-09 | Producto · Precisión | El asistente no inventa repos | M | 0 repos alucinados en el set de prueba | 002 |
| RNF-10 | Producto · Usabilidad | Interfaz responsiva (mobile y desktop) | M | Prueba en 2 tamaños | 001 |
| RNF-11 | Organizacional | Stack acordado; PR revisado por el otro integrante | M | Historial de PRs | todas |
| RNF-12 | Organizacional | Entrega antes del 16/11/2026 con README, SRS y matriz de riesgos | M | Fecha de entrega | — |
| RNF-13 | Externo · Legal | Licencia visible en el 100 % de las fichas; sin PII de usuarios | M | Revisión de fichas | 001 |
| RNF-14 | Externo · Supply chain | Dependencias escaneadas (Dependabot / audit) | M | 0 vulnerabilidades críticas abiertas | todas |
| RNF-15 | Producto · Usabilidad | Interfaz solo en tema claro, sin selector y sin depender del sistema | M | Revisión visual con sistema en modo claro y oscuro | 001 |
| RNF-16 | Producto · Accesibilidad | WCAG 2.1 AA acotado: 1.4.3, 1.4.11, 2.1.1, 2.1.2, 2.4.3, 2.4.7, 3.3.2, 4.1.2, 3.1.1 | M | axe + prueba manual de teclado | 001 |
| RNF-17 | Producto · Usabilidad | Textos de interfaz en diccionario; entrega en español, inglés como mejora | C | Diccionario único; sin textos hardcodeados | 001 |
| RNF-18 | Producto · Calidad visual | Composición fiel a la referencia, aprobada por revisión visual de Jerónimo; tema claro e identidad OpenBridge según spec 001 §1.1–1.2 | M | Revisión visual de Jerónimo (T34) | 001 |
| RNF-19 | Producto · Seguridad | El asistente nunca devuelve su system prompt (canario + detección de fragmentos) | M | Test unitario + ataque MU-14 del red-team | 002 |
| RNF-20 | Producto · Seguridad | Entrada del asistente: JSON, cuerpo ≤ 4 KB, consulta ≤ 500 caracteres normalizada | M | Tests del route handler (400/413/415) | 002 |
| RNF-21 | Producto · Seguridad | El modo sin guardrails del red-team no tiene efecto en producción | M | Test unitario de configuración y del handler | 002 |
| RNF-22 | Producto · Privacidad | LLM local: la consulta no sale del servidor y no se registra | M | Revisión de código (logs solo con códigos) | 002 |
| RNF-23 | Producto · Seguridad | Mitigar MU-19: jailbreak por rol/persona, ficción o hipótesis, en otro idioma u ofuscado → «sin contexto», sin bloquear consultas legítimas | M | Red-team v1 vs v2 (`docs/red-team.md`) + tests del detector | 002 |
| RNF-24 | Producto · Seguridad | El backend es fuente no confiable: respuesta validada por el contrato; malformada, lenta (> 3 s), redirigida o caída → error genérico, sin datos inventados; runtime sin credenciales | M | `adaptador-backend.test.ts` + e2e con backend | 001 (B9) |
| RNF-25 | Producto · Seguridad | Siembra del backend fuera del runtime: `ADMIN_API_KEY` solo por entorno, nunca en archivos ni logs; verifica que escribir sin credencial sea rechazado | M | Corrida real de `sembrar:backend` | 001 (B9) |
| RNF-26 | Producto · Seguridad | Logos solo de `avatars.githubusercontent.com`, sin redirecciones, PNG o JPEG por magic bytes (nunca SVG), ≤ 200 KB, nombre derivado del id validado; CSP sin cambios | M | Tests de la validación del logo | 005 |
| RNF-27 | Producto · Seguridad | Ideas generadas por el LLM: no confiables, validadas por el contrato, `revisada: false`, nunca ejecutadas ni renderizadas como HTML | M | Test de validación de ideas + `repos-reales.test.ts` | 005 |
| RNF-28 | Producto · Disponibilidad | Con fuente backend el catálogo no supera 60 requests/min sin subir el límite del backend | M | Test del adaptador + R-21 | 005 |
| RNF-29 | Producto · Seguridad | El asistente con ≥ 100 repos no regresiona en la batería del red-team v2 | M | `docs/red-team.md` | 005 |
| RNF-34 | Producto · Seguridad | RLS sin debilitar: anon lee el catálogo y no escribe ni lee embeddings ni audit logs; el login del backend opera como `service_role` | M | `test_postgres_client.py` (RLS) | 006 |
| RNF-35 | Producto · Seguridad | SQL parametrizado, `LIKE` escapado, `clear()` solo en pruebas, DSN fuera de logs | M | Test de inyección | 006 |
| RNF-36 | Producto · Cadena de suministro | Workflow de ingesta con permisos mínimos, acciones por SHA y `GITHUB_TOKEN` propio | M | Revisión del YAML + Gitleaks | 006 |
| RNF-30 | Producto · Seguridad | Capturas: 4 hosts de GitHub, https, redirecciones validadas por salto, PNG/JPEG/WebP por magic bytes, ≤ 600 KB, nombre del id | M | `capturas.test.tsx` | 007 |
| RNF-31 | Producto · Seguridad | Imágenes por `next/image`, `alt` descriptivo, CSP `img-src 'self'` sin cambios | M | `headers.spec.ts`, guarda de `mu.spec.ts` | 007 |
| RNF-32 | Producto | Una captura solo aparece en la card de su propia herramienta y no se repite entre repos | M | `capturas.test.tsx` | 007 |
| RNF-33 | Producto · Seguridad | Red-team held-out con promptfoo: 6 categorías × 5 casos generados localmente (Ollama), mismo set con y sin guardrails, ningún request fuera de localhost; promptfoo aislado en `redteam/promptfoo/` (riesgo de supply chain: R-23) | S | Corridas en `redteam/promptfoo/corridas/` + `docs/red-team.md` §v3 | 002 (§13) |

## 5. Trazabilidad

Riesgo → control → requisito → prueba: ver `docs/matriz-riesgos.md`.

## 6. Cambios

| Fecha | Cambio | Origen |
| --- | --- | --- |
| 2026-10-30 | RNF-08 pasa de 001/003 a 003. RF-02 incluye categorías, mantenedor activo y enlace al repo. RF-05 separa el requisito de datos (≥ 1 idea, 003) del comportamiento de la interfaz (0..N, 001). | Plan 001, decisiones 2 y 3 |
| 2026-11-13 | RF-27 a RF-29 y RNF-34 a RNF-36: persistencia con RLS, ingesta programada y scheduler (feature 006). | Consigna, spec 006 |
| 2026-11-13 | RF-20 a RF-26 y RNF-30 a RNF-32: interacciones reales, capturas de producto y fotos (feature 007). | Consigna, spec 007 |
| 2026-11-13 | RF-16 a RF-19 y RNF-26 a RNF-29: catálogo de ≥ 100 repos reales, ingesta automática, logos oficiales y grilla sin desgloses con backend. RF-12 queda ampliado por RF-16. | Consigna, spec 005 |

## Estado al cierre (2026-11-13)

Resultado real de cada requisito al entregar. Evidencia completa en `specs/001-frontend-catalogo/tasks.md` (Validación), `specs/002-asistente-rag/spec.md` §11 y `docs/red-team.md`. **Cumple** · **Parcial** · **Pendiente** (con motivo).

| ID | Estado | Evidencia o motivo |
| --- | --- | --- |
| RF-01 a RF-05 | Cumple | Vitest + Playwright en CI (`filtros`, `ficha`, `ideas-mapeo`, `filtros-url.spec`, `mu.spec`, `copiar.spec`) |
| RF-06 | Cumple | `asistente-nucleo` y `asistente-route`; red-team: 0 repos fuera del índice |
| RF-07, RF-08, RF-09 | Pendiente de integración | Implementados en `backend/` (feature 003, Ángel); el frontend todavía no los consume |
| RF-10 | Pendiente | Prioridad C, sin feature asignada |
| RF-11 a RF-14 | Cumple | `asistente-panel`, `repos-reales`, `npm run embeddings`, `docs/red-team.md` |
| RNF-01 | Cumple | Gitleaks en CI en verde; un falso positivo triado por fingerprint |
| RNF-02 | Parcial | Frontend solo lectura por construcción; MU-07 sin probar (Supabase fuera del MVP) |
| RNF-03 | Parcial | 9/10 ataques bloqueados con guardrails; **MU-19 abierto** |
| RNF-04, RNF-05 | Cumple | `mu.spec`, `asistente-panel`; test de 429 |
| RNF-06, RNF-08 | Pendiente | Responsabilidad del pipeline (003) |
| RNF-07 | Pendiente | `rnf07.spec` fuera del MVP; sin medición no se declara (P7) |
| RNF-09 | Cumple | 0 repos alucinados en el red-team con guardrails |
| RNF-10 | Pendiente | Revisión manual T34 sin registrar |
| RNF-11 | Parcial | PRs con CI; revisión cruzada suspendida por **EX-01** |
| RNF-12 | Cumple | Entrega 13/11 con README, SRS y matriz |
| RNF-13 | Cumple | Licencia o «Sin dato» visible en todas las fichas (`licencia.test`, `mu.spec`) |
| RNF-14 | Cumple | `check:deps` + `npm audit --audit-level=critical` en CI |
| RNF-15 | Cumple | `headers.spec` con el sistema en claro y en oscuro |
| RNF-16 | Pendiente | Teclado y axe fuera del MVP |
| RNF-17 | Cumple (español) | Lint `jsx-no-literals` + `i18n.test`; inglés no entregado (C) |
| RNF-18 | Pendiente | Aprobación visual de Jerónimo sin registrar |
| RNF-19 a RNF-22 | Cumple | Tests de 002; MU-14 bloqueado |
| RNF-23 | Cumple en la batería | Red-team v2 13/13 (v1 11/13), 0/5 falsos positivos; generalización sin medir (AM-29) |
| RF-16 | Cumple | `data/semilla-repos.json`: 108 repos, 18 por categoría, criterio verificado contra la API (`semilla-repos.test.ts`) |
| RF-17 | Cumple | Corrida real de `npm run ingesta` del 13/11: 108 repos, 0 excluidos, 83 con ideas nuevas, exit 0 (`specs/005-catalogo-100/tasks.md`); `ingesta.test.ts` |
| RF-18 | Cumple | 108 logos en `public/logos/` con `fuentes.json`; `logo.test.tsx` y guarda de `mu.spec.ts` |
| RF-19 | Cumple | Grilla con 108 repos en 2 requests; desglose solo en ficha (`adaptador-backend.test.ts`). Nivel en la grilla con backend: «Sin dato» |
| RNF-26, RNF-27 | Cumple | `ingesta.test.ts`, `logo.test.tsx`, `repos-reales.test.ts`; CSP sin cambios (`headers.spec`) |
| RNF-28 | Cumple | Peor caso 52 requests/min por instancia (`adaptador-backend.test.ts`); sin medir contra el backend real con 108 |
| RNF-29 | Parcial | Red-team v3 (108 repos): 13/13 bloqueados, 0/5 falsos positivos, 0 fugas, 0 inventados, igual que v2. **Regresión cualitativa en MU-20** (recomienda repos para un pedido de ransomware en vez de «sin contexto»): abierta, R-27 (`docs/red-team.md`) |

