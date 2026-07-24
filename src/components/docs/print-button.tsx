"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button size="sm" className="gap-1.5" onClick={() => window.print()}>
      <Printer className="h-4 w-4" />
      Imprimir / Guardar PDF
    </Button>
  );
}
