"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

/**
 * Cliente de Supabase para el navegador. Usa exclusivamente la clave anon
 * (protegida por RLS). La service_role JAMÁS llega al cliente.
 */
export function createClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
}
