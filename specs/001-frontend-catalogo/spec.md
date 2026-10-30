# Spec 001 — Frontend del catálogo

**Dueño:** Jero · **Estado:** aprobado · **Fecha:** 2026-10-30

> Qué y por qué. Nada de frameworks, librerías ni código: eso va en `plan.md`.

## 1. Problema y objetivo

Los arquitectos y líderes técnicos de la consultora pierden **15-20 horas por proyecto** investigando librerías open-source: buscar candidatas, comparar si están mantenidas, revisar la licencia y entender cómo se integran. Con más de 30 proyectos por año, son entre 450 y 600 horas anuales de trabajo repetido.

**Objetivo de esta feature:** que el usuario pueda, desde una sola interfaz, explorar herramientas open-source por categoría, filtrarlas por los criterios que usa para decidir (lenguaje, licencia, mantenimiento, popularidad), ver una ficha técnica confiable de cada una y obtener ideas concretas de cómo integrarla.

**Cómo sabremos que lo resolvió (para la demo):**
- Un usuario llega desde la pantalla inicial a la ficha de una herramienta que cumple tres criterios (categoría, lenguaje, licencia) sin usar otra fuente.
- Toda ficha muestra la licencia y el estado de mantenimiento sin tener que salir a GitHub.
- Ningún dato externo puede ejecutar código ni alterar la interfaz (validado con los casos de mal uso de la sección 6).

> El ahorro de horas es la hipótesis del producto; no se presenta como métrica hasta medirlo en una corrida real (P7).

### 1.1 Referencia de experiencia (UX/UI)

Se toma **Mobbin** como referencia de **estructura y calidad**, no de identidad:

| Se toma | No se toma |
| --- | --- |
| Grilla de tarjetas como vista principal | Marca, nombre, logo |
| Navegación por categorías siempre visible | Textos, copys o microcopys |
| Filtros combinables con conteo de resultados | Imágenes, ilustraciones o capturas |
| Ficha de detalle con jerarquía clara | Paleta de colores o tipografía propietaria |
| Jerarquía tipográfica marcada y modo oscuro (único tema, ver RNF-15) | |

## 2. Usuarios y actores

| Actor | Tipo | Qué hace en esta feature |
| --- | --- | --- |
| Arquitecto / líder técnico | Humano (usuario principal, anónimo) | Explora, filtra, busca, abre fichas y copia ideas de integración. No inicia sesión: el catálogo es público. |
| Backend y pipeline (feature 003, Ángel) | Sistema interno | Provee los datos del catálogo ya procesados (métricas, health score, ideas). El frontend solo los lee. |
| GitHub | Sistema externo (fuente indirecta) | Origen de nombres, descripciones, métricas y licencias. Sus datos llegan vía backend y son **no confiables**. |
| Mantenedor malicioso de un repo | Atacante | Controla el nombre, la descripción y el README de su repo; puede intentar inyectar contenido que se ejecute o engañe en nuestra interfaz. |
| Usuario o tercero malicioso | Atacante | Manipula la búsqueda, los filtros o un enlace compartido (que lleva filtros y búsqueda en la dirección) para engañar a otro usuario; intenta usar la clave pública para escribir datos. |
| Fuente de datos comprometida | Atacante | Un dato envenenado aguas arriba (pipeline, o un README manipulado que induce al LLM a generar ideas maliciosas) que llega malformado o con payloads. El frontend debe seguir siendo seguro aunque el backend falle. |

## 3. Historias de usuario

- **HU-01** Como arquitecto, quiero navegar el catálogo por categoría (Autenticación, Base de Datos, Pagos, IA, Analítica, Búsqueda), para ver rápido las opciones de un área sin buscar en GitHub.
- **HU-02** Como arquitecto, quiero ver una ficha técnica de cada herramienta con métricas de salud y licencia, para descartar en minutos las que no están mantenidas o no puedo usar legalmente.
- **HU-03** Como líder técnico, quiero filtrar por lenguaje, licencia, nivel de mantenimiento, stars mínimos y categoría, para quedarme solo con las candidatas compatibles con el proyecto del cliente.
- **HU-04** Como arquitecto, quiero buscar por texto, para encontrar una herramienta que ya conozco de nombre o por lo que hace.
- **HU-05** Como arquitecto, quiero ver ideas de integración estructuradas (tipo, disparadores, snippet, stack compatible, dificultad), para estimar el esfuerzo de adopción antes de proponerla.
- **HU-06** Como usuario, quiero usar el catálogo desde el celular o la notebook, para consultarlo en una reunión con el cliente.
- **HU-07** *(C, mejora)* Como usuario, quiero usar la interfaz en español o en inglés, para compartirla con equipos o clientes que no hablan español.

