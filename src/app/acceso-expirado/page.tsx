import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldX, Mail, LogOut } from "lucide-react";
import { requireActiveUser } from "@/lib/auth/require";
import { getMiAccesoDemo } from "@/lib/nexus/queries";
import { logoutAction } from "@/app/(auth)/actions";
import { LogoMark } from "@/components/brand/logo";

export const metadata: Metadata = { title: "Acceso expirado" };
export const dynamic = "force-dynamic";

export default async function AccesoExpiradoPage() {
  await requireActiveUser();
  const acceso = await getMiAccesoDemo();

  // Si la cuenta no está bloqueada (no es demo, o sigue vigente), no procede.
  if (!acceso?.bloqueado) redirect("/dashboard");

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-primary px-4 py-10 text-primary-foreground">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(70% 60% at 50% 30%, rgb(var(--primary-light) / 0.35), transparent 70%)",
        }}
      />
      <div className="relative w-full max-w-md text-center">
        <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/20">
          <ShieldX className="h-9 w-9" />
        </div>

        <h1 className="font-serif text-3xl font-semibold">Tu acceso ha expirado</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-primary-foreground/80">
          El período de demostración de este entorno ha finalizado. Para
          renovar tu acceso y continuar explorando el sistema, comunícate con
          nosotros.
        </p>

        <div className="mx-auto mt-7 flex max-w-xs flex-col gap-3">
          <a
            href="mailto:jm.designs.worldwide@gmail.com?subject=Renovaci%C3%B3n%20de%20acceso%20demo"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-primary shadow-sm transition-transform hover:scale-[1.02]"
          >
            <Mail className="h-4 w-4" />
            Contactar a JM Nexus Designs
          </a>
          <form action={logoutAction}>
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 px-4 py-2.5 text-sm font-medium text-primary-foreground/80 transition-colors hover:bg-white/10"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </form>
        </div>

        <div className="mt-10 flex items-center justify-center gap-2 text-xs text-primary-foreground/50">
          <LogoMark className="h-5 w-5 bg-white/10 ring-white/20" />
          Powered by JM Nexus Designs
        </div>
      </div>
    </div>
  );
}
