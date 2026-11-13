// Reglas de seguridad y de textos (T02): RNF-04, RNF-17, AM-01, AM-12, AM-16 y ui-brief.md §5, §6, §10.
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const URL_EXTERNA = "/^(https?:)?\\/\\//";

const sintaxisComun = [
  {
    selector:
      "JSXOpeningElement[name.name=/^(img|iframe|script|link|video|audio|object|embed)$/]",
    message: "Elemento prohibido (ui-brief §5.3): sin recursos externos ni scripts en línea.",
  },
  {
    selector: "ImportDeclaration[source.value='next/image']",
    message: "next/image prohibido (ui-brief §5.3).",
  },
  {
    selector: `JSXAttribute[name.name=/^(src|href|action)$/][value.type='Literal'][value.value=${URL_EXTERNA}]`,
    message: "URL absoluta o protocolo-relativa literal prohibida en src/href/action (ui-brief §5.3).",
  },
  {
    selector: `JSXAttribute[name.name=/^(src|href|action)$/] > JSXExpressionContainer > Literal[value=${URL_EXTERNA}]`,
    message: "URL absoluta o protocolo-relativa literal prohibida en src/href/action (ui-brief §5.3).",
  },
  {
    selector:
      // alt="" (imagen decorativa) no es texto de interfaz: se permite (feature 005, logo propio).
      "JSXAttribute[name.name=/^(aria-label|title|placeholder|alt)$/][value.type='Literal'][value.value!='']",
    message: "Texto literal prohibido: usar t('clave') (RNF-17, ui-brief §6).",
  },
  {
    selector:
      "JSXAttribute[name.name=/^(aria-label|title|placeholder|alt)$/] > JSXExpressionContainer > Literal",
    message: "Texto literal prohibido: usar t('clave') (RNF-17, ui-brief §6).",
  },
];

const sintaxisComponentes = [
  ...sintaxisComun,
  {
    selector: "MemberExpression[object.name='process'][property.name='env']",
    message: "process.env prohibido en componentes (ui-brief §10).",
  },
];

const sintaxisCatalogo = [
  ...sintaxisComponentes,
  {
    selector: "JSXAttribute[name.name='style']",
    message:
      "La prop style está prohibida en src/components/catalogo (ui-brief §5.4). Las excepciones se piden por escrito.",
  },
];

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", ".next-redteam/**", "out/**", "build/**", "next-env.d.ts", "node_modules/**"]),
  {
    rules: {
      "react/no-danger": "error",
      "react/jsx-no-target-blank": ["error", { enforceDynamicLinks: "always" }],
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-restricted-properties": [
        "error",
        { property: "innerHTML", message: "innerHTML prohibido (AM-01)." },
        { property: "outerHTML", message: "outerHTML prohibido (AM-01)." },
        { property: "insertAdjacentHTML", message: "insertAdjacentHTML prohibido (AM-01)." },
      ],
    },
  },
  {
    files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
    rules: {
      "react/jsx-no-literals": ["error", { noStrings: true, ignoreProps: true }],
      "no-restricted-syntax": ["error", ...sintaxisComun],
    },
  },
  {
    files: ["src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": ["error", ...sintaxisComponentes],
      "no-restricted-globals": [
        "error",
        { name: "fetch", message: "Los componentes no hacen fetch (ui-brief §10)." },
        { name: "XMLHttpRequest", message: "Los componentes no hacen requests (ui-brief §10)." },
        { name: "WebSocket", message: "Los componentes no hacen requests (ui-brief §10)." },
      ],
    },
  },
  {
    files: ["src/components/catalogo/**/*.{ts,tsx}"],
    rules: { "no-restricted-syntax": ["error", ...sintaxisCatalogo] },
  },
  {
    // Única excepción a ui-brief §5.3 (feature 005; RF-18, RNF-26): el logo propio es un archivo del sitio
    // (/logos/<id>.png|jpg, validado en la ingesta), nunca un recurso externo; la CSP `img-src 'self'` lo garantiza.
    // Sigue prohibido todo lo demás, incluidas las URLs absolutas en src y next/image.
    files: ["src/components/marca/LogoRepo.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        ...sintaxisComponentes.filter((r) => !r.selector.startsWith("JSXOpeningElement[name.name=/^(img|")),
        {
          selector: "JSXOpeningElement[name.name=/^(iframe|script|link|video|audio|object|embed)$/]",
          message: "Elemento prohibido (ui-brief §5.3): sin recursos externos ni scripts en línea.",
        },
      ],
    },
  },
  {
    // Excepción a ui-brief §5.3 (feature 007; RF-24, RF-25, RNF-31, ui-brief §13): capturas y fotos propias van con
    // next/image, solo desde /capturas/<id> y /imagenes/<archivo> del propio sitio (CSP `img-src 'self'` sin cambios).
    // Solo se habilita el import: siguen prohibidas las URLs absolutas en src, <img> directo y `style`.
    files: ["src/components/marca/PreviewHerramienta.tsx", "src/components/sitio/FotoSitio.tsx"],
    rules: {
      "no-restricted-syntax": ["error", ...sintaxisCatalogo.filter((r) => !r.selector.includes("next/image"))],
    },
  },
]);
