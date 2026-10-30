# SRS — OpenBridge

**Versión:** 0.1 · **Fecha:** 2026-10-30 · **Responsable:** Jerónimo Núñez (propone) · Ángel De La Rosa (revisa)
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
| RF-06 | El usuario describe su negocio y el asistente devuelve un stack recomendado con justificación y repos citados | M | Solo cita repos existentes en la BD | 002 |
| RF-07 | El pipeline consulta la GitHub API diariamente y actualiza metadatos y health score | M | Log de corrida diaria | 003 |
| RF-08 | El pipeline genera y guarda embeddings de cada repo | M | 100 % de repos con vector | 003 |
| RF-09 | Health score con fórmula documentada | M | Fórmula en README + tests | 003 |
| RF-10 | Un admin puede dar de alta o baja un repo | C | Alta/baja visible en catálogo | — |

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
| RNF-15 | Producto · Usabilidad | Interfaz solo en modo oscuro, sin selector de tema | M | Revisión visual con sistema en modo claro | 001 |
| RNF-16 | Producto · Accesibilidad | WCAG 2.1 AA acotado: 1.4.3, 1.4.11, 2.1.1, 2.1.2, 2.4.3, 2.4.7, 3.3.2, 4.1.2, 3.1.1 | M | axe + prueba manual de teclado | 001 |
| RNF-17 | Producto · Usabilidad | Textos de interfaz en diccionario; entrega en español, inglés como mejora | C | Diccionario único; sin textos hardcodeados | 001 |

## 5. Trazabilidad

Riesgo → control → requisito → prueba: ver `docs/matriz-riesgos.md`.

## 6. Cambios

| Fecha | Cambio | Origen |
| --- | --- | --- |
| 2026-10-30 | RNF-08 pasa de 001/003 a 003. RF-02 incluye categorías, mantenedor activo y enlace al repo. RF-05 separa el requisito de datos (≥ 1 idea, 003) del comportamiento de la interfaz (0..N, 001). | Plan 001, decisiones 2 y 3 |
