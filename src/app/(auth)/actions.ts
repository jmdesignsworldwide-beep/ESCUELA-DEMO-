"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { loginSchema, pinSchema } from "@/lib/validation/auth";

export interface AuthActionState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

function clientIp(): string {
  const h = headers();
  const fwd = h.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || h.get("x-real-ip") || "desconocido";
}

/** Login por correo + contraseña. Rate limit + Zod en servidor. */
export async function loginAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const rl = checkRateLimit(`login:${clientIp()}`, 8, 5 * 60_000);
  if (!rl.ok) {
    return {
      error: `Demasiados intentos. Espera ${rl.retryAfterSec} segundos.`,
    };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Mensaje genérico: no revelamos si el correo existe.
    return { error: "Correo o contraseña incorrectos." };
  }

  const dest = parsed.data.next ?? "/dashboard";
  redirect(dest);
}

/**
 * Login por PIN para docentes (pase de lista rápido).
 * Verifica código+PIN vía RPC SECURITY DEFINER; si es válido, emite una
 * sesión con el cliente admin y establece la cookie con verifyOtp.
 */
export async function pinLoginAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = pinSchema.safeParse({
    codigo: formData.get("codigo"),
    pin: formData.get("pin"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const rl = checkRateLimit(
    `pin:${parsed.data.codigo.toLowerCase()}`,
    5,
    5 * 60_000,
  );
  if (!rl.ok) {
    return {
      error: `Demasiados intentos. Espera ${rl.retryAfterSec} segundos.`,
    };
  }

  const admin = createAdminClient();

  // La RPC compara el hash del PIN en servidor y devuelve el correo si es
  // válido y el docente está activo. Nunca devuelve el hash.
  const { data: email, error: rpcError } = await admin.rpc(
    "verificar_pin_docente",
    { p_codigo: parsed.data.codigo, p_pin: parsed.data.pin },
  );

  if (rpcError || !email || typeof email !== "string") {
    return { error: "Código o PIN incorrectos." };
  }

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  if (linkError || !link.properties?.hashed_token) {
    return { error: "No se pudo iniciar la sesión. Intenta de nuevo." };
  }

  const supabase = createClient();
  const { error: otpError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: link.properties.hashed_token,
  });

  if (otpError) {
    return { error: "No se pudo iniciar la sesión. Intenta de nuevo." };
  }

  redirect("/academico/asistencia");
}

/** Cierre de sesión. */
export async function logoutAction(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
