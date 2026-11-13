# Brief de UI — OpenBridge (feature 001)

**Para:** el asistente que desarrolla la capa visual (UI) en paralelo.
**Fecha:** 2026-11-02 · **Responsable:** Jerónimo Núñez · **Integra:** Claude Code en `apps/web`, vía PR revisado.

> Este brief es parte del spec 001. Si algo de acá choca con `spec.md`, `plan.md` o `specs/constitution.md`, gana el spec: avisá y no improvises.

## 1. Qué sos y qué NO sos en este proyecto

- **Sos:** el autor de los **componentes visuales** (presentacionales) del catálogo: reciben datos por props y los muestran.
- **NO sos:** quien trae datos, valida, filtra, maneja la URL, configura seguridad ni instala dependencias. Eso ya existe o lo hace otro equipo en `lib/` y en el proxy. Tus componentes no hacen `fetch`, no leen variables de entorno y no guardan estado global.

## 2. Producto

OpenBridge es un catálogo de herramientas open-source (Autenticación, Base de Datos, Pagos, IA, Analítica, Búsqueda) para arquitectos de software. Cada herramienta tiene una ficha técnica con métricas de salud y "ideas de integración" estructuradas.

## 3. Dirección visual

**Revisión 2026-11-02:** seguir `spec.md` §1.1–1.2. El objetivo es una representación muy cercana de la composición de Mobbin con marca OpenBridge, no una reinterpretación libre. El tema oscuro de la versión anterior queda sustituido por **tema claro único**.

- Fondo `#ffffff`, texto principal `#141414`, superficies `#f5f5f5`, texto secundario cercano a `#6b6b6b` y bordes neutros sutiles. Verificar contraste AA de cada combinación. Negro/blanco para la acción principal y gris claro para la secundaria; colores semánticos solo para salud, avisos y errores.
- Un solo juego de tokens en `:root`, `color-scheme: light`; sin `.dark`, `@custom-variant dark`, selector, proveedor de tema ni dependencia de `prefers-color-scheme`. Tokens de espaciado, radios y escala tipográfica compartidos; botones tipo píldora y tarjetas con radios medidos de la referencia.
- Cabecera compacta, alineada al ancho del contenido. Portada centrada con título grande, fuerte y de hasta tres líneas en escritorio, subtítulo gris, acción hacia el catálogo y amplios espacios como en las capturas. No convertir todos los títulos de estados en titulares de portada.
- Catálogo con navegación superior, grilla de tres/dos/una columnas según espacio disponible y filtros laterales en escritorio. Conservar la densidad técnica de OpenBridge y los campos requeridos; no inventar capturas de producto ni bloques vacíos para rellenar tarjetas.
- Marca, textos, íconos y recursos de OpenBridge. No reutilizar activos de Mobbin. Fuente libre visualmente cercana con `next/font`; solo assets locales. No agregar secciones comerciales, enlaces ficticios ni animaciones de la referencia.
- Componer fiel a la referencia (`spec.md` §1.2); la aprobación es la revisión visual de Jerónimo, sin medición de píxeles. No tomar el chrome de Safari como parte del diseño.
- Responsive a 360, 768 y 1280 px sin desborde; móvil adaptado a falta de referencia móvil. Seguridad y accesibilidad se mantienen aunque obliguen a documentar una diferencia visual.

## 4. Stack obligatorio (no agregar nada)

- Next.js 16 (App Router) + React 19 + TypeScript **estricto** + Tailwind CSS 4.
- Componentes base de shadcn/ui **solo**: Button, Badge, Card, Input, Label. Íconos: `lucide-react`.
- **Prohibido agregar dependencias.** Si creés que hace falta una, proponela por escrito con el motivo; no la instales.
- Tipografía: `next/font` (se descarga en el build y se sirve desde nuestro dominio). Nada de `<link>` a Google Fonts ni CDNs.

## 5. Reglas de seguridad (no negociables)

