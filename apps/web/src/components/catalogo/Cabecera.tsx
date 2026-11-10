import type { ReactNode } from "react";
import Link from "next/link";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n/es";

export interface CabeceraProps {
  children?: ReactNode;
}

export function Cabecera({ children }: CabeceraProps) {
  return (
    <header className="border-b border-border bg-background">
      <div className="catalogo-contenedor flex flex-wrap items-center gap-5 py-6 lg:flex-nowrap lg:gap-10">
        <Link href="/" className="catalogo-foco rounded-sm text-2xl font-semibold tracking-tight">
          {t("sitio.nombre")}
        </Link>
        {children != null && (
        <div className="order-last min-w-0 basis-full lg:order-none lg:flex-1 lg:basis-auto">
          {children}
        </div>
        )}
        <Button
          type="button"
          variant="secondary"
          disabled
          className="lg:ml-auto min-h-11 max-w-full gap-2 rounded-full px-5 whitespace-normal disabled:opacity-100"
        >
          <Bot aria-hidden="true" />
          {t("cabecera.asistente")}
        </Button>
      </div>
    </header>
  );
}
