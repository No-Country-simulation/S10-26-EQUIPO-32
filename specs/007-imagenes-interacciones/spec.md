# Spec 007 — Imágenes reales e interacciones

**Dueño:** Jero · **Estado:** aprobado (consigna del 2026-11-13, timebox 19:30) · **Fecha:** 2026-11-13

> Qué y por qué. El cómo va en `plan.md`. Complementa `specs/001-frontend-catalogo/ui-brief.md` §13.

## 1. Problema y objetivo

La portada tiene botones, tabs y un carrusel que se ven bien pero en parte no hacen lo que prometen (no hay CTA «Probar el asistente» en la portada, el carrusel no tiene puntos ni arrastre, el asistente no ofrece consultas de ejemplo). Además, todas las tarjetas muestran un mockup genérico: no hay ninguna imagen real de producto ni fotos de apoyo.

Se cumple cuando: (1) todo control visible hace algo real y está probado con un e2e sin links muertos; (2) cada herramienta que tiene una captura de UI válida en su README la muestra, y las que no, siguen con la pantalla de preview; (3) las secciones de portada, asistente y seguridad llevan fotos con licencia libre y crédito, sin presentarlas nunca como captura de una herramienta.

## 2. Usuarios y actores

- **Visitante:** usa teclado, mouse o touch; algunos con `prefers-reduced-motion`.
- **Ingesta (cron):** descarga capturas y registra su origen.
- **GitHub (README, hosts de imágenes):** fuente externa **no confiable** (P5). Un atacante controla el README de un repo y por lo tanto las URLs de imagen que contiene.

## 3. Historias de usuario

- Como visitante, quiero que cada botón haga lo que dice, para no chocar con controles decorativos.
- Como visitante, quiero ver cómo se ve una herramienta de verdad antes de abrir su ficha.
- Como equipo, queremos poder demostrar que ninguna imagen de otro producto aparece en la card de una herramienta.

## 4. Requisitos funcionales

| ID | Requisito | Prioridad | Criterio de aceptación |
| --- | --- | --- | --- |
| RF-20 | Cada CTA lleva a algo real: «Probar el asistente» (portada, cabecera y sección del asistente) abre el panel del asistente y mueve el foco a él; «Explorar el catálogo» hace scroll a la grilla; los links del footer apuntan a documentos que existen en el repositorio. Las cards del carrusel y de la grilla abren la ficha | M | e2e: recorre todos los CTA y todos los links del footer (destino existente en el repo, sin `href` vacío ni `#`) |
| RF-21 | Las tabs «Recientes» y «Mejor salud» reordenan la grilla de verdad, con teclado | M | e2e: el primer elemento cambia según la tab y coincide con el orden esperado de los datos de prueba |
| RF-22 | El carrusel muestra puntos de posición (uno por tarjeta, operables) y se arrastra con mouse o touch; conserva flechas y teclado | M | Test del componente + e2e del arrastre y de los puntos |
| RF-23 | El panel del asistente ofrece botones con consultas de ejemplo que la envían, y un estado de carga visible y anunciado | M | Test del panel; e2e con la API simulada |
| RF-24 | Capturas de producto: la ingesta busca en el README de cada repo la primera imagen que parezca una captura de UI o dashboard, descarta badges, logos y GIF de más de 1 MB, y la guarda como archivo propio con su origen y la licencia del repo en `public/capturas/fuentes.json`. La tarjeta y la ficha la muestran en la pantalla de preview; sin captura válida, queda la `PantallaPreview`. Nunca se muestra en una herramienta una imagen de otra | M | Tests de las funciones puras; corrida real con el conteo de repos con captura; test de que el componente solo usa el archivo de su propio id |
| RF-25 | Fotos decorativas: de 3 a 5 fotos de Pexels o Unsplash (trabajo con código, equipos, pantallas) en la portada, la sección del asistente y la de seguridad, optimizadas a ≤ 300 KB, con `public/imagenes/fuentes.json` (autor, URL, licencia) y crédito en el footer. No se usan como captura de ninguna herramienta | S | Test del manifiesto (tamaño, campos, crédito en el footer) |
| RF-26 | Todo lo de arriba funciona con teclado y respeta `prefers-reduced-motion` | M | e2e con `reducedMotion: "reduce"`: sin animaciones ni scroll suave; foco visible en cada control nuevo |

## 5. Requisitos no funcionales

| ID | Tipo | Requisito | Cómo se verifica |
| --- | --- | --- | --- |
| RNF-30 | Seguridad | Capturas: solo hosts `raw.githubusercontent.com`, `user-images.githubusercontent.com`, `private-user-images.githubusercontent.com` y `github.com/user-attachments`; solo https; sin seguir redirecciones a otro host (se valida cada salto); solo PNG, JPEG o WebP por magic bytes (nunca SVG ni HTML); ≤ 600 KB; nombre de archivo derivado del id | Tests de `urlCaptura`, `tipoImagen`, `archivoCaptura` y de la descarga con servidor simulado |
| RNF-31 | Seguridad | CSP sin cambios (`img-src 'self'`): las imágenes se sirven desde el propio sitio con `next/image`, con `alt` descriptivo en las fotos y las capturas | `headers.spec` sin cambios; la guarda e2e solo admite el logo, las capturas y las fotos propias (ruta, atributos y origen verificados) |
| RNF-32 | Producto | Una captura es evidencia, no decoración: nunca se asigna a un id distinto del suyo ni se reutiliza entre repos (hash único) | Test sobre `capturas/fuentes.json` |

## 6. Casos de mal uso

| ID | El atacante intenta… | Resultado esperado |
| --- | --- | --- |
| MU-29 | Poner en su README una imagen en otro host, o una URL de `raw.githubusercontent.com` que redirige a un host interno | La ingesta la descarta (host fuera de la lista o redirect a otro host); queda la `PantallaPreview` |
| MU-30 | Subir como «captura» un SVG con script, un HTML disfrazado de `.png` o un archivo de 50 MB | Descartado por magic bytes y tamaño; nunca llega a `public/` |
| MU-31 | Que su README apunte a la captura de otro producto (suplantación) | La captura se guarda solo bajo el id del repo que la declaró y con su origen registrado; no se muestra en ninguna otra card |
| MU-32 | Un nombre de repo con `../` para escribir fuera de `public/capturas/` | El nombre sale del id validado por la semilla; el id inválido se rechaza |

## 7. Fuera de alcance

- Cambiar el backend, `docker-compose` o los workflows (los trabaja otra sesión).
- Revisión visual de Jerónimo (RNF-18) y axe (siguen en el backlog del brief).
- Análisis visual (modelo) de las imágenes: la heurística es por texto del README (alt, nombre de archivo, contexto).

## 8. Decisiones (sin preguntas abiertas)

La consigna fija hosts, formatos, límites y alcance; no quedaron preguntas. Supuestos registrados: el «primer candidato» se decide por alt/nombre de archivo/ubicación (palabras como screenshot, dashboard, ui, demo; se descartan badge, logo, shield, icon, banner); si ningún candidato válido, sin captura.