1. **Nunca** `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function` ni parsers de Markdown o HTML.
2. Todo texto que viene de datos (nombre, descripción, licencia, snippets) se renderiza como **texto** de React. Puede contener `<script>`, emojis, caracteres bidi o 300 KB de texto: tiene que verse literal y no romper el layout (cortar con `line-clamp`/`truncate` y `overflow-wrap:anywhere`).
3. **Sin recursos externos:** ningún `<img src="https://...">`, ningún fondo, fuente o script remoto. Solo assets locales en `public/` (la CSP los bloquea: `img-src 'self'`, `font-src 'self'`, `connect-src 'self'`).
4. **Sin `<script>` en línea y sin la prop `style` en ningún componente de `src/components/catalogo`** (ni con valores fijos). Todo el aspecto sale de clases de Tailwind y de los tokens de `globals.css`. Si una tanda necesita una excepción, se pide por escrito en el PR con el motivo; no se usa por las dudas. Lo comprueba el lint.
5. Enlace al repositorio: el componente recibe `urlRepo: string | null` **ya validado**. Si es `null`, no hay enlace. Si hay, `<a target="_blank" rel="noopener noreferrer">`.
6. Snippets: dentro de `<pre><code>`, como texto. Ninguna URL del snippet es clickeable. El botón "Copiar" solo aparece si la prop `copiable` es `true`.
7. Idea **no revisada** (`revisada: false`): mostrar el aviso "Generada automáticamente, revisala antes de usarla" pegado al snippet y al botón copiar. La insignia "Revisada" sale **solo** de la prop booleana, nunca del texto.

## 6. Textos de interfaz (RNF-17)

- **Ningún texto literal en JSX.** Todo texto propio de la UI sale de `t('clave')` del diccionario `src/i18n/es.ts`. Entregá también las claves nuevas que agregues.
- Textos fijos obligatorios: "Sin dato", "Sin licencia declarada", "Asistente — próximamente", el aviso de no revisada, los estados vacío, error y no encontrado.

## 7. Accesibilidad (RNF-16, criterios que se verifican con axe)

Contraste AA (1.4.3 y 1.4.11), todo operable con teclado y sin trampas (2.1.1, 2.1.2), orden de foco lógico (2.4.3), **foco visible** en todo control (2.4.7), labels en los controles (3.3.2, 4.1.2). HTML semántico: `header`, `nav`, `main`, `h1`–`h3` en orden, `button` para acciones y `a` para navegación.

## 8. Componentes a entregar

Los tipos de abajo son **copia del contrato** (`plan.md` 4.2; viven en `src/lib/catalogo/contrato.ts`, que escribimos nosotros con zod). Usá estos nombres, enums, nulabilidad y límites exactos. Si algo difiere, gana el plan: avisá y no lo cambies por tu cuenta.

```ts
type Categoria = 'autenticacion' | 'base-de-datos' | 'pagos' | 'ia' | 'analitica' | 'busqueda';
type NivelMantenimiento = 'activo' | 'moderado' | 'abandonado';   // NO 'inactivo'
type TipoIdea = 'rest' | 'docker' | 'sdk' | 'webhook';
type Dificultad = 'baja' | 'media' | 'alta';

// Todo texto ya viene normalizado (NFC, sin controles ni bidi) y cortado a su cota.
interface Herramienta {
  id: string;                          // ASCII, ^[a-z0-9][a-z0-9._-]{0,99}$
  nombre: string;                      // 1-100
  descripcion: string | null;          // lista: ≤ 300 · detalle: ≤ 2000
  descripcionTruncada: boolean;        // true si se cortó a la cota
  categorias: Categoria[];             // 1 a 6, sin duplicados
  lenguaje: string | null;             // ≤ 40
  licencia: string | null;             // ≤ 64
  stars: number | null;                // entero 0 a 10^9
  ultimaActualizacion: string | null;  // ISO 8601
  issuesAbiertos: number | null;       // entero ≥ 0
  mantenedorActivo: boolean | null;
  nivelMantenimiento: NivelMantenimiento | null;
  healthScore: number | null;          // entero 0 a 100
  metricasTomadasEn: string | null;    // ISO 8601
  urlRepo: string | null;              // ya validada (https://github.com/…) o null
}
interface Idea {                        // el contrato no tiene `id`: usá el índice como key
  tipo: TipoIdea | null;
  disparadores: string[];              // 0 a 10, ≤ 200 c/u
  snippet: string | null;              // ≤ 4000, conserva \n y \t
  snippetExcedeLimite: boolean;        // true: se muestra el inicio y NO se puede copiar
  stack: string[];                     // 0 a 10, ≤ 60 c/u
  dificultad: Dificultad | null;
  revisada: boolean;                   // solo `true` estricto cuenta como revisada
}
interface ValoresFiltros {            // estado de 4.4 del plan; null = sin filtro
  lenguaje: string | null; licencia: string | null;
  mantenimiento: NivelMantenimiento | null; stars: number | null;   // stars: entero 0 a 10^7
}
type HerramientaResumen = Herramienta;                                 // grilla: sin ideas, descripción ≤ 300
type HerramientaDetalle = Herramienta & { ideas: Idea[] };             // ficha: 0 a 10 ideas
```

