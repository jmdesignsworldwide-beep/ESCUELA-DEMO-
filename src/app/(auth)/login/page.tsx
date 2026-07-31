import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound, GraduationCap } from "lucide-react";
import { LoginForm } from "./login-form";
import { Logo } from "@/components/brand/logo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; motivo?: string };
}) {
  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <Logo showWordmark={false} markClassName="h-12 w-12" />
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">
            JM ESCOLAR
          </h1>
          <p className="text-sm text-muted-foreground">
            Sistema de Gestión Académica Integral
          </p>
        </div>
      </div>

      <Card className="shadow-card-hover">
        <CardHeader>
          <CardTitle className="text-xl">Bienvenido de vuelta</CardTitle>
          <CardDescription>
            Ingresa con tu correo institucional para continuar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {searchParams.motivo === "inactivo" && (
            <p className="mb-4 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
              Tu cuenta no está activa. Contacta a la administración.
            </p>
          )}
          <LoginForm next={searchParams.next} />

          <div className="mt-6 space-y-3 border-t border-border pt-4">
            <Link
              href="/pin"
              className="flex items-center justify-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary-medium"
            >
              <KeyRound className="h-4 w-4" />
              Soy docente — entrar con PIN
            </Link>
            <Link
              href="/admision"
              className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <GraduationCap className="h-4 w-4" />
              ¿Nuevo ingreso? Solicita admisión
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
