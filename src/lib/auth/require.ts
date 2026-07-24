import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Role } from "@/lib/types";

/**
 * Contexto de sesión resuelto en servidor. `profile` incluye rol y estado,
 * ambos verificados contra la base de datos, nunca contra el cliente.
 */
export interface AuthContext {
  userId: string;
  email: string | null;
  profile: Profile;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: "no_session" | "inactive" | "forbidden",
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Exige un usuario autenticado y ACTIVO. Debe invocarse al inicio de CADA
 * server action y de cada carga de página protegida. La validación de
 * expiración/estado es del lado del servidor (Fort Knox §5.3).
 *
 * @param opts.redirectOnFail  Si true (por defecto), redirige a /login.
 *                             Si false, lanza AuthError (para server actions).
 */
export async function requireActiveUser(opts?: {
  redirectOnFail?: boolean;
}): Promise<AuthContext> {
  const redirectOnFail = opts?.redirectOnFail ?? true;
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (redirectOnFail) redirect("/login");
    throw new AuthError("No hay sesión activa.", "no_session");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (error || !profile) {
    if (redirectOnFail) redirect("/login");
    throw new AuthError("Perfil no encontrado.", "no_session");
  }

  if (profile.status !== "activo") {
    if (redirectOnFail) redirect("/login?motivo=inactivo");
    throw new AuthError("La cuenta no está activa.", "inactive");
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    profile,
  };
}

/**
 * Exige que el usuario activo tenga uno de los roles permitidos.
 * Envuelve requireActiveUser(). El director tiene acceso universal salvo
 * que se pase `strict: true`.
 */
export async function requireRole(
  allowed: Role[],
  opts?: { redirectOnFail?: boolean; strict?: boolean },
): Promise<AuthContext> {
  const ctx = await requireActiveUser({
    redirectOnFail: opts?.redirectOnFail,
  });

  const role = ctx.profile.role;
  const permitted =
    allowed.includes(role) || (!opts?.strict && role === "director");

  if (!permitted) {
    if (opts?.redirectOnFail ?? true) redirect("/dashboard?motivo=sin_permiso");
    throw new AuthError(
      "No tiene permiso para esta acción.",
      "forbidden",
    );
  }

  return ctx;
}
