import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseUrl } from "@/lib/supabase/env";

/**
 * Cliente administrativo (service_role). SOLO servidor. JAMÁS se expone al
 * cliente ni se registra la clave. Úsalo únicamente en flujos privilegiados
 * y controlados (p. ej. emitir sesión tras verificar el PIN de un docente).
 */
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error(
      "Falta SUPABASE_SERVICE_ROLE_KEY (solo servidor).",
    );
  }

  return createSupabaseClient(getSupabaseUrl(), serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
