import "server-only";
import { createClient } from "@supabase/supabase-js";

/** URL tujuan link email (template bawaan Supabase) → diproses di /auth/callback. */
export function authCallbackUrl(next = "/reset-password") {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return `${site}/auth/callback?next=${encodeURIComponent(next)}`;
}

/**
 * Kirim email "atur password". Memakai alur implicit (token di #fragmen),
 * bukan PKCE, agar link tetap berlaku walau dibuka di perangkat/browser lain
 * — mis. HR mengirim ulang link untuk karyawan.
 * Dengan template kustom (SMTP sendiri), link memakai /auth/confirm?token_hash=…
 */
export function sendPasswordLink(email: string) {
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client.auth.resetPasswordForEmail(email, { redirectTo: authCallbackUrl() });
}
