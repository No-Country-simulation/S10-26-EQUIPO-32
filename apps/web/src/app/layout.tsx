import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { Cabecera } from "@/components/catalogo/Cabecera";
import { Pie } from "@/components/sitio/Pie";
import { t } from "@/i18n/es";
import "./globals.css";

// next/font descarga las fuentes en el build y las sirve desde /_next/static: sin pedidos a terceros (ui-brief §4).
const sans = Geist({ subsets: ["latin"], variable: "--font-openbridge-sans", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-openbridge-mono", display: "swap" });

// La CSP con nonce (src/proxy.ts) exige render dinámico: una página estática no puede llevar el nonce de cada request (plan 5.2).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: t("sitio.nombre"),
  description: t("sitio.descripcion"),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <Cabecera />
        <main>{children}</main>
        <Pie />
      </body>
    </html>
  );
}
