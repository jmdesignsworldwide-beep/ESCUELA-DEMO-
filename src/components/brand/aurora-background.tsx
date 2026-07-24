import { cn } from "@/lib/utils";

/**
 * Fondo aurora sutil (azul → transparente, toque dorado). Decorativo,
 * fijo detrás del contenido. No captura interacción.
 */
export function AuroraBackground({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none fixed inset-0 -z-10 overflow-hidden",
        className,
      )}
    >
      <div className="absolute inset-0 aurora-bg" />
      <div className="absolute -left-24 -top-24 h-[38rem] w-[38rem] rounded-full bg-primary-light/10 blur-3xl animate-aurora" />
      <div className="absolute -right-32 top-10 h-[30rem] w-[30rem] rounded-full bg-gold/10 blur-3xl animate-aurora [animation-delay:-6s]" />
    </div>
  );
}
