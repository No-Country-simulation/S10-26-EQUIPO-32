# Perfil NIST CSF 2.0: OpenBridge

**Versión:** 1.0 · **Fecha:** 2026-11-13 · **Propone:** Jerónimo Núñez · **Revisa:** Ángel De La Rosa (pendiente, EX-01)

> Perfil actual del MVP entregado: qué categorías de CSF 2.0 cubrimos, con qué control y con qué evidencia verificable en el repo. No es una certificación. **Cobertura:** ● implementado con evidencia · ◐ parcial · ○ no cubierto.

| Función | Categoría CSF 2.0 | Control en OpenBridge | Evidencia | Cob. |
| --- | --- | --- | --- | --- |
| **GV** Gobernar | GV.PO Política | Constitución con 10 principios no negociables (P1-P10) | `specs/constitution.md` | ● |
| | GV.RR Roles y responsabilidades | Roles por frente y por documento | Constitución §6, `README.md` | ● |
| | GV.OV Supervisión | Revisión cruzada (P9); excepción formal con dueño, riesgo residual, controles compensatorios y cierre | `docs/matriz-riesgos.md` → EX-01 | ◐ (revisión posterior pendiente) |
| | GV.SC Cadena de suministro | Lista cerrada de dependencias con versión exacta; Dependabot | `apps/web/allowed-deps.json`, `check:deps` en `web.yml`, `.github/dependabot.yml` | ● |
| **ID** Identificar | ID.AM Activos | Inventario de componentes y fuentes de datos | `README.md` (arquitectura), `repositorio.ts` (fuentes) | ◐ |
| | ID.RA Evaluación de riesgos | Matriz R-01 a R-16 con probabilidad, impacto, control, requisito y prueba; STRIDE + OWASP por feature | `docs/matriz-riesgos.md`; amenazas AM-01..16 (plan 001) y AM-17..26 (spec 002) | ● |
| | ID.IM Mejora | Hallazgos convertidos en controles (Trojan Source → hook + CI; MU-19 → siguiente paso) | R-14 en la matriz; `docs/red-team.md` | ◐ |
| **PR** Proteger | PR.AA Identidad y acceso | Frontend solo lectura (puerto sin métodos de escritura); RLS y roles en el backend | `repositorio.ts`; `backend/app/database/schema.sql` | ◐ (MU-07 sin probar) |
| | PR.DS Seguridad de datos | Cero secretos en el repo; validación zod en toda frontera; LLM local (la consulta no sale del servidor) | Gitleaks en CI; `contrato.ts`; `api/asistente/route.ts` (RNF-22) | ● |
| | PR.PS Seguridad de plataforma | CSP con nonce, cabeceras endurecidas, sin `X-Powered-By`; build reproducible con `npm ci` | `proxy.ts`, `csp.ts`, `next.config.ts`; `headers.spec.ts` | ● |
| | PR.PS (código seguro) | Lint de seguridad (`react/no-danger`, sin `eval`/`innerHTML`); escapes en lugar de caracteres invisibles | `eslint.config.mjs`; `check:invisibles` + `.githooks/pre-commit` | ● |
| | PR.IR Resiliencia | Rate limit, cotas de tamaño, timeouts, errores genéricos | `limite.ts`, `contrato.ts` (cotas); tests de 429/413 | ● |
| **DE** Detectar | DE.CM Monitoreo continuo | CI en cada PR y push a `main`: Gitleaks sobre todo el historial, audit, tests, E2E | `.github/workflows/{web,security}.yml` | ● |
| | DE.AE Análisis de eventos | Logs del asistente solo con códigos y contadores (sin la consulta); auditoría JSON en el backend | `asistente.ts`, `route.ts`; `backend/app/core/audit.py` | ◐ (sin alertas ni tablero) |
| **RS** Responder | RS.MA / RS.MI Gestión y mitigación | Runbook de secreto filtrado; reporte privado de vulnerabilidades; triage de Gitleaks por fingerprint | `SECURITY.md` | ◐ (`docs/incidentes.md` sin incidentes reales que registrar) |
| **RC** Recuperar | RC.RP Plan de recuperación | Servir el último dato válido si falla la ingesta (RNF-08, feature 003) | — | ○ fuera del MVP (P8 recorta RC primero) |

## Brechas priorizadas

1. **GV.OV:** cerrar EX-01. Ángel revisa los PRs y se activa la aprobación obligatoria en `main`.
2. **PR.AA:** probar MU-07 (escritura con la clave pública debe fallar) al integrar Supabase.
3. **DE.AE:** alertar ante picos de 429 o de salidas rechazadas del asistente.
4. **RC.RP:** implementar RNF-08 en el pipeline.