## 4. Requisitos funcionales

| ID | Requisito | Prioridad (M/S/C) | Criterio de aceptación |
| --- | --- | --- | --- |
| RF-01 | Catálogo por categoría: el usuario navega las 6 categorías y ve las herramientas de cada una en una grilla de tarjetas. | M | (a) Las 6 categorías están visibles y accesibles desde cualquier pantalla del catálogo. (b) Al elegir una categoría, la grilla muestra todas las herramientas que pertenecen a ella, aunque también estén en otras categorías. (c) Cada tarjeta muestra como mínimo: nombre, descripción corta, stars, lenguaje, licencia y health score. (d) Una categoría sin herramientas muestra un estado vacío explicativo, no una pantalla en blanco. (e) Si los datos no se pueden obtener, se muestra un estado de error con opción de reintentar. |
| RF-02 | Ficha técnica: al abrir una herramienta se ve su ficha con todos los campos técnicos. | M | (a) La ficha muestra: nombre, categorías (todas las que tenga), descripción, stars, última actualización, licencia, lenguaje, issues abiertos, mantenedor activo (sí/no) y health score. (b) Un campo sin dato se muestra explícitamente como "Sin dato"; nunca se inventa ni se oculta en silencio. (c) La ficha es accesible por una dirección propia (se puede recargar y llegar al mismo repo). (d) Una ficha inexistente muestra un estado "no encontrado". (e) La ficha incluye un enlace al repositorio original solo si la URL usa `https` y su dominio es exactamente `github.com` (no subdominios ni dominios parecidos). Si no cumple, el enlace no aparece. El enlace abre en una pestaña nueva, sin dar acceso a la página de origen. |
| RF-03 | Filtros: el usuario combina filtros por lenguaje, licencia, nivel de mantenimiento, stars mínimos y categoría. | M | (a) Los filtros se combinan entre sí (se deben cumplir todos). El filtro de nivel de mantenimiento ofrece Activo, Moderado y Abandonado. Una herramienta cumple el filtro de categoría si pertenece a la categoría elegida, aunque tenga otras. (b) Las opciones de lenguaje y licencia salen de los datos disponibles, no de una lista fija inventada. (c) Se muestra la cantidad de resultados y los filtros activos, con opción de quitar uno o todos. (d) Una combinación sin resultados muestra un estado vacío con la opción de limpiar filtros. (e) Un valor de filtro inválido (ej. stars negativos o no numéricos) se rechaza o se ignora sin romper la vista. (f) Los filtros activos y el texto de búsqueda quedan reflejados en la dirección de la página: al recargarla o abrir un enlace compartido se ve la misma selección. |
| RF-04 | Búsqueda por texto sobre el catálogo. | S | (a) Busca en nombre y descripción (no en otros campos), sin distinguir mayúsculas. (b) Se combina con los filtros activos. (c) El texto buscado se trata siempre como texto literal (ver MU-05). (d) Tiene un largo máximo razonable; lo que excede se recorta sin error. (e) Sin coincidencias muestra un estado vacío. |
| RF-05 | Ideas de integración estructuradas en la ficha. | M | (a) Cada idea muestra: tipo (REST, Docker, SDK o webhook), disparadores, snippet de ejemplo, stack compatible y dificultad. (b) El snippet se muestra como código en texto plano, con formato monoespaciado y opción de copiarlo. (c) Nada dentro del snippet es clickeable ni se ejecuta (ver MU-02). (d) Si una herramienta no tiene ideas, la sección lo indica explícitamente. (e) Una idea con un campo faltante se muestra con "Sin dato" en ese campo. (f) Cada idea indica si está revisada o no; las no revisadas muestran un aviso visible de "Generada automáticamente, revisala antes de usarla". (g) La marca de "revisada" sale solo del estado de revisión, nunca del contenido de la idea (ver MU-12). |

