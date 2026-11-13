# Spec 008 — Búsqueda y bloque de exploración

**Dueño:** Jero · **Estado:** aprobado (consigna del 2026-11-13) · **Rama:** `fix/busqueda-exploracion`

## 1. Problema
Buscar «Java» no devolvía los repos en Java (la búsqueda solo miraba nombre y descripción) y el bloque Categorías / Lenguajes / Licencias / Casos de uso tenía un ítem informativo («Casos de uso») y poco feedback al elegir.

## 2. Requisitos
| ID | Requisito | Criterio de aceptación |
| --- | --- | --- |
| RF-30 | La búsqueda también mira id, lenguaje, licencia y categorías (identificador y etiqueta), siempre como texto literal en minúsculas con `includes`: nunca regex ni HTML (MU-05 igual) | `filtros.test.ts`; e2e: «Java» da > 1 resultado, todos con «java»; con los fixtures MU sigue siendo literal |
| RF-31 | Cada ítem de Categorías, Lenguajes, Licencias y Casos de uso es un control real (`aria-pressed`) que aplica su filtro al estado de la URL; un segundo clic lo quita. «Casos de uso» filtra por el tipo de integración de las ideas (`caso=rest\|docker\|sdk\|webhook`, validado contra la lista cerrada). Los conteos se mantienen; Lenguajes muestra los 8 más frecuentes | e2e: clic en Java, MIT y un caso de uso → URL y resultados; segundo clic lo quita; `estado-url.test.ts` valida `caso` |
| RF-32 | Feedback: al buscar (debounce de 600 ms), con Enter o al elegir un ítem, scroll suave hasta la grilla (instantáneo con `prefers-reduced-motion`); chips de filtros activos con «Limpiar todo»; el conteo de resultados se anuncia con `aria-live` | e2e, incluido `reducedMotion` |

## 3. Amenazas y controles
Valor de URL `caso` no confiable (MU-05/MU-06): se ignora si no está en la lista cerrada. La búsqueda sigue sin `RegExp` (AM-02, ReDoS). El filtro de casos usa solo los TIPOS de las ideas (`tiposIdea`, sin snippets) en la lista.

## 4. Límite conocido
Con `CATALOG_SOURCE=backend` la lista no trae ideas (el backend no las expone): `tiposIdea` queda vacío y el filtro «Casos de uso» da 0 resultados con esa fuente.
