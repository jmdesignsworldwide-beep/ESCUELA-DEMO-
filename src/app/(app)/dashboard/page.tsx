import type { Metadata } from "next";
import { requireActiveUser } from "@/lib/auth/require";
import { DashboardContent } from "./dashboard-content";
import { ModuloDashboards } from "./modulo-dashboards";
import { WelcomeCurtain } from "@/components/brand/welcome-curtain";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { ROLE_SHORT, type Role } from "@/lib/types";
import { COLEGIO } from "@/lib/constants";
import { getAnioActivo } from "@/lib/academic/queries";
import { getTableroKpis, type TableroKpis } from "@/lib/dashboard/tablero";
import { getDashKpis, type DashKpis } from "@/lib/reports/queries";
import { CumpleanosWidget } from "./cumpleanos-widget";
import { getProximosCumpleanos, type Cumpleanos } from "@/lib/dashboard/cumpleanos";

export const metadata: Metadata = { title: "Panel" };
export const dynamic = "force-dynamic";

const ROLES_TABLERO: Role[] = ["director", "coordinador", "secretaria"];
const ROLES_FINANCIERO: Role[] = ["director", "coordinador", "contabilidad"];

function saludo(): string {
  const hora = new Date().getHours();
  if (hora < 12) return "Buenos días";
  if (hora < 19) return "Buenas tardes";
  return "Buenas noches";
}

export default async function DashboardPage() {
  const { profile } = await requireActiveUser();
  const primerNombre = profile.nombre_completo.split(/\s+/)[0] ?? "";

  const verTablero = ROLES_TABLERO.includes(profile.role);
  const verFinanciero = ROLES_FINANCIERO.includes(profile.role);

  let tablero: TableroKpis | null = null;
  let financiero: DashKpis | null = null;
  let cumpleanos: Cumpleanos[] = [];
  if (verTablero || verFinanciero) {
    const anio = await getAnioActivo();
    const [t, f, c] = await Promise.all([
      verTablero && anio ? getTableroKpis(anio.id) : Promise.resolve(null),
      verFinanciero ? getDashKpis() : Promise.resolve(null),
      verTablero ? getProximosCumpleanos(15) : Promise.resolve([]),
    ]);
    tablero = t;
    financiero = f;
    cumpleanos = c;
  }

  return (
    <div>
      <WelcomeCurtain nombre={profile.nombre_completo} />
      <PageHeader
        title={`${saludo()}, ${primerNombre}`}
        description={`${COLEGIO.nombre} · Accesos de tu rol`}
        actions={<Badge variant="gold">{ROLE_SHORT[profile.role]}</Badge>}
      />
      <ModuloDashboards tablero={tablero} financiero={financiero} />
      <CumpleanosWidget items={cumpleanos} />
      <DashboardContent role={profile.role} />
    </div>
  );
}