### 4.1 Datos que necesita el frontend

Qué información necesita la interfaz, **no** cómo se pide ni en qué formato viaja. Esta sección **está pendiente de validar con Ángel** (feature 003). La validación no bloquea el plan, pero tiene que estar hecha antes de las tareas que consumen datos reales. El formato concreto se fija en el plan.

**Categoría**

| Dato | Obligatorio | Origen / confianza |
| --- | --- | --- |
| Identificador estable | Sí | Interno |
| Nombre visible (una de las 6) | Sí | Interno |
| Cantidad de herramientas | No (se puede calcular) | Interno |

**Herramienta (repositorio)**

| Dato | Obligatorio | Origen / confianza |
| --- | --- | --- |
| Identificador estable | Sí | Interno |
| Nombre | Sí | GitHub — no confiable |
| URL del repositorio | Sí | GitHub vía pipeline — no confiable (se valida contra la regla de RF-02 e) |
| Descripción | No | GitHub — no confiable |
| Categorías: una o más de las 6 | Sí | Interno |
| Stars (entero ≥ 0) | Sí | GitHub vía pipeline |
| Fecha de última actualización (último commit en la rama principal) | Sí | GitHub vía pipeline |
| Licencia (o indicación de "sin licencia declarada") | Sí | GitHub — no confiable |
| Lenguaje principal | No | GitHub — no confiable |
| Issues abiertos (entero ≥ 0) | No | GitHub vía pipeline |
| Mantenedor activo (sí/no) | Sí | Calculado por el pipeline |
| Nivel de mantenimiento: Activo, Moderado o Abandonado | Sí | Calculado por el pipeline |
| Health score: entero de 0 a 100 | Sí | Calculado por el pipeline |
| Fecha en que se tomaron las métricas | Sí | Interno (para que el usuario sepa qué tan frescos son los datos) |

**Idea de integración** (0 a N por herramienta)

| Dato | Obligatorio | Origen / confianza |
| --- | --- | --- |
| Tipo: REST, Docker, SDK o webhook | Sí | Generado por LLM — no confiable |
| Disparadores (lista de textos cortos) | Sí | Generado por LLM — no confiable |
| Snippet de ejemplo (texto) | Sí | Generado por LLM — no confiable |
| Stack compatible (lista) | Sí | Generado por LLM — no confiable |
| Dificultad: Baja, Media o Alta | Sí | Generado por LLM — no confiable |
| Estado de revisión: revisada o no revisada | Sí | Interno (lo marca una persona en el pipeline) |

> El frontend **no calcula** métricas: muestra el health score, el nivel de mantenimiento y "mantenedor activo" tal como los entrega el pipeline (pregunta 3). Un health score fuera de 0-100 o un nivel fuera de los tres valores se trata como dato inválido (MU-09).
>
> Regla general: cualquier dato marcado "no confiable" se muestra **solo como texto**. Cualquier dato que llegue con tipo o valor inválido se trata como "Sin dato".

## 5. Requisitos no funcionales

