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
      "JSXAttribute[name.name=/^(aria-label|title|placeholder|alt)$/][value.type='Literal']",
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
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "node_modules/**"]),
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
]);
