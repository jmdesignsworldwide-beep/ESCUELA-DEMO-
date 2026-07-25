import type { Metadata } from "next";
import { requireSuperAdmin } from "@/lib/nexus/guard";
import { getAccesos } from "@/lib/nexus/queries";
import { NexusPanel } from "./nexus-panel";

export const metadata: Metadata = { title: "JM Nexus · Control de acceso" };
export const dynamic = "force-dynamic";

export default async function NexusPage() {
  await requireSuperAdmin();
  const accesos = await getAccesos();
  return <NexusPanel accesos={accesos} />;
}