| ID | Tipo | Requisito | Cómo se verifica |
| --- | --- | --- | --- |
| RNF-02 | Seguridad | El frontend solo **lee** datos del catálogo y usa únicamente la clave pública. No ofrece ninguna operación de escritura ni contiene la clave de servicio. | (1) Revisión de código: no hay operaciones de alta, baja ni modificación. (2) Secret scanning en CI sin hallazgos y búsqueda de la clave de servicio en lo que se publica del frontend: 0 coincidencias. (3) Prueba de MU-07: un intento de escritura con la clave pública es rechazado. |
| RNF-04 | Seguridad | Ningún contenido externo (nombres, descripciones, licencias, disparadores, snippets, texto de búsqueda) se renderiza como HTML ni se ejecuta. Se muestra siempre como texto. | Set de payloads de los casos MU-01 a MU-05 y MU-11 cargados como datos de prueba: ninguno ejecuta script, carga recursos remotos ni cambia la estructura de la página; el texto aparece literal. |
| RNF-07 | Producto · Rendimiento | Con un catálogo de más de 100 herramientas, aplicar o cambiar un filtro o una búsqueda actualiza los resultados en **menos de 1 segundo**. | Medición con el conjunto sintético de 150 herramientas (sección 9): tiempo desde el cambio de filtro hasta la grilla actualizada, 20 repeticiones, todas < 1 s. Se registran los valores reales en `tasks.md` (P7). |
| RNF-10 | Producto · Usabilidad | La interfaz es responsiva y usable en celular, tablet y escritorio. | Revisión en anchos de 360 px, 768 px y 1280 px: sin scroll horizontal, filtros accesibles en celular, tarjetas y ficha legibles. |
| RNF-13 | Producto · Legal | La licencia de cada herramienta es visible en **todas** las fichas (y en las tarjetas de la grilla). Si no tiene, se indica "Sin licencia declarada" de forma visible. | Revisión de todas las fichas del conjunto de prueba, incluyendo al menos una sin licencia: el dato o la leyenda aparece siempre. |
| RNF-15 | Producto · Usabilidad | **Modo oscuro único** (M): la interfaz se ve solo en tema oscuro, sin selector de tema y sin importar la preferencia del sistema. Todas las pantallas (grilla, filtros, ficha, estados vacíos, de error y "no encontrado") y los controles nativos del navegador (campos, barras de desplazamiento) se ven en oscuro. | (1) Revisión de cada pantalla con el sistema en modo claro y en modo oscuro: la interfaz se ve igual, en oscuro. (2) No hay textos invisibles ni elementos con fondo claro sin estilo. (3) No existe ningún control para cambiar de tema. |
| RNF-16 | Producto · Accesibilidad | **WCAG 2.1 AA acotado** (M): la interfaz cumple estos criterios, y solo estos se declaran y verifican: **contraste** de texto (1.4.3) y de controles y foco (1.4.11); **navegación completa por teclado** (2.1.1), sin trampas de foco (2.1.2) y con un orden de foco lógico (2.4.3); **foco visible** (2.4.7); **labels** en todos los controles, filtros y botones (3.3.2, 4.1.2); **idioma de la página declarado** (3.1.1). Los criterios que quedan fuera están listados en 5.1. | (1) Análisis con **axe** sobre la grilla, la ficha, el panel de filtros, un estado vacío y un estado de error: 0 violaciones en las reglas de axe asociadas a los criterios en alcance. Si axe reporta violaciones de criterios fuera de alcance (5.1), se registran en `tasks.md` pero no bloquean. (2) Prueba manual solo con teclado: elegir una categoría, aplicar y quitar filtros, buscar, abrir una ficha, copiar un snippet y volver a la grilla, con el foco siempre visible y sin quedar atrapado. Resultados de ambas pruebas registrados en `tasks.md`. |
| RNF-17 | Producto · Internacionalización | **Interfaz preparada para varios idiomas, entregada en español** (C). Desde el inicio, todos los textos propios de la interfaz (navegación, filtros, estados vacíos y de error, "Sin dato", "Sin licencia declarada", aviso de idea no revisada, "Asistente — próximamente") viven en un diccionario por idioma; ninguno queda escrito directamente en las pantallas. La entrega obligatoria es solo en español. **Mejora si sobra tiempo:** diccionario en inglés con selector de idioma; el idioma inicial sale de la preferencia del navegador (español si no es ninguno de los dos) y solo se traduce la interfaz, nunca los datos del catálogo. | (1) Revisión de código: no hay textos visibles de la interfaz fuera del diccionario. (2) El idioma de la página está declarado como español (RNF-16, 3.1.1). (3) Solo si se entrega el inglés: recorrido completo en cada idioma sin textos del otro idioma, y cambiar de idioma no pierde la búsqueda ni los filtros. |

### 5.1 Criterios WCAG 2.1 fuera de alcance (RNF-16)

No se declaran ni se verifican en esta feature. Pueden cumplirse por diseño, pero no forman parte del criterio de terminado.

