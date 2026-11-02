import type { ReactNode } from "react";
import "./globals.css";

// `lang="es"`, textos del diccionario y tema oscuro llegan en T02 y B2.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