**Notas de lectura (no son campos nuevos):** el botón «Copiar» se habilita con `copiable = !snippetExcedeLimite` y solo si `snippet !== null`; ese cálculo lo hace `IdeaIntegracion` al pasarle `copiable` a `BloqueSnippet`. `metricasTomadasEn` es la fecha que se muestra como «métricas al …». Filtros y búsqueda usan estos mismos valores (`lenguaje`, `licencia`, `mantenimiento`, `stars`, `q`).

**UI-1 no depende de `contrato.ts`**. Los tipos de datos anteriores se usan a partir de UI-2; si el archivo aún no existe, se trabaja con esta copia y se concilia al integrar.

Los componentes se entregan en **cuatro tandas** (cada una es un PR a la rama `001-frontend-catalogo`):

| Tanda | Componentes |
| --- | --- |
| UI-1 | Tokens y escala en `globals.css`, fuentes con `next/font`, `Cabecera`, `PresentacionCatalogo`, `EstadoVacio`, `EstadoError`, `EstadoNoEncontrado` |
| UI-2 | `TarjetaHerramienta`, `IndicadorSalud`, `GrillaHerramientas`, `NavCategorias` |
| UI-3 | `FichaHerramienta`, `IdeaIntegracion`, `BloqueSnippet` |
| UI-4 | `PanelFiltros`, `Buscador`, `ChipsFiltros` (el contador de resultados va dentro de `PanelFiltros`) |

| Componente | Qué muestra | Props clave |
| --- | --- | --- |
| `Cabecera` | Marca OpenBridge y botón «Asistente — próximamente» **deshabilitado** (no acepta texto ni hace nada). **No incluye buscador** (va en UI-4); deja un lugar para montarlo | `children?` (ranura para el `Buscador`) |
| `PresentacionCatalogo` *(UI-1)* | Portada centrada del catálogo: título, subtítulo y enlace principal al área del catálogo. Textos propios desde `t()`, sin métricas inventadas ni lógica de datos | `idCatalogo: string` (identificador interno del destino; el componente construye un enlace de fragmento, no acepta URL externa) |
| `Buscador` *(UI-4)* | Campo de búsqueda con `label` | `valor: string`, `onBuscar: (q: string) => void`; `maxLength={100}` |
| `NavCategorias` | Las 6 categorías + «Todas», la activa resaltada | `activa: Categoria \| null`, `onElegir: (c: Categoria \| null) => void` |
| `PanelFiltros` *(UI-4)* | Lenguaje, licencia, stars mínimos, nivel de mantenimiento y contador de resultados. En móvil, dentro de `<details>` nativo | `opciones: { lenguajes: string[]; licencias: string[] }`, `valores: ValoresFiltros`, `total: number`, `onCambiar: (parcial: Partial<ValoresFiltros>) => void` |
| `ChipsFiltros` *(UI-4)* | Filtros activos con «quitar uno» y «limpiar todos» | `activos: { clave: string; etiqueta: string }[]`, `onQuitar: (clave: string) => void`, `onLimpiar: () => void` |
| `GrillaHerramientas` | Grilla responsive de tarjetas | `herramientas: HerramientaResumen[]`, `total: number` |
| `TarjetaHerramienta` | Nombre, `id` en monoespaciada, descripción cortada, badges de categorías, lenguaje, licencia, stars, health score, nivel de mantenimiento (con texto) | `herramienta: HerramientaResumen` |
| `IndicadorSalud` | Health score 0–100 con color y número (no depender solo del color) | `valor: number \| null` |
| `FichaHerramienta` | Detalle completo con todos los campos, enlace al repo y lista de ideas | `herramienta: HerramientaDetalle` |
| `IdeaIntegracion` | Tipo, disparadores, stack, dificultad, insignia Revisada o aviso, snippet | `idea: Idea` |
| `BloqueSnippet` | `<pre><code>` + botón Copiar (si es copiable) | `codigo: string`, `copiable: boolean`, `onCopiar: () => void` |
| `EstadoVacio`, `EstadoError`, `EstadoNoEncontrado` | Mensajes y acción de reintento o volver | `titulo`, `texto` y `accion?` (vacío) · `onReintentar?` (error) |

