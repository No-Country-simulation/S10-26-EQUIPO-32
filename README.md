# OpenBridge — Acelerador de Integraciones Open Source

Catálogo inteligente de herramientas open-source con métricas de salud de cada repositorio y un asistente RAG que recomienda un stack según el modelo de negocio.

> Simulación Laboral No Country · Octubre 2026 · Equipo S10-26-EQUIPO-32

## Equipo

| Integrante | Rol | Frentes |
| --- | --- | --- |
| Ángel De La Rosa ([@Arcanalyra](https://github.com/Arcanalyra)) | Cybersecurity Engineer | Backend, pipeline de ingesta, base vectorial |
| Jerónimo Núñez ([@jeronimoenunez](https://github.com/jeronimoenunez)) | Cybersecurity Engineer | Frontend, asistente RAG, guardrails, requisitos y GRC |

## Estructura

```
specs/         Constitución, plantillas y una carpeta por feature (spec, plan, tasks)
apps/web/      Frontend (Next.js + Tailwind)
backend/       API y pipeline de ingesta
docs/          SRS, casos de uso, matriz de riesgos, perfil NIST CSF
CLAUDE.md      Reglas de SDD para Claude Code
.github/       CI, plantillas de PR/issues, CODEOWNERS, Dependabot
```

## Cómo trabajamos

- **Spec-Driven Development:** constitución → especificación → clarificación → plan → tareas → implementación → validación. Ningún código sin spec.
- **Security by design:** cada feature define amenazas y controles en su spec (NIST CSF 2.0, OWASP Top 10 web y LLM).
- **Ramas:** `main` protegida. Una rama por feature (`001-nombre-feature`), un PR por feature, revisado por el otro integrante.
- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/) con el ID del requisito cuando aplica: `feat(rag): validar input (RNF-03)`.
- **Secretos:** nunca en el repo. Copiar `.env.example` a `.env` y completar localmente.

## Seguridad

Ver [SECURITY.md](SECURITY.md).
