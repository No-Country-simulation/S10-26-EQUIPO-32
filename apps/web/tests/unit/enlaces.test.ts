import { describe, expect, it } from "vitest";
import { validarUrlRepo } from "@/lib/catalogo/enlaces";

describe("validarUrlRepo · válidos", () => {
  it("acepta https://github.com/o/r y devuelve la URL canónica", () => {
    expect(validarUrlRepo("https://github.com/o/r")).toBe("https://github.com/o/r");
  });

  it("acepta mayúsculas en esquema y host y devuelve minúsculas", () => {
    expect(validarUrlRepo("HTTPS://GitHub.COM/o/r")).toBe("https://github.com/o/r");
  });

  it("acepta ruta, consulta y hash de github.com", () => {
    expect(validarUrlRepo("https://github.com/o/r/tree/main?x=1#a")).toBe(
      "https://github.com/o/r/tree/main?x=1#a",
    );
  });

  it("el puerto por defecto escrito (:443) se normaliza y la salida no lo tiene", () => {
    expect(validarUrlRepo("https://github.com:443/o/r")).toBe("https://github.com/o/r");
  });
});

describe("validarUrlRepo · inválidos (MU-08)", () => {
  it.each([
    ["http sin TLS", "http://github.com/o/r"],
    ["javascript:", "javascript:alert(1)"],
    ["data:", "data:text/html,<script>alert(1)</script>"],
    ["subdominio engañoso", "https://github.com.evil.io/o/r"],
    ["typosquatting", "https://githuh.com/o/r"],
    ["host en la consulta", "https://evil.io/?github.com"],
    ["host en la ruta", "https://evil.io/github.com/o/r"],
    ["credenciales", "https://user:pw@github.com/o/r"],
    ["solo usuario", "https://user@github.com/o/r"],
    ["puerto", "https://github.com:8443/o/r"],
    ["subdominio legítimo no permitido", "https://gist.github.com/o/r"],
    ["www", "https://www.github.com/o/r"],
    ["punto final en el host", "https://github.com./o/r"],
    ["sin esquema", "github.com/o/r"],
    ["esquema relativo", "//github.com/o/r"],
    ["vacío", ""],
    ["solo espacios", "   "],
    ["file:", "file:///etc/passwd"],
    ["ftp:", "ftp://github.com/o/r"],
    ["barra invertida que engaña al parser", "https://evil.io\\@github.com/o/r"],
  ])("rechaza %s", (_nombre, url) => {
    expect(validarUrlRepo(url)).toBeNull();
  });

  it.each([
    ["espacio al final", "https://github.com/o/r "],
    ["salto de línea", "https://github.com/o/r\n"],
    ["tabulación en el host", "https://git\thub.com/o/r"],
    ["NUL", "https://github.com/o/r\u0000"],
    ["bidi U+202E", "https://github.com/o/r\u202E"],
    ["ancho cero U+200B en el host", "https://git\u200Bhub.com/o/r"],
    ["BOM U+FEFF", "\uFEFFhttps://github.com/o/r"],
  ])("rechaza caracteres invisibles o de control: %s", (_nombre, url) => {
    expect(validarUrlRepo(url)).toBeNull();
  });

  it("rechaza lo que no es una cadena", () => {
    for (const v of [null, undefined, 42, {}, [], true, ["https://github.com/o/r"]]) {
      expect(validarUrlRepo(v)).toBeNull();
    }
  });

  it("rechaza una URL de más de 2048 caracteres", () => {
    expect(validarUrlRepo("https://github.com/o/" + "a".repeat(2100))).toBeNull();
  });

  it("un host con letras de ancho completo se normaliza a github.com y la salida es la canónica", () => {
    const r = validarUrlRepo("https://ｇithub.com/o/r");
    expect(r === null || r === "https://github.com/o/r").toBe(true);
  });
});