Los textos de las etiquetas de `ChipsFiltros` los arma nuestro código (a partir de `t()` y de los valores); el componente solo los muestra como texto.

Campos `null` → «Sin dato»; `licencia === null` → «Sin licencia declarada»; `nivelMantenimiento` se muestra con texto («Activo», «Moderado», «Abandonado») además del color.

## 9. Cómo se entrega

- Rama `ui/astra-v1` (o zip), **una tanda por PR** (ver tabla de tandas en §8), con **solo**: `src/components/catalogo/*.tsx`, ajustes de tokens en `src/app/globals.css`, la fuente con `next/font` y las claves nuevas para `src/i18n/es.ts`.
- Página de demostración como archivo aparte en `demo/demo-ui/page.tsx`, **fuera de `src/app`**. El autor de UI no modifica configuración ni crea una ruta de producción; TI1 decide cómo montarla solo en desarrollo y verifica que `/demo-ui` no exista en producción. Estar fuera de `src/app` evita registrar una ruta, pero no garantiza exclusión de typecheck: no cambiar `tsconfig` para ocultar errores.
- La demo abre con una **vista normal del producto**: cabecera y portada; desde UI-2, catálogo de ejemplo. En UI-1 el enlace principal lleva a una sección de demostración de un estado del catálogo; no se inventan tarjetas de tandas posteriores. Los casos de prueba se agrupan aparte en un `<details>` identificado, cerrado inicialmente, y nunca sustituyen la portada.
- Datos inventados; incluir solo casos aplicables a la tanda. UI-1: estados con/sin acción, reintento opcional, texto largo, `<script>alert(1)</script>` como texto y caracteres bidi contenidos sin afectar vecinos. En UI-2/3 agregar licencia ausente, campos nulos, ideas no revisadas y ficha sin ideas. Los valores nulos solo se usan donde el tipo los permite; no forzar props inválidas con casts.
- Entregar cada archivo completo con su ruta en un bloque separado, claves nuevas de `es.ts` aparte y checklist §10 confirmado con evidencia o explicado como pendiente.
- Entra por **PR** a la rama `001-frontend-catalogo`. Lo revisa Jerónimo y pasa por lint (`react/no-danger`, `react/jsx-no-target-blank`, `react/jsx-no-literals`), `tsc`, Gitleaks y axe.

## 10. Checklist de aceptación

- [ ] Cero dependencias nuevas en `package.json` (lo comprueba además el chequeo de CI contra la lista de la tabla 3 del plan).
- [ ] Cero `style` en `src/components/catalogo` (sin excepciones no pedidas por escrito).
- [ ] Tipos de props idénticos a §8 (`abandonado`, no `inactivo`; `null` donde el contrato lo permite).
- [ ] Cero `dangerouslySetInnerHTML`, `<img>` remotos, fuentes o scripts externos.
- [ ] Cero textos literales en JSX; todo pasa por `t()`.
- [ ] Ningún componente hace `fetch` ni lee variables de entorno.
- [ ] Payloads de la página demo visibles como texto literal y sin romper el layout.
- [ ] Foco visible y navegación completa con teclado.
- [ ] Sin scroll horizontal a 360 px.
- [ ] Sin logo, nombre, textos, íconos ni imágenes de la referencia visual; la marca es solo OpenBridge.

- [ ] Tema claro único incluso con sistema oscuro; sin `.dark`, selector ni recursos remotos en ejecución.
- [ ] Cabecera y portada fieles a la referencia, a revisión de Jerónimo (`spec.md` §1.2). Grilla y ficha se verifican cuando corresponda a su tanda.
- [ ] Demo en `demo/demo-ui/page.tsx`, sin cambios de configuración; vista normal primero y casos extremos separados y cerrados inicialmente.
- [ ] UI-1 incluye `PresentacionCatalogo`; ningún estado gigante ni texto técnico de pruebas reemplaza la portada del producto.
- [ ] Evidencia responsive a 360, 768 y 1280 px; no declarar fidelidad móvil pixel perfect sin referencia móvil.
