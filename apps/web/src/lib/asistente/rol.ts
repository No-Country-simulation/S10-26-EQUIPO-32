// Detección de cambio de rol en la entrada (feature 002 · §12; RNF-23, AM-27, AM-28).
// Heurística determinista que corre antes del modelo: busca señales de jailbreak por rol/persona, ficción o
// hipótesis, en español, inglés y portugués, sobre una forma «plegada» de la consulta que deshace ofuscación
// simple (tildes, mayúsculas, ancho completo, homoglifos cirílicos, leetspeak, letras espaciadas, base64).
// Para no bloquear consultas legítimas (AM-28) se usan frases dirigidas al asistente, nunca palabras sueltas
// como «rol» o «dan». Todas las expresiones tienen repeticiones acotadas: la consulta llega cortada a 500.

export type SenalRol = "asignacion-de-rol" | "sin-reglas" | "persona-jailbreak" | "ficcion" | "formato-forzado";

// Cirílicas que se ven como latinas (escapadas a propósito, R-14).
const HOMOGLIFOS: Record<string, string> = {
  "\u0430": "a", "\u0435": "e", "\u043e": "o", "\u0440": "p", "\u0441": "c", "\u0445": "x", "\u0443": "y", "\u0456": "i", "\u0458": "j", "\u0455": "s",
};
const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s" };

/** Minúsculas, sin tildes, sin homoglifos ni leetspeak; conserva la puntuación. */
export function plegarConSignos(texto: string): string {
  return texto
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u0400-\u04FF]/gu, (c) => HOMOGLIFOS[c] ?? c)
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .replace(/[013457@$]/g, (c) => LEET[c] ?? c);
}

/** Solo letras separadas por un espacio; une letras sueltas espaciadas («d a n», «d.a.n» → «dan»). */
export function plegar(texto: string): string {
  return plegarConSignos(texto)
    .replace(/[^\p{L}]+/gu, " ")
    .trim()
    .replace(/\b(?:[a-z] ){2,}[a-z]\b/g, (m) => m.replace(/ /g, ""));
}

// Inicio de oración con un imperativo que le asigna otro rol o persona al asistente.
const ENTRADA = "(?:(?:ahora|bueno|ok|vale|dale|por favor|porfa|quiero que|necesito que|te pido que|please|now|ok so) )?";
const ASIGNACION_INICIO = new RegExp(
  `^${ENTRADA}(?:` +
    [
      "actua(?:d|n)? como", "actue como", "comportate como", "comportese como", "hace de cuenta que", "haz de cuenta que",
      "fingi(?:r)? (?:que|ser)", "finge (?:que|ser)", "simula (?:que|ser)", "interpreta (?:a|al|el papel)", "hace (?:el papel|de)", "haz (?:el papel|de)",
      "imagina(?:te)? que (?:sos|eres|vos sos|tu eres)", "suponete que sos", "juguemos a que", "convertite en", "conviertete en", "transformate en",
      "act (?:as|like)", "pretend(?: to be| you are| you re| that you| youre)", "role ?play", "behave (?:as|like)", "play the role", "imagine (?:you are|you re|youre)",
      "simulate being", "you are now", "you re now", "youre now", "aja como", "atue como", "finja (?:que|ser)", "agis comme", "agisci come",
    ].join("|") +
    ")\\b",
);

