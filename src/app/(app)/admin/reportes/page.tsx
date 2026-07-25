import type { Metadata } from "next";
import { Users, GraduationCap, Banknote, AlertTriangle } from "lucide-react";
import { requireRole } from "@/lib/auth/require";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { ReportesCharts } from "./reportes-charts";
import {
  getDashKpis,
  getMatriculaNivel,
  getIngresosMes,
  getMorosidadAging,
  getRendimientoNivel,
} from "@/lib/reports/queries";
import { formatRD } from "@/lib/utils";

export const metadata: Metadata = { title: "Reportes y dirección" };
export const dynamic = "force-dynamic";

export default async function ReportesPage() {
  await requireRole(["director", "coordinador", "contabilidad"]);

  const [kpis, matricula, ingresos, aging, rendimiento] = await Promise.all([
    getDashKpis(),
    getMatriculaNivel(),
    getIngresosMes(),
    getMorosidadAging(),
    getRendimientoNivel(),
  ]);

  return (
    <div>
      <PageHeader
        title="Reportes y dirección"
        description="Panel ejecutivo · indicadores académicos y financieros"
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          icon={<Users className="h-4 w-4" />}
          label="Estudiantes activos"
          value={String(kpis.estudiantes)}
        />
        <Kpi
          icon={<GraduationCap className="h-4 w-4" />}
          label="Docentes"
          value={String(kpis.docentes)}
        />
        <Kpi
          icon={<Banknote className="h-4 w-4" />}
          label="Cobrado (año)"
          value={formatRD(kpis.cobrado)}
          accent="success"
        />
        <Kpi
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Saldo pendiente"
          value={formatRD(kpis.pendiente)}
          accent="danger"
        />
      </div>

      <ReportesCharts
        matricula={matricula}
        ingresos={ingresos}
        aging={aging}
        rendimiento={rendimiento}
        familiasMorosas={kpis.familias_morosas}
      />
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: "success" | "danger";
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </div>
      <p
        className={
          "mt-1 font-serif text-2xl font-semibold tabular-nums " +
          (accent === "success"
            ? "text-success"
            : accent === "danger"
              ? "text-destructive"
              : "text-foreground")
        }
      >
        {value}
      </p>
    </Card>
  );
}
