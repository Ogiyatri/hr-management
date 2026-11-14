import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Client dengan SECRET key (melewati RLS). HANYA untuk server:
 * mengundang user (auth admin) dan menerima lamaran dari halaman karier publik.
 * Selalu cek otorisasi pemanggil sebelum memakai client ini.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY belum diset");
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
