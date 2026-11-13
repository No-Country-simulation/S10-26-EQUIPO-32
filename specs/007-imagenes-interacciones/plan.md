# Plan 007 — Imágenes reales e interacciones

**Spec:** `./spec.md` · **Estado:** aprobado · **Alcance:** solo `apps/web` y `specs/`/`docs/` (nada de `backend/`, `docker-compose` ni `.github/workflows/`).

## 1. Chequeo contra la constitución
| Principio | ¿Cumple? | Nota |
| --- | --- | --- |
| P2 Security by design | Sí | Amenazas y controles en §5, antes de implementar |
| P3 Mínimo privilegio | Sí | El paso de capturas no necesita token: lee el README de `raw.githubusercontent.com`. El navegador nunca pide nada externo |
| P4 Cero secretos | Sí | No se guardan URLs con `jwt` (el origen se registra sin query) |
| P5 Externo no confiable | Sí | README, URLs, bytes y nombres se validan; una captura nunca se renderiza como HTML |
| P6 El asistente no inventa | N/A | Las consultas de ejemplo son texto propio; la respuesta sigue validada por `cliente.ts` |
| P7 Métricas reales | Sí | El conteo de capturas sale de una corrida real, sin redondear |

## 2. Arquitectura
- **Interacciones:** `AsistenteProvider` (contexto) en el layout guarda el estado del panel; `Cabecera` lo dibuja y `BotonAsistente` (portada, sección del asistente) lo abre. `Carrusel` suma puntos (botones) y arrastre con `pointer events` (solo mouse; el touch ya desplaza). Las tabs ya ordenaban en memoria (`orden.ts`); se prueban con e2e.
- **Capturas:** `npm run ingesta` (paso 3b) o `npm run ingesta -- --solo-capturas`: README → candidatas (`candidatasCaptura`) → descarga acotada con redirecciones manuales validadas por salto → `tipoCaptura` (magic bytes) → `public/capturas/<id>.<ext>` + `fuentes.json`. Una imagen repetida entre repos se descarta en todos.
- **Render:** `PreviewHerramienta` arma la ruta solo con el id y usa `next/image`; sin captura, `PantallaPreview`. `FotoSitio` hace lo mismo con `public/imagenes/fuentes.json`.

## 3. Stack y dependencias
Sin dependencias nuevas. `next/image` ya viene con Next; su optimizador (`/_next/image`) es del mismo origen y solo sirve archivos de `public/`. La regla de lint que prohibía `next/image` (§5.3) se levanta **solo** para `PreviewHerramienta.tsx` y `FotoSitio.tsx`.

## 4. Modelo de datos / contratos
`public/capturas/fuentes.json`: `{ id, archivo, tipo, bytes, sha256, origen (sin query), repo, licencia, descargadoEn }`. `public/imagenes/fuentes.json`: `{ id, archivo, autor, fuente, url, licencia, urlLicencia, alt, ancho, alto, bytes, sha256 }`.

## 5. Amenazas y controles
| Amenaza (STRIDE / OWASP) | Componente | Control | RNF | Riesgo |
| --- | --- | --- | --- | --- |
| SSRF / redirección a host interno (A10, MU-29) | Ingesta | Lista de hosts, https, sin puerto ni credenciales; redirecciones manuales (máx. 3) validadas en cada salto | RNF-30 | R-28 |
| Archivo malicioso: SVG con script, HTML como `.png`, archivo enorme (A03, MU-30) | Ingesta / sitio | Magic bytes (PNG, JPEG, WebP), 6–600 KB, lectura acotada por streaming; nunca SVG ni GIF | RNF-30 | R-28 |
| Suplantación: captura de otro producto (S, MU-31) | Ingesta / UI | `raw.githubusercontent.com` solo del propio `owner/repo`; archivo `<id>.<ext>`; hash único entre repos; origen y licencia registrados; la ruta sale solo del id | RNF-30, RNF-32 | R-28 |
| Path traversal en el nombre (MU-32) | Ingesta | Nombre derivado del id validado (`archivoCaptura`); rutas relativas con `..` se descartan | RNF-30 | R-28 |
| Recurso externo en el navegador / exfiltración por imagen (A05) | Sitio | CSP `img-src 'self'` sin cambios; todo se descarga en la ingesta; la guarda e2e acepta solo rutas propias con `alt` y sin `on*` | RNF-31 | R-13 |
| Licencia / atribución | Sitio | Licencia del repo y de la foto en `fuentes.json`; crédito en el footer | RF-24, RF-25 | — |
| Clickjacking de interacción: arrastre abre una ficha sin querer | Carrusel | Un arrastre suprime el clic siguiente | RF-22 | — |

## 6. Estrategia de prueba
Vitest: `capturas.test.tsx` (URL, magic bytes, nombre, candidatas, manifiestos, componente), `asistente-panel.test.tsx`. Playwright: `interacciones.spec.ts` (CTA, links sin muertos, asistente con API simulada, carrusel, tabs, movimiento reducido, fotos y CSP) y la guarda de `mu.spec.ts` ampliada con una prueba de que **detecta** fotos y capturas falsas.

## 7. Decisiones y alternativas descartadas
- Una subida anónima (`user-attachments`) sin pista de captura **no se acepta**: en la corrida de prueba eran logos y banners. Se prefiere no mostrar nada.
- Capturas de más de 600 KB se descartan, no se recomprimen (no hay dependencia de imágenes y no se altera la evidencia).
- Los GIF nunca se aceptan (más estricto que «descartar GIF de más de 1 MB»).
- El README se lee de `raw.githubusercontent.com` (sin token) en vez de la API.
- No se incluye una prueba de la descarga con servidor simulado: la lógica de red vive en el script. Queda en el backlog.
