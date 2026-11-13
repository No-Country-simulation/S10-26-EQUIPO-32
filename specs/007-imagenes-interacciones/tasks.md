# Tareas 007 — Imágenes reales e interacciones

**Spec:** `spec.md` · **Plan:** `plan.md` · **Fecha:** 2026-11-13

| # | Tarea | Requisito | Terminado cuando | Estado |
| --- | --- | --- | --- | --- |
| I01 | Spec 007, §13 del brief | P1 | Spec aprobada | [x] |
| I02 | `AsistenteProvider`, `BotonAsistente` en portada y sección, foco al abrir, Escape | RF-20, RF-26 | e2e de CTA verde | [x] |
| I03 | Consultas de ejemplo y estado de carga en el panel | RF-23 | e2e con API simulada verde | [x] |
| I04 | Carrusel: puntos y arrastre con mouse | RF-22 | e2e verde | [x] |
| I05 | Tabs reordenan (prueba) y footer sin links muertos (prueba) | RF-20, RF-21 | e2e verde | [x] |
| I06 | Movimiento reducido | RF-26 | e2e con `reducedMotion` verde | [x] |
| I07 | Funciones puras de capturas + tests | RF-24, RNF-30 | `capturas.test.tsx` verde | [x] |
| I08 | Paso de capturas en `npm run ingesta` (+ `--solo-capturas`) | RF-24 | Corrida real registrada | [x] |
| I09 | `PreviewHerramienta` en tarjeta y ficha con `next/image` | RF-24, RNF-31, RNF-32 | Test del componente; verificación en el build con `CATALOG_SOURCE=reales` | [x] |
| I10 | 3 fotos de Pexels, `FotoSitio`, crédito en el footer | RF-25 | Test del manifiesto y e2e | [x] |
| I11 | Guarda e2e con excepciones estrictas y prueba de que detecta lo falso | RNF-31 | `mu.spec.ts` verde | [x] |
| I12 | SRS, matriz (R-28), brief §13.5 | P10 | Docs actualizadas | [x] |

## Validación (2026-11-13)

- **Capturas reales (corrida `npm run ingesta -- --solo-capturas` sobre los 108 repos): 5 de 108** (Supabase, Lago, Plausible, QuestDB, Airflow). Las otras 103 quedan con `PantallaPreview`. Motivos de las 103 sin captura: 96 sin imagen candidata (imágenes en otros hosts, SVG o sin pista de captura), 5 con candidatas que no pasaron (p. ej. más de 600 KB: Pocket ID pesa 1,6 MB) y 2 sin `README.md`.
- Revisión visual de las 5 capturas y de las 3 fotos: son interfaces reales y fotos de código; ninguna se repite.
- Tests: ver el resultado final en el PR.
