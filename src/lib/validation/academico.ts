import { z } from "zod";

const uuid = z.string().uuid("Identificador no válido.");

export const aulaSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio.").max(80),
  codigo: z
    .string()
    .trim()
    .min(1, "El código es obligatorio.")
    .max(20)
    .regex(/^[A-Za-z0-9-]+$/, "Solo letras, números y guiones."),
  capacidad: z.coerce
    .number()
    .int("Debe ser un entero.")
    .min(1, "Mínimo 1.")
    .max(200, "Máximo 200."),
  ubicacion: z.string().trim().max(120).optional().or(z.literal("")),
});
export type AulaInput = z.infer<typeof aulaSchema>;

export const asignaturaSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio.").max(120),
  codigo: z
    .string()
    .trim()
    .min(1, "El código es obligatorio.")
    .max(20)
    .regex(/^[A-Za-z0-9-]+$/, "Solo letras, números y guiones."),
  area: z.string().trim().max(80).optional().or(z.literal("")),
});
export type AsignaturaInput = z.infer<typeof asignaturaSchema>;

export const seccionSchema = z.object({
  grado_id: uuid,
  jornada_id: uuid,
  aula_id: uuid.optional().or(z.literal("")),
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio.")
    .max(20),
  modalidad: z
    .enum(["general", "academica", "tecnico_profesional", "artes"])
    .optional()
    .or(z.literal("")),
  cupo: z.coerce.number().int().min(1, "Mínimo 1.").max(60, "Máximo 60."),
});
export type SeccionInput = z.infer<typeof seccionSchema>;

const componenteSchema = z.object({
  nombre: z.string().trim().min(1, "Nombre obligatorio.").max(80),
  codigo: z
    .string()
    .trim()
    .min(1)
    .max(20)
    .regex(/^[A-Za-z0-9]+$/, "Solo letras y números."),
  peso: z.coerce.number().min(0, "Mínimo 0.").max(100, "Máximo 100."),
});

export const ponderacionSchema = z
  .object({
    esquema_id: uuid,
    componentes: z
      .array(componenteSchema)
      .min(1, "Agrega al menos un componente.")
      .max(10, "Máximo 10 componentes."),
  })
  .refine(
    (v) =>
      Math.round(
        v.componentes.reduce((sum, c) => sum + c.peso, 0) * 100,
      ) === 10000,
    { message: "Los pesos deben sumar exactamente 100%.", path: ["componentes"] },
  );
export type PonderacionInput = z.infer<typeof ponderacionSchema>;
