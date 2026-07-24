import { z } from "zod";

/** Login por correo + contraseña. */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "El correo es obligatorio.")
    .email("Correo no válido.")
    .max(254),
  password: z
    .string()
    .min(1, "La contraseña es obligatoria.")
    .max(128),
  next: z.string().startsWith("/").max(512).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

/** Login por PIN para docentes (pase de lista rápido). */
export const pinSchema = z.object({
  codigo: z
    .string()
    .trim()
    .min(3, "Código no válido.")
    .max(20)
    .regex(/^[A-Za-z0-9._-]+$/, "Código no válido."),
  pin: z
    .string()
    .trim()
    .regex(/^\d{4,8}$/, "El PIN debe tener entre 4 y 8 dígitos."),
});

export type PinInput = z.infer<typeof pinSchema>;
