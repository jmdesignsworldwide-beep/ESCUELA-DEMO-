export interface TableroEjecutivo {
  estudiantes_activos: number;
  docentes_activos: number;
  cupo_total: number;
  ocupacion_pct: number;
  esperado_mes: number;
  cobrado_mes: number;
  tasa_cobro_mes: number;
  morosidad_saldo: number;
  familias_morosas: number;
  familias_total: number;
  deuda_90mas: number;
  asistencia_pct: number;
  riesgo_asistencia: number;
  promedio_general: number | null;
  admisiones_pendientes: number;
  admisiones_aceptadas: number;
}

export type Severidad = "alta" | "media" | "baja";

export interface AlertaEjecutiva {
  severidad: Severidad;
  categoria: string;
  titulo: string;
  detalle: string;
  orden: number;
}

export const SEVERIDAD_STYLES: Record<
  Severidad,
  { chip: string; dot: string; label: string }
> = {
  alta: {
    chip: "bg-destructive/10 text-destructive border-destructive/20",
    dot: "bg-destructive",
    label: "Alta",
  },
  media: {
    chip: "bg-gold/15 text-gold-foreground border-gold/30",
    dot: "bg-gold",
    label: "Media",
  },
  baja: {
    chip: "bg-primary/10 text-primary border-primary/20",
    dot: "bg-primary",
    label: "Baja",
  },
};

/** Semáforo por umbral: devuelve el tono según el valor y la dirección. */
export type Tono = "bueno" | "atencion" | "critico";

export function tonoAscendente(
  pct: number,
  bueno: number,
  atencion: number,
): Tono {
  if (pct >= bueno) return "bueno";
  if (pct >= atencion) return "atencion";
  return "critico";
}

export const TONO_STYLES: Record<Tono, { text: string; bar: string }> = {
  bueno: { text: "text-success", bar: "bg-success" },
  atencion: { text: "text-gold-foreground", bar: "bg-gold" },
  critico: { text: "text-destructive", bar: "bg-destructive" },
};
