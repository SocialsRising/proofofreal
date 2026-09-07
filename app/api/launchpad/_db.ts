import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Registry storage. Uses Supabase when configured (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY),
 * otherwise an in-memory Map so local dev works with zero setup. See supabase/launchpad.sql for the schema.
 */
let sb: SupabaseClient | null | undefined;
export function db(): SupabaseClient | null {
  if (sb !== undefined) return sb;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  sb = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return sb;
}

type Row = { id: string; data: unknown; created_at: string };
const mem: Record<string, Map<string, Row>> = {};
export const memTable = (name: string) => (mem[name] ??= new Map());
