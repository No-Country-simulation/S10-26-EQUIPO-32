import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { t } from "@/i18n/es";
import "./globals.css";

// next/font descarga las fuentes en el build y las sirve desde /_next/static: sin pedidos a terceros (ui-brief §4).
const sans = Geist({ subsets: ["latin"], variable: "--font-openbridge-sans", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-openbridge-mono", display: "swap" });

export const metadata: Metadata = {
  title: t("sitio.nombre"),
  description: t("sitio.descripcion"),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
