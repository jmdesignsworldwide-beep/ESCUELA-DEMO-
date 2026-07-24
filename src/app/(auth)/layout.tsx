import type { ReactNode } from "react";
import { AuroraBackground } from "@/components/brand/aurora-background";
import { COLEGIO } from "@/lib/constants";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <AuroraBackground />
      <div className="w-full max-w-md">{children}</div>
      <p className="mt-8 text-center text-xs text-muted-foreground">
        {COLEGIO.nombre} · {COLEGIO.ciudad}
      </p>
    </main>
  );
}