| Criterios | Motivo |
| --- | --- |
| 1.2.x Multimedia (subtítulos, audiodescripción) | La interfaz no tiene audio ni video. |
| 2.2.x Tiempo suficiente · 2.3.1 Destellos | La interfaz no tiene límites de tiempo, contenido en movimiento ni destellos. |
| 1.4.1 Uso del color | No se verifica formalmente; como práctica de diseño, el nivel de mantenimiento, el health score y la marca de revisada llevan también texto. |
| 1.3.1 Información y relaciones · 2.4.6 Encabezados y etiquetas | Sin revisión de la estructura semántica; si axe reporta algo, se registra sin bloquear. |
| 1.3.4 Orientación · 1.4.4 Cambio de tamaño del texto · 1.4.10 Reflow · 1.4.12 Espaciado del texto | El comportamiento por ancho de pantalla se cubre con RNF-10, no como criterio WCAG. |
| 1.4.13 Contenido al pasar el puntero o al recibir el foco | No se verifica. |
| 2.4.5 Múltiples vías · 3.2.3 Navegación coherente · 3.2.4 Identificación coherente | No se verifican. |
| 3.1.2 Idioma de las partes | Las descripciones en inglés dentro de la interfaz en español no se marcan con su idioma. |
| 3.3.1, 3.3.3, 3.3.4 Identificación, sugerencia y prevención de errores | No hay formularios que envíen datos; los valores inválidos de búsqueda y filtros se cubren con RF-03, RF-04 y MU-06. |
| 4.1.3 Mensajes de estado | El cambio en la cantidad de resultados no se anuncia a lectores de pantalla. |
| Pruebas con lectores de pantalla | Fuera de alcance; solo axe y la prueba manual de teclado. |

## 6. Casos de mal uso

| ID | El atacante intenta… | Resultado esperado del sistema |
| --- | --- | --- |
| MU-01 | Poner un payload XSS en la descripción o el nombre de su repo (`<script>…</script>`, `<img src=x onerror=…>`, `<svg onload=…>`). | Se muestra el texto literal, con los signos `<` y `>` visibles. No se ejecuta nada ni se agrega ningún elemento a la página. (RNF-04) |
| MU-02 | Incluir un link malicioso en un snippet de integración (`javascript:alert(1)`, `data:text/html,…`, o una URL de phishing). | El snippet se muestra como texto plano; ninguna URL dentro del snippet es clickeable. Copiarlo copia solo texto. (RF-05, RNF-04) |
| MU-03 | Usar caracteres Unicode engañosos en el nombre o la descripción (inversión de dirección de texto, caracteres invisibles, homoglifos) para hacerse pasar por otra herramienta o desordenar la interfaz. | El texto queda contenido en su tarjeta o campo y no altera el orden ni el contenido de los elementos vecinos. El nombre se muestra siempre junto a su identificador u otro dato que permita distinguirlo. |
| MU-04 | Publicar una descripción enorme (cientos de KB) o una cantidad desmedida de ideas o disparadores para romper el diseño o trabar el navegador. | Los textos largos se recortan con indicación visual; la grilla y la ficha mantienen su diseño; el filtrado sigue cumpliendo RNF-07. |
| MU-05 | Escribir en la búsqueda un payload XSS o de inyección (`<svg onload=…>`, `' OR 1=1 --`) y compartir el enlace con la búsqueda cargada. | El término se trata como texto literal: se busca tal cual y, si se muestra en pantalla (ej. "sin resultados para…"), aparece como texto. No se ejecuta nada. (RF-04, RNF-04) |
| MU-06 | Armar un enlace con valores de filtro manipulados (categoría inexistente, stars negativos, licencia con caracteres especiales). | Los valores inválidos se ignoran o se reemplazan por el valor por defecto; la vista se muestra sin error. (RF-03) |
| MU-07 | Usar la clave pública que viaja en el frontend para crear, modificar o borrar datos del catálogo. | La operación es rechazada por las políticas de acceso de la base (control de la feature 003). El frontend no expone ninguna operación de escritura. (RNF-02, P3) |
| MU-08 | Hacer que el enlace "ver repositorio" de su ficha apunte a un dominio malicioso (`http://github.com.evil.io`, `https://githuh.com`, `javascript:…`, `https://evil.io/?github.com`). | Ninguno de esos casos se muestra como enlace: solo se acepta `https` con dominio exactamente `github.com`. El enlace válido abre sin dar acceso a la página de origen. (RF-02 e) |
| MU-09 | Enviar datos malformados (stars negativos, fecha futura, campo con tipo incorrecto, licencia vacía). | El dato inválido se muestra como "Sin dato" o la herramienta se omite con registro del problema; la interfaz no se rompe y nunca muestra un valor inventado. |
| MU-10 | Incluir en un snippet un comando destructivo (`curl … \| sh`, `rm -rf …`) esperando que el usuario lo copie y lo ejecute, por ejemplo envenenando el README para que el LLM lo genere. | El sistema no ejecuta nada. Si la idea no está revisada, el aviso de RF-05 (f) es visible junto al snippet y junto a la opción de copiar. |
| MU-11 | Meter Markdown o HTML con una imagen remota en la descripción (píxel de rastreo). | El Markdown/HTML no se interpreta; no se carga ningún recurso remoto a partir de datos externos. (RNF-04) |
| MU-12 | Hacer pasar una idea no revisada por revisada, metiendo en el snippet o en los disparadores un texto como "✔ Revisada por el equipo". | La marca de revisada es un elemento de la interfaz separado visualmente del contenido externo y depende solo del estado de revisión. El texto falso aparece como parte del contenido y la idea sigue mostrando el aviso de no revisada. (RF-05 g) |

