import type { ReactNode } from "react";
import Link from "next/link";
import { ShieldHalf, ArrowLeft } from "lucide-react";
import { requireSuperAdmin } from "@/lib/nexus/guard";
import { logoutAction } from "@/app/(auth)/actions";

export default async function NexusLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Doble puerta de servidor: solo super-admin JM Nexus.
  await requireSuperAdmin();

  return (
    <div className="min-h-dvh bg-muted/40">
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <ShieldHalf className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <p className="font-serif text-base font-semibold">JM Nexus</p>
              <p className="text-xs text-muted-foreground">Control de acceso demo</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Ver el sistema</span>
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="font-medium text-primary hover:text-primary-medium"
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
