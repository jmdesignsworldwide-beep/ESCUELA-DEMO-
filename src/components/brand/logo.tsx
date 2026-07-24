import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";

interface LogoProps {
  className?: string;
  markClassName?: string;
  showWordmark?: boolean;
}

/** Marca JM ESCOLAR: escudo académico azul + acento dorado. */
export function Logo({
  className,
  markClassName,
  showWordmark = true,
}: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className={markClassName} />
      {showWordmark && (
        <span className="font-serif text-lg font-semibold tracking-tight text-foreground">
          {APP_NAME}
        </span>
      )}
    </div>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm ring-1 ring-inset ring-white/10",
        className,
      )}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-5 w-5"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Birrete académico */}
        <path
          d="M12 3 2.5 7.5 12 12l9.5-4.5L12 3Z"
          fill="currentColor"
        />
        <path
          d="M6.5 10v4.2c0 1.5 2.5 2.8 5.5 2.8s5.5-1.3 5.5-2.8V10"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
        />
        {/* Borla dorada */}
        <path
          d="M21 7.5v4.5"
          stroke="rgb(201 162 39)"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle cx="21" cy="12.6" r="1.15" fill="rgb(201 162 39)" />
      </svg>
    </span>
  );
}