## 7. Fuera de alcance

- **Asistente RAG** (feature 002): en esta feature solo se reserva el punto de entrada, como un elemento visible y deshabilitado ("Asistente — próximamente"), sin campo de texto ni llamada a ningún servicio.
- Ingesta desde GitHub, cálculo del health score y del nivel de mantenimiento, generación de ideas de integración con LLM y el proceso de revisión humana de esas ideas (feature 003).
- Mostrar el README completo de los repos.
- Login, cuentas de usuario y control de acceso al catálogo: el catálogo es público (pregunta 1).
- Cualquier escritura de datos desde la interfaz: altas, ediciones, favoritos, comentarios, valoraciones.
- Comparador lado a lado de herramientas y ordenamiento personalizado (candidatos a una versión posterior).
- Tema claro y selector de tema: la interfaz es solo oscura (RNF-15).
- Criterios WCAG 2.1 no listados en RNF-16 (ver 5.1) y pruebas con lectores de pantalla.
- Interfaz en inglés como entrega obligatoria: es una mejora C (RNF-17). Traducción de los datos del catálogo (descripciones, disparadores, snippets). Idiomas además de español e inglés.
- Copiar marca, logo, textos o imágenes de Mobbin.

## 8. Preguntas abiertas (clarificación)

| # | Pregunta | Respuesta | Fecha |
| --- | --- | --- | --- |
| 1 | **Acceso:** ¿el catálogo es público (sin login) o solo para usuarios de la consultora con inicio de sesión? | Público, sin login. Todo dato que muestra el catálogo debe poder ser público; el login queda fuera de alcance. | 2026-10-30 |
| 2 | **Datos mientras no hay backend:** ¿esta feature incluye un conjunto de datos de ejemplo para desarrollar y probar (incluyendo los payloads de mal uso), o se espera al backend de Ángel? ¿El contrato de datos de 4.1 lo cerramos con él antes del plan? | Sí, la feature incluye datos de prueba que respetan el contrato de 4.1: **150 herramientas sintéticas generadas por script** y un **archivo de fixtures separado** con los payloads de MU-01 a MU-12 y los casos borde. **Actualizado:** la validación de 4.1 con Ángel no bloquea el plan, pero tiene que estar hecha antes de las tareas que consumen datos reales. | 2026-10-30 |
| 3 | **Métricas de salud:** ¿en qué escala viene el health score, qué niveles tiene el "nivel de mantenimiento" y qué significa "última actualización" (último commit, último release)? ¿El frontend solo los muestra o calcula algo? | El frontend **solo muestra**, no calcula. Health score: 0-100. Nivel de mantenimiento: Activo / Moderado / Abandonado. "Última actualización" = último commit en la rama principal. Los umbrales los define Ángel y se confirman al validar 4.1. | 2026-10-30 |
| 4 | **Ideas de integración:** ¿de dónde salen (curadas a mano, generadas por un LLM, extraídas del README)? ¿Qué valores tiene "dificultad"? Define el nivel de confianza y si mostramos un aviso de "ejemplo no verificado". | Mixto: las genera un LLM en el pipeline y una persona puede marcarlas como revisadas. La ficha distingue entre idea revisada y no revisada; las no revisadas llevan un aviso visible. Revisada o no, todo su contenido sigue siendo no confiable (P5) y se muestra solo como texto. Dificultad: Baja / Media / Alta (a confirmar en 4.1). | 2026-10-30 |
| 5 | **Enlaces externos:** ¿la ficha enlaza al repositorio original? ¿Solo permitimos enlaces a `github.com`? | Sí. El único enlace externo es el del repositorio original y solo es clickeable si usa `https` y su dominio es exactamente `github.com`. Si no cumple, no se muestra el enlace. Se abre en una pestaña nueva, sin dar acceso a la página de origen. | 2026-10-30 |
| 6 | **Categorías:** ¿una herramienta puede pertenecer a más de una categoría? | Sí. Una herramienta tiene una o más de las 6 categorías, aparece en cada una de ellas y la ficha las lista todas. | 2026-10-30 |
| 7 | **Búsqueda y filtros:** ¿en qué campos busca el texto (¿también en disparadores o stack?) y queremos que la búsqueda y los filtros queden en la dirección para poder compartir el enlace? | Busca solo en nombre y descripción. La búsqueda y los filtros quedan en la dirección: se puede recargar o compartir el enlace y se llega a la misma vista. Todo valor que llegue por la dirección es no confiable y se valida (MU-05, MU-06). | 2026-10-30 |
| 8 | **Punto de entrada al asistente:** ¿cómo se reserva (botón deshabilitado "Próximamente", sección vacía, oculto detrás de un flag)? ¿Le asignamos un ID de requisito? | Un botón o sección visible y deshabilitado, "Asistente — próximamente", sin campo de texto ni llamada a ningún servicio. No lleva ID propio: es un criterio de aceptación de esta feature y el ID lo define la spec 002. | 2026-10-30 |
| 9 | **Modo oscuro y accesibilidad:** ¿el modo oscuro es obligatorio (M) o recortable (C, según P8)? ¿Apuntamos a algún nivel de accesibilidad (ej. WCAG 2.1 AA)? | **Modo oscuro único**, sin selector de tema (**RNF-15**, M): no entra en el orden de recorte de P8 para esta feature. Accesibilidad: **WCAG 2.1 AA acotado** a contraste, teclado, foco visible, labels e idioma declarado, verificado con axe más una prueba manual de teclado (**RNF-16**, M). Los criterios fuera de alcance están en 5.1. | 2026-10-30 |
| 10 | **Idioma:** ¿la interfaz es solo en español? Las descripciones de GitHub vienen mayormente en inglés: ¿se muestran tal cual? | **RNF-17, prioridad C.** Los textos de la interfaz se externalizan en un diccionario desde el inicio, pero se entrega solo en español. El inglés (con selector) queda como mejora si sobra tiempo. Supuestos confirmados: el idioma inicial sale del navegador y solo se traduce la interfaz; los datos del catálogo se muestran en su idioma original. | 2026-10-30 |

