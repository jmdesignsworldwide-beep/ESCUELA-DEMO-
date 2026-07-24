import { z } from "zod";

const uuid = z.string().uuid("Identificador no válido.");

export const estudianteSchema = z.object({
  nombres: z.string().trim().min(1, "Los nombres son obligatorios.").max(120),
  apellidos: z
    .string()
    .trim()
    .min(1, "Los apellidos son obligatorios.")
    .max(120),
  sexo: z.enum(["M", "F"], { message: "Selecciona el sexo." }),
  fecha_nacimiento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida.")
    .refine((v) => {
      const d = new Date(v);
      return !Number.isNaN(d.getTime()) && d < new Date();
    }, "Fecha no válida."),
  lugar_nacimiento: z.string().trim().max(120).optional().or(z.literal("")),
  tipo_documento: z.enum(["acta", "cedula", "pasaporte"]),
  numero_documento: z.string().trim().max(30).optional().or(z.literal("")),
  rne: z
    .string()
    .trim()
    .max(20)
    .regex(/^[0-9-]*$/, "Solo dígitos y guiones.")
    .optional()
    .or(z.literal("")),
  direccion: z.string().trim().max(200).optional().or(z.literal("")),
  tipo_sangre: z
    .enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", ""])
    .optional(),
  alergias: z.string().trim().max(300).optional().or(z.literal("")),
  condiciones_medicas: z.string().trim().max(300).optional().or(z.literal("")),
  familia_id: uuid.optional().or(z.literal("")),
  grado_id: uuid,
  seccion_id: uuid,
});
export type EstudianteInput = z.infer<typeof estudianteSchema>;

export const cambiarEstadoSchema = z.object({
  estudiante_id: uuid,
  estado: z.enum(["activo", "retirado", "egresado", "transferido"]),
});
