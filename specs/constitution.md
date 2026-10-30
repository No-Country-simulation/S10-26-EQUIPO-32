# Constitución del proyecto — OpenBridge

**Versión:** 0.1 (borrador para revisar con Ángel) · **Fecha:** 2026-10-30
**Equipo:** S10-26-equipo 32 — Ángel De La Rosa, Jerónimo Núñez (Cybersecurity Engineers)
**Simulación:** No Country, Octubre 2026 · cierre 16/11/2026

> Qué es este documento: los principios que no se negocian durante todo el proyecto. Toda spec, plan, tarea y PR se valida contra esto.
> Qué NO es: no es la especificación (qué hace el sistema) ni el plan técnico (cómo se construye). Si algo acá cambia, cambia la versión y se avisa al otro.

---

## 1. Propósito

OpenBridge es un catálogo de herramientas open-source con métricas de salud y un asistente RAG que recomienda un stack según el negocio del usuario. Nuestro diferencial: **un MVP chico, seguro por diseño y trazable de punta a punta** (riesgo → control → requerimiento → prueba).

## 2. Principios

### P1 · Spec primero
Ningún código sin una spec aprobada. Flujo: constitución → especificación → clarificación → plan técnico → tareas → implementación → validación. Todo cambio de alcance vuelve a la spec antes de tocar código.

### P2 · Security by design
La seguridad se define en la spec, no se agrega al final. Cada feature lista sus amenazas (STRIDE + OWASP Top 10 web / OWASP Top 10 para LLM) y sus controles antes del plan técnico.

### P3 · Mínimo privilegio
- El frontend solo lee datos públicos del catálogo.
- Solo el pipeline (rol de servicio) escribe en la base.
- RLS activado en todas las tablas de Supabase.
- Cada clave tiene el alcance mínimo (token de GitHub de solo lectura, sin scopes extra).

### P4 · Cero secretos en el repositorio
Tokens, API keys y credenciales solo en variables de entorno / GitHub Secrets. Existe `.env.example` sin valores. Secret scanning en CI; un hallazgo bloquea el merge.

### P5 · Todo lo externo es no confiable
El input del usuario, los READMEs y metadatos de GitHub y la salida del LLM se tratan como datos no confiables: se validan, se sanitizan y nunca se ejecutan ni se renderizan como HTML.

### P6 · El asistente no inventa
El asistente solo recomienda repos que existen en nuestra base y cita cuáles usó. Si no hay contexto suficiente, lo dice. Una recomendación sin fuente es un bug.

### P7 · Métricas reales o no van
Toda métrica de seguridad o calidad (ataques bloqueados, precisión, latencia) sale de una corrida real y reproducible. Nada se presenta en la demo, README o CV sin evidencia.

### P8 · Simple antes que completo
Ante la duda, menos features y mejor hechas. El orden de recorte, si falta tiempo: (1) extras visuales del frontend, (2) funciones DE/RC de NIST, (3) filtros secundarios. Nunca se recortan P3, P4, P5 ni P6.

### P9 · Revisión cruzada
Todo PR lo revisa el otro integrante antes de mergear a `main`. `main` protegida: sin push directo.

### P10 · Trazabilidad documental
Cada requerimiento tiene ID (RF-xx / RNF-xx), cada riesgo ID (R-xx), y la matriz los conecta. Los commits y PRs referencian el ID que implementan.

## 3. Marcos de referencia

| Marco | Para qué lo usamos | Qué NO es para nosotros |
| --- | --- | --- |
| ISO/IEC/IEEE 29148 (ex IEEE 830) | Formato de la SRS: requerimientos verificables y priorizados | No hacemos la SRS completa del estándar, solo lo necesario |
| NIST CSF 2.0 (GV, ID, PR, DE, RS, RC) | Organizar controles en un perfil y mostrar cobertura | No es una certificación ni una checklist a completar entera |
| OWASP Top 10 (web) | Revisar riesgos del frontend y backend | No es un estándar de cumplimiento |
| OWASP Top 10 para LLM | Revisar riesgos del asistente RAG | Ídem |
| STRIDE | Threat model por componente | — |

## 4. Stack acordado

- Frontend: Next.js + Tailwind
- Backend / pipeline: desarrollado por Ángel (stack a confirmar al subir el código)
- Base: Supabase (Postgres + pgvector + RLS)
- LLM: a definir (API comercial vs. modelo open-source vía Ollama)

## 5. Definición de "terminado" (Definition of Done)

Una tarea está terminada cuando:
- [ ] Implementa la spec y referencia su RF/RNF.
- [ ] Pasó revisión del otro integrante.
- [ ] No introduce secretos (CI verde en secret scanning).
- [ ] Si toca el asistente, pasó el set de pruebas de red-team.
- [ ] La documentación afectada (SRS, matriz de riesgos) está actualizada.

## 6. Roles

| Rol | Responsable |
| --- | --- |
| Backend, pipeline, base vectorial | Ángel |
| Frontend, asistente RAG, guardrails | Jero |
| Red-team del asistente | Jero (con Ángel) |
| Requisitos (SRS, casos de uso) | Jero propone, Ángel revisa |
| Gobernanza y riesgos (NIST, OWASP, matriz) | Jero propone, Ángel revisa |

## 7. Cómo se modifica esta constitución

Cualquiera de los dos propone el cambio por PR sobre este archivo; se mergea solo con aprobación del otro y se sube la versión.
