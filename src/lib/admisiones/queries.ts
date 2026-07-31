import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  AdmisionEvento,
  AdmisionesResumen,
  GradoOpcion,
  SolicitudAdmision,
} from "@/lib/admisiones/types";

export type {
  AdmisionEvento,
  AdmisionesResumen,
  ConsultaAdmision,
  EstadoSolicitud,
  GradoOpcion,
  SolicitudAdmision,
} from "@/lib/admisiones/types";
export {
  ESTADO_SOLICITUD_LABELS,
  ESTADO_SOLICITUD_ORDEN,
  ESTADO_SOLICITUD_STYLES,
  ESTADOS_TRANSICION,
} from "@/lib/admisiones/types";

const EMPTY_RESUMEN: AdmisionesResumen = {
  recibida: 0,
  en_revision: 0,
  entrevista: 0,
  aceptada: 0,
  lista_espera: 0,
  rechazada: 0,
  matriculada: 0,
  total: 0,
};

export async function getAdmisionesResumen(): Promise<AdmisionesResumen> {
  const supabase = createClient();
  const { data } = await supabase.rpc("admisiones_resumen").maybeSingle();
  return (data as AdmisionesResumen) ?? EMPTY_RESUMEN;
}

interface SolicitudRow {
  id: string;
  codigo: string;
  anio_escolar: string;
  aspirante_nombres: string;
  aspirante_apellidos: string;
  aspirante_sexo: "M" | "F";
  aspirante_fecha_nacimiento: string;
  aspirante_nacionalidad: string;
  colegio_procedencia: string | null;
  tutor_nombres: string;
  tutor_apellidos: string;
  tutor_parentesco: string;
  tutor_telefono: string;
  tutor_email: string | null;
  tutor_cedula: string | null;
  mensaje: string | null;
  estado: SolicitudAdmision["estado"];
  notas_internas: string | null;
  entrevista_at: string | null;
  decidido_at: string | null;
  estudiante_id: string | null;
  created_at: string;
  grados: { nombre: string } | null;
}

export async function getSolicitudes(
  estado?: string | null,
): Promise<SolicitudAdmision[]> {
  const supabase = createClient();
  let query = supabase
    .from("solicitudes_admision")
    .select(
      "id, codigo, anio_escolar, aspirante_nombres, aspirante_apellidos, aspirante_sexo, aspirante_fecha_nacimiento, aspirante_nacionalidad, colegio_procedencia, tutor_nombres, tutor_apellidos, tutor_parentesco, tutor_telefono, tutor_email, tutor_cedula, mensaje, estado, notas_internas, entrevista_at, decidido_at, estudiante_id, created_at, grados(nombre)",
    )
    .order("created_at", { ascending: false });
  if (estado && estado !== "todas") query = query.eq("estado", estado);

  const { data } = await query;
  const rows = (data as unknown as SolicitudRow[]) ?? [];
  return rows.map((r) => ({
    id: r.id,
    codigo: r.codigo,
    anio_escolar: r.anio_escolar,
    grado: r.grados?.nombre ?? "—",
    aspirante: `${r.aspirante_apellidos}, ${r.aspirante_nombres}`,
    sexo: r.aspirante_sexo,
    fecha_nacimiento: r.aspirante_fecha_nacimiento,
    nacionalidad: r.aspirante_nacionalidad,
    colegio_procedencia: r.colegio_procedencia,
    tutor: `${r.tutor_nombres} ${r.tutor_apellidos}`,
    parentesco: r.tutor_parentesco,
    telefono: r.tutor_telefono,
    email: r.tutor_email,
    cedula: r.tutor_cedula,
    mensaje: r.mensaje,
    estado: r.estado,
    notas_internas: r.notas_internas,
    entrevista_at: r.entrevista_at,
    decidido_at: r.decidido_at,
    estudiante_id: r.estudiante_id,
    created_at: r.created_at,
  }));
}

export async function getEventosSolicitud(
  solicitudId: string,
): Promise<AdmisionEvento[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("admision_eventos")
    .select("id, estado_anterior, estado_nuevo, nota, created_at")
    .eq("solicitud_id", solicitudId)
    .order("created_at", { ascending: true });
  return (data as AdmisionEvento[]) ?? [];
}

/** Opciones de grado (staff, para el diálogo de matriculación usa secciones). */
export async function getGradoOpciones(): Promise<GradoOpcion[]> {
  const supabase = createClient();
  const { data } = await supabase.rpc("admision_grados");
  const rows =
    (data as { id: string; etiqueta: string }[] | null) ?? [];
  return rows.map((r) => ({ id: r.id, etiqueta: r.etiqueta }));
}
