# Plan 005 — Catálogo de 100+ repos reales

**Dueño:** Jero · **Fecha:** 2026-11-13 · Spec: `spec.md` (RF-16 a RF-19, RNF-26 a RNF-29)

## 1. Arquitectura

```
data/semilla-repos.json (raíz, versionada, compartida con backend/)
        │
        ▼
apps/web/scripts/ingestar-repos.mjs  ── GITHUB_TOKEN (solo entorno) ──► api.github.com/repos/{owner}/{repo}
        │                             ── avatar_url ──────────────────► avatars.githubusercontent.com (sin redirecciones)
        │                             ── OLLAMA_URL ──────────────────► /api/chat (ideas faltantes) · /api/embed (nomic-embed-text)
        ▼ (escribe solo si todo salió bien)
apps/web/data/repos-reales.json · apps/web/data/embeddings.json · apps/web/public/logos/<id>.(png|jpg) + fuentes.json
        │
        ├─► adaptador `reales` y el índice del asistente (sin cambios de interfaz)
        └─► LogoRepo (tarjeta, ficha, carrusel, sección y panel del asistente, portada) → fallback MarcaRepo
```

- **Funciones puras** en `scripts/ingesta-lib.mjs` (criterio, mapeo, validación de ideas, logos), testeadas en `tests/unit/ingesta.test.ts`. El script orquesta red y disco.
- **Idempotente y apto para cron:** las ideas ya presentes (curadas o generadas en una corrida anterior) se conservan; solo se generan las que faltan. Las métricas se actualizan siempre. Escritura atómica (`.tmp` + `rename`) al final. Códigos de salida: 0 ok, 1 falla de corrida, 2 configuración o semilla.
- **Ideas:** Ollama local, modelo configurable por `INGESTA_MODELO_IDEAS` (por defecto `llama3.1:8b`: el `llama3.2:3b` del asistente produce JSON menos confiable). Salida forzada con el esquema JSON de Ollama (`format`) y luego validada por `validarIdeaGenerada` (más estricta que el contrato) y por `contrato.ts` en el test del dataset. `revisada: false` siempre.
- **Adaptador backend (RF-19):** lista paginada (`limit=100&offset=N`, hasta 3 páginas) en una instantánea de 60 s; la grilla no pide desgloses. La ficha pide un único desglose, en caché 60 s por id, con un presupuesto de 50 desgloses/min por instancia.

## 2. Modelo de datos

- `data/semilla-repos.json`: `{ version, actualizado, criterio, repos: [{ repo, id, nombre, categorias, licencia?, notaLicencia? }], excluidos: [{ repo, motivo }] }`.
- `repos-reales.json`: mismo contrato que antes (`contrato.ts`). Salud, nivel y mantenedor en `null` (fórmula de 003, P7).
- `public/logos/fuentes.json`: `{ generadoEn, logos: [{ id, archivo, tipo, bytes, sha256, origen, descargadoEn }] }`. `origen` sin query.

## 3. Amenazas y controles (STRIDE + OWASP)

| Amenaza | STRIDE | OWASP | Control | Prueba |
| --- | --- | --- | --- | --- |
| Avatar malicioso (SVG con script, HTML, archivo enorme) — MU-25 | T, E | A03, A08 | Solo PNG/JPEG por magic bytes, ≤ 200 KB con corte en streaming, extensión según el tipo real, servido por el sitio con `nosniff`; CSP `img-src 'self'` sin cambios | `ingesta.test.ts` (logos) + `headers.spec.ts` |
| SSRF / redirección desde la URL del avatar — MU-26 | S, I | A10 | Host exacto `avatars.githubusercontent.com`, https, sin credenciales ni puerto, `redirect: "error"` | `ingesta.test.ts` (urlAvatar) |
| Path traversal con el id en el nombre del archivo | T | A01 | Nombre derivado solo del id validado (`archivoLogo`); en runtime solo se usan archivos `<id>.png|jpg` listados en `fuentes.json` | `ingesta.test.ts`, `logo.test.tsx` |
| Idea envenenada por la descripción del repo (inyección indirecta al LLM de la ingesta) — MU-27 | T | LLM01, LLM04, LLM05 | Datos delimitados y marcados como no instrucciones; formato JSON forzado; validación estricta (sin HTML, sin `| sh`, sin `sudo`/`rm -rf`, URLs solo a hosts de ejemplo, largos acotados); `revisada: false`; render como texto | `ingesta.test.ts` (ideas) + `repos-reales.test.ts` |
| Filtración del token de GitHub | I | — | Solo por entorno; nunca en el log (solo mensajes propios) ni en archivos | Gitleaks en CI; revisión del script |
| Repo de la semilla renombrado, archivado o que cambia de licencia — MU-28 | T | LLM04 | Criterio reaplicado en cada corrida contra la API; excluido con aviso en el log; `owner/repo` canónico de la respuesta | `ingesta.test.ts` (criterio) |
| Consumo del rate limit del backend con 100+ repos | D | A04 | Grilla sin desgloses (2 pedidos con 108), desglose solo en ficha, caché 60 s y presupuesto 50/min | `adaptador-backend.test.ts` |
| Regresión del asistente con un índice más grande | T, I | LLM01, LLM09 | Mismos guardrails; red-team v2 contra el índice de 108 | `docs/red-team.md` |

## 4. Verificación contra la constitución

- P3: token de GitHub de solo lectura; el runtime no usa credenciales. P4: nada en archivos. P5: GitHub, avatar y LLM tratados como no confiables. P6: el asistente sigue citando solo ids del índice. P7: métricas reales o `null`; ningún sintético. P8: sin dependencias nuevas.
