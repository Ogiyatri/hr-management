import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { cookies } from "next/headers";
import { connection } from "next/server";

/**
 * Supabase client untuk Server Components, Server Actions, dan Route Handlers.
 * Buat baru di setiap request; jangan disimpan di variabel global.
 */
export async function createClient() {
  const cookieStore = await cookies();
  // Data HR selalu dirender per request: supabase-js memakai waktu sekarang
  // (cek kedaluwarsa token) yang tidak boleh terjadi saat prerender/prefetch.
  await connection();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Dipanggil dari Server Component (cookie read-only).
            // Aman diabaikan karena proxy.ts yang me-refresh sesi.
          }
        },
      },
    },
  );
}
