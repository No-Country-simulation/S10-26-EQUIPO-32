# Tareas 006 — Persistencia real y pipeline automatizado

| # | Tarea | Requisito | Terminado cuando | Estado |
| --- | --- | --- | --- | --- |
| P01 | Spec 006 y SRS | P1 | Spec en la rama | [x] |
| P02 | `docker-compose.yml` (digest), shim de roles, `schema.sql` sin cambios y GRANT | RF-27, RNF-34 | `docker compose up` aplica todo sin error | [x] |
| P03 | `PostgresDatabaseClient` + selección por `DATABASE_URL` | RF-27, RNF-35 | Tests de CRUD e inyección | [x] |
| P04 | Tests de RLS con login `anon` real | RNF-34 | Escritura anon rechazada; embeddings y audit ilegibles | [x] |
| P05 | Siembra de 108 repos (lotes de 20) y prueba de reinicio | RF-27 | 108 tras reiniciar backend y base; frontend con `CATALOG_SOURCE=backend` muestra 108 | [x] |
| P06 | Scheduler opcional | RF-29 | `test_scheduler.py` | [x] |
| P07 | `--solo-metadatos` | RF-28 | Corrida real e idempotencia | [x] |
| P08 | `.github/workflows/ingesta.yml` | RF-28, RNF-36 | Corrida manual | [ ] **Pendiente: el token OAuth local no tiene el scope `workflow` y GitHub rechaza el push (ver «Estado»).** |
| P09 | README, diagrama, matriz (R-19 mitigado; R-29..R-32) | P10 | Docs actualizadas | [x] |

## Validación (2026-11-13)

- **Backend con tests:** 30 pasan sin base (14 de base saltados); con la base real: 44 pasan.
- **Persistencia:** `npm run sembrar:backend`: 108/108 en 6 lotes de 20; con `docker compose restart db` y el backend reiniciado, `count(*)`: 108 repos, 108 métricas, 108 embeddings; RLS activo en las 4 tablas. Frontend con `CATALOG_SOURCE=backend`: la portada enlaza 108 fichas y `/herramientas/supabase` responde 200.
- **Estado del workflow:** escrito y commiteado en la rama local `006-ingesta-workflow`, **sin empujar**: GitHub rechazó el push («refusing to allow an OAuth App to create or update workflow … without `workflow` scope»). Hace falta `gh auth refresh -h github.com -s workflow` (interactivo, lo tiene que hacer una persona) y luego `git push -u origin 006-ingesta-workflow`. Por eso **no hubo corrida manual** del workflow.
