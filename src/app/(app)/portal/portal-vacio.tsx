import { Contact } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function PortalVacio({ nombre }: { nombre: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="rounded-full bg-primary/10 p-4 text-primary">
          <Contact className="h-8 w-8" />
        </div>
        <h2 className="font-serif text-lg font-semibold">
          Hola, {nombre}
        </h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Tu cuenta aún no está vinculada a ningún estudiante. Comunícate con la
          administración del colegio para completar la vinculación de tu portal
          de familia.
        </p>
      </CardContent>
    </Card>
  );
}
