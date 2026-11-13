"use client";

import { Sparkles } from "lucide-react";
import { useAsistente } from "@/components/asistente/Asistente";
import { cn } from "@/lib/utils";
import { t } from "@/i18n/es";

/** CTA «Probar el asistente» (RF-20): abre el panel del asistente de la cabecera. Es un botón, no un enlace. */
export function BotonAsistente({ className }: { className?: string }) {
  const asistente = useAsistente();
  return (
    <button
      type="button"
      aria-expanded={asistente.abierto}
      aria-controls={asistente.id}
      onClick={asistente.abrir}
      className={cn(
        "catalogo-foco inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-full px-6 text-[1.05rem] font-medium transition-colors",
        className,
      )}
    >
      <Sparkles aria-hidden="true" className="size-4" />
      {t("portada.probar")}
    </button>
  );
}
