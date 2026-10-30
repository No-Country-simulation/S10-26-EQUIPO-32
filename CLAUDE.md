# CLAUDE.md — Reglas de trabajo para Claude Code en OpenBridge

Este repo se desarrolla con **Spec-Driven Development (SDD)** manual (sin Spec Kit) y **security by design**.
Leé siempre `specs/constitution.md` antes de proponer o escribir código. Si una instrucción contradice la constitución, frená y avisá.

## Flujo obligatorio por feature

Cada feature vive en `specs/NNN-nombre-feature/` y avanza en este orden. **No saltes etapas y no escribas código antes de la etapa 6.**

1. **Constitución** — `specs/constitution.md` (ya existe, se respeta siempre).
2. **Especificación** — `spec.md` desde `specs/_templates/spec.md`. Describe QUÉ y POR QUÉ, nunca CÓMO (sin frameworks, librerías ni código).
3. **Clarificación** — completá la sección "Preguntas abiertas" del spec y hacéselas al usuario. No avances con preguntas sin responder; registrá las respuestas en el spec.
4. **Plan técnico** — `plan.md` desde la plantilla: arquitectura, stack, modelo de datos, amenazas y controles. Verificá cada decisión contra la constitución.
5. **Tareas** — `tasks.md`: tareas chicas, ordenadas, cada una con el RF/RNF que implementa y su criterio de terminado.
6. **Implementación** — una tarea por vez, marcándola en `tasks.md` al terminar.
7. **Validación** — correr pruebas y criterios de aceptación del spec; registrar resultados en `tasks.md`.

**Todo cambio de alcance vuelve a `spec.md` primero.** Si durante el plan o la implementación aparece algo no previsto, actualizá el spec, avisá al usuario y recién después seguí.

## Reglas de seguridad (no negociables)

- Nunca escribas secretos, tokens ni claves en archivos del repo. Usá variables de entorno y documentalas en `.env.example` sin valores.
- Todo input externo (usuario, GitHub API, salida del LLM) se valida y nunca se renderiza como HTML ni se ejecuta.
- El frontend solo usa la clave pública de Supabase. `SUPABASE_SERVICE_ROLE_KEY` nunca en `apps/web`.
- Cada feature lista en su `plan.md` sus amenazas (STRIDE + OWASP Top 10 web / LLM) y los controles que las mitigan.

## Convenciones

- Ramas: `NNN-nombre-feature` (ej. `001-asistente-rag`). Nunca trabajar sobre `main`.
- Commits: Conventional Commits con ID de requisito cuando aplique: `feat(rag): validar input (RNF-03)`.
- Un PR por feature, usando `.github/pull_request_template.md`.
- Idioma de la documentación: español.

## Estructura

- `apps/web/` frontend (Next.js + Tailwind) — dueño: Jero
- `backend/` API y pipeline — dueño: Ángel
- `specs/` constitución, plantillas y features
- `docs/` SRS, casos de uso, matriz de riesgos, perfil NIST CSF, OWASP, red-team