// En cualquier lugar de la consulta.
const ASIGNACION = /\b(?:a partir de ahora|desde ahora|de ahora en mas|from now on|a partir de agora|d ora in poi)\b(?: \w+){0,2} (?:sos|eres|seras|vas a ser|actua|actuas|responde|respondes|contesta|you|voce|sei)\b/;
const SIN_REGLAS = [
  /\bsin (?:ningun[ao]? |tus |las |tener )?(?:reglas?|restricciones|filtros?|censura|limitaciones|politicas|limites eticos)\b(?! de\b)/,
  /\b(?:ignora|ignore|ignoren|ignorar|olvida|olvidate|olvidese|saltea|saltear|saltearse|saltarse|omiti|omite|desactiva|deshabilita|evadi|evade|evadir)\b(?: \w+){0,3} (?:reglas|instrucciones|restricciones|politicas|filtros|directivas|indicaciones|lineamientos|regras|instrucoes)\b/,
  /\bno (?:tenes|tienes|tiene|tuvieras|tuvieses|tendrias|existieran|existiesen|hubiera|hubiese|hay)\b(?: \w+){0,2} (?:reglas?|restricciones|limites|filtros|censura)\b/,
  /\bno (?:te|le) importa(?:n)?\b(?: \w+){0,2} (?:reglas?|restricciones|normas|limites)\b/,
  /\b(?:no|without|zero|free of|free from|if you had no)\b(?: \w+){0,2} (?:rules|restrictions|limitations|filters|guidelines|censorship|boundaries)\b/,
  /\b(?:ignore|disregard|forget|bypass|override|skip)\b(?: \w+){0,3} (?:rules|instructions|guidelines|restrictions|prompt|policies|format)\b/,
  /\b(?:unrestricted|unfiltered|uncensored|jailbroken|jailbreak|jailbreaking|sem (?:regras|restricoes|limites|filtros|censura))\b/,
];
const PERSONA_JAILBREAK = /\b(?:do anything now|developer mode|dev mode|god mode|evil mode|modo (?:desarrollador|dios|libre|malvado|sin filtros?|sin restricciones))\b/;
// «DAN» solo en mayúsculas en el texto original: «dan» en minúscula es un verbo común en español.
const DAN = /(?<![A-Za-z])D[\s.\-_]?A[\s.\-_]?N(?![A-Za-z])/;
const FICCION = /\b(?:hipoteticamente|hipotetic[oa]|supongamos|suponete|imagina|imaginate|imaginemos|en un mundo|juguemos|escribamos|un cuento|una novela|una historia|un relato|ficcion|ficticio|personaje|role ?play|hypothetically|hypothetical|imagine|pretend|story|novel|fiction|character)\b/;
const OBJETIVO_PROPIO = /\b(?:(?:tus|tuyas|your) (?:reglas|instrucciones|restricciones|directivas|indicaciones|rules|instructions|guidelines)|instrucciones (?:secretas|de sistema|del sistema|internas|ocultas|originales)|system prompt|prompt (?:de|del) sistema|(?:hidden|secret|system) instructions)\b/;
const FORMATO_LIBRE = /\b(?:en texto libre|sin json|fuera del json|no uses json|ignora el formato|in plain text|plain english|free text|without json|no json|outside the json|in character|stay in character|sem json)\b/;
// Forzar un prefijo de persona entre comillas («empezá con 'DAN:'»). Se evalúa sobre la forma con signos.
const PREFIJO = /\b(?:empez|comenz|empiez|comienz|inici|arranc|start|begin|prefix|prefij|comec)\w*\b[^.?!\n]{0,40}?["'\u00AB\u201C\u2018][a-z][a-z_-]{1,19}:/;

const BASE64 = /[A-Za-z0-9+/]{16,}={0,2}/g;

/** Segmentos base64 que decodifican a texto legible: se analizan como si fueran parte de la consulta. */
function decodificarBase64(texto: string): string[] {
  const salida: string[] = [];
  for (const token of texto.match(BASE64) ?? []) {
    try {
      const bytes = Uint8Array.from(atob(token), (c) => c.charCodeAt(0));
      const decodificado = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      const legibles = Array.from(decodificado).filter((c) => /[\p{L}\p{N}\p{P}\s]/u.test(c)).length;
      if (decodificado.length > 0 && legibles / Array.from(decodificado).length >= 0.9) salida.push(decodificado);
    } catch {
      /* no es base64 o no es texto */
    }
  }
  return salida;
}

function analizar(original: string): SenalRol | null {
  const conSignos = plegarConSignos(original);
  const plano = plegar(original);
  const oraciones = conSignos.split(/[.!?¡¿;:,\n]+/u).map(plegar).filter((o) => o.length > 0);

  if (oraciones.some((o) => ASIGNACION_INICIO.test(o)) || ASIGNACION.test(plano)) return "asignacion-de-rol";
  if (SIN_REGLAS.some((r) => r.test(plano))) return "sin-reglas";
  if (PERSONA_JAILBREAK.test(plano) || DAN.test(original.normalize("NFKC"))) return "persona-jailbreak";
  if (FICCION.test(plano) && OBJETIVO_PROPIO.test(plano)) return "ficcion";
  if (FORMATO_LIBRE.test(plano) || PREFIJO.test(conSignos)) return "formato-forzado";
  return null;
}

/**
 * Devuelve la primera señal de cambio de rol que encuentra, o `null`. Con una señal, el asistente responde
 * «sin contexto» sin llamar al modelo (spec §8, #8). La consulta debe venir ya normalizada (route.ts, RNF-20).
 */
export function detectarCambioDeRol(consulta: string): SenalRol | null {
  const directa = analizar(consulta);
  if (directa !== null) return directa;
  for (const decodificado of decodificarBase64(consulta)) {
    const senal = analizar(decodificado);
    if (senal !== null) return senal;
  }
  return null;
}
