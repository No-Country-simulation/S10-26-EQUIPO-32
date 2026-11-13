import type { ReactNode } from "react";
import Link from "next/link";
import { Asistente } from "@/components/asistente/Asistente";
import { t } from "@/i18n/es";

export interface CabeceraProps {
  children?: ReactNode;
}

export function Cabecera({ children }: CabeceraProps) {
  return (
    <header className="relative border-b border-border bg-background">
      <div className="catalogo-contenedor flex flex-wrap items-center gap-5 py-6 lg:flex-nowrap lg:gap-10">
        <Link href="/" className="catalogo-foco rounded-sm text-2xl font-semibold tracking-tight">
          {t("sitio.nombre")}
        </Link>
        {children != null && (
        <div className="order-last min-w-0 basis-full lg:order-none lg:flex-1 lg:basis-auto">
          {children}
        </div>
        )}
        <Asistente />
      </div>
    </header>
  );
}
