import { NextResponse, type NextRequest } from "next/server";
import { construirCsp, generarNonce } from "@/lib/seguridad/csp";

// CSP con nonce por request (T25). Next lee el nonce del header de la petición y lo aplica a sus scripts.
export function proxy(request: NextRequest) {
  const nonce = generarNonce();
  const csp = construirCsp({
    nonce,
    desarrollo: process.env.NODE_ENV === "development",
    mejorarAHttps:
      process.env.NODE_ENV === "production" &&
      (request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https"),
  });

  const cabecerasPeticion = new Headers(request.headers);
  cabecerasPeticion.set("x-nonce", nonce);
  cabecerasPeticion.set("Content-Security-Policy", csp);

  const respuesta = NextResponse.next({ request: { headers: cabecerasPeticion } });
  respuesta.headers.set("Content-Security-Policy", csp);
  return respuesta;
}

export const config = {
  matcher: [
    {
      // Sin estáticos ni prefetch de next/link: no renderizan HTML que necesite nonce.
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
