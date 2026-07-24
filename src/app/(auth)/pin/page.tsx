import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PinForm } from "./pin-form";
import { Logo } from "@/components/brand/logo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Entrar con PIN" };

export default function PinPage() {
  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <Logo showWordmark={false} markClassName="h-12 w-12" />
        <h1 className="font-serif text-2xl font-semibold text-foreground">
          Acceso rápido docente
        </h1>
      </div>

      <Card className="shadow-card-hover">
        <CardHeader>
          <CardTitle className="text-xl">Entrar con PIN</CardTitle>
          <CardDescription>
            Para pasar lista al instante. Usa tu código de docente y tu PIN.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PinForm />

          <div className="mt-6 border-t border-border pt-4">
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a inicio de sesión
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
