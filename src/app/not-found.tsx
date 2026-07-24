import Link from "next/link";
import { Home } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { AuroraBackground } from "@/components/brand/aurora-background";

export default function NotFound() {
  return (
    <main className="relative grid min-h-dvh place-items-center px-4">
      <AuroraBackground />
      <div className="flex max-w-md flex-col items-center text-center">
        <LogoMark className="h-14 w-14" />
        <p className="mt-6 font-serif text-6xl font-semibold text-primary">
          404
        </p>
        <h1 className="mt-2 font-serif text-2xl font-semibold text-foreground">
          Página no encontrada
        </h1>
        <p className="mt-2 text-muted-foreground">
          La ruta que buscas no existe o fue movida.
        </p>
        <Button asChild className="mt-6">
          <Link href="/dashboard">
            <Home className="h-4 w-4" />
            Volver al panel
          </Link>
        </Button>
      </div>
    </main>
  );
}
