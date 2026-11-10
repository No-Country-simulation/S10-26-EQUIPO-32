import { describe, expect, it } from "vitest";
import { normalizarTexto, normalizarTextoLargo } from "@/lib/catalogo/texto";

const cp = (desde: number, hasta: number) =>
  Array.from({ length: hasta - desde + 1 }, (_, i) => String.fromCodePoint(desde + i));

const BIDI = [...cp(0x202a, 0x202e), ...cp(0x2066, 0x2069), "\u200E", "\u200F", "\u061C"];
const ANCHO_CERO = [...cp(0x200b, 0x200d), "\u2060", "\uFEFF"];

describe("texto.ts · caracteres de dirección (bidi)", () => {
  it.each(BIDI)("elimina U+%#x en ambas variantes", (c) => {
    expect(normalizarTexto(`a${c}b`, 50)).toBe("ab");
    expect(normalizarTextoLargo(`a${c}b`, 50)).toBe("ab");
  });

  it("neutraliza un «Trojan Source» en un snippet", () => {
    const snippet = "if (esAdmin) {\u202E // } {\u2066 /* x */\u2069\n  ejecutar();\n}";
    const salida = normalizarTextoLargo(snippet, 500);
    for (const c of BIDI) expect(salida).not.toContain(c);
    expect(salida).toContain("\n  ejecutar();\n}");
  });
});

describe("texto.ts · ancho cero", () => {
  it.each(ANCHO_CERO)("elimina U+%#x en ambas variantes", (c) => {
    expect(normalizarTexto(`a${c}b`, 50)).toBe("ab");
    expect(normalizarTextoLargo(`a${c}b`, 50)).toBe("ab");
  });
});

describe("texto.ts · controles C0/C1", () => {
  it("variante corta: borra los controles", () => {
    expect(normalizarTexto("a\u0000b\u0007c\u001Bd\u007Fe\u0085f\u009Fg", 50)).toBe("abcdefg");
  });

  it("variante corta: saltos y tabulaciones pasan a un solo espacio", () => {
    expect(normalizarTexto("uno\n\n\tdos\r\ntres", 50)).toBe("uno dos tres");
  });

  it("variante larga: quita C0 y C1 salvo \\n y \\t", () => {
    expect(normalizarTextoLargo("a\u0000b\u0007c\u007Fd\u0085e\u009Ff", 50)).toBe("abcdef");
  });

  it("variante larga: \\r desaparece (CRLF pasa a LF) y U+2028/2029 pasan a \\n", () => {
    expect(normalizarTextoLargo("a\r\nb\u2028c\u2029d", 50)).toBe("a\nb\nc\nd");
  });
});

describe("texto.ts · NFC", () => {
  it("compone e + U+0301 en é (corta y larga)", () => {
    const decomp = "cafe\u0301";
    expect(normalizarTexto(decomp, 50)).toBe("café");
    expect(normalizarTexto(decomp, 50).length).toBe(4);
    expect(normalizarTextoLargo(decomp, 50)).toBe("café");
  });

  it("la salida es NFC aunque un carácter invisible separe la secuencia", () => {
    const sucio = "cafe\u200D\u0301";
    expect(normalizarTexto(sucio, 50)).toBe("café");
    expect(normalizarTextoLargo(sucio, 50)).toBe("café");
  });
});

describe("texto.ts · espacios", () => {
  it("variante corta: colapsa y recorta (incluye espacio no separable)", () => {
    expect(normalizarTexto("   hola \u00A0  mundo   ", 50)).toBe("hola mundo");
  });

  it("variante larga: no colapsa ni recorta (el código no se altera)", () => {
    expect(normalizarTextoLargo("  a    b\t c  ", 50)).toBe("  a    b\t c  ");
  });
});

describe("texto.ts · snippet con saltos de línea intactos", () => {
  it("conserva \\n y \\t exactos", () => {
    const snippet = "function f() {\n\treturn 1;\n}\n\nf();\n";
    expect(normalizarTextoLargo(snippet, 500)).toBe(snippet);
  });

  it("no convierte URLs ni etiquetas: solo normaliza", () => {
    const s = "<script>alert(1)</script>\nhttps://evil.io/x";
    expect(normalizarTextoLargo(s, 500)).toBe(s);
  });
});

describe("texto.ts · cortes exactos", () => {
  it("corta justo en la cota (corta y larga)", () => {
    expect(normalizarTexto("abcdefghij", 4)).toBe("abcd");
    expect(normalizarTextoLargo("abcdefghij", 4)).toBe("abcd");
  });

  it("una cota igual al largo no corta; cota 0 devuelve vacío", () => {
    expect(normalizarTexto("abcd", 4)).toBe("abcd");
    expect(normalizarTextoLargo("abcd", 0)).toBe("");
  });

  it("no parte un par sustituto (emoji) en la frontera", () => {
    const salida = normalizarTexto("ab😀cd", 3);
    expect(salida).toBe("ab😀");
    expect(Array.from(salida)).toHaveLength(3);
    expect(normalizarTextoLargo("😀😀😀", 2)).toBe("😀😀");
  });

  it("el corte se hace después de limpiar: los invisibles no consumen cota", () => {
    expect(normalizarTexto("a\u200Bb\u200Bc\u200Bd", 3)).toBe("abc");
  });

  it("una descripción de 300 000 caracteres queda en la cota", () => {
    const enorme = "x".repeat(300_000);
    expect(normalizarTextoLargo(enorme, 300)).toHaveLength(300);
    expect(normalizarTexto(enorme, 100)).toHaveLength(100);
  });

  it("rechaza cotas inválidas", () => {
    expect(() => normalizarTexto("a", -1)).toThrow(RangeError);
    expect(() => normalizarTextoLargo("a", 1.5)).toThrow(RangeError);
    expect(() => normalizarTexto("a", Number.NaN)).toThrow(RangeError);
  });
});

describe("texto.ts · propiedades", () => {
  it("es idempotente", () => {
    const sucio = "  \u202Ehola\u200B\u0000 mun\u0303do\r\n\t ";
    const una = normalizarTexto(sucio, 100);
    expect(normalizarTexto(una, 100)).toBe(una);
    const larga = normalizarTextoLargo(sucio, 100);
    expect(normalizarTextoLargo(larga, 100)).toBe(larga);
  });

  it("texto limpio pasa sin cambios", () => {
    expect(normalizarTexto("Herramienta útil 1.0", 50)).toBe("Herramienta útil 1.0");
  });
});
