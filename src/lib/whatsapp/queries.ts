import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  DestinatarioWhatsapp,
  EnvioWhatsappRow,
  PlantillaWhatsapp,
} from "@/lib/whatsapp/types";

export type {
  CategoriaWhatsapp,
  DestinatarioWhatsapp,
  EnvioWhatsappRow,
  PlantillaWhatsapp,
} from "@/lib/whatsapp/types";
export { CATEGORIA_WA_LABELS } from "@/lib/whatsapp/types";

export async function getPlantillasWhatsapp(
  sedeId: string,
): Promise<PlantillaWhatsapp[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("plantillas_whatsapp")
    .select("id, nombre, categoria, cuerpo")
    .eq("sede_id", sedeId)
    .eq("activa", true)
    .order("orden");
  return (data as PlantillaWhatsapp[]) ?? [];
}

export async function getDestinatariosWhatsapp(
  seccionId: string | null,
  soloMorosos: boolean,
): Promise<DestinatarioWhatsapp[]> {
  const supabase = createClient();
  const { data } = await supabase.rpc("destinatarios_whatsapp", {
    p_seccion: seccionId,
    p_solo_morosos: soloMorosos,
  });
  return ((data as DestinatarioWhatsapp[]) ?? []).map((d) => ({
    ...d,
    saldo: Number(d.saldo),
  }));
}

export async function getEnviosWhatsappRecientes(
  limit = 25,
): Promise<EnvioWhatsappRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("envios_whatsapp")
    .select("id, telefono, categoria, mensaje, created_at, estudiantes(nombres, apellidos)")
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows =
    (data as unknown as {
      id: string;
      telefono: string;
      categoria: string;
      mensaje: string;
      created_at: string;
      estudiantes: { nombres: string; apellidos: string } | null;
    }[]) ?? [];
  return rows.map((r) => ({
    id: r.id,
    telefono: r.telefono,
    categoria: r.categoria,
    mensaje: r.mensaje,
    created_at: r.created_at,
    estudiante: r.estudiantes
      ? `${r.estudiantes.apellidos}, ${r.estudiantes.nombres}`
      : null,
  }));
}
