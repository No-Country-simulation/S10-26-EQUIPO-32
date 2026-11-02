import type { ReactNode } from "react";
import "./globals.css";

// Tema oscuro y fuentes llegan en B2 (TI1, T12).
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
