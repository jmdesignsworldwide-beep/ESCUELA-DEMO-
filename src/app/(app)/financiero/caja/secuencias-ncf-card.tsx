import { FileCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatFechaRD } from "@/lib/utils";
import type { EstadoSecuenciaNcf } from "@/lib/cashier/queries";

export function SecuenciasNcfCard({
  secuencias,
}: {
  secuencias: EstadoSecuenciaNcf[];
}) {
  if (secuencias.length === 0) return null;
  return (
    <Card className="mt-6">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileCheck className="h-5 w-5 text-primary" />
          Comprobantes fiscales (NCF / e-CF)
        </CardTitle>
        <CardDescription>
          Secuencias autorizadas por la DGII y su consumo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th className="border-b border-border p-2 text-left">Tipo</th>
                <th className="border-b border-border p-2 text-left">Descripción</th>
                <th className="border-b border-border p-2 text-center">Usados</th>
                <th className="border-b border-border p-2 text-center">Disponibles</th>
                <th className="border-b border-border p-2 text-center">Vence</th>
                <th className="border-b border-border p-2 text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {secuencias.map((s) => (
                <tr key={s.tipo}>
                  <td className="border-b border-border/60 p-2 font-mono font-medium">
                    {s.tipo}
                    {s.electronico && (
                      <Badge variant="secondary" className="ml-1.5 text-[0.6rem]">
                        e-CF
                      </Badge>
                    )}
                  </td>
                  <td className="border-b border-border/60 p-2">{s.descripcion}</td>
                  <td className="border-b border-border/60 p-2 text-center tabular-nums">
                    {s.usados.toLocaleString("es-DO")}
                  </td>
                  <td className="border-b border-border/60 p-2 text-center tabular-nums">
                    {s.disponibles.toLocaleString("es-DO")}
                  </td>
                  <td className="border-b border-border/60 p-2 text-center">
                    {formatFechaRD(s.vencimiento)}
                  </td>
                  <td className="border-b border-border/60 p-2 text-center">
                    <Badge variant={s.vencida ? "destructive" : "success"}>
                      {s.vencida ? "Vencida" : "Vigente"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
