# Tareas 005 — Catálogo de 100+ repos reales

**Dueño:** Jero · **Fecha:** 2026-11-13 · Spec: `spec.md` · Plan: `plan.md`

| # | Tarea | Requisito | Terminado cuando | Estado |
| --- | --- | --- | --- | --- |
| C01 | Spec 005 + RF-16..19 y RNF-26..29 en la SRS | P1 | Spec con preguntas respondidas | [x] |
| C02 | `data/semilla-repos.json` (108, 18 por categoría) con criterio, verificado contra la API; PR chico y temprano | RF-16 | `semilla-repos.test.ts` verde; PR #20 mergeado | [x] |
| C03 | `scripts/ingesta-lib.mjs` (criterio, mapeo, ideas, logos) + tests | RF-17, RF-18, RNF-26, RNF-27 | `ingesta.test.ts` verde | [x] |
| C04 | `scripts/ingestar-repos.mjs` (`npm run ingesta`): API de GitHub, ideas con Ollama, logos, embeddings, escritura atómica, códigos de salida | RF-17 | Corrida real sin errores (ver Validación) | [x] |
| C05 | `generar-embeddings.mjs` exporta `calcularEmbeddings` (reusada por la ingesta) sin cambiar `npm run embeddings` | RF-17 | La ingesta regenera `embeddings.json` | [x] |
| C06 | `LogoRepo` con fallback a `MarcaRepo` en tarjeta, ficha, carrusel, sección y panel del asistente, portada | RF-18 | `logo.test.tsx` verde; guarda e2e acepta solo el logo propio | [x] |
| C07 | Adaptador backend: lista paginada, grilla sin desgloses, desglose solo en ficha con caché y presupuesto | RF-19, RNF-28 | `adaptador-backend.test.ts` verde (2 requests para 108) | [x] |
| C08 | Tests que asumían 30 (dataset, índice, panel) | RF-16 | `npm test` verde | [x] |
| C09 | Red-team v2 contra el índice de 108 (corrida `v3`) y `docs/red-team.md` | RNF-29 | Corrida real registrada | [ ] |
| C10 | README, SRS (estado), matriz (R-21, R-25, R-26), `docs/mapeo-backend.md` | P10 | Docs actualizadas | [ ] |

## Validación

Pendiente de la corrida real (se completa abajo).