## 9. Criterios de aceptación de la feature

- [ ] Existe un script que genera 150 herramientas sintéticas que respetan el contrato de 4.1, con ideas revisadas y no revisadas y herramientas en varias categorías.
- [ ] Existe un archivo de fixtures separado con los payloads de MU-01 a MU-12 y los casos borde (campos faltantes, al menos una herramienta sin licencia, categoría vacía, valores fuera de rango).
- [ ] La sección 4.1 fue validada con Ángel antes de empezar las tareas que consumen datos reales.
- [ ] RF-01 a RF-05 cumplen sus criterios de aceptación con el conjunto de prueba.
- [ ] RNF-02, RNF-04, RNF-07, RNF-10, RNF-13, RNF-15 (modo oscuro) y RNF-16 (WCAG 2.1 AA acotado) verificados según la sección 5, con resultados reales registrados en `tasks.md`.
- [ ] RNF-17: todos los textos de la interfaz están en el diccionario y la interfaz se entrega en español. El inglés no es requisito para cerrar la feature.
- [ ] Los casos MU-01 a MU-12 se probaron con datos de prueba y dieron el resultado esperado.
- [ ] El punto de entrada al asistente RAG se ve como un elemento deshabilitado "Asistente — próximamente": no acepta texto, no envía nada y no llama a ningún servicio.
- [ ] La interfaz no usa marca, textos ni imágenes de Mobbin.
- [ ] Sin secretos en el repo; secret scanning en verde.
- [x] Todas las preguntas de la sección 8 respondidas y reflejadas en este spec.
