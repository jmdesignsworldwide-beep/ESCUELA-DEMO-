import { z } from "zod";

const uuid = z.string().uuid("Identificador no válido.");

export const empleadoSchema = z.object({
  nombres: z.string().trim().min(1, "Los nombres son obligatorios.").max(120),
  apellidos: z
    .string()
    .trim()
    .min(1, "Los apellidos son obligatorios.")
    .max(120),
  cedula: z
    .string()
    .trim()
    .max(20)
    .regex(/^[0-9-]*$/, "Solo dígitos y guiones.")
    .optional()
    .or(z.literal("")),
  tipo: z.enum(["docente", "administrativo", "apoyo", "directivo"]),
  cargo: z.string().trim().min(1, "El cargo es obligatorio.").max(120),
  telefono: z.string().trim().max(30).optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .max(254)
    .email("Correo no válido.")
    .optional()
    .or(z.literal("")),
  direccion: z.string().trim().max(200).optional().or(z.literal("")),
  fecha_ingreso: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida.")
    .optional()
    .or(z.literal("")),
  titulo_academico: z.string().trim().max(160).optional().or(z.literal("")),
  fecha_nacimiento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida.")
    .optional()
    .or(z.literal("")),
});
export type EmpleadoInput = z.infer<typeof empleadoSchema>;

export const editarEmpleadoSchema = empleadoSchema.extend({
  empleado_id: uuid,
});

export const asignacionSchema = z.object({
  empleado_id: uuid,
  seccion_id: uuid,
  asignatura_id: uuid,
  horas_semanales: z.coerce
    .number()
    .int("Debe ser un entero.")
    .min(1, "Mínimo 1.")
    .max(40, "Máximo 40."),
});
export type AsignacionInput = z.infer<typeof asignacionSchema>;

export const estadoEmpleadoSchema = z.object({
  empleado_id: uuid,
  estado: z.enum(["activo", "licencia", "inactivo"]),
});
