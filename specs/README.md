# Specs

Spec-Driven Development manual. Cada feature tiene su carpeta:

```
specs/
├── constitution.md          principios no negociables
├── _templates/              plantillas para copiar
└── 001-nombre-feature/
    ├── spec.md              QUÉ y POR QUÉ (+ clarificaciones)
    ├── plan.md              CÓMO (arquitectura, datos, amenazas)
    └── tasks.md             tareas y validación
```

Flujo: constitución → especificación → clarificación → plan técnico → tareas → implementación → validación. Todo cambio vuelve al spec.

| # | Feature | Dueño | Estado |
| --- | --- | --- | --- |
| 001 | Frontend: catálogo y ficha | Jero | pendiente |
| 002 | Asistente RAG + guardrails | Jero | pendiente |
| 003 | Backend y pipeline de ingesta | Ángel | pendiente |
