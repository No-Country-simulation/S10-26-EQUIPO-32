import { cn } from "@/lib/utils";

/** Estrella propia para las stars (reemplaza el glifo de texto «★»). */
export function IconoEstrella({ className }: { className?: string }) {
  return (
    <svg data-ob-svg="" aria-hidden="true" viewBox="0 0 16 16" className={cn("inline size-3 shrink-0", className)}>
      <path d="M8 1.5l1.9 4 4.3.5-3.2 3 .9 4.3L8 11.2l-3.9 2.1.9-4.3-3.2-3 4.3-.5z" fill="#ca8a04" />
    </svg>
  );
}
