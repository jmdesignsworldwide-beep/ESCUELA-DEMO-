import { DatabaseZap } from "lucide-react";
import { Card } from "@/components/ui/card";

export function EstructuraVacia() {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
        <DatabaseZap className="h-7 w-7" />
      </div>
      <h2 className="font-serif text-xl font-semibold">
        Aún no hay estructura configurada
      </h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        No se encontró una sede o un año escolar activo. Aplica la migración de
        la TANDA 2 y su semilla para ver la estructura académica poblada.
      </p>
    </Card>
  );
}
